'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthTokens, RegisterData, AuthContextType } from '@/domain/auth/types';

export type { User } from '@/domain/auth/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load auth state from localStorage on mount (client-side only)
  useEffect(() => {
    if (!mounted) return;

    try {
      const storedTokens = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedTokens && storedUser) {
        setTokens(JSON.parse(storedTokens));
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setIsLoading(false);
  }, [mounted]);

  // Save auth state to localStorage (client-side only)
  const saveAuthState = useCallback((newTokens: AuthTokens | null, newUser: User | null) => {
    if (typeof window !== 'undefined') {
      if (newTokens && newUser) {
        localStorage.setItem(TOKEN_KEY, JSON.stringify(newTokens));
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setTokens(newTokens);
    setUser(newUser);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      saveAuthState(data.tokens, data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (registerData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = Object.values(data).flat().join(', ') || 'Registration failed';
        return { success: false, error: errorMessage };
      }

      saveAuthState(data.tokens, data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = useCallback(() => {
    if (tokens?.refresh) {
      fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
        },
        body: JSON.stringify({ refresh: tokens.refresh }),
      }).catch(() => {});
    }
    saveAuthState(null, null);
  }, [tokens, saveAuthState]);

  const refreshToken = async (): Promise<boolean> => {
    if (!tokens?.refresh) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });

      if (!response.ok) {
        logout();
        return false;
      }

      const data = await response.json();
      const newTokens = { ...tokens, access: data.access };
      if (data.refresh) {
        newTokens.refresh = data.refresh;
      }
      saveAuthState(newTokens, user);
      return true;
    } catch {
      logout();
      return false;
    }
  };

  const applyUser = useCallback((nextUser: User) => {
    saveAuthState(tokens, nextUser);
  }, [tokens, saveAuthState]);

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated: !!user && !!tokens,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    refreshToken,
    applyUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function for authenticated API calls
export async function authFetch(
  url: string,
  options: RequestInit = {},
  tokens: AuthTokens | null
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (tokens?.access) {
    headers.set('Authorization', `Bearer ${tokens.access}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
}
