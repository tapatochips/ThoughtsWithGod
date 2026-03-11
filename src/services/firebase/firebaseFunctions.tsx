import { getFunctions, httpsCallable, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { firebaseInstance } from './firebaseReactNative';

// Initialize Firebase Functions
let functions: Functions | null = null;

if (firebaseInstance.app) {
  functions = getFunctions(firebaseInstance.app);

  // Only connect to the local emulator when explicitly opted in via env var.
  // Do NOT auto-connect in development — the app should hit real Firebase
  // unless you are actively running `firebase emulators:start`.
  if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
    try {
      if (functions) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
        if (__DEV__) console.log('Connected to Functions emulator');
      }
    } catch (error) {
      console.error('Failed to connect to Functions emulator:', error);
    }
  }
} else {
  console.error('Firebase app is not initialized. Functions will not work.');
}

export { functions, httpsCallable };