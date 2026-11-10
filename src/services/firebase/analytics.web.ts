import { FirebaseApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

// Web version of analytics.ts. Starts Google Analytics for the web app, using
// the measurementId in the Firebase config.
export function initAnalytics(app: FirebaseApp): void {
  getAnalytics(app);
}
