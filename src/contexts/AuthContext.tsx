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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const verifySession = async () => {
      const token = getAuthToken();
      const currentUser = getCurrentUser();
      
      // If no token or no saved user, not logged in
      if (!token || !currentUser) {
        setLoading(false);
        return;
      }

      // Try to verify token with API
      try {
        const result = await authApi.verifyToken();
        
        if (result.success && result.data) {
          // Token valid, update user from API response
          const verifiedUser: AuthUser = {
            id: result.data.id,
            email: result.data.email,
            fullName: result.data.full_name,
          };
          saveCurrentUser(verifiedUser);
          setUser(verifiedUser);
        } else {
          // Token invalid according to API - check if it's a network/CORS issue
          // If the error suggests network issues, keep the local session
          const isNetworkError = result.error?.includes('Network') || 
                                  result.error?.includes('fetch') ||
                                  result.error?.includes('CORS');
          
          if (isNetworkError) {
            // Network issue - trust local storage for now
            console.warn('Network error during token verification, using cached session');
            setUser(currentUser);
          } else {
            // Genuine auth failure - clear session
            console.log('Token verification failed:', result.error);
            removeAuthToken();
            saveCurrentUser(null);
            setUser(null);
          }
        }
      } catch (error) {
        // Network error - trust local session
        console.warn('Exception during token verification, using cached session:', error);
        setUser(currentUser);
      }
      
      setLoading(false);
    };

    verifySession();
  }, []);

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: Error | null }> => {
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
