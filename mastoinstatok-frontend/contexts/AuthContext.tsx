"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiService } from '@/services/apiService';

// This interface should match the user object your backend sends from /api/auth/me
export type User = {
    googleId ?: string,
    email ?: string,
    displayName?: string,
    actorId: string,
    bio ?: string,
    fullHandle ?: string
  };

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  logout: () => void;
  isLoading: boolean;
  registrationRequired: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registrationRequired, setRegistrationRequired] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuthStatus = useCallback(async () => {
    try {
      const userData = await apiService.get('/platform/users/me');
      if (userData.displayName == null || userData.bio == null) {
        setRegistrationRequired(true);
      } else {
        setRegistrationRequired(false);
      }
      setUser(userData);
    } catch (error) {
      setUser(null);
      setRegistrationRequired(false);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (!isLoading) {
      const isAuthenticated = !!user;
      if (isAuthenticated && registrationRequired && pathname !== '/registration') {
        router.push('/registration');
      }
    }
  }, [isLoading, user, registrationRequired, router, pathname]);

  const logout = async () => {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      setRegistrationRequired(false);
      router.push('/auth');
    }
  };

  const value = {
    isAuthenticated: !!user,
    user,
    logout,
    isLoading,
    registrationRequired,
    refreshUser: checkAuthStatus
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