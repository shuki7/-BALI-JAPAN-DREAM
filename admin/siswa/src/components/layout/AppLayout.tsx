import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_BG = '#1a1a2e';
const ACTIVE_BG = '#CC0000';
const TEXT_COLOR = '#e0e0e0';
const HOVER_BG = 'rgba(255,255,255,0.08)';

const NAV_ITEMS: { key: keyof typeof translations.ja; path: string; adminOnly?: boolean }[] = [
  { key: 'dashboard', path: '/dashboard' },
  { key: 'students', path: '/students' },
  { key: 'payments', path: '/payments' },
  { key: 'documents', path: '/documents' },
  { key: 'discipline', path: '/discipline' },
  { key: 'partners', path: '/partners' },
  { key: 'scouters', path: '/scouters' },
  { key: 'staff', path: '/staff' },
  { key: 'commissions', path: '/commissions', adminOnly: true },
  { key: 'organizations', path: '/organizations' },
  { key: 'inventory', path: '/inventory' },
  { key: 'settings', path: '/settings', adminOnly: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { appUser, logout, isAdmin } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[language];

  // Translate nav items based on current language
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Sidebar */}
      <div
        style={{
          width: SIDEBAR_WIDTH,
          minWidth: SIDEBAR_WIDTH,
          background: SIDEBAR_BG,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          overflowY: 'auto',
        }}
      >
        {/* Logo area */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>
            🇮🇩 BJD 🇯🇵
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
            Bali Japan Dream
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {visibleItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const label = t[item.key] as string;
            const sublabel = translations.id[item.key] as string;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 20px',
                  background: isActive ? ACTIVE_BG : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActive ? '#fff' : TEXT_COLOR,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  transition: 'background 0.15s',
                  borderLeft: isActive ? '3px solid #FF4444' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = HOVER_BG;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 10, color: '#888', fontStyle: 'italic' }}>{sublabel}</span>
              </button>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {appUser && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appUser.email}
              </div>
              <div style={{ fontSize: 11, color: '#CC0000', marginTop: 2 }}>
                {appUser.role === 'admin' ? t.role_admin : t.role_staff}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(204,0,0,0.2)',
              border: '1px solid rgba(204,0,0,0.4)',
              borderRadius: 6,
              color: '#ff6666',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {t.logout}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: SIDEBAR_WIDTH, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #e0e0e0',
            padding: '0 24px',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
              {(() => {
                const item = visibleItems.find((i) => location.pathname.startsWith(i.path));
                return item ? (t[item.key] as string) : 'BJD';
              })()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              style={{
                background: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#555'
              }}
            >
              <span>{language === 'ja' ? '🇯🇵 日本語' : '🇮🇩 Indonesia'}</span>
              <span style={{ fontSize: 10, color: '#999' }}>⇄</span>
            </button>

            <div style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>
              {appUser?.displayName || appUser?.email}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
