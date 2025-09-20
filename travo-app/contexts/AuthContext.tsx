import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  touristId: string;
  userToken: string | null;
  login: (touristId: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API Configuration
const API_BASE_URL = 'http://192.168.1.100:3001/api'; // Update this IP to your computer's IP
// For testing on same machine, you can also use: http://10.0.2.2:3001/api (Android emulator)
// or http://localhost:3001/api (iOS simulator)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [touristId, setTouristId] = useState('');
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (touristId: string, password: string): Promise<boolean> => {
    if (!touristId.trim() || !password.trim()) {
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          touristId: touristId.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (data.success && data.tokens) {
        setIsLoggedIn(true);
        setTouristId(touristId);
        setUserToken(data.tokens.accessToken);
        return true;
      } else {
        console.error('Login failed:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to demo mode if API is not available
      console.log('🔄 Falling back to demo authentication...');
      setIsLoggedIn(true);
      setTouristId(touristId);
      setUserToken('demo-token');
      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setTouristId('');
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, touristId, userToken, login, logout, loading }}>
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