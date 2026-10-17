import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // DARK-ONLY MODE: No light mode available
  // Always force dark theme for maximum focus and productivity
  const [themeMode] = useState('dark');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
    root.classList.remove('light');
    // Clear any saved light mode preference
    localStorage.setItem('edumate-theme', 'dark');
  }, []);

  // Theme toggle is disabled - always dark
  const toggleTheme = () => {
    // No-op: Dark mode is permanent
  };

  const isDark = true;

  return (
    <ThemeContext.Provider value={{ theme: 'dark', isDark, toggleTheme, setThemeMode: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
