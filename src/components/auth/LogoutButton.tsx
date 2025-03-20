import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFirebase } from '../../context/FirebaseContext';
import { useTheme } from '../../context/ThemeProvider';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

interface LogoutButtonProps {
  onLogout?: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
  const { auth } = useFirebase();
  const { theme } = useTheme();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    if (loading) return;
    
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: `${theme.colors.danger}15`,
          borderColor: theme.colors.danger
        }
      ]} 
      onPress={handleLogout}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.danger} />
      ) : (
        <>
          <Ionicons name="log-out-outline" size={16} color={theme.colors.danger} />
          <Text style={[styles.text, { color: theme.colors.danger }]}>Logout</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  text: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LogoutButton;