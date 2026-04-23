import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScouters, addScouter, updateScouter, deleteScouter } from '../lib/firestore';
import type { Scouter, CommissionPaymentTiming } from '../lib/types';

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
  nickname: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  province: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  commissionPerStudent: 0,
  commissionPaymentTiming: 'on_enrollment' as CommissionPaymentTiming,
  commissionNotes: '',
  isActive: true,
  notes: '',
};

export default function Scouters() {
  const queryClient = useQueryClient();
  const { data: scouters = [], isLoading } = useQuery({ queryKey: ['scouters'], queryFn: getScouters });

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Scouter | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [detailTarget, setDetailTarget] = useState<Scouter | null>(null);

  const addMutation = useMutation({
    mutationFn: (data: Omit<Scouter, 'id'>) => addScouter(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scouters'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Scouter> }) => updateScouter(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scouters'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScouter,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scouters'] }),
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: Scouter) => {
    setEditTarget(s);
    setForm({
      fullName: s.fullName,
      nickname: s.nickname || '',
      phone: s.phone,
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      address: s.address || '',
      city: s.city || '',
      province: s.province || '',
      bankName: s.bankName || '',
      bankAccountNumber: s.bankAccountNumber || '',
      bankAccountHolder: s.bankAccountHolder || '',
      commissionPerStudent: s.commissionPerStudent,
      commissionPaymentTiming: s.commissionPaymentTiming,
      commissionNotes: s.commissionNotes || '',
      isActive: s.isActive,
      notes: s.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const data: Omit<Scouter, 'id'> = {
      fullName: form.fullName,
      nickname: form.nickname || undefined,
      phone: form.phone,
      whatsapp: form.whatsapp || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      province: form.province || undefined,
      bankName: form.bankName || undefined,
      bankAccountNumber: form.bankAccountNumber || undefined,
      bankAccountHolder: form.bankAccountHolder || undefined,
      commissionPerStudent: form.commissionPerStudent,
      commissionPaymentTiming: form.commissionPaymentTiming,
      commissionNotes: form.commissionNotes || undefined,
      isActive: form.isActive,
      notes: form.notes || undefined,
      createdAt: editTarget?.createdAt || new Date(),
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const timingLabel = (t: CommissionPaymentTiming) => ({
    on_enrollment: '入学時',
    on_departure: '出発時',
    on_job_matching: 'JM時',
    custom: 'カスタム',
  }[t]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>スカウター</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>紹介者管理 — {scouters.length}名</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          + スカウター追加
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>読み込み中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['氏名', '連絡先', '紹介数', 'コミッション/人', '支払いタイミング', '状態', '操作'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scouters.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.fullName}</div>
                    {s.nickname && <div style={{ fontSize: 12, color: '#888' }}>{s.nickname}</div>}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>
                    {s.phone}<br />{s.email}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{s.totalStudentsReferred || 0}名</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>Rp {s.commissionPerStudent.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{timingLabel(s.commissionPaymentTiming)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: s.isActive ? '#166534' : '#6b7280', background: s.isActive ? '#dcfce7' : '#f3f4f6' }}>
                      {s.isActive ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setDetailTarget(s)} style={{ padding: '4px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#1d4ed8' }}>詳細</button>
                      <button onClick={() => openEdit(s)} style={{ padding: '4px 10px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>編集</button>
                      <button onClick={() => { if (confirm('削除しますか？')) deleteMutation.mutate(s.id); }} style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#991b1b' }}>削除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {scouters.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>スカウターがありません</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {detailTarget && (
        <Modal title={`${detailTarget.fullName} — 詳細`} onClose={() => setDetailTarget(null)}>
          {[
            ['電話番号', detailTarget.phone],
            ['WhatsApp', detailTarget.whatsapp],
            ['メール', detailTarget.email],
            ['住所', [detailTarget.address, detailTarget.city, detailTarget.province].filter(Boolean).join(', ')],
            ['銀行名', detailTarget.bankName],
            ['口座番号', detailTarget.bankAccountNumber],
            ['口座名義', detailTarget.bankAccountHolder],
            ['コミッション/人', detailTarget.commissionPerStudent ? `Rp ${detailTarget.commissionPerStudent.toLocaleString('id-ID')}` : '—'],
            ['支払いタイミング', timingLabel(detailTarget.commissionPaymentTiming)],
            ['紹介生徒数', `${detailTarget.totalStudentsReferred || 0}名`],
            ['支払済コミッション', detailTarget.totalCommissionPaid ? `Rp ${detailTarget.totalCommissionPaid.toLocaleString('id-ID')}` : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 160, fontSize: 12, color: '#888', flexShrink: 0 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#1A1A1A' }}>{value || '—'}</div>
            </div>
          ))}
          {detailTarget.notes && (
            <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 6, fontSize: 13, color: '#555' }}>
              {detailTarget.notes}
            </div>
          )}
        </Modal>
      )}

      {showModal && (
        <Modal title={editTarget ? 'スカウターを編集' : 'スカウターを追加'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { field: 'fullName', label: '氏名 *', type: 'text' },
              { field: 'nickname', label: 'ニックネーム', type: 'text' },
              { field: 'phone', label: '電話番号 *', type: 'text' },
              { field: 'whatsapp', label: 'WhatsApp', type: 'text' },
              { field: 'email', label: 'メール', type: 'email' },
              { field: 'address', label: '住所', type: 'text' },
              { field: 'city', label: '市', type: 'text' },
              { field: 'province', label: '州', type: 'text' },
              { field: 'bankName', label: '銀行名', type: 'text' },
              { field: 'bankAccountNumber', label: '口座番号', type: 'text' },
              { field: 'bankAccountHolder', label: '口座名義', type: 'text' },
            ].map(({ field, label, type }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
                <input type={type} value={String((form as any)[field] || '')} onChange={(e) => setForm(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>コミッション/人 (IDR)</label>
              <input type="number" value={form.commissionPerStudent} onChange={(e) => setForm(p => ({ ...p, commissionPerStudent: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>支払いタイミング</label>
              <select value={form.commissionPaymentTiming} onChange={(e) => setForm(p => ({ ...p, commissionPaymentTiming: e.target.value as CommissionPaymentTiming }))} style={inputStyle}>
                <option value="on_enrollment">入学時</option>
                <option value="on_departure">出発時</option>
                <option value="on_job_matching">JM時</option>
                <option value="custom">カスタム</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <input type="checkbox" id="scouterActive" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="scouterActive" style={{ fontSize: 13 }}>アクティブ</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button onClick={handleSave} style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>保存</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
