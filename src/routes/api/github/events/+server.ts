import { json } from '@sveltejs/kit';
import { GITHUB_PAT, GITHUB_REPO } from '$lib/server/config';

export async function GET({ locals }) {
  if (!locals.user) {
    return json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const [owner, repo] = GITHUB_REPO.split('/');

    // Récupérer les événements du repository (issues, comments, commits, etc.)
    const eventsResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/events?per_page=100`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${GITHUB_PAT}`,
          'User-Agent': 'SvelteKit-Project-Tracker'
        }
      }
    );

    if (!eventsResponse.ok) {
      const errorBody = await eventsResponse.text();
      console.error('GitHub API Error Details:', {
        status: eventsResponse.status,
        statusText: eventsResponse.statusText,
        body: errorBody
      });
      throw new Error(`Erreur lors de la récupération des événements: ${eventsResponse.status}`);
    }

    const events = await eventsResponse.json();

    // Filtrer et transformer les événements pour garder seulement ceux pertinents
    const relevantEvents = events
      .filter(event => {
        // Garder seulement les types d'événements pertinents
        return [
          'IssuesEvent',
          'IssueCommentEvent',
          'PushEvent',
          'PullRequestEvent',
          'PullRequestReviewEvent',
          'PullRequestReviewCommentEvent'
        ].includes(event.type);
      })
      .map(event => {
        const baseEvent = {
          id: event.id,
          type: event.type,
          actor: event.actor.login,
          actor_avatar: event.actor.avatar_url,
          created_at: event.created_at,
          repo: event.repo.name
        };

        // Ajouter des détails spécifiques selon le type d'événement
        switch (event.type) {
          case 'IssuesEvent':
            return {
              ...baseEvent,
              action: event.payload.action,
              issue_number: event.payload.issue.number,
              issue_title: event.payload.issue.title,
              issue_state: event.payload.issue.state,
              description: `${event.payload.action === 'opened' ? 'Ouvert' : event.payload.action === 'closed' ? 'Fermé' : 'Modifié'} l'issue #${event.payload.issue.number}: ${event.payload.issue.title}`
            };

          case 'IssueCommentEvent':
            return {
              ...baseEvent,
              action: event.payload.action,
              issue_number: event.payload.issue.number,
              issue_title: event.payload.issue.title,
              comment_body: event.payload.comment.body,
              description: `Commenté sur l'issue #${event.payload.issue.number}: ${event.payload.issue.title}`
            };

          case 'PushEvent':
            const commitCount = event.payload.commits?.length || 0;
            const commits = event.payload.commits?.slice(0, 3) || [];
            return {
              ...baseEvent,
              ref: event.payload.ref,
              commit_count: commitCount,
              commits: commits.map(c => ({
                sha: c.sha.substring(0, 7),
                message: c.message
              })),
              description: `Pushed ${commitCount} commit${commitCount > 1 ? 's' : ''} vers ${event.payload.ref}`
            };

          case 'PullRequestEvent':
            return {
              ...baseEvent,
              action: event.payload.action,
              pr_number: event.payload.number,
              pr_title: event.payload.pull_request.title,
              pr_state: event.payload.pull_request.state,
              description: `${event.payload.action === 'opened' ? 'Ouvert' : event.payload.action === 'closed' ? 'Fermé' : 'Modifié'} la PR #${event.payload.number}: ${event.payload.pull_request.title}`
            };

          case 'PullRequestReviewEvent':
            return {
              ...baseEvent,
              action: event.payload.action,
              pr_number: event.payload.pull_request.number,
              pr_title: event.payload.pull_request.title,
              review_state: event.payload.review.state,
              description: `Review ${event.payload.review.state} sur la PR #${event.payload.pull_request.number}`
            };

          case 'PullRequestReviewCommentEvent':
            return {
              ...baseEvent,
              action: event.payload.action,
              pr_number: event.payload.pull_request.number,
              pr_title: event.payload.pull_request.title,
              comment_body: event.payload.comment.body,
              description: `Commenté sur la PR #${event.payload.pull_request.number}`
            };

          default:
            return baseEvent;
        }
      });

    return json({ events: relevantEvents });
  } catch (error) {
    console.error('GitHub API error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
