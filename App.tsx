import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import VerseDisplay from './VerseDisplay';
import AuthScreen from './AuthScreen';
import { auth } from './firebase';
import { User } from 'firebase/auth';

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      {user ? (
        <VerseDisplay user={user}/>
      ) : (
        <AuthScreen />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


export default App;