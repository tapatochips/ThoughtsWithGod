import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { FirebaseApp } from "firebase/app";
import { Firestore } from "firebase/firestore";
import { Auth, User, onAuthStateChanged } from "firebase/auth";
import { firebaseInstance } from './firebaseConfig';

interface FirebaseContextType {
    app: FirebaseApp | null;
    auth: Auth | null;
    db: Firestore | null;
    firebaseInstance: typeof firebaseInstance;
    user: User | null;
}

interface FirebaseProviderProps {
    children: ReactNode;
}

const FirebaseContext = createContext<FirebaseContextType>({
    app: null,
    auth: null,
    db: null,
    firebaseInstance: firebaseInstance,
    user: null
});

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
    console.log("FirebaseProvider rendered");
    const [user, setUser] = useState<User | null>(firebaseInstance.auth?.currentUser || null);

    useEffect(() => {
        if (!firebaseInstance.auth) {
            console.log("Auth not initialized in FirebaseProvider");
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

    const value: FirebaseContextType = {
        app: firebaseInstance.app,
        auth: firebaseInstance.auth,
        db: firebaseInstance.db,
        firebaseInstance: firebaseInstance,
        user: user
    };

    console.log("FirebaseProvider value:", { 
        appInitialized: !!value.app, 
        authInitialized: !!value.auth, 
        dbInitialized: !!value.db,
        userEmail: value.user?.email
    });

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