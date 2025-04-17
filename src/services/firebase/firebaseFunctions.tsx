import { getFunctions, httpsCallable, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { firebaseInstance } from './firebaseConfig';

// Initialize Firebase Functions
let functions: Functions | null = null;

if (firebaseInstance.app) {
  functions = getFunctions(firebaseInstance.app);
  
  // If in development environment, connect to functions emulator
  if (process.env.NODE_ENV === 'development') {
    try {
      // Connect to the local emulator if running locally
      if (functions) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log('Connected to Functions emulator');
      }
    } catch (error) {
      console.error('Failed to connect to Functions emulator:', error);
    }
  }
} else {
  console.error('Firebase app is not initialized. Functions will not work.');
}

export { functions, httpsCallable };