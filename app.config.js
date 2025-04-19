const getEnvironment = () => {
  return {
    FIREBASE_API_KEY: "AIzaSyDfU8MvzvZpegiIdf11OTQ4WDSjqfGtknE",
    FIREBASE_AUTH_DOMAIN: "thoughtswithgod-a5a08.firebaseapp.com",
    FIREBASE_PROJECT_ID: "thoughtswithgod-a5a08",
    FIREBASE_STORAGE_BUCKET: "thoughtswithgod-a5a08.firebasestorage.app",
    FIREBASE_MESSAGING_SENDER_ID: "307700418079",
    FIREBASE_APP_ID: "1: 307700418079:web:dfb49050b7113ef51f772a",
    FIREBASE_MEASUREMENT_ID: "G-ZRLXCYP3S2",
    
    // RevenueCat API keys
    REVENUECAT_API_KEY_IOS: "YOUR_REVENUECAT_IOS_API_KEY",
    REVENUECAT_API_KEY_ANDROID: "YOUR_REVENUECAT_ANDROID_API_KEY",
  };
};

module.exports = {
  name: "ThoughtsWithGod",
  slug: "ThoughtsWithGod",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yourdomain.thoughtswithgod"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.yourdomain.thoughtswithgod"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: getEnvironment()
  // No plugins needed
};