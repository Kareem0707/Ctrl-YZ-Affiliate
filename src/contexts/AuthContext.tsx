'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { getMarketers, saveMarketer } from '@/lib/dataService';
import type { Marketer } from '@/lib/types';

export type UserRole = 'admin' | 'marketer' | 'customer' | 'guest';

interface AuthUser {
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
  loginAsDemoAdmin: () => void;
  loginAsDemoMarketer: (marketerId?: string) => Promise<void>;
  registerMarketer: (data: { name: string; email: string; phone: string; whatsapp?: string; payoutMethod?: string; payoutAccount?: string }) => Promise<Marketer>;
  logout: () => Promise<void>;
  refreshMarketer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ctrl_yz_auth_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole>('marketer'); // Default demo role to marketer
  const [currentMarketer, setCurrentMarketer] = useState<Marketer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSavedSession = useCallback(async () => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        setUser(session.user);
        setRole(session.role);
        if (session.marketerId) {
          const marketers = await getMarketers();
          const found = marketers.find((m) => m.id === session.marketerId || m.uid === session.user?.uid);
          if (found) setCurrentMarketer(found);
        }
      } else {
        // Default initialization: sign in as Demo Marketer Ahmed so the user immediately sees the real affiliate experience
        const marketers = await getMarketers();
        const defaultMarketer = marketers[0] || null;
        if (defaultMarketer) {
          setUser({
            uid: defaultMarketer.uid,
            email: defaultMarketer.email,
            displayName: defaultMarketer.name,
          });
          setRole('marketer');
          setCurrentMarketer(defaultMarketer);
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              user: {
                uid: defaultMarketer.uid,
                email: defaultMarketer.email,
                displayName: defaultMarketer.name,
              },
              role: 'marketer',
              marketerId: defaultMarketer.id,
            })
          );
        }
      }
    } catch (e) {
      console.error('Error loading auth session:', e);
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

  const loginAsDemoAdmin = () => {
    const adminUser: AuthUser = {
      uid: 'admin-super-id',
      email: 'admin@ctrlyz.com',
      displayName: 'المدير العام (Admin)',
    };
    setUser(adminUser);
    setRole('admin');
    setCurrentMarketer(null);
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: adminUser, role: 'admin' })
    );
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
  }): Promise<Marketer> => {
    const newMarketer = await saveMarketer({
      name: data.name,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
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
    } else {
      // Offline fallback: prompt demo login
      await loginAsDemoMarketer();
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
