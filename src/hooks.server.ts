import { verifyAuthToken } from '$lib/server/auth';

export async function handle({ event, resolve }) {
  const token = event.cookies.get('auth_token');

  if (token) {
    const payload = verifyAuthToken(token);
    if (payload && typeof payload !== 'string') {
      event.locals.user = { email: payload.email as string };
    }
  }

  return resolve(event);
}
