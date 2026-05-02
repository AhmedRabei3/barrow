// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqCAr3Fwp08rCmCnOTY97u1LMR8T_ICXg",
  authDomain: "mashhoor-afea3.firebaseapp.com",
  projectId: "mashhoor-afea3",
  storageBucket: "mashhoor-afea3.appspot.com",
  messagingSenderId: "827380921960",
  appId: "1:827380921960:web:7eb34bce891a9ff6652ddd",
  measurementId: "G-R1419C6D9F",
};

const app = initializeApp(firebaseConfig);

// Firebase Auth (لـ custom token sign-in)
export const firebaseAuth = getAuth(app);

// Firestore (للدردشة)
export const db = getFirestore(app);

// FCM (لـ Push Notification)
export const messaging =
  typeof window !== "undefined" && "serviceWorker" in navigator
    ? getMessaging(app)
    : null;

export { getToken, onMessage };
