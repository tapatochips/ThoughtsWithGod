import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useFirebase } from './FirebaseContext';

// Define theme types
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  card: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  secondary: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  accent: string;
  divider: string;
  shadow: string;
}

// Add fontSize to the Theme interface
export interface Theme {
  colors: ThemeColors;
  name: string;
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
}

// Define base themes
const baseThemes = {
  light: {
    colors: {
      primary: '#5271FF',           // Vibrant blue
      primaryLight: '#8B9EFF',      // Light blue
      primaryDark: '#3853F4',       // Dark blue
      background: '#F8F9FB',        // Very light gray
      card: '#FFFFFF',              // Pure white
      surface: '#F2F3F5',           // Very light gray (alt)
      text: '#2A2D34',              // Nearly black
      textSecondary: '#71747A',     // Medium gray
      border: '#E2E4E8',            // Light gray
      secondary: '#8C8F94',         // Medium gray
      danger: '#FF6370',            // Coral red
      success: '#4ECE8C',           // Green
      warning: '#FFBD59',           // Orange
      info: '#5AB0FF',              // Light blue
      accent: '#FF8A65',            // Peach
      divider: '#EBEBED',           // Very light gray
      shadow: 'rgba(0, 0, 0, 0.08)' // Transparent black
    },
    name: 'light',
  },
  dark: {
    colors: {
      primary: '#5271FF',           // Same vibrant blue
      primaryLight: '#8B9EFF',      // Light blue
      primaryDark: '#3853F4',       // Dark blue
      background: '#1A1D21',        // Very dark gray
      card: '#242830',              // Dark gray
      surface: '#2D3139',           // Medium-dark gray
      text: '#F0F1F2',              // Almost white
      textSecondary: '#9DA1A7',     // Light gray
      border: '#3A3F47',            // Medium gray
      secondary: '#7E8187',         // Medium-light gray
      danger: '#FF6370',            // Same coral red
      success: '#4ECE8C',           // Same green
      warning: '#FFBD59',           // Same orange
      info: '#5AB0FF',              // Same light blue
      accent: '#FF8A65',            // Same peach
      divider: '#3A3F47',           // Medium gray
      shadow: 'rgba(0, 0, 0, 0.3)'  // Darker transparent black
    },
    name: 'dark',
  },
  sepia: {
    colors: {
      primary: '#A86B3C',           // Warm brown
      primaryLight: '#C89878',      // Light brown
      primaryDark: '#7A4E2B',       // Dark brown
      background: '#F7F1E3',        // Cream
      card: '#FDF6E3',              // Light cream
      surface: '#F0E6D2',           // Slightly darker cream
      text: '#5B4636',              // Dark brown
      textSecondary: '#8D7761',     // Medium brown
      border: '#D8CCBC',            // Light brown border
      secondary: '#9C8C7D',         // Medium brown
      danger: '#C25450',            // Muted red
      success: '#5E9C76',           // Muted green
      warning: '#D5A458',           // Muted gold
      info: '#6190A8',              // Muted blue
      accent: '#C6846E',            // Terracotta
      divider: '#E0D6C3',           // Very light brown
      shadow: 'rgba(131, 96, 67, 0.1)' // Transparent brown
    },
    name: 'sepia',
  }
};

// Font size configurations
const fontSizes = {
  small: {
    xs: 10,
    sm: 16,
    md: 18,
    lg: 22,
    xl: 28,
    xxl: 32
  },
  medium: {
    xs: 10,
    sm: 16,
    md: 18,
    lg: 22,
    xl: 28,
    xxl: 32
  },
  large: {
    xs: 10,
    sm: 16,
    md: 18,
    lg: 22,
    xl: 28,
    xxl: 32
  }
};

// Standard spacing and border radius
const standardParams = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    pill: 50
  }
};

// Create a full theme by combining base theme with font size and standard params
const createTheme = (themeName: 'light' | 'dark' | 'sepia', fontSizeName: 'small' | 'medium' | 'large'): Theme => {
  return {
    ...baseThemes[themeName],
    fontSize: fontSizes[fontSizeName],
    ...standardParams
  };
};

// Create the context
interface ThemeContextType {
  theme: Theme;
  setThemePreference: (theme: 'light' | 'dark' | 'sepia') => void;
  setFontSizePreference: (fontSize: 'small' | 'medium' | 'large') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: createTheme('light', 'medium'),
  setThemePreference: () => {},
  setFontSizePreference: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { userProfile } = useFirebase();
  const deviceTheme = useColorScheme();
  const [themeName, setThemeName] = useState<'light' | 'dark' | 'sepia'>('light');
  const [fontSizeName, setFontSizeName] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<Theme>(createTheme('light', 'medium'));
  
  // Apply user theme preference or device theme
  useEffect(() => {
    if (userProfile?.preferences) {
      setThemeName(userProfile.preferences.theme || 'light');
      setFontSizeName(userProfile.preferences.fontSize || 'medium');
    } else if (deviceTheme) {
      setThemeName(deviceTheme === 'dark' ? 'dark' : 'light');
    }
  }, [userProfile, deviceTheme]);

  // Update theme when theme name or font size changes
  useEffect(() => {
    setTheme(createTheme(themeName, fontSizeName));
  }, [themeName, fontSizeName]);
  
  const setThemePreference = (newThemeName: 'light' | 'dark' | 'sepia') => {
    setThemeName(newThemeName);
  };

  const setFontSizePreference = (newFontSizeName: 'small' | 'medium' | 'large') => {
    setFontSizeName(newFontSizeName);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setThemePreference, setFontSizePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);