import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, getAuthToken, setAuthToken, removeAuthToken } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'auth-current-user';

// ONLY this email can register and login
const ALLOWED_EMAIL = 'abdurrohmanmuthi@gmail.com';

function getCurrentUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCurrentUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getAuthToken();
    const savedUser = getCurrentUser();
    return token && savedUser ? savedUser : null;
  });
  
  const [loading, setLoading] = useState(() => {
    const token = getAuthToken();
    const savedUser = getCurrentUser();
    return !(token && savedUser);
  });
  
  const [verificationDone, setVerificationDone] = useState(false);

  useEffect(() => {
    if (verificationDone) return;
    
    const verifySession = async () => {
      const token = getAuthToken();
      const currentUser = getCurrentUser();
      
      if (!token || !currentUser) {
        setUser(null);
        setLoading(false);
        setVerificationDone(true);
        return;
      }

      try {
        const result = await authApi.verifyToken();
        
        if (result.success && result.data) {
          const verifiedUser: AuthUser = {
            id: result.data.id,
            email: result.data.email,
            fullName: result.data.full_name,
          };
          saveCurrentUser(verifiedUser);
          setUser(verifiedUser);
        } else if (result.error) {
          const errorLower = result.error.toLowerCase();
          
          const isNetworkError = 
            errorLower.includes('network') || 
            errorLower.includes('fetch') ||
            errorLower.includes('cors') ||
            errorLower.includes('failed to fetch') ||
            errorLower.includes('load failed') ||
            errorLower.includes('mixed content') ||
            errorLower.includes('blocked') ||
            errorLower.includes('timeout') ||
            errorLower.includes('aborted');
          
          if (!isNetworkError) {
            const isAuthFailure = 
              errorLower.includes('tidak valid') || 
              errorLower.includes('kadaluarsa') ||
              errorLower.includes('tidak ditemukan') ||
              errorLower.includes('expired') ||
              errorLower.includes('invalid') ||
              errorLower.includes('unauthorized') ||
              errorLower.includes('401');
            
            if (isAuthFailure) {
              removeAuthToken();
              saveCurrentUser(null);
              setUser(null);
            }
          }
        }
      } catch (error) {
        // Keep local session on exception
      }
      
      setLoading(false);
      setVerificationDone(true);
    };

    verifySession();
  }, [verificationDone]);

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: Error | null }> => {
    if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      return { error: new Error('Email tidak diizinkan untuk mendaftar. Hanya email yang terdaftar yang dapat mengakses sistem ini.') };
    }

    try {
      const result = await authApi.register(email, password, fullName);
      
      if (!result.success || !result.data) {
        return { error: new Error(result.error || 'Terjadi kesalahan saat mendaftar') };
      }

      setAuthToken(result.data.token);
      
      const authUser: AuthUser = {
        id: result.data.id,
        email: result.data.email,
        fullName: result.data.full_name,
      };
      saveCurrentUser(authUser);
      setUser(authUser);

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Terjadi kesalahan saat mendaftar') };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      return { error: new Error('Email tidak diizinkan untuk login. Hanya email yang terdaftar yang dapat mengakses sistem ini.') };
    }

    try {
      const result = await authApi.login(email, password);
      
      if (!result.success || !result.data) {
        return { error: new Error(result.error || 'Email atau password salah') };
      }

      setAuthToken(result.data.token);
      
      const authUser: AuthUser = {
        id: result.data.id,
        email: result.data.email,
        fullName: result.data.full_name,
      };
      saveCurrentUser(authUser);
      setUser(authUser);

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Terjadi kesalahan saat login') };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      // Silent catch
    } finally {
      removeAuthToken();
      saveCurrentUser(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}