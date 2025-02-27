import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth,indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

class Firebase {
    app: any | null = null;
    auth: any | null = null;
    db: any | null = null;

    constructor() {
        if (Firebase.instance) {
            return Firebase.instance;
        }

        const firebaseConfig = {
            apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY,
            authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN,
            projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID,
            storageBucket: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID,
            appId: Constants.expoConfig?.extra?.FIREBASE_APP_ID,
            measurementId: Constants.expoConfig?.extra?.FIREBASE_MEASUREMENT_ID,
        };

        console.log("Constants.expoConfig:", Constants.expoConfig);
        console.log("Firebase Config:", firebaseConfig);

        if (!firebaseConfig.apiKey) {
            throw new Error("Firebase configuration is missing");
        }

        if (getApps().length === 0) {
            this.app = initializeApp(firebaseConfig);
        } else {
            this.app = getApps()[0];
        }

        this.auth = initializeAuth(this.app);
        this.auth.setPersistence(indexedDBLocalPersistence);
        this.db = getFirestore(this.app);

        Firebase.instance = this;
    }

    static instance: Firebase | null = null;

    isAppInitialized() { return !!this.app; }
    isAuthInitialized() { return !!this.auth; }
    isDbInitialized() { return !!this.db; }
}

const firebase = new Firebase();

export const app = firebase.app;
export const auth = firebase.auth;
export const db = firebase.db;
export const firebaseInstance = firebase;
export default Firebase;