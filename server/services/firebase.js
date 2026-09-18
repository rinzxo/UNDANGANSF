import admin from 'firebase-admin';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const servicesDir = join(process.cwd(), 'server', 'services');

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer
      .from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64')
      .toString('utf8');
    return JSON.parse(json);
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  const localServiceAccountPath = findLocalServiceAccountPath();
  if (localServiceAccountPath) {
    return JSON.parse(readFileSync(localServiceAccountPath, 'utf8'));
  }

  return null;
}

function findLocalServiceAccountPath() {
  if (!existsSync(servicesDir)) return null;

  const fileName = readdirSync(servicesDir).find((entry) => (
    entry.endsWith('.json') && entry.includes('firebase-adminsdk')
  ));

  return fileName ? join(servicesDir, fileName) : null;
}

const serviceAccount = getServiceAccount();

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
}

export const db = admin.firestore();
export { admin };
