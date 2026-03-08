import express from 'express';
import { SignJWT } from 'jose';
import { OAuth2Client } from 'google-auth-library';
import { authRequired } from '../middleware/auth.js';
import { createGoogleUserIfMissing, createUser, getUserById, validateUser } from '../services/userStore.js';

const router = express.Router();

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-change-this-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const encoder = new TextEncoder();
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const user = await createUser({ email, password, name });
    const token = await signToken(user);
    return res.status(201).json({ user, token });
  } catch (e) {
    if (e?.message === 'User already exists') {
      return res.status(409).json({ message: 'Account already exists for this email.' });
    }
    console.error('[auth/signup] error:', e);
    return res.status(500).json({ message: 'Failed to create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await validateUser(email, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = await signToken(user);
    return res.json({ user, token });
  } catch (e) {
    console.error('[auth/login] error:', e);
    return res.status(500).json({ message: 'Failed to login.' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }
    if (!googleClient || !GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: 'Google OAuth is not configured on server.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) {
      return res.status(400).json({ message: 'Google account email not available.' });
    }

    const user = await createGoogleUserIfMissing({
      email,
      name: payload?.name || ''
    });
    const token = await signToken(user);
    return res.json({ user, token });
  } catch (e) {
    console.error('[auth/google] error:', e);
    return res.status(401).json({ message: 'Google authentication failed.' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await getUserById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({ user });
  } catch (e) {
    console.error('[auth/me] error:', e);
    return res.status(500).json({ message: 'Failed to fetch profile.' });
  }
});

async function signToken(user) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name || ''
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('doclarity-local-auth')
    .setAudience('doclarity-client')
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encoder.encode(JWT_SECRET));
}

export default router;
