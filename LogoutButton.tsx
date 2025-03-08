import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import { useFirebase } from './FirebaseContext';
import { signOut } from 'firebase/auth';

interface LogoutButtonProps {
  onLogout?: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
  const { auth } = useFirebase();

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        console.log('User signed out successfully');
        if (onLogout) {
          onLogout();
        }
      } else {
        console.error('Auth instance is not available');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={handleLogout} color="#dc3545" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
});

export default LogoutButton;