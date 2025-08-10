import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { FirebaseApp } from "firebase/app";
import { Firestore } from "firebase/firestore";
import { Auth, User, onAuthStateChanged } from "firebase/auth";
import { firebaseInstance } from './firebaseReactNative';
import {
  UserProfile,
  createUserProfile,
  getUserProfile,
  checkPremiumStatus,
  getPremiumDetails
} from './userProfile';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  firebaseInstance: typeof firebaseInstance;
  user: User | null;
  userProfile: UserProfile | null;
  refreshUserProfile: () => Promise<void>;
  isLoading: boolean;
  // Premium status properties
  isPremiumUser: boolean;
  premiumPlan: string | null;
  premiumExpiry: Date | null;
  refreshPremiumStatus: () => Promise<void>;
}

interface FirebaseProviderProps {
  children: ReactNode;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  db: null,
  firebaseInstance: firebaseInstance,
  user: null,
  userProfile: null,
  refreshUserProfile: async () => { },
  isLoading: true,
  isPremiumUser: false,
  premiumPlan: null,
  premiumExpiry: null,
  refreshPremiumStatus: async () => { }
});

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
  console.log("FirebaseProvider rendered");
  const [user, setUser] = useState<User | null>(firebaseInstance.auth?.currentUser || null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Premium status state
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [premiumExpiry, setPremiumExpiry] = useState<Date | null>(null);

  // Function to check premium status
  const checkUserPremiumStatus = async (userId: string) => {
    try {
      // Get premium details
      const premiumDetails = await getPremiumDetails(userId);

      if (premiumDetails && premiumDetails.isPremium) {
        setIsPremiumUser(true);
        setPremiumPlan(premiumDetails.plan || null);
        setPremiumExpiry(premiumDetails.expiryDate || null);
      } else {
        setIsPremiumUser(false);
        setPremiumPlan(null);
        setPremiumExpiry(null);
      }
    } catch (error) {
      console.error("Error checking premium status:", error);
      setIsPremiumUser(false);
      setPremiumPlan(null);
      setPremiumExpiry(null);
    }
  };

  // Fetch user profile whenever user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && firebaseInstance.db) {
        try {
          // Create profile if it doesn't exist, or get existing one
          const profile = await createUserProfile(user);
          setUserProfile(profile);

          // Check premium status
          await checkUserPremiumStatus(user.uid);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
        setIsPremiumUser(false);
        setPremiumPlan(null);
        setPremiumExpiry(null);
      }
      setIsLoading(false);
    };

    fetchUserProfile();
  }, [user]);

  // Set up auth state listener
  useEffect(() => {
    if (!firebaseInstance.auth) {
      console.log("Auth not initialized in FirebaseProvider");
      setIsLoading(false);
      return;
    }

    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(firebaseInstance.auth, (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email);
      setUser(firebaseUser);
    });

    // Clean up listener on unmount
    return () => {
      console.log("Cleaning up auth state listener");
      unsubscribe();
    };
  }, [firebaseInstance.auth]);

  // Function to manually refresh user profile
  const refreshUserProfile = async () => {
    if (user && firebaseInstance.db) {
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);

          // Also refresh premium status
          await checkUserPremiumStatus(user.uid);
        }
      } catch (error) {
        console.error("Error refreshing user profile:", error);
      }
    }
  };

  // Function to manually refresh premium status only
  const refreshPremiumStatus = async () => {
    if (user) {
      await checkUserPremiumStatus(user.uid);
    }
  };

  const value: FirebaseContextType = {
    app: firebaseInstance.app,
    auth: firebaseInstance.auth,
    db: firebaseInstance.db,
    firebaseInstance: firebaseInstance,
    user,
    userProfile,
    refreshUserProfile,
    isLoading,
    isPremiumUser,
    premiumPlan,
    premiumExpiry,
    refreshPremiumStatus
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};