import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { FirebaseApp } from "firebase/app";
import { Firestore } from "firebase/firestore";
import { Auth, User, onAuthStateChanged } from "firebase/auth";
import { firebaseInstance } from '../services/firebase/firebaseConfig'; // Adjust path
import { UserProfile, createUserProfile, getUserProfile } from '../services/firebase/userProfile';

interface FirebaseContextType {
    app: FirebaseApp | null;
    auth: Auth | null;
    db: Firestore | null;
    firebaseInstance: typeof firebaseInstance;
    user: User | null;
    userProfile: UserProfile | null;
    refreshUserProfile: () => Promise<void>;
    isLoading: boolean;
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
    refreshUserProfile: async () => {},
    isLoading: true
});

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
    console.log("FirebaseProvider rendered");
    const [user, setUser] = useState<User | null>(firebaseInstance.auth?.currentUser || null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch user profile whenever user changes
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user && firebaseInstance.db) {
                try {
                    // Create profile if it doesn't exist, or get existing one
                    const profile = await createUserProfile(user);
                    setUserProfile(profile);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            } else {
                setUserProfile(null);
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
                }
            } catch (error) {
                console.error("Error refreshing user profile:", error);
            }
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
        isLoading
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