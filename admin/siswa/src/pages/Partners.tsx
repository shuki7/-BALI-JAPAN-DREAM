import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPartners, addPartner, updatePartner, deletePartner, getStudents } from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import type { Partner, PartnerType, CommissionDirection } from '../lib/types';

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 13,
  color: '#333',
  boxSizing: 'border-box' as const,
};

function CommissionIcon({ type, t }: { type: CommissionDirection; t: any }) {
  if (type === 'we_pay') return <span style={{ color: '#CC0000', fontWeight: 600, fontSize: 12 }}>🔴 {t.we_pay}</span>;
  if (type === 'they_pay') return <span style={{ color: '#166534', fontWeight: 600, fontSize: 12 }}>🟢 {t.they_pay}</span>;
  if (type === 'mutual') return <span style={{ color: '#92400e', fontWeight: 600, fontSize: 12 }}>🟡 {t.mutual}</span>;
  return <span style={{ color: '#888', fontSize: 12 }}>—</span>;
}

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

const getTabs = (t: any) => [
  { label: t.all, value: '' },
  { label: t.high_school, value: 'school' },
  { label: t.university, value: 'university' },
  { label: '金融機関', value: 'financial' },
  { label: '登録支援機関', value: 'registered_support' },
  { label: '企業', value: 'company' },
  { label: t.other, value: 'other' },
];

const emptyForm = {
  partnerType: 'school' as PartnerType,
  partnerName: '',
  partnerNameJp: '',
  country: 'Indonesia',
  province: '',
  city: '',
  address: '',
  contactPersonName: '',
  contactPersonTitle: '',
  contactPhone: '',
  contactEmail: '',
  whatsapp: '',
  commissionType: 'none' as CommissionDirection,
  commissionRate: 0,
  commissionUnit: 'percent' as 'percent' | 'fixed_amount',
  commissionCurrency: 'IDR' as 'IDR' | 'JPY',
  commissionNotes: '',
  contractStartDate: '',
  contractEndDate: '',
  isActive: true,
  notes: '',
};

export default function Partners() {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const t = translations[language];
  const { data: partners = [], isLoading } = useQuery({ queryKey: ['partners'], queryFn: getPartners });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });

  const [activeTab, setActiveTab] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Partner | null>(null);
  const [form, setForm] = useState(emptyForm);

  const addMutation = useMutation({
    mutationFn: (data: Omit<Partner, 'id'>) => addPartner(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Partner> }) => updatePartner(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePartner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners'] }),
  });

  const filtered = useMemo(() => {
    if (!activeTab) return partners;
    return partners.filter((p) => p.partnerType === activeTab);
  }, [partners, activeTab]);

  const studentCountByPartner = useMemo(() => {
    const m: Record<string, number> = {};
    students.forEach((s) => { if (s.partnerSchoolId) m[s.partnerSchoolId] = (m[s.partnerSchoolId] || 0) + 1; });
    return m;
  }, [students]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Partner) => {
    setEditTarget(p);
    setForm({
      partnerType: p.partnerType,
      partnerName: p.partnerName,
      partnerNameJp: p.partnerNameJp || '',
      country: p.country,
      province: p.province || '',
      city: p.city || '',
      address: p.address || '',
      contactPersonName: p.contactPersonName,
      contactPersonTitle: p.contactPersonTitle || '',
      contactPhone: p.contactPhone,
      contactEmail: p.contactEmail || '',
      whatsapp: p.whatsapp || '',
      commissionType: p.commissionType,
      commissionRate: p.commissionRate || 0,
      commissionUnit: p.commissionUnit || 'percent',
      commissionCurrency: p.commissionCurrency || 'IDR',
      commissionNotes: p.commissionNotes || '',
      contractStartDate: p.contractStartDate ? p.contractStartDate.toISOString().split('T')[0] : '',
      contractEndDate: p.contractEndDate ? p.contractEndDate.toISOString().split('T')[0] : '',
      isActive: p.isActive,
      notes: p.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const data: Omit<Partner, 'id'> = {
      partnerType: form.partnerType,
      partnerName: form.partnerName,
      partnerNameJp: form.partnerNameJp || undefined,
      country: form.country,
      province: form.province || undefined,
      city: form.city || undefined,
      address: form.address || undefined,
      contactPersonName: form.contactPersonName,
      contactPersonTitle: form.contactPersonTitle || undefined,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail || undefined,
      whatsapp: form.whatsapp || undefined,
      commissionType: form.commissionType,
      commissionRate: form.commissionRate || undefined,
      commissionUnit: form.commissionUnit || undefined,
      commissionCurrency: form.commissionCurrency || undefined,
      commissionNotes: form.commissionNotes || undefined,
      contractStartDate: form.contractStartDate ? new Date(form.contractStartDate) : undefined,
      contractEndDate: form.contractEndDate ? new Date(form.contractEndDate) : undefined,
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

  const partnerTypeLabel = (pt: PartnerType) => {
    const labels: Record<string, string> = {
      school: t.high_school,
      university: t.university,
      financial: language === 'ja' ? '金融機関' : 'Lembaga Keuangan',
      registered_support: language === 'ja' ? '登録支援機関' : 'LPK/SO',
      company: language === 'ja' ? '企業' : 'Perusahaan',
      other: t.other
    };
    return labels[pt] || pt;
  };

  const TABS = getTabs(t);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.partners}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>Mitra — {filtered.length} {language === 'ja' ? '件' : 'data'}</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          + {language === 'ja' ? '提携先追加' : 'Tambah Mitra'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              fontSize: 13,
              fontWeight: activeTab === tab.value ? 700 : 500,
              color: activeTab === tab.value ? '#CC0000' : '#666',
              borderBottom: activeTab === tab.value ? '3px solid #CC0000' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>{t.loading}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderTop: '3px solid #CC0000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.partnerName}</div>
                  {p.partnerNameJp && <div style={{ fontSize: 12, color: '#888' }}>{p.partnerNameJp}</div>}
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#555' }}>
                  {partnerTypeLabel(p.partnerType)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                {p.city && `${p.city}, `}{p.province && `${p.province}, `}{p.country}
              </div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                {language === 'ja' ? '担当' : 'Kontak'}: {p.contactPersonName} · {p.contactPhone}
              </div>
              <div style={{ marginBottom: 12 }}>
                <CommissionIcon type={p.commissionType} t={t} />
                {p.commissionRate && <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                  {p.commissionRate}{p.commissionUnit === 'percent' ? '%' : ` ${p.commissionCurrency}`}
                </span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {language === 'ja' ? '紹介生徒数' : 'Jumlah Siswa'}: <strong>{studentCountByPartner[p.id] || 0} {language === 'ja' ? '名' : 'orang'}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(p)} style={{ padding: '5px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>{language === 'ja' ? '編集' : 'Edit'}</button>
                  <button
                    onClick={() => { if (confirm(language === 'ja' ? '削除しますか？' : 'Hapus mitra ini?')) deleteMutation.mutate(p.id); }}
                    style={{ padding: '5px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 5, fontSize: 12, cursor: 'pointer', color: '#991b1b' }}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {filtered.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>{language === 'ja' ? '提携先がありません' : 'Tidak ada mitra'}</div>
      )}

      {showModal && (
        <Modal title={editTarget ? (language === 'ja' ? '提携先を編集' : 'Edit Mitra') : (language === 'ja' ? '提携先を追加' : 'Tambah Mitra')} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { field: 'partnerName', label: `${t.partner_name} *`, type: 'text' },
              { field: 'partnerNameJp', label: t.partner_name_jp, type: 'text' },
              { field: 'contactPersonName', label: `${t.contact_person} *`, type: 'text' },
              { field: 'contactPersonTitle', label: t.contact_title, type: 'text' },
              { field: 'contactPhone', label: `${t.phone} *`, type: 'text' },
              { field: 'contactEmail', label: t.email, type: 'email' },
              { field: 'whatsapp', label: 'WhatsApp', type: 'text' },
              { field: 'country', label: t.country, type: 'text' },
              { field: 'province', label: t.province, type: 'text' },
              { field: 'city', label: t.city, type: 'text' },
            ].map(({ field, label, type }) => (
              <div key={field} style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
                <input type={type} value={String((form as any)[field] || '')} onChange={(e) => setForm(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.partner_type}</label>
              <select value={form.partnerType} onChange={(e) => setForm(p => ({ ...p, partnerType: e.target.value as PartnerType }))} style={inputStyle}>
                <option value="school">{t.high_school}</option>
                <option value="university">{t.university}</option>
                <option value="financial">{language === 'ja' ? '金融機関' : 'Lembaga Keuangan'}</option>
                <option value="registered_support">{language === 'ja' ? '登録支援機関' : 'LPK/SO'}</option>
                <option value="company">{language === 'ja' ? '企業' : 'Perusahaan'}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.commission_type}</label>
              <select value={form.commissionType} onChange={(e) => setForm(p => ({ ...p, commissionType: e.target.value as CommissionDirection }))} style={inputStyle}>
                <option value="none">{t.none}</option>
                <option value="we_pay">{t.we_pay}</option>
                <option value="they_pay">{t.they_pay}</option>
                <option value="mutual">{t.mutual}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="isActive" style={{ fontSize: 13 }}>{t.is_active}</label>
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
