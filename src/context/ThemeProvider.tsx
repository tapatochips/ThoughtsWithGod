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

// Define themes with a more modern palette
const lightTheme: Theme = {
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
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32
  },
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

const darkTheme: Theme = {
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
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32
  },
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

const sepiaTheme: Theme = {
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
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32
  },
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

// Create the context
interface ThemeContextType {
  theme: Theme;
  setThemePreference: (theme: 'light' | 'dark' | 'sepia') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  setThemePreference: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { userProfile } = useFirebase();
  const deviceTheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(lightTheme);
  
  // Apply user theme preference or device theme
  useEffect(() => {
    if (userProfile?.preferences?.theme) {
      setThemePreference(userProfile.preferences.theme);
    } else if (deviceTheme) {
      setThemePreference(deviceTheme === 'dark' ? 'dark' : 'light');
    }
  }, [userProfile, deviceTheme]);
  
  const setThemePreference = (themeName: 'light' | 'dark' | 'sepia') => {
    switch (themeName) {
      case 'dark':
        setTheme(darkTheme);
        break;
      case 'sepia':
        setTheme(sepiaTheme);
        break;
      default:
        setTheme(lightTheme);
    }
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);