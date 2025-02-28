import React, { createContext, useContext, ReactNode } from 'react';
import { app, auth, db, firebaseInstance } from './firebaseConfig';
import FirebaseApp from './firebaseConfig';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import Firebase from './firebaseConfig';

interface FirebaseContextType {
    app: FirebaseApp | null;
    auth: Auth | null;
    db: Firestore | null;
    firebaseInstance: Firebase | null;
}

interface FirebaseProviderProps {
    children?: ReactNode;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
    const value: FirebaseContextType = {
        app,
        auth,
        db,
        firebaseInstance,
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