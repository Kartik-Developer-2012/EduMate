import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Protected Credentials
const MASTER_EMAIL = 'support@edumate.study';
const MASTER_PASSWORD = 'Edumate@2026';
const SESSION_KEY = 'edumate_auth_session';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      return parsed && parsed.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();
    } catch {
      return false;
    }
  });

  const [authEmail, setAuthEmail] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (!stored) return '';
      const parsed = JSON.parse(stored);
      return parsed?.email || '';
    } catch {
      return '';
    }
  });

  const login = (email, password, remember = true) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (cleanEmail === MASTER_EMAIL.toLowerCase() && cleanPass === MASTER_PASSWORD) {
      const sessionData = {
        email: MASTER_EMAIL,
        authenticatedAt: Date.now(),
        token: `em_sec_${Math.random().toString(36).substring(2, 12)}`
      };

      if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }

      setIsAuthenticated(true);
      setAuthEmail(MASTER_EMAIL);
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid credentials. Please verify your authorized email and password.'
    };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setAuthEmail('');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authEmail,
        login,
        logout,
        masterEmail: MASTER_EMAIL
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
