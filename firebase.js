// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDfU8MvzvZpegiIdf11OTQ4WDSjqfGtknE",
    authDomain: "thoughtswithgod-a5a08.firebaseapp.com",
    projectId: "thoughtswithgod-a5a08",
    storageBucket: "thoughtswithgod-a5a08.firebasestorage.app",
    messagingSenderId: "307700418079",
    appId: "1:307700418079:web:dfb49050b7113ef51f772a",
    measurementId: "G-ZRLXCYP3S2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)  // Use AsyncStorage for persistence
})

let analytics = null;
if (isSupported()) {
    analytics = getAnalytics(app);
} else {
    console.warn("Firebase analytics is not supported.")
}

// Export the initialized Firebase app and Firestore database

export { app, analytics, db, auth };
//const analytics = getAnalytics(app);