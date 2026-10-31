import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export type UserRole = 'admin' | 'sales' | 'technician' | 'warehouse' | 'support' | 'accounts';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  hourly_rate?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  switchRole: (newRole: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const ROLE_TOKENS: Record<UserRole, string> = {
  admin: 'admin_uid',
  sales: 'sales_uid',
  technician: 'tech_uid',
  warehouse: 'warehouse_uid',
  support: 'support_uid',
  accounts: 'accounts_uid',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(
    (localStorage.getItem('sunpower_role') as UserRole) || 'admin'
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (targetRole: UserRole) => {
    setIsLoading(true);
    const token = ROLE_TOKENS[targetRole] || 'admin_uid';
    localStorage.setItem('sunpower_token', token);
    localStorage.setItem('sunpower_role', targetRole);

    try {
      const profile = await api.get<UserProfile>('/auth/me');
      setUser(profile);
    } catch (err) {
      console.error('Failed to load profile for role:', targetRole, err);
      // Fallback stub for dev
      setUser({
        id: 1,
        email: `${targetRole}@sunpower.com`,
        full_name: `${targetRole.toUpperCase()} User`,
        role: targetRole,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(role);
  }, [role]);

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
  };

  const logout = () => {
    localStorage.removeItem('sunpower_token');
    localStorage.removeItem('sunpower_role');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, switchRole, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

