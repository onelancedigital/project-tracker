import { env } from '$env/dynamic/private';

export const GITHUB_PAT = env.GITHUB_PAT || '';
export const GITHUB_REPO = env.GITHUB_REPO || 'owner/repo';
export const RESEND_API_KEY = env.RESEND_API_KEY || '';
export const RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL || 'no-reply@onelance.ch';
export const JWT_SECRET = env.JWT_SECRET || 'your-secret-key-change-this';
export const APP_URL = env.APP_URL || 'http://localhost:5173';
