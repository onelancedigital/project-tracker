import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config';
import allowedEmailsData from '../../config/allowedEmails.json';

const allowedEmails = allowedEmailsData.allowedEmails;

export function isEmailAllowed(email) {
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
