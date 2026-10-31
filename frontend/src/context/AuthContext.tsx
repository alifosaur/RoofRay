import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from '../api/client';

export type UserRole = 'customer' | 'sales' | 'technician' | 'warehouse' | 'admin';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  hourly_rate?: number;
  customer_id?: number | null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  otp: string;
  full_name: string;
  phone: string;
  address?: string;
  city?: string;
  pincode?: string;
}


interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  requestPasswordReset: (email: string) => Promise<void>;
  requestSignupOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case 'customer':
      return '/customer';
    case 'sales':
      return '/sales';
    case 'technician':
      return '/technician';
    case 'warehouse':
      return '/warehouse';
    case 'admin':
      return '/admin';
    default:
      return '/login';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (): Promise<UserProfile | null> => {
    try {
      const profile = await api.get<UserProfile>('/auth/me');
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      if (localStorage.getItem(TOKEN_KEY) && !(await loadProfile())) localStorage.removeItem(TOKEN_KEY);
      setIsLoading(false);
    })();
  }, []);

  const requireProfile = async (): Promise<UserProfile> => {
    const profile = await loadProfile();
    if (!profile) throw new Error('Your account is not registered in the system. Please contact an administrator.');
    return profile;
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: UserProfile }>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload) => {
    const res = await api.post<{ access_token: string; user: UserProfile }>('/auth/register', payload);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setUser(res.user);
    return res.user;
  };

  const requestPasswordReset = async (email: string) => {
    await api.post('/auth/forgot-password', { email });
  };

  const requestSignupOtp = async (email: string) => {
    await api.post('/auth/register/request-otp', { email });
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isLoading,
        login,
        register,
        requestPasswordReset,
        requestSignupOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
