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
  // Initialize user from localStorage immediately to prevent flash
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getAuthToken();
    const savedUser = getCurrentUser();
    // Only use saved user if we also have a token
    return token && savedUser ? savedUser : null;
  });
  
  // Start with loading=false if we already have user data from localStorage
  const [loading, setLoading] = useState(() => {
    const token = getAuthToken();
    const savedUser = getCurrentUser();
    // If we have both token and user, don't show loading
    return !(token && savedUser);
  });
  
  const [verificationDone, setVerificationDone] = useState(false);

  useEffect(() => {
    // Skip if already verified this session
    if (verificationDone) return;
    
    const verifySession = async () => {
      const token = getAuthToken();
      const currentUser = getCurrentUser();
      
      // If no token or no saved user, definitely not logged in
      if (!token || !currentUser) {
        setUser(null);
        setLoading(false);
        setVerificationDone(true);
        return;
      }

      // We have local session, verify it in background (don't block UI)
      try {
        const result = await authApi.verifyToken();
        
        if (result.success && result.data) {
          // Token still valid, update user data if changed
          const verifiedUser: AuthUser = {
            id: result.data.id,
            email: result.data.email,
            fullName: result.data.full_name,
          };
          saveCurrentUser(verifiedUser);
          setUser(verifiedUser);
        } else if (result.error) {
          // Analyze the error type
          const errorLower = result.error.toLowerCase();
          
          // Network/CORS errors - keep local session, don't log out
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
          
          if (isNetworkError) {
            // Network issue - keep using local session, don't disturb user
            console.warn('Network error during token verification, keeping local session');
          } else {
            // Check for genuine authentication failures
            const isAuthFailure = 
              errorLower.includes('tidak valid') || 
              errorLower.includes('kadaluarsa') ||
              errorLower.includes('tidak ditemukan') ||
              errorLower.includes('expired') ||
              errorLower.includes('invalid') ||
              errorLower.includes('unauthorized') ||
              errorLower.includes('401');
            
            if (isAuthFailure) {
              // Token is definitely invalid - clear session
              console.log('Token expired or invalid, clearing session');
              removeAuthToken();
              saveCurrentUser(null);
              setUser(null);
            }
            // For other server errors (500, etc.), keep session
          }
        }
      } catch (error) {
        // Exception during verification - keep local session
        console.warn('Exception during token verification, keeping cached session:', error);
      }
      
      setLoading(false);
      setVerificationDone(true);
    };

    verifySession();
  }, [verificationDone]);

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: Error | null }> => {
    // Check if email is allowed
    if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      return { error: new Error('Email tidak diizinkan untuk mendaftar. Hanya email yang terdaftar yang dapat mengakses sistem ini.') };
    }

    try {
      const result = await authApi.register(email, password, fullName);
      
      if (!result.success || !result.data) {
        return { error: new Error(result.error || 'Terjadi kesalahan saat mendaftar') };
      }

      // Save token and user
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
    // Check if email is allowed
    if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      return { error: new Error('Email tidak diizinkan untuk login. Hanya email yang terdaftar yang dapat mengakses sistem ini.') };
    }

    try {
      const result = await authApi.login(email, password);
      
      if (!result.success || !result.data) {
        return { error: new Error(result.error || 'Email atau password salah') };
      }

      // Save token and user
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
      // Call logout API to invalidate token on server
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
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
