import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme, ColorSchemeName } from 'react-native';
// Temporarily comment out AsyncStorage
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, lightTheme, darkTheme } from './index';

// Create theme context with provider value type
type ThemeContextType = {
  theme: typeof lightTheme;
  isDarkMode: boolean;
  toggleTheme: () => void;
};

// Default context value
const defaultContextValue: ThemeContextType = {
  theme: lightTheme,
  isDarkMode: false,
  toggleTheme: () => {},
};

// Create context
const ThemeContext = createContext<ThemeContextType>(defaultContextValue);

// Hook to use theme
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
  customTheme?: typeof lightTheme;
}

// const THEME_PREFERENCE_KEY = '@theme_preference';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  customTheme 
}) => {
  // Always start with light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Toggle function (will be used later when we re-enable dark mode)
  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };
  
  // Always use light theme for now
  const currentTheme = customTheme || lightTheme;
  
  const contextValue: ThemeContextType = {
    theme: currentTheme,
    isDarkMode,
    toggleTheme,
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 