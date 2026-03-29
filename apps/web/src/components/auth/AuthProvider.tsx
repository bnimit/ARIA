'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, getStoredUser, saveSession, clearSession, AuthUser } from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: () => {},
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_PATHS = ['/auth/signin', '/auth/signup', '/auth/forgot-password', '/auth/reset-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;
    const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!user && !isPublicPath) {
      router.replace('/auth/signin');
    } else if (user && isPublicPath) {
      router.replace('/');
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback((token: string, u: AuthUser) => {
    saveSession(token, u);
    setUser(u);
    router.replace('/');
  }, [router]);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
    router.replace('/auth/signin');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
