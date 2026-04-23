import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      alert(t.login_failed);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: '#CC0000', fontWeight: 600 }}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #b0b0b0 0%, #d8d8d8 40%, #c0c0c0 100%)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '48px 40px',
          width: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Language Switcher */}
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 6 }}>
          <button
            onClick={() => setLanguage('id')}
            style={{
              padding: '4px 8px',
              fontSize: 10,
              background: language === 'id' ? '#CC0000' : '#f5f5f5',
              color: language === 'id' ? '#fff' : '#666',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ID
          </button>
          <button
            onClick={() => setLanguage('ja')}
            style={{
              padding: '4px 8px',
              fontSize: 10,
              background: language === 'ja' ? '#CC0000' : '#f5f5f5',
              color: language === 'ja' ? '#fff' : '#666',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            JA
          </button>
        </div>
        {/* Logo */}
        <div style={{ fontSize: 40, marginBottom: 8 }}>🇮🇩 BJD 🇯🇵</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: 4,
          }}
        >
          {t.login_title}
        </div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 32 }}>
          {t.login_subtitle}
        </div>

        <div
          style={{
            width: '100%',
            height: 1,
            background: '#e0e0e0',
            marginBottom: 28,
          }}
        />

        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: '#CC0000',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            letterSpacing: 0.5,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#AA0000';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#CC0000';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t.login_google}
        </button>

        <div style={{ marginTop: 20, fontSize: 11, color: '#999' }}>
          {t.login_footer}
        </div>
      </div>
    </div>
  );
}
