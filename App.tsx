import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import VerseDisplay from './VerseDisplay';
import AuthScreen from './AuthScreen';
import FavoritesScreen from './FavoritesScreen';
import PrayerBoard from './PrayerBoard';
import { useFirebase } from './FirebaseContext';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ErrorBoundary from './ErrorBoundary';

const Stack = createStackNavigator();

const App = () => {
    const { firebaseInstance, user } = useFirebase();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (firebaseInstance.isAppInitialized()) {
            setIsLoading(false);
        } else {
            console.log("Waiting for Firebase to initialize...");
            const timeoutId = setTimeout(() => {
                setError("Firebase initialization timeout");
                setIsLoading(false);
            }, 10000);
            
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
                            <Stack.Screen 
                                name="VerseDisplay" 
                                component={VerseDisplay} 
                                options={{ title: "Daily Verse" }}
                            />
                            <Stack.Screen 
                                name="Favorites" 
                                component={FavoritesScreen} 
                                options={{ title: "My Favorites" }}
                            />
                            <Stack.Screen 
                                name="PrayerBoard" 
                                component={PrayerBoard} 
                                options={{ title: "Prayer Board" }}
                            />
                        </>
                    ) : (
                        <Stack.Screen 
                            name="Auth" 
                            component={AuthScreen}
                            options={{ title: "Sign In" }}
                        />
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