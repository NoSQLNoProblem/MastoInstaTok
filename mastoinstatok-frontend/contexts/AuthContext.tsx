"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/apiService';

// This interface should match the user object your backend sends from /api/auth/me
interface User {
  displayName: string;
  email: string;
  googleId: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  logout: () => void;
  isLoading: boolean; // Flag to prevent rendering pages before auth status is known
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuthStatus = useCallback(async () => {
    try {
      // Will return user data if they have a valid session
      const userData = await apiService.get('/auth/me');
      setUser(userData);
    } catch (error) {
      // If the request fails (e.g., 401), the user is not logged in
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const logout = async () => {
    try {
      // This endpoint should tell the backend to destroy the session
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Clear user state and redirect regardless of backend call success
      setUser(null);
      router.push('/auth');
    }
  };

  const value = {
    isAuthenticated: !!user,
    user,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
