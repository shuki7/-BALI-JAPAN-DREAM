import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrganizations, addOrganization, updateOrganization, deleteOrganization } from '../lib/firestore';
import type { Organization, OrgType } from '../lib/types';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

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
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
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
  orgType: 'registered_support_org' as OrgType,
  orgName: '',
  orgNameId: '',
  country: 'Japan',
  address: '',
  contactPersonName: '',
  contactPersonTitle: '',
  contactPhone: '',
  contactEmail: '',
  registrationNumber: '',
  contractDetails: '',
  notes: '',
  isActive: true,
};

export default function Organizations() {
  const { language } = useLanguage();
  const t = translations[language];
  const queryClient = useQueryClient();
  const { data: orgs = [], isLoading } = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations });

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Organization | null>(null);
  const [form, setForm] = useState(emptyForm);

  const orgTypeLabel: Record<OrgType, string> = {
    registered_support_org: t.registered_support_org,
    university_jp: t.university_jp,
    financial_institution: t.financial_institution,
    immigration: t.immigration,
    other: t.other,
  };

  const addMutation = useMutation({
    mutationFn: (data: Omit<Organization, 'id'>) => addOrganization(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['organizations'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Organization> }) => updateOrganization(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['organizations'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (o: Organization) => {
    setEditTarget(o);
    setForm({
      orgType: o.orgType,
      orgName: o.orgName,
      orgNameId: o.orgNameId || '',
      country: o.country,
      address: o.address || '',
      contactPersonName: o.contactPersonName || '',
      contactPersonTitle: o.contactPersonTitle || '',
      contactPhone: o.contactPhone || '',
      contactEmail: o.contactEmail || '',
      registrationNumber: o.registrationNumber || '',
      contractDetails: o.contractDetails || '',
      notes: o.notes || '',
      isActive: o.isActive,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const data: Omit<Organization, 'id'> = {
      orgType: form.orgType,
      orgName: form.orgName,
      orgNameId: form.orgNameId || undefined,
      country: form.country,
      address: form.address || undefined,
      contactPersonName: form.contactPersonName || undefined,
      contactPersonTitle: form.contactPersonTitle || undefined,
      contactPhone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
      registrationNumber: form.registrationNumber || undefined,
      contractDetails: form.contractDetails || undefined,
      notes: form.notes || undefined,
      isActive: form.isActive,
      createdAt: editTarget?.createdAt || new Date(),
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.related_orgs}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>{t.org_count.replace('{count}', orgs.length.toString())}</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          + {t.add_org}
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>{t.loading}...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {orgs.map((o) => (
            <div key={o.id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderTop: '3px solid #CC0000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{o.orgName}</div>
                  {o.orgNameId && <div style={{ fontSize: 12, color: '#888' }}>{o.orgNameId}</div>}
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#555' }}>
                  {orgTypeLabel[o.orgType]}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{o.country}</div>
              {o.contactPersonName && (
                <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                  {t.contact}: {o.contactPersonName} {o.contactPersonTitle && `(${o.contactPersonTitle})`}
                </div>
              )}
              {o.contactPhone && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{o.contactPhone}</div>}
              {o.contactEmail && <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{o.contactEmail}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: o.isActive ? '#166534' : '#6b7280', background: o.isActive ? '#dcfce7' : '#f3f4f6' }}>
                  {o.isActive ? t.status_active : t.status_inactive}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(o)} style={{ padding: '5px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>{t.edit}</button>
                  <button
                    onClick={() => { if (confirm(t.confirm_delete)) deleteMutation.mutate(o.id); }}
                    style={{ padding: '5px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 5, fontSize: 12, cursor: 'pointer', color: '#991b1b' }}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {orgs.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#aaa' }}>{t.no_orgs}</div>
          )}
        </div>
      )}

      {showModal && (
        <Modal title={editTarget ? t.edit_org : t.add_org} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { field: 'orgName', label: `${t.org_name} *`, type: 'text' },
              { field: 'orgNameId', label: `${t.org_name} (${t.indonesian})`, type: 'text' },
              { field: 'country', label: t.country, type: 'text' },
              { field: 'address', label: t.address, type: 'text' },
              { field: 'contactPersonName', label: t.contact_person, type: 'text' },
              { field: 'contactPersonTitle', label: t.position, type: 'text' },
              { field: 'contactPhone', label: t.phone_number, type: 'text' },
              { field: 'contactEmail', label: t.email, type: 'email' },
              { field: 'registrationNumber', label: t.registration_number, type: 'text' },
            ].map(({ field, label, type }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
                <input type={type} value={String((form as any)[field] || '')} onChange={(e) => setForm(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.type}</label>
              <select value={form.orgType} onChange={(e) => setForm(p => ({ ...p, orgType: e.target.value as OrgType }))} style={inputStyle}>
                <option value="registered_support_org">{t.registered_support_org}</option>
                <option value="university_jp">{t.university_jp}</option>
                <option value="financial_institution">{t.financial_institution}</option>
                <option value="immigration">{t.immigration}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.contract_details}</label>
            <textarea value={form.contractDetails} onChange={(e) => setForm(p => ({ ...p, contractDetails: e.target.value }))} style={{ ...inputStyle, height: 80, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <input type="checkbox" id="orgActive" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="orgActive" style={{ fontSize: 13 }}>{t.status_active}</label>
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
