import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, setUser } from '../lib/firestore';
import { useAuth } from '../context/AuthContext';
import type { AppUser, UserRole } from '../lib/types';

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 13,
  color: '#333',
  boxSizing: 'border-box' as const,
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const { isAdmin, appUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: isAdmin,
  });

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ uid: '', email: '', displayName: '', role: 'staff' as UserRole });

  const saveMutation = useMutation({
    mutationFn: (data: AppUser) => setUser(data.uid, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); },
  });

  const openEdit = (u: AppUser) => {
    setEditTarget(u);
    setForm({ uid: u.uid, email: u.email, displayName: u.displayName, role: u.role });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ uid: '', email: '', displayName: '', role: 'staff' });
    setShowModal(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      uid: form.uid,
      email: form.email,
      displayName: form.displayName,
      role: form.role,
      createdAt: editTarget?.createdAt || new Date(),
    });
  };

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>アクセス権限がありません</div>
        <div style={{ fontSize: 13, marginTop: 8 }}>管理者のみアクセス可能です</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>設定</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>スタッフ管理</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          + スタッフ追加
        </button>
      </div>

      {/* Current user info */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #CC0000' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>現在ログイン中</h3>
        <div style={{ fontSize: 14 }}><strong>{appUser?.displayName || '—'}</strong> ({appUser?.email})</div>
        <div style={{ fontSize: 12, color: '#CC0000', marginTop: 4, fontWeight: 600 }}>
          {appUser?.role === 'admin' ? '管理者 (Admin)' : 'スタッフ (Staff)'}
        </div>
      </div>

      {/* User list */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 15 }}>スタッフ一覧</div>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>読み込み中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['表示名', 'メールアドレス', 'ロール', '登録日', '操作'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600 }}>{u.displayName || '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      color: u.role === 'admin' ? '#991b1b' : '#1d4ed8',
                      background: u.role === 'admin' ? '#fee2e2' : '#dbeafe',
                    }}>
                      {u.role === 'admin' ? 'Admin' : 'Staff'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#888' }}>
                    {u.createdAt.toLocaleDateString('ja-JP')}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => openEdit(u)}
                      style={{ padding: '4px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>スタッフデータがありません</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editTarget ? 'スタッフを編集' : 'スタッフを追加'} onClose={() => setShowModal(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>UID (Firebase Auth UID)</label>
            <input value={form.uid} onChange={(e) => setForm(p => ({ ...p, uid: e.target.value }))} style={inputStyle} disabled={!!editTarget} placeholder="Firebase Auth のUID" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>メールアドレス</label>
            <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>表示名</label>
            <input value={form.displayName} onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>ロール</label>
            <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value as UserRole }))} style={inputStyle}>
              <option value="admin">Admin (管理者)</option>
              <option value="staff">Staff (スタッフ)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button onClick={handleSave} disabled={!form.uid || !form.email} style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', opacity: form.uid && form.email ? 1 : 0.5 }}>保存</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
