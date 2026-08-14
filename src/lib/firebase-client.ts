"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken,
  type AppCheck,
} from "firebase/app-check";

/**
 * Browser-side Firebase + App Check initialization.
 *
 * Required env vars (all NEXT_PUBLIC_*):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY   (reCAPTCHA v3 site key registered in App Check)
 *
 * Optional:
 *   NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN  — when set in dev, enables App
 *     Check debug mode and uses this token (must also be registered in
 *     Firebase Console → App Check → Apps → Manage debug tokens).
 */

let cachedApp: FirebaseApp | null = null;
let cachedAppCheck: AppCheck | null = null;

function ensureApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  cachedApp = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  return cachedApp;
}

function ensureAppCheck(): AppCheck {
  if (cachedAppCheck) return cachedAppCheck;

  // Wire up debug token BEFORE initializeAppCheck (Firebase requirement).
  //
  // Two-phase flow for local dev:
  //   Phase 1 (first run, no token yet):
  //     Set window.FIREBASE_APPCHECK_DEBUG_TOKEN = true → Firebase generates a
  //     UUID and prints it to DevTools console as:
  //       "App Check debug token: <UUID>"
  //     Copy that UUID, register it in Firebase Console →
  //       App Check → Apps → your web app → ⋮ → Manage debug tokens → Add.
  //     Then paste it into .env.local as NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN.
  //
  //   Phase 2 (env var set):
  //     Use the specific UUID so every dev session reuses the same registered token.
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    type DebugWindow = { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | true };
    const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
    // If a specific token is already saved, use it; otherwise set `true` so
    // Firebase auto-generates one and logs it to the console.
    (window as unknown as DebugWindow).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken ?? true;
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY is not set — App Check cannot be initialized.",
    );
  }

  cachedAppCheck = initializeAppCheck(ensureApp(), {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return cachedAppCheck;
}

/** Returns a fresh App Check token for the current browser session. */
export async function getAppCheckToken(): Promise<string> {
  // Allow skipping App Check on Preview/UAT environments where the
  // dynamically-generated Vercel domain cannot be registered with reCAPTCHA.
  if (process.env.NEXT_PUBLIC_SKIP_APPCHECK === "1") {
    return "";
  }
  const { token } = await getToken(ensureAppCheck(), /* forceRefresh */ false);
  return token;
}
