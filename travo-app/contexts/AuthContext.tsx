import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  touristId: string;
  login: (touristId: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [touristId, setTouristId] = useState('');

  const login = (touristId: string, password: string) => {
    // Simple validation - in real app, you'd validate against a server
    if (touristId.trim() && password.trim()) {
      setIsLoggedIn(true);
      setTouristId(touristId);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setTouristId('');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, touristId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}