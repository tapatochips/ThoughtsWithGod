import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import VerseDisplay from './VerseDisplay';
import AuthScreen from './AuthScreen';
import FavoritesScreen from './FavoritesScreen';
import { useFirebase } from './FirebaseContext'; // Import useFirebase
import { User } from 'firebase/auth'; // Import User type
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';


const Stack = createStackNavigator();

const App = () => {
  const { auth, firebaseInstance } = useFirebase(); // Access auth and firebaseInstance
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseInstance.isAuthInitialized() && auth) { // Use firebaseInstance and check auth
      const unsubscribe = auth.onAuthStateChanged(
        (currentUser: User | null) => { // Specify the type of currentUser
          setUser(currentUser);
          setIsLoading(false);
        },
        (error) => {
          console.error("Auth state change error:", error);
          setError("Failed to authenticate");
          setIsLoading(false);
        }
      );
      return unsubscribe;
    } else {
      setIsLoading(false); // Stop loading even if not initialized
    }
  }, [auth, firebaseInstance]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text>Loading Authentication...</Text>
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
    <View> {/* View as a wrapper */}
      <NavigationContainer>
        <Stack.Navigator>
          {user ? (
            <>
              <Stack.Screen name="VerseDisplay">
                {(props) => <VerseDisplay {...props} user={user} />}
              </Stack.Screen>
              <Stack.Screen name="Favorites" component={FavoritesScreen} />
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
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