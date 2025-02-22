import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import Constants from 'expo-constants';

const firebaseConfig = {
    apiKey: Constants.expoConfig?.extra.FIREBASE_API_KEY || Constants.manifest?.extra.FIREBASE_API_KEY,
    authDomain: Constants.expoConfig?.extra.FIREBASE_AUTH_DOMAIN || Constants.manifest?.extra.FIREBASE_AUTH_DOMAIN,
    projectId: Constants.expoConfig?.extra.FIREBASE_PROJECT_ID || Constants.manifest?.extra.FIREBASE_PROJECT_ID,
    storageBucket: Constants.expoConfig?.extra.FIREBASE_STORAGE_BUCKET || Constants.manifest?.extra.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: Constants.expoConfig?.extra.FIREBASE_MESSAGING_SENDER_ID || Constants.manifest?.extra.FIREBASE_MESSAGING_SENDER_ID,
    appId: Constants.expoConfig?.extra.FIREBASE_APP_ID || Constants.manifest?.extra.FIREBASE_APP_ID,
    measurementId: Constants.expoConfig?.extra.FIREBASE_MEASUREMENT_ID || Constants.manifest?.extra.FIREBASE_MEASUREMENT_ID,
};

// Log the config for debugging (remove in production)
console.log("Firebase Config:", firebaseConfig);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

let analytics = null;
if (isSupported()) {
    analytics = getAnalytics(app);
} else {
    console.warn("Firebase analytics is not supported.");
}

export { app, analytics, db, auth };