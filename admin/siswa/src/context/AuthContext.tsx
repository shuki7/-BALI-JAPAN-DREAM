import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { getUser, setUser as setFsUser } from '../lib/firestore';
import { useLanguage } from './LanguageContext';
import type { AppUser } from '../lib/types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  googleToken: string | null;
  googleTokenStatus: 'connected' | 'expired' | 'none';
  refreshGoogleToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const checkToken = () => {
    const token = localStorage.getItem('google_access_token');
    const ts = Number(localStorage.getItem('google_access_token_ts') || '0');
    if (token && Date.now() - ts < 55 * 60 * 1000) {
      setGoogleToken(token);
      return true;
    }
    setGoogleToken(null);
    return false;
  };

  useEffect(() => {
    checkToken();
    const interval = setInterval(checkToken, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        checkToken();
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
    try {
      const token = await signInWithGoogle();
      if (token) {
        setGoogleToken(token);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        alert(language === 'ja' ? 'ブラウザのポップアップがブロックされました。アドレスバーのアイコンから許可してください。' : 'Popup diblokir oleh browser. Harap izinkan melalui ikon di bilah alamat.');
      }
      throw err;
    }
  };

  const isAdmin = appUser?.role === 'admin';
  const isStaff = appUser?.role === 'admin' || appUser?.role === 'staff';
  const googleTokenStatus = googleToken ? 'connected' : (localStorage.getItem('google_access_token') ? 'expired' : 'none');

  return (
    <AuthContext.Provider value={{ user, appUser, loading, logout, isAdmin, isStaff, googleToken, googleTokenStatus, refreshGoogleToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
