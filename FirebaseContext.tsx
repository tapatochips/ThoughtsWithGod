import React, { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from "firebase/app";
import { Firestore } from "firebase/firestore";
import { Auth } from "firebase/auth";
import { firebaseInstance } from './firebaseConfig';
import { User } from 'firebase/auth'

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

    const value: FirebaseContextType = {
        app: firebaseInstance.app,
        auth: firebaseInstance.auth,
        db: firebaseInstance.db,
        firebaseInstance: firebaseInstance,
        user: firebaseInstance.auth?.currentUser || null
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