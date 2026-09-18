import { createDemoDataStore } from './demoDataStore.js';
import { createFirestoreDataStore } from './firestoreDataStore.js';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const servicesDir = join(process.cwd(), 'server', 'services');

const hasFirebaseConfig = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) ||
  hasLocalFirebaseServiceAccount()
);
export const isDemoMode = process.env.DEMO_MODE === 'true' || (process.env.DEMO_MODE !== 'false' && !hasFirebaseConfig);

if (isDemoMode) {
  console.log('Backend running in DEMO_MODE with in-memory data.');
}

export const dataStore = isDemoMode
  ? createDemoDataStore()
  : createFirestoreDataStore();

function hasLocalFirebaseServiceAccount() {
  if (!existsSync(servicesDir)) return false;

  return readdirSync(servicesDir).some((fileName) => (
    fileName.endsWith('.json') && fileName.includes('firebase-adminsdk')
  ));
}
