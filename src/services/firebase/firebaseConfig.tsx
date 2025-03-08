import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { Auth } from "firebase/auth";
import Constants from 'expo-constants';
import { setLogLevel } from "firebase/firestore";


export class Firebase {
  app: FirebaseApp | null = null;
  db: Firestore | null = null; // Initialize db as null
  auth: Auth | null = null;

  constructor() {
    console.log("Firebase constructor called");
    console.log("Firebase.instance", Firebase.instance);
    if (Firebase.instance) {
      return Firebase.instance;
    }
    const firebaseConfig = {
      apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY,
      authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN,
      projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID,
      storageBucket: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID, // Corrected typo
      appId: Constants.expoConfig?.extra?.FIREBASE_APP_ID,
      measurementId: Constants.expoConfig?.extra?.FIREBASE_MEASUREMENT_ID,
    };

    if (!firebaseConfig.apiKey) {
      throw new Error("Firebase configuration is missing");
    }

    if (getApps().length === 0) {
      this.app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized:", this.app);
    } else {
      this.app = getApps()[0];
      console.log("Firebase app already initialized:", this.app);
    }

    if (this.app) { // Initialize db only after app is initialized
      this.db = getFirestore(this.app);
    } else {
      console.error("Firebase app not initialized. Firestore cannot be initialized.");
    }

    Firebase.instance = this;
  }

  static instance: Firebase | null = null;

  isAppInitialized() {
    return !!this.app;
  }

  isDbInitialized() {
    return !!this.db;
  }
}

const firebase = new Firebase();

setLogLevel("debug");

console.log("end of firebase config");

export const db: Firestore | null = firebase.db; // Export as nullable
export const firebaseInstance = firebase;
export default Firebase;