import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { DoctorProfile } from '@/types';
import { authService, SERVICE_MODE } from '@/services/api';

interface AuthContextValue {
  doctor: DoctorProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'hca_doctor_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setDoctor(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const { doctor: doc, error: err } = await authService.signIn(email, password);
    if (doc) {
      setDoctor(doc);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      setLoading(false);
      return { success: true, error: null };
    }
    setError(err || 'Sign-in failed.');
    setLoading(false);
    return { success: false, error: err };
  };

  const signOut = async () => {
    await authService.signOut();
    setDoctor(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ doctor, loading, error, signIn, signOut, isDemoMode: SERVICE_MODE === 'demo' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
