import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { auth, signInWithGoogle } from '../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { LogIn, Users, GraduationCap, Clock, CheckCircle } from 'lucide-react';
import StudentList from '../components/StudentList';
import StudentForm from '../components/StudentForm';
import DocumentTab from '../components/DocumentTab';
import ActivityList from '../components/ActivityList';
import ActivityChart from '../components/ActivityChart';
import type { Student, StudentStats } from '../types/student';
import { studentService } from '../lib/studentService';

interface AdminLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Dashboard = ({ stats }: { stats: StudentStats }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">システムの概要と統計情報</p>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[ 
        { label: '登録生徒数', value: stats.total.toString(), color: 'bg-blue-500', icon: Users },
        { label: '在籍中', value: stats.active.toString(), color: 'bg-green-500', icon: GraduationCap },
        { label: '卒業生', value: stats.graduated.toString(), color: 'bg-orange-500', icon: CheckCircle },
        { label: '退学者', value: stats.withdrawn.toString(), color: 'bg-red-500', icon: Clock }
      ].map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="card p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <span className="text-gray-500 font-medium text-sm tracking-wide">{stat.label}</span>
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current opacity-80 group-hover:opacity-100 transition-opacity`}>
                <Icon size={24} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold text-gray-800 tabular-nums">{stat.value}</span>
              <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <span>↑ 12%</span>
                <span className="text-gray-400 font-normal">先月比</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-6 h-80 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900">アクティビティ傾向</h3>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">直近7日間</span>
        </div>
        <div className="flex-grow">
          <ActivityChart />
        </div>
      </div>
      <div className="card p-6 h-80 space-y-4 overflow-hidden flex flex-col">
        <h3 className="font-bold text-gray-900 border-b pb-3 shrink-0">最近のアクティビティ</h3>
        <div className="overflow-y-auto flex-grow pr-2">
          <ActivityList />
        </div>
      </div>
    </div>
  </div>
);


const AdminLayout = ({ activeTab, setActiveTab }: AdminLayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('gdrive_token'));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
  const [stats, setStats] = useState<StudentStats>({ total: 0, active: 0, graduated: 0, withdrawn: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  const loadStats = async () => {
    try {
      const students = await studentService.getStudents();
      const newStats: StudentStats = {
        total: students.length,
        active: students.filter(s => s.status === 'active').length,
        graduated: students.filter(s => s.status === 'graduated').length,
        withdrawn: students.filter(s => s.status === 'withdrawn').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const token = await signInWithGoogle();
      if (token) {
        setGoogleToken(token);
        localStorage.setItem('gdrive_token', token);
      }
    } catch (error) {
      alert("ログインに失敗しました");
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setGoogleToken(null);
    localStorage.removeItem('gdrive_token');
  };

  const handleOpenAddForm = () => {
    setEditingStudent(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #CC0000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
          <div style={{ color: '#CC0000', fontWeight: 600 }}>BJD SISWA 読み込み中...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'linear-gradient(135deg, #b0b0b0 0%, #d8d8d8 40%, #c0c0c0 100%)',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            padding: '48px 40px',
            textAlign: 'center',
          }}>
            <img
              src="https://balijapandream.com/images/logo.png"
              alt="BJD Logo"
              style={{ width: '80px', margin: '0 auto 24px', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#CC0000', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              BJD SISWA
            </h1>
            <div style={{ width: '40px', height: '2px', background: '#e5e7eb', margin: '12px auto' }}></div>
            <p style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '32px' }}>
              内部スタッフ専用管理システム
            </p>
            <button
              onClick={handleLogin}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #CC0000, #990000)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(204,0,0,0.3)',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <LogIn size={18} />
              Googleアカウントでログイン
            </button>
            <p style={{ marginTop: '24px', fontSize: '10px', color: '#d1d5db', letterSpacing: '0.15em', fontWeight: 600, textTransform: 'uppercase' }}>
              Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#C0C0C0' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      <main style={{ marginLeft: '240px', padding: '32px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {activeTab === 'dashboard' && <Dashboard stats={stats} />}
          {activeTab === 'students' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StudentList 
                key={refreshKey}
                onAddClick={handleOpenAddForm} 
                onEditClick={handleOpenEditForm} 
              />
            </div>
          )}
          {activeTab === 'documents' && (
            <DocumentTab accessToken={googleToken || ''} />
          )}
          {activeTab !== 'dashboard' && activeTab !== 'students' && activeTab !== 'documents' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Users size={40} className="opacity-20" />
              </div>
              <p className="text-2xl font-bold tracking-tight">{activeTab} は開発中です</p>
              <p className="text-sm mt-2 font-medium">Coming Soon</p>
            </div>
          )}
        </div>
      </main>

      {isFormOpen && (
        <StudentForm 
          student={editingStudent}
          googleAccessToken={googleToken || ''}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};

export default AdminLayout;
