import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaffMembers, addStaffMember, updateStaffMember, deleteStaffMember } from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import type { StaffMember } from '../lib/types';

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
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 580, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const emptyForm = {
  fullName: '',
  fullNameKana: '',
  role: 'staff' as StaffMember['role'],
  specialty: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  joinedDate: '',
  isActive: true,
  notes: '',
};

export default function Staff() {
  const { language } = useLanguage();
  const t = translations[language];
  const queryClient = useQueryClient();
  const { data: staff = [], isLoading } = useQuery({ queryKey: ['staffMembers'], queryFn: getStaffMembers });

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);

  const addMutation = useMutation({
    mutationFn: (data: Omit<StaffMember, 'id'>) => addStaffMember(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staffMembers'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffMember> }) => updateStaffMember(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staffMembers'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaffMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staffMembers'] }),
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditTarget(s);
    setForm({
      fullName: s.fullName,
      fullNameKana: s.fullNameKana || '',
      role: s.role,
      specialty: s.specialty || '',
      phone: s.phone,
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      address: s.address || '',
      joinedDate: s.joinedDate ? new Date(s.joinedDate).toISOString().split('T')[0] : '',
      isActive: s.isActive,
      notes: s.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const data: Omit<StaffMember, 'id'> = {
      fullName: form.fullName,
      fullNameKana: form.fullNameKana || undefined,
      role: form.role,
      specialty: form.specialty || undefined,
      phone: form.phone,
      whatsapp: form.whatsapp || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      joinedDate: form.joinedDate ? new Date(form.joinedDate) : undefined,
      isActive: form.isActive,
      notes: form.notes || undefined,
      createdAt: editTarget?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const roleLabels = {
    staff: language === 'ja' ? 'スタッフ' : 'Staf',
    teacher: language === 'ja' ? '先生' : 'Guru',
    management: language === 'ja' ? 'マネジメント' : 'Manajemen',
    other: language === 'ja' ? 'その他' : 'Lainnya',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.staff_management}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>{language === 'ja' ? 'スタッフ・講師一覧' : 'Daftar staf & guru'} — {staff.length}{language === 'ja' ? '名' : ' orang'}</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          + {language === 'ja' ? 'スタッフ追加' : 'Tambah Staf'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>{language === 'ja' ? '読み込み中...' : 'Memuat...'}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {[
                  language === 'ja' ? '氏名' : 'Nama',
                  language === 'ja' ? '役割' : 'Peran',
                  language === 'ja' ? '専門/担当' : 'Spesialisasi',
                  language === 'ja' ? '連絡先' : 'Kontak',
                  language === 'ja' ? '入社日' : 'Tgl Masuk',
                  language === 'ja' ? '状態' : 'Status',
                  language === 'ja' ? '操作' : 'Aksi'
                ].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.fullName}</div>
                    {s.fullNameKana && <div style={{ fontSize: 11, color: '#888' }}>{s.fullNameKana}</div>}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: 4, 
                      fontSize: 11, 
                      fontWeight: 600,
                      background: s.role === 'teacher' ? '#e0f2fe' : s.role === 'management' ? '#fef3c7' : '#f3f4f6',
                      color: s.role === 'teacher' ? '#0369a1' : s.role === 'management' ? '#92400e' : '#374151'
                    }}>
                      {roleLabels[s.role]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>
                    {s.specialty || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>
                    {s.phone}<br />
                    <span style={{ fontSize: 11, color: '#888' }}>{s.email}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    {s.joinedDate ? new Date(s.joinedDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: s.isActive ? '#166534' : '#6b7280', background: s.isActive ? '#dcfce7' : '#f3f4f6' }}>
                      {s.isActive ? (language === 'ja' ? 'アクティブ' : 'Aktif') : (language === 'ja' ? '非アクティブ' : 'Nonaktif')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(s)} style={{ padding: '4px 10px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>{language === 'ja' ? '編集' : 'Edit'}</button>
                      <button onClick={() => { if (confirm(language === 'ja' ? '削除しますか？' : 'Hapus staf ini?')) deleteMutation.mutate(s.id); }} style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#991b1b' }}>{t.delete}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>{language === 'ja' ? 'データがありません' : 'Tidak ada data'}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editTarget ? (language === 'ja' ? 'スタッフを編集' : 'Edit Staf') : (language === 'ja' ? 'スタッフを追加' : 'Tambah Staf')} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '氏名 *' : 'Nama Lengkap *'}</label>
              <input type="text" value={form.fullName} onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? 'フリガナ' : 'Furigana'}</label>
              <input type="text" value={form.fullNameKana} onChange={(e) => setForm(p => ({ ...p, fullNameKana: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '役割' : 'Peran'}</label>
              <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value as StaffMember['role'] }))} style={inputStyle}>
                <option value="staff">{roleLabels.staff}</option>
                <option value="teacher">{roleLabels.teacher}</option>
                <option value="management">{roleLabels.management}</option>
                <option value="other">{roleLabels.other}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '専門/担当' : 'Spesialisasi'}</label>
              <input type="text" value={form.specialty} placeholder="例: 日本語講師" onChange={(e) => setForm(p => ({ ...p, specialty: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '電話番号' : 'No. Telepon'}</label>
              <input type="text" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>WhatsApp</label>
              <input type="text" value={form.whatsapp} onChange={(e) => setForm(p => ({ ...p, whatsapp: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? 'メール' : 'Email'}</label>
              <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '住所' : 'Alamat'}</label>
              <input type="text" value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '入社日' : 'Tanggal Masuk'}</label>
              <input type="date" value={form.joinedDate} onChange={(e) => setForm(p => ({ ...p, joinedDate: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <input type="checkbox" id="staffActive" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="staffActive" style={{ fontSize: 13 }}>{language === 'ja' ? 'アクティブ' : 'Aktif'}</label>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? 'メモ' : 'Catatan'}</label>
            <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, height: 60, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={handleSave} style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>{t.save}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
