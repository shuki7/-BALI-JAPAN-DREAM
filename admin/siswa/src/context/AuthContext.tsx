import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { getUser, setUser as setFsUser } from '../lib/firestore';
import type { AppUser } from '../lib/types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  googleToken: string | null;
  refreshGoogleToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    const token = localStorage.getItem('google_access_token');
    const ts = Number(localStorage.getItem('google_access_token_ts') || '0');
    // Treat token as valid for 55 minutes (tokens expire in 60)
    if (token && Date.now() - ts < 55 * 60 * 1000) return token;
    return null;
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Re-check token validity on auth state change
        const token = localStorage.getItem('google_access_token');
        const ts = Number(localStorage.getItem('google_access_token_ts') || '0');
        if (token && Date.now() - ts < 55 * 60 * 1000) {
          setGoogleToken(token);
        } else {
          setGoogleToken(null);
        }
        const au = await getUser(u.uid);
        if (!au) {
          const newUser: AppUser = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || '',
            role: 'admin',
            createdAt: new Date(),
          };
          await setFsUser(u.uid, newUser);
          setAppUser(newUser);
        } else {
          setAppUser(au);
        }
      } else {
        setAppUser(null);
        setGoogleToken(null);
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_access_token_ts');
      }
      setLoading(false);
    });
  }, []);

  const logout = () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_access_token_ts');
    signOut(auth);
  };

  const refreshGoogleToken = async () => {
    const token = await signInWithGoogle();
    if (token) {
      setGoogleToken(token);
    }
  };

  const isAdmin = appUser?.role === 'admin';
  const isStaff = appUser?.role === 'admin' || appUser?.role === 'staff';

  return (
    <AuthContext.Provider value={{ user, appUser, loading, logout, isAdmin, isStaff, googleToken, refreshGoogleToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
