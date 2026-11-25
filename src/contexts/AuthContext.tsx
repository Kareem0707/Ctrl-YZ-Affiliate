'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Marketer } from '@/lib/types';
import type { AuthNextStep, SessionAffiliateStatus, SessionRole } from '@/lib/auth/session';

export type UserRole = 'admin' | 'marketer' | 'customer' | 'guest';

export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  displayName: string;
  avatarUrl?: string | null;
  photoURL?: string | null;
  role: SessionRole;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
}

export type AuthenticatedMarketer = Marketer & {
  dbStatus?: SessionAffiliateStatus;
  lockedBalance?: number;
};

export interface GoogleAuthResult {
  authenticated: boolean;
  user: AuthUser;
  affiliate: AuthenticatedMarketer | null;
  nextStep: AuthNextStep;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  role: UserRole;
  dbRole: SessionRole | null;
  isAdmin: boolean;
  isMarketer: boolean;
  isActiveMarketer: boolean;
  currentMarketer: AuthenticatedMarketer | null;
  nextStep: AuthNextStep | null;
  authenticateWithGoogle: (credential: string) => Promise<GoogleAuthResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshMarketer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapDbRoleToUiRole(dbRole?: SessionRole | null): UserRole {
  switch (dbRole) {
    case 'ADMIN':
      return 'admin';
    case 'MARKETER':
      return 'marketer';
    case 'CUSTOMER':
      return 'customer';
    default:
      return 'guest';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dbRole, setDbRole] = useState<SessionRole | null>(null);
  const [currentMarketer, setCurrentMarketer] = useState<AuthenticatedMarketer | null>(null);
  const [nextStep, setNextStep] = useState<AuthNextStep | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        setUser(null);
        setDbRole(null);
        setCurrentMarketer(null);
        setNextStep(null);
        return;
      }

      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setDbRole(data.user.role);
        setCurrentMarketer(data.affiliate ?? null);
        setNextStep(data.nextStep ?? null);
      } else {
        setUser(null);
        setDbRole(null);
        setCurrentMarketer(null);
        setNextStep(null);
      }
    } catch (err) {
      console.error('[AuthContext] Failed to verify server session:', err);
      setUser(null);
      setDbRole(null);
      setCurrentMarketer(null);
      setNextStep(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const authenticateWithGoogle = useCallback(
    async (credential: string): Promise<GoogleAuthResult> => {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'فشل التحقق من حساب Google على الخادم');
      }

      setUser(data.user);
      setDbRole(data.user.role);
      setCurrentMarketer(data.affiliate ?? null);
      setNextStep(data.nextStep ?? null);

      return data as GoogleAuthResult;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (typeof window !== 'undefined' && window.google?.accounts?.id?.disableAutoSelect) {
        window.google.accounts.id.disableAutoSelect();
      }
    } catch (err) {
      console.error('[AuthContext] Logout error:', err);
    } finally {
      setUser(null);
      setDbRole(null);
      setCurrentMarketer(null);
      setNextStep(null);
    }
  }, []);

  const role = mapDbRoleToUiRole(dbRole);
  const isAdmin = dbRole === 'ADMIN';
  const isMarketer = dbRole === 'MARKETER';
  const isActiveMarketer = Boolean(
    currentMarketer && (currentMarketer.dbStatus === 'ACTIVE' || currentMarketer.status === 'active')
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        dbRole,
        isAdmin,
        isMarketer,
        isActiveMarketer,
        currentMarketer,
        nextStep,
        authenticateWithGoogle,
        logout,
        refreshSession,
        refreshMarketer: refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
