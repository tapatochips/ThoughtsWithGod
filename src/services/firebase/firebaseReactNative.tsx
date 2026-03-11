import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

if (__DEV__) console.log("firebaseReactNative.tsx: Start");

// Firebase configuration object - using environment variables for security
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Firebase instance object to hold all Firebase services
export const firebaseInstance = {
  app: null as FirebaseApp | null,
  auth: null as Auth | null,
  db: null as Firestore | null,
  isAppInitialized: () => Boolean(firebaseInstance.app)
};

// Initialize Firebase App
try {
  if (__DEV__) console.log("Initializing Firebase app...");
  firebaseInstance.app = initializeApp(firebaseConfig);
  if (__DEV__) console.log("Firebase app initialized");
} catch (error) {
  console.error("Error initializing Firebase app:", error);
}

// Initialize Auth
if (firebaseInstance.app) {
  if (__DEV__) console.log("firebaseInstance.app is initialized");
  try {
    firebaseInstance.auth = getAuth(firebaseInstance.app);
    if (__DEV__) console.log("Auth initialized");
  } catch (error) {
    console.error("Error initializing auth:", error);
  }
} else {
  console.error("Firebase app is not initialized. Authentication will not work.");
}

// Initialize Firestore
if (firebaseInstance.app) {
  try {
    firebaseInstance.db = getFirestore(firebaseInstance.app);
    if (__DEV__) console.log("Firestore initialized");
  } catch (error) {
    console.error("Error initializing Firestore:", error);
  }
}

if (__DEV__) console.log("firebaseReactNative.tsx: End");

// Export individual services for convenience
export const app: FirebaseApp | null = firebaseInstance.app;
export const auth: Auth | null = firebaseInstance.auth;
export const db: Firestore | null = firebaseInstance.db;