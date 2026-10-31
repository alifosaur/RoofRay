import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

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
  full_name: string;
  phone: string;
  role?: UserRole;
  password?: string;
  address?: string;
  city?: string;
  pincode?: string;
  department?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<UserProfile>;
  loginWithToken: (token: string, targetRole: UserRole) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  logout: () => void;
  switchRole: (newRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const DEMO_TOKENS: Record<UserRole, { uid: string; email: string; name: string }> = {
  admin: { uid: 'admin_uid', email: 'admin@roofray.com', name: 'Rajesh Singhania (Director)' },
  sales: { uid: 'sales_uid', email: 'sales@roofray.com', name: 'Rohan Sharma (Sales)' },
  technician: { uid: 'tech_uid', email: 'tech@roofray.com', name: 'Amit Verma (Lead Technician)' },
  warehouse: { uid: 'warehouse_uid', email: 'warehouse@roofray.com', name: 'Deepak Kumar (Warehouse Lead)' },
  customer: { uid: 'customer_uid', email: 'customer@roofray.com', name: 'Vikram Malhotra (Customer)' },
};

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
  const [role, setRole] = useState<UserRole>(
    (localStorage.getItem('roofray_role') as UserRole) ||
    (localStorage.getItem('sunpower_role') as UserRole) ||
    'customer'
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (): Promise<UserProfile | null> => {
    const token = localStorage.getItem('roofray_token') || localStorage.getItem('sunpower_token');
    if (!token) {
      setUser(null);
      setRole('customer');
      setIsLoading(false);
      return null;
    }

    try {
      const profile = await api.get<UserProfile>('/auth/me');
      setUser(profile);
      setRole(profile.role);
      localStorage.setItem('roofray_role', profile.role);
      return profile;
    } catch (err) {
      console.warn('Session not active or token expired:', err);
      // Clean up invalid/expired session
      localStorage.removeItem('roofray_token');
      localStorage.removeItem('roofray_role');
      localStorage.removeItem('sunpower_token');
      localStorage.removeItem('sunpower_role');
      setUser(null);
      setRole('customer');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Clear any legacy auto-injected admin session so users start unauthenticated on the landing page
    const token = localStorage.getItem('roofray_token') || localStorage.getItem('sunpower_token');
    if (token === 'admin_uid' && !localStorage.getItem('roofray_user_explicit')) {
      localStorage.removeItem('roofray_token');
      localStorage.removeItem('roofray_role');
      localStorage.removeItem('sunpower_token');
      localStorage.removeItem('sunpower_role');
    }
    fetchProfile();
  }, []);

  const login = async (email: string, password?: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await api.post<{ access_token: string; user: UserProfile }>('/auth/login', {
        email,
        password: password || 'demo123',
      });
      localStorage.setItem('roofray_token', res.access_token);
      localStorage.setItem('roofray_role', res.user.role);
      localStorage.setItem('roofray_user_explicit', 'true');
      setUser(res.user);
      setRole(res.user.role);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithToken = async (token: string, targetRole: UserRole): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      localStorage.setItem('roofray_token', token);
      localStorage.setItem('roofray_role', targetRole);
      localStorage.setItem('roofray_user_explicit', 'true');
      const profile = await api.get<UserProfile>('/auth/me');
      setUser(profile);
      setRole(profile.role);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const endpoint = payload.role && payload.role !== 'customer' ? '/auth/staff-register' : '/auth/register';
      const res = await api.post<{ access_token: string; user: UserProfile }>(endpoint, payload);
      localStorage.setItem('roofray_token', res.access_token);
      localStorage.setItem('roofray_role', res.user.role);
      localStorage.setItem('roofray_user_explicit', 'true');
      setUser(res.user);
      setRole(res.user.role);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('roofray_token');
    localStorage.removeItem('roofray_role');
    localStorage.removeItem('roofray_user_explicit');
    localStorage.removeItem('sunpower_token');
    localStorage.removeItem('sunpower_role');
    setUser(null);
    setRole('customer');
  };

  const switchRole = async (newRole: UserRole) => {
    const demo = DEMO_TOKENS[newRole] || DEMO_TOKENS.admin;
    await loginWithToken(demo.uid, newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        login,
        loginWithToken,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
