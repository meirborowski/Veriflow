
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, setAccessToken } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeTokens = useCallback((tokens: AuthTokens) => {
    setAccessToken(tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }, []);

  const clearTokens = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const profile = await api.get<User>('/auth/me');
      setUser(profile);
    } catch {
      clearTokens();
      setUser(null);
    }
  }, [clearTokens]);

  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    api
      .post<AuthTokens>('/auth/refresh', { refreshToken })
      .then((tokens) => {
        storeTokens(tokens);
        return fetchUser();
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [storeTokens, clearTokens, fetchUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.post<AuthTokens>('/auth/login', { email, password });
      storeTokens(tokens);
      await fetchUser();
    },
    [storeTokens, fetchUser],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const tokens = await api.post<AuthTokens>('/auth/register', { name, email, password });
      storeTokens(tokens);
      await fetchUser();
    },
    [storeTokens, fetchUser],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, [clearTokens]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
