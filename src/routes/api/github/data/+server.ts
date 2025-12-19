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
      // Extract project status
      let projectStatus = null;
      if (issue.projectItems?.nodes?.length > 0) {
        const projectItem = issue.projectItems.nodes[0];
        const statusField = projectItem.fieldValues?.nodes?.find(
          field => field.field?.name === 'Status'
        );
        if (statusField) {
          projectStatus = statusField.name;
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
        project_status: projectStatus // Nouveau champ avec le statut du projet
      };
    });

    return json({
      milestones,
      issues
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
