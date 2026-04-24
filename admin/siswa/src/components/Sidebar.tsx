import React from 'react';
import { Users, LayoutDashboard, Settings, LogOut, FileText, Package, AlertTriangle, School, UserCheck, Briefcase, Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const { language } = useLanguage();
  const { isAdmin, googleTokenStatus, refreshGoogleToken } = useAuth();
  const t = translations[language];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'students', label: t.students, icon: Users },
    { id: 'payments', label: t.payments, icon: FileText },
    { id: 'documents', label: t.documents, icon: FileText },
    { id: 'discipline', label: t.discipline, icon: AlertTriangle },
    { id: 'partners', label: t.partners, icon: School },
    { id: 'scouters', label: t.scouters, icon: UserCheck },
    { id: 'commissions', label: t.commissions, icon: Briefcase },
    { id: 'inventory', label: t.inventory, icon: Package },
    { id: 'organizations', label: t.organizations, icon: Building2 },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  // Filter out admin-only items if needed, or just keep them all for now
  const visibleItems = isAdmin ? menuItems : menuItems.filter(item => 
    ['dashboard', 'students', 'documents', 'discipline', 'settings'].includes(item.id)
  );

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      width: '240px',
      height: '100vh',
      background: '#1a1a2e',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #CC0000, #990000)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: '10px',
            boxShadow: '0 4px 12px rgba(204,0,0,0.4)',
            flexShrink: 0,
          }}>BJD</div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '14px', letterSpacing: '0.05em' }}>BJD SISWA</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
              {language === 'ja' ? '管理システム' : 'Sistem Manajemen'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '4px',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s',
                background: isActive ? 'linear-gradient(135deg, #CC0000, #990000)' : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                boxShadow: isActive ? '0 4px 12px rgba(204,0,0,0.3)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Google Drive Connection */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Google Drive</div>
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            background: googleTokenStatus === 'connected' ? '#10b981' : googleTokenStatus === 'expired' ? '#f59e0b' : '#6b7280' 
          }} />
        </div>
        
        {googleTokenStatus !== 'connected' ? (
          <button
            onClick={() => refreshGoogleToken()}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <span>{language === 'ja' ? 'Driveに接続' : 'Hubungkan Drive'}</span>
          </button>
        ) : (
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, textAlign: 'center' }}>
            {language === 'ja' ? '接続済み' : 'Terhubung'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 8px' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <LogOut size={18} />
          <span>{t.logout}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
