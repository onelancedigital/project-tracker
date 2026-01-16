import { redirect } from '@sveltejs/kit';
import { verifyAuthToken, generateAuthToken } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const token = url.searchParams.get('token');

  if (!token) {
    throw redirect(302, '/auth/login');
  }

  const payload = verifyAuthToken(token);

  if (!payload || typeof payload === 'string' || payload.type !== 'magic-link') {
    throw redirect(302, '/auth/login');
  }

  // Generate a long-lived authentication token
  const authToken = generateAuthToken(payload.email as string);
  
  // Set the cookie
  cookies.set('auth_token', authToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30 // 30 jours
  });

  throw redirect(302, '/');
};
