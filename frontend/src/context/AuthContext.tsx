import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, setTokenProvider, TOKEN_KEY } from '../api/client';

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
  full_name: string;
  phone: string;
  address?: string;
  city?: string;
  pincode?: string;
}

type AuthMode = 'firebase' | 'local';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  authMode: AuthMode | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  requestPasswordReset: (email: string) => Promise<void>;
  sendStaffPasswordEmail: (email: string) => Promise<void>;
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
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Firebase Auth instance + SDK module, loaded only in Firebase mode
  const fb = useRef<{ auth: any; sdk: typeof import('firebase/auth') } | null>(null);

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
      try {
        const cfg = await api.get<{ mode: AuthMode; firebase: Record<string, string> | null }>('/auth/config');
        setAuthMode(cfg.mode);
        if (cfg.mode === 'firebase' && cfg.firebase) {
          const [{ initializeApp }, sdk] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
          const auth = sdk.getAuth(initializeApp(cfg.firebase));
          fb.current = { auth, sdk };
          setTokenProvider(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null));
          sdk.onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) await loadProfile();
            else setUser(null);
            setIsLoading(false);
          });
          return;
        }
        if (localStorage.getItem(TOKEN_KEY)) {
          if (!(await loadProfile())) localStorage.removeItem(TOKEN_KEY);
        }
      } catch (err) {
        console.error('Auth initialisation failed', err);
      }
      setIsLoading(false);
    })();
  }, []);

  const requireProfile = async (): Promise<UserProfile> => {
    const profile = await loadProfile();
    if (!profile) throw new Error('Your account is not registered in the system. Please contact an administrator.');
    return profile;
  };

  const login = async (email: string, password: string) => {
    if (fb.current) {
      await fb.current.sdk.signInWithEmailAndPassword(fb.current.auth, email, password);
      return requireProfile();
    }
    const res = await api.post<{ access_token: string; user: UserProfile }>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload) => {
    if (fb.current) {
      await fb.current.sdk.createUserWithEmailAndPassword(fb.current.auth, payload.email, payload.password);
      const { password, ...profile } = payload;
      const res = await api.post<{ user: UserProfile }>('/auth/register', profile);
      setUser(res.user);
      return res.user;
    }
    const res = await api.post<{ access_token: string; user: UserProfile }>('/auth/register', payload);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setUser(res.user);
    return res.user;
  };

  const requestPasswordReset = async (email: string) => {
    if (fb.current) {
      await fb.current.sdk.sendPasswordResetEmail(fb.current.auth, email);
      return;
    }
    await api.post('/auth/forgot-password', { email });
  };

  // Firebase mode: newly created staff get Firebase's password-reset email to set their password
  const sendStaffPasswordEmail = async (email: string) => {
    if (fb.current) await fb.current.sdk.sendPasswordResetEmail(fb.current.auth, email);
  };

  const logout = async () => {
    if (fb.current) await fb.current.sdk.signOut(fb.current.auth);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        authMode,
        isLoading,
        login,
        register,
        requestPasswordReset,
        sendStaffPasswordEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
