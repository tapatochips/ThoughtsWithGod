import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeProvider';
import { useFirebase } from '../../context/FirebaseContext';
import { updateUserPreferences } from '../../services/firebase/userProfile';

interface FontSizeControlProps {
  style?: any;
}

const FontSizeControl: React.FC<FontSizeControlProps> = ({ style }) => {
  const { theme, setFontSizePreference } = useTheme();
  const { user, userProfile, refreshUserProfile } = useFirebase();
  
  const currentFontSize = userProfile?.preferences?.fontSize || 'medium';

  const handleFontSizeChange = async (size: 'small' | 'medium' | 'large') => {
    if (!user) return;
    
    try {
      setFontSizePreference(size);
      
      await updateUserPreferences(user.uid, {
        ...userProfile?.preferences,
        fontSize: size
      });
      
      await refreshUserProfile();
    } catch (error) {
      console.error('Error updating font size:', error);
    }
  };

  const getFontSizeIcon = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'text-outline';
      case 'medium': return 'text';
      case 'large': return 'text';
    }
  };

  const getFontSizeNumber = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return '14';
      case 'medium': return '16';
      case 'large': return '18';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm }]}>
        Text Size
      </Text>
      <View style={styles.buttonContainer}>
        {(['small', 'medium', 'large'] as const).map((size) => (
          <TouchableOpacity
            key={size}
            style={[
              styles.button,
              { 
                backgroundColor: currentFontSize === size 
                  ? theme.colors.primary 
                  : theme.colors.surface,
                borderColor: theme.colors.border
              }
            ]}
            onPress={() => handleFontSizeChange(size)}
            accessibilityRole="button"
            accessibilityLabel={`Set font size to ${size}`}
            accessibilityState={{ selected: currentFontSize === size }}
            accessibilityHint={`Changes the font size throughout the app to ${size}`}
          >
            <Ionicons 
              name={getFontSizeIcon(size)} 
              size={size === 'small' ? 16 : size === 'medium' ? 18 : 20} 
              color={currentFontSize === size ? 'white' : theme.colors.text} 
            />
            <Text style={[
              styles.buttonText, 
              { 
                color: currentFontSize === size ? 'white' : theme.colors.text,
                fontSize: size === 'small' ? 12 : size === 'medium' ? 14 : 16
              }
            ]}>
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 2,
    minHeight: 44, // Ensures minimum touch target size for accessibility
  },
  buttonText: {
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default FontSizeControl;