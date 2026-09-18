import crypto from 'crypto';
import { admin, db } from './firebase.js';

const tokenTtlSeconds = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 12);
const authSecret = process.env.AUTH_SECRET || 'development-auth-secret-change-me';

const roleAliases = {
  pending: 'pending',
  pending_role: 'pending',
  'pending-role': 'pending',
  receptionist: 'receptionist',
  resepsionis: 'receptionist',
  admin: 'admin',
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  'super-admin': 'super_admin'
};

export const roles = {
  pending: 'pending',
  receptionist: 'receptionist',
  admin: 'admin',
  superAdmin: 'super_admin'
};

export async function authenticateGoogleUser(idToken) {
  if (!idToken) return null;

  let payload;
  try {
    payload = await admin.auth().verifyIdToken(idToken);
  } catch {
    return null;
  }

  const email = String(payload?.email || '').trim().toLowerCase();

  if (!email || payload?.email_verified === false) return null;

  const configuredUser = await getGoogleAuthUser(email);
  if (!configuredUser) {
    return toPublicUser({
      id: payload.uid || email,
      name: payload.name || email,
      email,
      role: roles.pending
    });
  }

  return toPublicUser({
    ...configuredUser,
    id: configuredUser.id || payload.uid || email,
    name: configuredUser.name || payload.name || email
  });
}

export function createAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: normalizeRole(user.role),
    iat: now,
    exp: now + tokenTtlSeconds
  };

  return signToken(payload);
}

export function verifyAuthToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

    const user = getGoogleAuthUsers().find((candidate) => candidate.id === payload.sub || candidate.email === payload.email);
    if (!user) {
      const tokenRole = normalizeRole(payload.role);
      if (!tokenRole || !payload.email) return null;

      return toPublicUser({
        id: payload.sub || payload.email,
        name: payload.name || payload.email,
        email: payload.email,
        role: tokenRole
      });
    }

    return toPublicUser({ ...user, role: payload.role || user.role });
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  const user = verifyAuthToken(token);

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(allowedRoles) {
  const normalizedRoles = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!normalizedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action' });
      return;
    }

    next();
  };
}

function getGoogleAuthUsers() {
  if (process.env.AUTH_GOOGLE_USERS_JSON) {
    try {
      const parsedUsers = JSON.parse(process.env.AUTH_GOOGLE_USERS_JSON);
      if (Array.isArray(parsedUsers) && parsedUsers.length) {
        return parsedUsers.map(normalizeGoogleUser).filter(Boolean);
      }
    } catch (err) {
      console.warn('Failed to parse AUTH_GOOGLE_USERS_JSON. Google admin allowlist is empty.', err);
    }
  }

  return [];
}

async function getGoogleAuthUser(email) {
  const configuredUser = getGoogleAuthUsers().find((candidate) => candidate.email === email);
  if (configuredUser) return configuredUser;

  return getFirestoreAuthUser(email);
}

async function getFirestoreAuthUser(email) {
  try {
    const adminUserSnap = await db.collection('admin_users').doc(safeFirestoreId(email)).get();
    if (adminUserSnap.exists) {
      const user = normalizeGoogleUser({
        ...adminUserSnap.data(),
        email
      });

      if (user && isActiveAdminStatus(adminUserSnap.data()?.status)) return user;
    }

    const requestSnap = await db.collection('role_requests').doc(safeFirestoreId(email)).get();
    if (requestSnap.exists && isApprovedRequestStatus(requestSnap.data()?.status)) {
      return normalizeGoogleUser({
        email,
        name: requestSnap.data()?.name,
        role: requestSnap.data()?.requestedRole
      });
    }
  } catch (err) {
    console.warn('Failed to load Google admin role from Firestore.', err);
  }

  return null;
}

function normalizeGoogleUser(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  const role = normalizeRole(user?.role);
  if (!email || !role) return null;

  return {
    id: String(user.id || email),
    name: String(user.name || email),
    email,
    role
  };
}

function normalizeRole(role) {
  return roleAliases[String(role || '').trim().toLowerCase()] || '';
}

function isActiveAdminStatus(status) {
  const value = String(status || 'active').trim().toLowerCase();
  return ['active', 'approved', 'success', 'succes'].includes(value);
}

function isApprovedRequestStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  return ['approved', 'success', 'succes', 'accepted', 'active'].includes(value);
}

function safeFirestoreId(value) {
  return String(value || '').trim().toLowerCase().replace(/\//g, '_');
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role)
  };
}

function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(`${encodedHeader}.${encodedPayload}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function sign(value) {
  return crypto.createHmac('sha256', authSecret).update(value).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  return type?.toLowerCase() === 'bearer' ? token : '';
}
