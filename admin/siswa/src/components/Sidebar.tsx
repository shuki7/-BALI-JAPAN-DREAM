import React from 'react';
import { Users, LayoutDashboard, Settings, LogOut, FileText, Image as ImageIcon } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { id: 'students', label: '生徒管理', icon: Users },
    { id: 'documents', label: '書類管理', icon: FileText },
    { id: 'images', label: '画像管理', icon: ImageIcon },
    { id: 'settings', label: '設定', icon: Settings },
  ];

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
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>管理システム</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {menuItems.map((item) => {
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

      {/* Footer */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
