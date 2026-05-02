import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const FALLBACK_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mashhoor-afea3";
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || FALLBACK_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
);

const hasServiceAccountCredentials = Boolean(
  FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY,
);

const hasApplicationDefaultCredentialsHint = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.K_SERVICE,
);

export const isFirebaseAdminConfigured =
  hasServiceAccountCredentials || hasApplicationDefaultCredentialsHint;

export const firebaseAdminSetupHint =
  "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.";

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (hasServiceAccountCredentials) {
    return initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY,
      }),
    });
  }

  // Provide projectId to avoid "Unable to detect a Project Id" in local environments.
  if (FIREBASE_PROJECT_ID) {
    return initializeApp({
      projectId: FIREBASE_PROJECT_ID,
    });
  }

  return initializeApp();
};

const adminApp = initializeFirebaseAdmin();

export const adminFirestore = getFirestore(adminApp);
export const adminMessaging = getMessaging(adminApp);
export const adminAuth = getAuth(adminApp);
