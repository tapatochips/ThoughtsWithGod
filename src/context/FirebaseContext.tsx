// src/context/FirebaseContext.tsx
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { FirebaseApp } from "firebase/app";
import { Firestore, collection, onSnapshot } from "firebase/firestore";
import { Auth, User, onAuthStateChanged } from "firebase/auth";
import { firebaseInstance } from '../services/firebase/firebaseReactNative';
import {
    UserProfile,
    createUserProfile,
    getUserProfile,
    getPremiumDetails
} from '../services/firebase/userProfile';

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
    // Moderation
    blockedUserIds: string[];
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
    refreshPremiumStatus: async () => { },
    blockedUserIds: [],
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

    // Blocked users state
    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

    // Function to check premium status
    const checkUserPremiumStatus = async (userId: string) => {
        try {
            // Get premium details from user profile or subscription
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

    // Listen for blocked users in real time
    useEffect(() => {
        if (!user || !firebaseInstance.db) {
            setBlockedUserIds([]);
            return;
        }
        const blockedCollection = collection(firebaseInstance.db, `users/${user.uid}/blockedUsers`);
        const unsubscribe = onSnapshot(blockedCollection, (snapshot) => {
            setBlockedUserIds(snapshot.docs.map(d => d.id));
        }, (error) => {
            console.error('Error fetching blocked users:', error);
        });
        return unsubscribe;
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
        refreshPremiumStatus,
        blockedUserIds,
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