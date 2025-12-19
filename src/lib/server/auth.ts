import jwt from 'jsonwebtoken';
import { JWT_SECRET, ALLOWED_EMAILS } from './config';

let allowedEmailsCache: string[] | null = null;

function getAllowedEmails(): string[] {
  if (!allowedEmailsCache) {
    allowedEmailsCache = ALLOWED_EMAILS.split(',').map(email => email.trim().toLowerCase());
  }
  return allowedEmailsCache;
}

export function isEmailAllowed(email) {
  const allowedEmails = getAllowedEmails();
  return allowedEmails.includes(email.toLowerCase());
}

export function generateAuthToken(email) {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function generateMagicLink(email) {
  const token = jwt.sign({ email, type: 'magic-link' }, JWT_SECRET, { expiresIn: '15m' });
  return token;
}
