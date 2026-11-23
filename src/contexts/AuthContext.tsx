'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { getMarketers, saveMarketer } from '@/lib/dataService';
import type { Marketer } from '@/lib/types';

export type UserRole = 'admin' | 'marketer' | 'customer' | 'guest';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isMarketer: boolean;
  currentMarketer: Marketer | null;
  signInWithGoogle: () => Promise<void>;
  loginWithGoogleProfile: (
    profile: { sub: string; name: string; email: string; picture?: string },
    marketer?: Marketer | null,
    forcedRole?: UserRole
  ) => Promise<void>;
  loginAsAdmin: (adminInfo?: { name?: string; email?: string; photoURL?: string }) => void;
  loginAsDemoAdmin: () => void;
  loginAsDemoMarketer: (marketerId?: string) => Promise<void>;
  registerMarketer: (data: { name: string; email: string; phone: string; whatsapp?: string; payoutMethod?: string; payoutAccount?: string; avatar?: string }) => Promise<Marketer>;
  logout: () => Promise<void>;
  refreshMarketer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ctrl_yz_auth_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [currentMarketer, setCurrentMarketer] = useState<Marketer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSavedSession = useCallback(async () => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        if (session.user) {
          setUser(session.user);
          setRole(session.role || 'guest');
          if (session.marketerId) {
            const marketers = await getMarketers();
            const found = marketers.find((m) => m.id === session.marketerId || m.uid === session.user?.uid);
            if (found) setCurrentMarketer(found);
          }
        }
      } else {
        // Real Guest state: do not automatically login as dummy user
        setUser(null);
        setRole('guest');
        setCurrentMarketer(null);
      }
    } catch (e) {
      console.error('Error loading auth session:', e);
      setUser(null);
      setRole('guest');
      setCurrentMarketer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (firebaseUser) {
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com';
          const isUserAdmin = firebaseUser.email === adminEmail;

          const marketers = await getMarketers();
          let marketer = marketers.find((m) => m.email === firebaseUser.email || m.uid === firebaseUser.uid);

          if (!marketer && !isUserAdmin) {
            marketer = await saveMarketer({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'مسوق جديد',
              email: firebaseUser.email || '',
              phone: firebaseUser.phoneNumber || '',
            });
          }

          const u: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          setUser(u);
          const assignedRole = isUserAdmin ? 'admin' : 'marketer';
          setRole(assignedRole);
          setCurrentMarketer(marketer || null);
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ user: u, role: assignedRole, marketerId: marketer?.id })
          );
        } else {
          loadSavedSession();
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      loadSavedSession();
    }
  }, [loadSavedSession]);

  const refreshMarketer = useCallback(async () => {
    if (currentMarketer) {
      const marketers = await getMarketers();
      const updated = marketers.find((m) => m.id === currentMarketer.id);
      if (updated) setCurrentMarketer(updated);
    }
  }, [currentMarketer]);

  const loginWithGoogleProfile = async (
    profile: { sub: string; name: string; email: string; picture?: string },
    marketer?: Marketer | null,
    forcedRole?: UserRole
  ) => {
    const adminEmails = [
      'admin@ctrlyz.com',
      'kareem0707@gmail.com',
      process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase(),
    ].filter(Boolean);

    const isUserAdmin = forcedRole === 'admin' || (profile.email && adminEmails.includes(profile.email.toLowerCase()));
    const assignedRole: UserRole = isUserAdmin ? 'admin' : forcedRole || (marketer ? 'marketer' : 'marketer');

    const authUser: AuthUser = {
      uid: profile.sub,
      email: profile.email,
      displayName: profile.name,
      photoURL: profile.picture || null,
    };

    setUser(authUser);
    setRole(assignedRole);
    setCurrentMarketer(marketer || null);

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: authUser,
        role: assignedRole,
        marketerId: marketer?.id || null,
      })
    );
  };

  const loginAsAdmin = (adminInfo?: { name?: string; email?: string; photoURL?: string }) => {
    const adminUser: AuthUser = {
      uid: 'admin-super-root',
      email: adminInfo?.email || 'admin@ctrlyz.com',
      displayName: adminInfo?.name || 'إدارة Ctrl YZ الرسمية',
      photoURL: adminInfo?.photoURL || null,
    };
    setUser(adminUser);
    setRole('admin');
    setCurrentMarketer(null);
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: adminUser, role: 'admin' })
    );
  };

  const loginAsDemoAdmin = () => {
    loginAsAdmin({ name: 'المدير العام (Admin)', email: 'admin@ctrlyz.com' });
  };

  const loginAsDemoMarketer = async (marketerId?: string) => {
    const marketers = await getMarketers();
    const target = marketerId
      ? marketers.find((m) => m.id === marketerId) || marketers[0]
      : marketers[0];

    if (target) {
      const mUser: AuthUser = {
        uid: target.uid,
        email: target.email,
        displayName: target.name,
      };
      setUser(mUser);
      setRole('marketer');
      setCurrentMarketer(target);
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: mUser, role: 'marketer', marketerId: target.id })
      );
    }
  };

  const registerMarketer = async (data: {
    name: string;
    email: string;
    phone: string;
    whatsapp?: string;
    payoutMethod?: string;
    payoutAccount?: string;
    avatar?: string;
  }): Promise<Marketer> => {
    const newMarketer = await saveMarketer({
      name: data.name,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      avatar: data.avatar,
      payoutInfo: {
        method: (data.payoutMethod as any) || 'vodafone_cash',
        accountNumber: data.payoutAccount || data.phone,
        accountHolderName: data.name,
      },
    });

    const mUser: AuthUser = {
      uid: newMarketer.uid,
      email: newMarketer.email,
      displayName: newMarketer.name,
      photoURL: data.avatar || null,
    };
    setUser(mUser);
    setRole('marketer');
    setCurrentMarketer(newMarketer);
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: mUser, role: 'marketer', marketerId: newMarketer.id })
    );
    return newMarketer;
  };

  const signInWithGoogle = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        console.error('Google Sign In error:', err);
        throw err;
      }
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setUser(null);
    setRole('guest');
    setCurrentMarketer(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        isAdmin: role === 'admin',
        isMarketer: role === 'marketer',
        currentMarketer,
        signInWithGoogle,
        loginWithGoogleProfile,
        loginAsAdmin,
        loginAsDemoAdmin,
        loginAsDemoMarketer,
        registerMarketer,
        logout,
        refreshMarketer,
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
