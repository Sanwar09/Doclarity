import fs from 'fs/promises';
import path from 'path';
import { randomUUID, scryptSync, timingSafeEqual } from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export async function ensureUserStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, '[]', 'utf8');
  }
}

export async function createUser({ email, password, name = '' }) {
  await ensureUserStore();
  const users = await readUsers();
  const normalizedEmail = normalizeEmail(email);
  if (users.find((u) => u.email === normalizedEmail)) {
    throw new Error('User already exists');
  }

  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    name: String(name || '').trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await writeUsers(users);
  return sanitizeUser(user);
}

export async function createGoogleUserIfMissing({ email, name = '' }) {
  await ensureUserStore();
  const users = await readUsers();
  const normalizedEmail = normalizeEmail(email);
  let found = users.find((u) => u.email === normalizedEmail);
  if (!found) {
    found = {
      id: randomUUID(),
      email: normalizedEmail,
      name: String(name || '').trim(),
      passwordHash: '',
      provider: 'google',
      createdAt: new Date().toISOString()
    };
    users.push(found);
    await writeUsers(users);
  }
  return sanitizeUser(found);
}

export async function validateUser(email, password) {
  await ensureUserStore();
  const users = await readUsers();
  const normalizedEmail = normalizeEmail(email);
  const found = users.find((u) => u.email === normalizedEmail);
  if (!found) return null;
  if (!found.passwordHash) return null;
  if (!verifyPassword(password, found.passwordHash)) return null;
  return sanitizeUser(found);
}

export async function getUserById(id) {
  await ensureUserStore();
  const users = await readUsers();
  const found = users.find((u) => u.id === id);
  return found ? sanitizeUser(found) : null;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    createdAt: user.createdAt
  };
}

function hashPassword(password) {
  const salt = randomUUID().replace(/-/g, '');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, encoded) {
  const [salt, originalHash] = String(encoded || '').split(':');
  if (!salt || !originalHash) return false;
  const hashBuffer = Buffer.from(scryptSync(String(password), salt, 64).toString('hex'), 'utf8');
  const originalBuffer = Buffer.from(originalHash, 'utf8');
  if (hashBuffer.length !== originalBuffer.length) return false;
  return timingSafeEqual(hashBuffer, originalBuffer);
}

async function readUsers() {
  const raw = await fs.readFile(USERS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}
