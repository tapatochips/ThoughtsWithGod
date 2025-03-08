import { initializeAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firebaseAuth from 'firebase/auth';
import { firebaseInstance } from './firebaseConfig';

console.log("firebaseReactNative.tsx: Start");

const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;

console.log("firebaseReactNative.tsx: firebaseInstance.app", firebaseInstance.app);
console.log("firebaseReactNative.tsx: AsyncStorage", AsyncStorage);

firebaseInstance.auth = null; // Initialize auth as null

if (firebaseInstance.app) {
    console.log("firebaseInstance.app is initialized");
    try {
        firebaseInstance.auth = initializeAuth(firebaseInstance.app, {
            persistence: reactNativePersistence(AsyncStorage),
        });
        console.log("Auth initialized:", firebaseInstance.auth);
    } catch (error) {
        console.error("Error initializing auth:", error);
    }
} else {
    console.error("Firebase app is not initialized. Authentication will not work.");
}

console.log("firebaseReactNative.tsx: End");

export const auth: Auth | null = firebaseInstance.auth;