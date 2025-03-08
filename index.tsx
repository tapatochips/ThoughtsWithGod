import { registerRootComponent } from 'expo';
import React from 'react';
import App from './App';
import { FirebaseProvider } from './src/context/FirebaseContext';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { withDevTools } from 'expo/devtools';
import Constants from 'expo-constants';

const Root = () => (
    <ErrorBoundary>
        <FirebaseProvider>
            <App />
        </FirebaseProvider>
    </ErrorBoundary>
);

let RootComponent = Root;

if (__DEV__ && Constants.expoConfig?.debuggerHost) {
    RootComponent = withDevTools(Root);
}

registerRootComponent(RootComponent);