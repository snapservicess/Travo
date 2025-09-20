import React from 'react';
import LoginForm from '@/components/login-form';
import AppRouter from '@/components/app-router';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { isLoggedIn } = useAuth();
  
  return isLoggedIn ? <AppRouter /> : <LoginForm />;
}
