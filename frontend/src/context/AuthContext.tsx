import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearStoredTokens,
  persistTokens,
  setAuthHeader,
} from '../services/apiClient';
import * as authService from '../services/authService';
import type { LoginPayload, RegisterPayload } from '../services/authService';
import { fetchProfile } from '../services/userService';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const USER_STORAGE_KEY = 'ethio-tech-hub:user';

const hasWindow = typeof window !== 'undefined';

const getStoredUser = (): User | null => {
  if (!hasWindow) return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

const persistUser = (nextUser: User | null) => {
  if (!hasWindow) return;
  if (!nextUser) {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      if (!hasWindow) {
        setIsLoading(false);
        return;
      }

      const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

      if (accessToken && refreshToken) {
        setAuthHeader(accessToken);
        try {
          const profile = await fetchProfile();
          setUser(profile);
          persistUser(profile);
        } catch (error) {
          console.error('Failed to bootstrap session', error);
          await authService.logout(refreshToken);
          clearStoredTokens();
          persistUser(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    void initialize();
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const { user: nextUser, tokens } = await authService.login(payload);
      persistTokens(tokens.accessToken, tokens.refreshToken);
      persistUser(nextUser);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      clearStoredTokens();
      persistUser(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    setIsLoading(true);
    try {
      await authService.register(payload);
      const nextUser = await login({ email: payload.email, password: payload.password });
      return nextUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = hasWindow ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    setIsLoading(true);
    try {
      await authService.logout(refreshToken);
    } finally {
      clearStoredTokens();
      persistUser(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    const profile = await fetchProfile();
    setUser(profile);
    persistUser(profile);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

