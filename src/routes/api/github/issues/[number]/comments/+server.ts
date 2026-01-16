import { json } from '@sveltejs/kit';
import { GITHUB_PAT, GITHUB_REPO } from '$lib/server/config';

export async function GET({ locals, params }) {
  if (!locals.user) {
    return json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { number } = params;

  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SvelteKit-Project-Tracker'
    };

    if (GITHUB_PAT) {
      headers['Authorization'] = `token ${GITHUB_PAT}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${number}/comments`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Error fetching comments');
    }

    const comments = await response.json();
    return json(comments);
  } catch (error) {
    console.error('GitHub API error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
