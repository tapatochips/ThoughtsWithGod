import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import VerseDisplay from './VerseDisplay';
import AuthScreen from './AuthScreen';
import FavoritesScreen from './FavoritesScreen';
import { useFirebase } from './FirebaseContext';
import { User } from 'firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ErrorBoundary from './ErrorBoundary';  
const Stack = createStackNavigator();

const App = () => {
    const { auth, firebaseInstance, user } = useFirebase();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // we just need to check if Firebase is initialized
        if (firebaseInstance.isAppInitialized()) {
            setIsLoading(false);
        } else {
            console.log("Waiting for Firebase to initialize...");
            //add a timeout here in case Firebase never initializes
            const timeoutId = setTimeout(() => {
                setError("Firebase initialization timeout");
                setIsLoading(false);
            }, 10000); // 10 second timeout
            
            return () => clearTimeout(timeoutId);
        }
    }, [firebaseInstance]);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator />
                <Text>Loading Application...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text>{error}</Text>
            </View>
        );
    }

    return (
        <ErrorBoundary>
            <NavigationContainer>
                <Stack.Navigator>
                    {user ? (
                        <>
                            <Stack.Screen name="VerseDisplay" component={VerseDisplay} />
                            <Stack.Screen name="Favorites" component={FavoritesScreen} />
                        </>
                    ) : (
                        <Stack.Screen name="Auth" component={AuthScreen} />
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </ErrorBoundary>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default App;