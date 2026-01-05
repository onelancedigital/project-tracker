import { json } from '@sveltejs/kit';
import { GITHUB_PAT, GITHUB_REPO } from '$lib/server/config';

export async function GET({ locals }) {
  if (!locals.user) {
    return json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const [owner, repo] = GITHUB_REPO.split('/');

    // Fetch milestones with REST API
    const milestonesResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/milestones?state=all`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${GITHUB_PAT}`,
          'User-Agent': 'SvelteKit-Project-Tracker'
        }
      }
    );

    if (!milestonesResponse.ok) {
      const errorBody = await milestonesResponse.text();
      console.error('GitHub API Error Details:', {
        status: milestonesResponse.status,
        statusText: milestonesResponse.statusText,
        body: errorBody,
        repo: GITHUB_REPO,
        url: `https://api.github.com/repos/${GITHUB_REPO}/milestones?state=all`
      });
      throw new Error(`Erreur lors de la récupération des milestones: ${milestonesResponse.status} - ${errorBody}`);
    }

    const milestones = await milestonesResponse.json();

    // Fetch issues with project status using GraphQL
    const graphqlQuery = {
      query: `query {
        repository(owner: "${owner}", name: "${repo}") {
          issues(first: 100, states: [OPEN, CLOSED]) {
            nodes {
              number
              title
              body
              state
              createdAt
              updatedAt
              closedAt
              url
              labels(first: 10) {
                nodes {
                  name
                  color
                }
              }
              assignees(first: 10) {
                nodes {
                  login
                  avatarUrl
                }
              }
              milestone {
                title
                number
              }
              comments {
                totalCount
              }
              author {
                login
              }
              projectItems(first: 5) {
                nodes {
                  project {
                    title
                  }
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`
    };

    const graphqlResponse = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!graphqlResponse.ok) {
      throw new Error('Erreur lors de la récupération des issues');
    }

    const graphqlData = await graphqlResponse.json();
    
    if (graphqlData.errors) {
      console.error('GraphQL errors:', graphqlData.errors);
      throw new Error('Erreur GraphQL: ' + JSON.stringify(graphqlData.errors));
    }

    // Transform GraphQL data to match REST API format
    const issues = graphqlData.data.repository.issues.nodes.map(issue => {
      // Extract project status and issue type from ProjectV2 fields (robust search)
      let projectStatus = null;
      let projectIssueType = null;
      if (issue.projectItems?.nodes?.length > 0) {
        // Iterate over all project items and their fieldValues to find Status and any 'type' field
        for (const projectItem of issue.projectItems.nodes) {
          const fields = projectItem.fieldValues?.nodes || [];

          // Look for Status
          if (!projectStatus) {
            const statusField = fields.find(f => f.field?.name === 'Status');
            if (statusField) projectStatus = statusField.name;
          }

          // Look for a field that looks like an issue type (case-insensitive contains 'type' or exact 'Issue type')
          if (!projectIssueType) {
            const typeField = fields.find(f => {
              const fname = f.field?.name || '';
              return fname.toLowerCase() === 'issue type' || fname.toLowerCase() === 'issue type' || fname.toLowerCase().includes('type');
            });
            if (typeField) projectIssueType = typeField.name;
          }

          if (projectStatus && projectIssueType) break;
        }
      }

      // If no issue_type found, fallback to first label if available
      if (!projectIssueType) {
        projectIssueType = issue.labels?.nodes && issue.labels.nodes.length > 0 ? issue.labels.nodes[0].name : null;
      }

      // Log projectItems for debugging in development when we had to fallback
      if (!projectIssueType && process.env.NODE_ENV !== 'production') {
        try {
          console.info(`No issue_type for issue #${issue.number}. projectItems:`, JSON.stringify(issue.projectItems, null, 2));
        } catch (logErr) {
          console.info(`No issue_type for issue #${issue.number}. (failed to stringify projectItems)`);
        }
      }

      return {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state.toLowerCase(),
        created_at: issue.createdAt,
        updated_at: issue.updatedAt,
        closed_at: issue.closedAt,
        html_url: issue.url,
        labels: issue.labels.nodes.map(label => ({
          name: label.name,
          color: label.color
        })),
        assignees: issue.assignees.nodes.map(assignee => ({
          login: assignee.login,
          avatar_url: assignee.avatarUrl
        })),
        milestone: issue.milestone,
        comments: issue.comments.totalCount,
        user: issue.author ? { login: issue.author.login } : null,
        project_status: projectStatus,
        issue_type: projectIssueType
      };
    });

    // Fetch sub-issues for each issue using the dedicated API
    const issuesWithSubIssues = await Promise.all(
      issues.map(async (issue) => {
        try {
          const subIssuesResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/issues/${issue.number}/sub_issues`,
            {
              headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${GITHUB_PAT}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'SvelteKit-Project-Tracker'
              }
            }
          );

          let subIssues = [];
          if (subIssuesResponse.ok) {
            const subIssuesData = await subIssuesResponse.json();
            subIssues = subIssuesData.map(si => ({
              number: si.number,
              title: si.title,
              state: si.state,
              html_url: si.html_url,
              assignees: si.assignees.map(a => ({
                login: a.login,
                avatar_url: a.avatar_url
              })),
              labels: si.labels.map(l => ({
                name: l.name,
                color: l.color
              }))
            }));
          }

          return {
            ...issue,
            sub_issues: subIssues,
            sub_issues_stats: {
              total: subIssues.length,
              completed: subIssues.filter(si => si.state === 'closed').length
            }
          };
        } catch (error) {
          console.error(`Error fetching sub-issues for issue #${issue.number}:`, error);
          return {
            ...issue,
            sub_issues: [],
            sub_issues_stats: { total: 0, completed: 0 }
          };
        }
      })
    );

    // Create a set of sub-issue numbers for filtering
    const subIssueNumbers = new Set();
    issuesWithSubIssues.forEach(issue => {
      issue.sub_issues.forEach(si => subIssueNumbers.add(si.number));
    });

    // Mark issues that are sub-issues
    const enrichedIssues = issuesWithSubIssues.map(issue => ({
      ...issue,
      is_sub_issue: subIssueNumbers.has(issue.number),
      parent_issue_number: null // Could be enhanced by finding parent from subIssues arrays
    }));

    return json({
      milestones,
      issues: enrichedIssues
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
