import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScouters, addScouter, updateScouter, deleteScouter } from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
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
  const { language } = useLanguage();
  const t = translations[language];
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

  const timingLabel = (timing: CommissionPaymentTiming) => {
    const labels: Record<string, string> = {
      on_enrollment: t.on_enrollment,
      on_departure: t.on_departure,
      on_job_matching: language === 'ja' ? 'JM時' : 'Saat JM',
      custom: language === 'ja' ? 'カスタム' : 'Kustom',
    };
    return labels[timing] || timing;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.scouters}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>{language === 'ja' ? '紹介者管理' : 'Manajemen Scouter'} — {scouters.length} {language === 'ja' ? '名' : 'orang'}</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          + {language === 'ja' ? 'スカウター追加' : 'Tambah Scouter'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>読み込み中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {[t.full_name, language === 'ja' ? '連絡先' : 'Kontak', language === 'ja' ? '紹介数' : 'Jml Referral', t.commission_per_student, t.payment_timing, t.status, language === 'ja' ? '操作' : 'Aksi'].map((h) => (
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
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{s.totalStudentsReferred || 0} {language === 'ja' ? '名' : 'orang'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>Rp {s.commissionPerStudent.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{timingLabel(s.commissionPaymentTiming)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: s.isActive ? '#166534' : '#6b7280', background: s.isActive ? '#dcfce7' : '#f3f4f6' }}>
                      {s.isActive ? t.active : t.inactive}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setDetailTarget(s)} style={{ padding: '4px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#1d4ed8' }}>{language === 'ja' ? '詳細' : 'Detail'}</button>
                      <button onClick={() => openEdit(s)} style={{ padding: '4px 10px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>{language === 'ja' ? '編集' : 'Edit'}</button>
                      <button onClick={() => { if (confirm(language === 'ja' ? '削除しますか？' : 'Hapus scouter ini?')) deleteMutation.mutate(s.id); }} style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#991b1b' }}>{t.delete}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {scouters.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>{language === 'ja' ? 'スカウターがありません' : 'Tidak ada scouter'}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {detailTarget && (
        <Modal title={`${detailTarget.fullName} — ${language === 'ja' ? '詳細' : 'Detail'}`} onClose={() => setDetailTarget(null)}>
          {[
            [t.phone, detailTarget.phone],
            ['WhatsApp', detailTarget.whatsapp],
            [t.email, detailTarget.email],
            [t.address, [detailTarget.address, detailTarget.city, detailTarget.province].filter(Boolean).join(', ')],
            [t.bank_name, detailTarget.bankName],
            [t.account_number, detailTarget.bankAccountNumber],
            [t.account_holder, detailTarget.bankAccountHolder],
            [t.commission_per_student, detailTarget.commissionPerStudent ? `Rp ${detailTarget.commissionPerStudent.toLocaleString('id-ID')}` : '—'],
            [t.payment_timing, timingLabel(detailTarget.commissionPaymentTiming)],
            [language === 'ja' ? '紹介生徒数' : 'Jml Referral', `${detailTarget.totalStudentsReferred || 0} ${language === 'ja' ? '名' : 'orang'}`],
            [language === 'ja' ? '支払済コミッション' : 'Komisi Terbayar', detailTarget.totalCommissionPaid ? `Rp ${detailTarget.totalCommissionPaid.toLocaleString('id-ID')}` : '—'],
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
        <Modal title={editTarget ? (language === 'ja' ? 'スカウターを編集' : 'Edit Scouter') : (language === 'ja' ? 'スカウターを追加' : 'Tambah Scouter')} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { field: 'fullName', label: `${t.full_name} *`, type: 'text' },
              { field: 'nickname', label: t.scouter_nickname, type: 'text' },
              { field: 'phone', label: `${t.phone} *`, type: 'text' },
              { field: 'whatsapp', label: 'WhatsApp', type: 'text' },
              { field: 'email', label: t.email, type: 'email' },
              { field: 'address', label: t.address, type: 'text' },
              { field: 'city', label: t.city, type: 'text' },
              { field: 'province', label: t.province, type: 'text' },
              { field: 'bankName', label: t.bank_name, type: 'text' },
              { field: 'bankAccountNumber', label: t.account_number, type: 'text' },
              { field: 'bankAccountHolder', label: t.account_holder, type: 'text' },
            ].map(({ field, label, type }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
                <input type={type} value={String((form as any)[field] || '')} onChange={(e) => setForm(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.commission_per_student} (IDR)</label>
              <input type="number" value={form.commissionPerStudent} onChange={(e) => setForm(p => ({ ...p, commissionPerStudent: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_timing}</label>
              <select value={form.commissionPaymentTiming} onChange={(e) => setForm(p => ({ ...p, commissionPaymentTiming: e.target.value as CommissionPaymentTiming }))} style={inputStyle}>
                <option value="on_enrollment">{t.on_enrollment}</option>
                <option value="on_departure">{t.on_departure}</option>
                <option value="on_job_matching">{language === 'ja' ? 'JM時' : 'Saat JM'}</option>
                <option value="custom">{language === 'ja' ? 'カスタム' : 'Kustom'}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <input type="checkbox" id="scouterActive" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="scouterActive" style={{ fontSize: 13 }}>{t.is_active}</label>
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
