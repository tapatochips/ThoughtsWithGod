import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Button, 
  Alert,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useFirebase } from '../context/FirebaseContext';
import { updateUsername, updateUserPreferences } from '../services/firebase/userProfile';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useTheme } from '../context/ThemeProvider';

interface ProfileSetupProps {
  navigation: NavigationProp<ParamListBase>;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ navigation }) => {
  const { user, userProfile, refreshUserProfile } = useFirebase();
  const { theme, setThemePreference } = useTheme();
  const [username, setUsername] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username || '');
      setSelectedTheme(userProfile.preferences?.theme || 'light');
      setFontSize(userProfile.preferences?.fontSize || 'medium');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // Update username
      if (username && username !== userProfile?.username) {
        await updateUsername(user.uid, username);
      }
      
      // Update preferences
      await updateUserPreferences(user.uid, {
        theme: selectedTheme,
        fontSize
      });
      
      // Update theme immediately in the app
      setThemePreference(selectedTheme);
      
      await refreshUserProfile();
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !userProfile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Please log in to set up your profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Profile Settings</Text>
      
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>User Information</Text>
        <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
        <Text style={[styles.email, { color: theme.colors.secondary }]}>{user.email}</Text>
        
        <Text style={[styles.label, { color: theme.colors.text }]}>Username</Text>
        <TextInput
          style={[styles.input, { 
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.colors.background
          }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Choose a username"
          placeholderTextColor={theme.colors.secondary}
        />
        <Text style={[styles.hint, { color: theme.colors.secondary }]}>
          This will be displayed instead of your email on the prayer board.
        </Text>
      </View>
      
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Theme Settings</Text>
        <View style={styles.themeContainer}>
          <TouchableOpacity 
            style={[
              styles.themeOption, 
              { borderColor: selectedTheme === 'light' ? theme.colors.primary : 'transparent' }
            ]}
            onPress={() => setSelectedTheme('light')}
          >
            <View style={[styles.themePreview, styles.lightTheme, { borderColor: theme.colors.border }]} />
            <Text style={{ color: theme.colors.text }}>Light</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.themeOption, 
              { borderColor: selectedTheme === 'dark' ? theme.colors.primary : 'transparent' }
            ]}
            onPress={() => setSelectedTheme('dark')}
          >
            <View style={[styles.themePreview, styles.darkTheme, { borderColor: theme.colors.border }]} />
            <Text style={{ color: theme.colors.text }}>Dark</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.themeOption, 
              { borderColor: selectedTheme === 'sepia' ? theme.colors.primary : 'transparent' }
            ]}
            onPress={() => setSelectedTheme('sepia')}
          >
            <View style={[styles.themePreview, styles.sepiaTheme, { borderColor: theme.colors.border }]} />
            <Text style={{ color: theme.colors.text }}>Sepia</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.label, { color: theme.colors.text }]}>Font Size</Text>
        <View style={styles.fontSizeContainer}>
          <TouchableOpacity 
            style={[
              styles.fontSizeOption, 
              { 
                borderColor: fontSize === 'small' ? theme.colors.primary : 'transparent',
                backgroundColor: fontSize === 'small' ? `${theme.colors.primary}20` : 'transparent'
              }
            ]}
            onPress={() => setFontSize('small')}
          >
            <Text style={{ fontSize: 14, color: theme.colors.text }}>Small</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.fontSizeOption, 
              { 
                borderColor: fontSize === 'medium' ? theme.colors.primary : 'transparent',
                backgroundColor: fontSize === 'medium' ? `${theme.colors.primary}20` : 'transparent'
              }
            ]}
            onPress={() => setFontSize('medium')}
          >
            <Text style={{ fontSize: 18, color: theme.colors.text }}>Medium</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.fontSizeOption, 
              { 
                borderColor: fontSize === 'large' ? theme.colors.primary : 'transparent',
                backgroundColor: fontSize === 'large' ? `${theme.colors.primary}20` : 'transparent'
              }
            ]}
            onPress={() => setFontSize('large')}
          >
            <Text style={{ fontSize: 22, color: theme.colors.text }}>Large</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <Button 
        title={isSaving ? "Saving..." : "Save Settings"}
        onPress={handleSave}
        disabled={isSaving}
        color={theme.colors.primary}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  message: {
    padding: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  themeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  themeOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    width: '30%',
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  lightTheme: {
    backgroundColor: '#ffffff',
  },
  darkTheme: {
    backgroundColor: '#121212',
  },
  sepiaTheme: {
    backgroundColor: '#f4ecd8',
  },
  fontSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fontSizeOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    width: '30%',
  }
});

export default ProfileSetup;