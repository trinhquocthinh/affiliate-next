import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";

/**
 * Lazily initialize and return the Firebase Admin app singleton.
 *
 * Reads service account credentials from environment variables:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY  (newline-escaped \n is normalized)
 *
 * Re-uses an existing app if one is already initialized (important for
 * serverless cold starts and Next.js dev hot reload).
 */
let cachedApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    );
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cachedApp;
}

export function getFirebaseAppCheck() {
  return getAppCheck(getFirebaseAdminApp());
}
