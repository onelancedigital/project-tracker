import { redirect } from '@sveltejs/kit';
import { verifyAuthToken, generateAuthToken } from '$lib/server/auth';

export async function load({ url, cookies }) {
  const token = url.searchParams.get('token');

  if (!token) {
    throw redirect(302, '/auth/login');
  }

  const payload = verifyAuthToken(token);

  if (!payload || payload.type !== 'magic-link') {
    throw redirect(302, '/auth/login');
  }

  // Générer un token d'authentification de longue durée
  const authToken = generateAuthToken(payload.email);
  
  // Définir le cookie
  cookies.set('auth_token', authToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30 // 30 jours
  });

  throw redirect(302, '/');
}
