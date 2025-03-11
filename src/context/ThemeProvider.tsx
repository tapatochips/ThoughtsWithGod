import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useFirebase } from './FirebaseContext';

// Define theme types
export interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  secondary: string;
  // Add these missing properties
  danger: string;
  success: string;
  warning: string;
  info: string;
  accent: string;
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
}

// Define themes
const lightTheme: Theme = {
  colors: {
    primary: '#007bff',
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#212529',
    border: '#ced4da',
    secondary: '#6c757d',
    danger: '#dc3545',    // Add danger color
    success: '#28a745',   // Add success color
    warning: '#ffc107',   // Add warning color
    info: '#17a2b8',      // Add info color
    accent: '#fd7e14',    // Add accent color
  },
  name: 'light',
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32
  }
};

const darkTheme: Theme = {
  colors: {
    primary: '#007bff',
    background: '#121212',
    card: '#1e1e1e',
    text: '#F8F8FF',
    border: '#343a40',
    secondary: '#adb5bd',
    danger: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    info: '#17a2b8',
    accent: '#fd7e14',
  },
  name: 'dark',
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32
  }
};

const sepiaTheme: Theme = {
  colors: {
    primary: '#8b5a2b',
    background: '#f4ecd8',
    card: '#fdf6e3',
    text: '#5b4636',
    border: '#d3c4a9',
    secondary: '#7d6f60',
    danger: '#a83240',
    success: '#4a7f41',
    warning: '#d5a021',
    info: '#39797f',
    accent: '#b56b00',
  },
  name: 'sepia',
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32
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