// src/screens/ProfileSetup.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Alert,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { useFirebase } from '../context/FirebaseContext';
import { updateUsername, updateUserPreferences } from '../services/firebase/userProfile';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useTheme } from '../context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

interface ProfileSetupProps {
  navigation: NavigationProp<ParamListBase>;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ navigation }) => {
  const { user, userProfile, refreshUserProfile, isPremiumUser } = useFirebase();
  const { theme, setThemePreference, setFontSizePreference } = useTheme();
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
        fontSize: fontSize
      });
      
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

  // Handle theme selection with immediate update
  const handleThemeChange = (theme: 'light' | 'dark' | 'sepia') => {
    setSelectedTheme(theme);
    setThemePreference(theme);
  };

  // Handle font size selection with immediate update
  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
    setFontSizePreference(size);
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
      
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, ...getShadowStyle(theme) }]}>
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
      
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, ...getShadowStyle(theme) }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Theme Settings</Text>
        <View style={styles.themeContainer}>
          <TouchableOpacity 
            style={[
              styles.themeOption, 
              { borderColor: selectedTheme === 'light' ? theme.colors.primary : 'transparent' }
            ]}
            onPress={() => handleThemeChange('light')}
          >
            <View style={[styles.themePreview, styles.lightTheme, { borderColor: theme.colors.border }]} />
            <Text style={{ color: theme.colors.text }}>Light</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.themeOption, 
              { borderColor: selectedTheme === 'dark' ? theme.colors.primary : 'transparent' }
            ]}
            onPress={() => handleThemeChange('dark')}
          >
            <View style={[styles.themePreview, styles.darkTheme, { borderColor: theme.colors.border }]} />
            <Text style={{ color: theme.colors.text }}>Dark</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.themeOption, 
              { borderColor: selectedTheme === 'sepia' ? theme.colors.primary : 'transparent' }
            ]}
            onPress={() => handleThemeChange('sepia')}
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
            onPress={() => handleFontSizeChange('small')}
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
            onPress={() => handleFontSizeChange('medium')}
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
            onPress={() => handleFontSizeChange('large')}
          >
            <Text style={{ fontSize: 22, color: theme.colors.text }}>Large</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fontPreviewContainer}>
          <Text style={[styles.fontPreviewLabel, { color: theme.colors.textSecondary }]}>Preview:</Text>
          <View style={[styles.fontPreview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.fontPreviewText, { 
              color: theme.colors.text,
              fontSize: fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : 18  
            }]}>
              This is how your text will appear throughout the app.
            </Text>
          </View>
        </View>
      </View>
      
      {/* Premium Features Section with Stripe integration */}
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, ...getShadowStyle(theme) }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Premium Features</Text>
        
        <View style={styles.premiumContainer}>
          <View style={styles.premiumIconContainer}>
            <Ionicons name={isPremiumUser ? "star" : "star-outline"} size={40} color={theme.colors.warning} />
          </View>
          <View style={styles.premiumTextContainer}>
            <Text style={[styles.premiumTitle, { color: theme.colors.text }]}>
              {isPremiumUser ? "Premium Features Unlocked" : "Unlock Premium Features"}
            </Text>
            <Text style={[styles.premiumDescription, { color: theme.colors.textSecondary }]}>
              {isPremiumUser 
                ? "Thank you for your support! You have access to all premium features."
                : "Get unlimited verses, advanced features, and an ad-free experience with a premium subscription."}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.premiumButton, { backgroundColor: theme.colors.warning }]}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Ionicons name={isPremiumUser ? "settings-outline" : "diamond-outline"} size={20} color="white" />
          <Text style={styles.premiumButtonText}>
            {isPremiumUser ? "Manage Subscription" : "View Subscription Plans"}
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.saveButton, 
          { backgroundColor: theme.colors.primary },
          isSaving && { opacity: 0.7 }
        ]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Settings"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Helper function for consistent shadow styling
const getShadowStyle = (theme: any) => {
  if (Platform.OS === 'ios') {
      return {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.8,
          shadowRadius: 3,
      };
  } else {
      return {
          elevation: 3,
      };
  }
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 0,
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
    borderRadius: 8,
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
    marginBottom: 24,
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    width: '30%',
  },
  fontPreviewContainer: {
    marginTop: 8,
  },
  fontPreviewLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  fontPreview: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  fontPreviewText: {
    lineHeight: 24,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Premium feature styles
  premiumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumIconContainer: {
    marginRight: 16,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  premiumButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ProfileSetup;