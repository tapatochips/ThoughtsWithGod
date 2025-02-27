import { registerRootComponent } from 'expo';
import React from 'react';
import App from './App';
import { FirebaseProvider } from './FirebaseContext';

const Root = () => (
    <FirebaseProvider>
        <App />
    </FirebaseProvider>
);

registerRootComponent(Root);