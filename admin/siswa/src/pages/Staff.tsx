import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaffMembers, addStaffMember, updateStaffMember, deleteStaffMember } from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useAuth } from '../context/AuthContext';
import { GDriveService } from '../lib/gdrive';
import { convertPhotoToWebP } from '../lib/imageUtils';
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
  contractDate: '',
  joinedDate: '',
  contractPeriod: '',
  salary: 0,
  benefits: '',
  others: '',
  instagramAccount: '',
  tiktokAccount: '',
  facebookAccount: '',
  isActive: true,
  notes: '',
};

export default function Staff() {
  const { language } = useLanguage();
  const t = translations[language];
  const queryClient = useQueryClient();
  const { googleToken } = useAuth();
  const { data: staff = [], isLoading } = useQuery({ queryKey: ['staffMembers'], queryFn: getStaffMembers });

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Files state
  const [photos, setPhotos] = useState<{ blob: Blob; previewUrl: string; caption: string }[]>([]);
  const [contractFile, setContractFile] = useState<File | null>(null);

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
    setPhotos([]);
    setContractFile(null);
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
      contractDate: s.contractDate ? new Date(s.contractDate).toISOString().split('T')[0] : '',
      joinedDate: s.joinedDate ? new Date(s.joinedDate).toISOString().split('T')[0] : '',
      contractPeriod: s.contractPeriod || '',
      salary: s.salary || 0,
      benefits: s.benefits || '',
      others: s.others || '',
      instagramAccount: s.instagramAccount || '',
      tiktokAccount: s.tiktokAccount || '',
      facebookAccount: s.facebookAccount || '',
      isActive: s.isActive,
      notes: s.notes || '',
    });
    setPhotos([]); // Reset local photos (we show existing ones from s.photos separately if needed)
    setContractFile(null);
    setShowModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const availableSlots = 5 - (editTarget?.photos?.length || 0) - photos.length;
    if (availableSlots <= 0) {
      alert(t.max_photos_limit);
      return;
    }

    for (const file of files.slice(0, availableSlots)) {
      try {
        const webpBlob = await convertPhotoToWebP(file);
        const previewUrl = URL.createObjectURL(webpBlob);
        setPhotos(prev => [...prev, { blob: webpBlob, previewUrl, caption: '' }]);
      } catch (err) {
        console.error('Failed to convert photo', err);
      }
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    setUploadProgress(t.preparing);
    
    try {
      let finalPhotos = editTarget?.photos || [];
      let finalContractFileId = editTarget?.contractFileId;
      let finalContractFileUrl = editTarget?.contractFileUrl;

      // Upload new photos to GDrive if token exists
      if (googleToken && photos.length > 0) {
        setUploadProgress(t.uploading_photos);
        const drive = new GDriveService(googleToken);
        const rootId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
        
        // Staff folder (one folder per staff)
        const staffFolderId = await drive.createFolder(`Staff_${form.fullName || 'New'}_${Date.now()}`, rootId);
        
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          const file = new File([p.blob], `staff_photo_${i + 1}_${Date.now()}.webp`, { type: 'image/webp' });
          const fileId = await drive.uploadFile(file, staffFolderId);
          await drive.makePublic(fileId);
          const url = drive.getViewUrl(fileId);
          finalPhotos = [...finalPhotos, { fileId, url, caption: p.caption }];
        }
      }

      // Upload contract if changed
      if (googleToken && contractFile) {
        setUploadProgress(t.uploading_contract);
        const drive = new GDriveService(googleToken);
        const rootId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
        
        const staffFolderId = await drive.createFolder(`Staff_Docs_${form.fullName || 'New'}_${Date.now()}`, rootId);
        const fileId = await drive.uploadFile(contractFile, staffFolderId);
        await drive.makePublic(fileId);
        finalContractFileId = fileId;
        finalContractFileUrl = drive.getViewUrl(fileId);
      }

      const data: Omit<StaffMember, 'id'> = {
        fullName: form.fullName,
        fullNameKana: form.fullNameKana || undefined,
        role: form.role,
        specialty: form.specialty || undefined,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        contractDate: form.contractDate ? new Date(form.contractDate) : undefined,
        joinedDate: form.joinedDate ? new Date(form.joinedDate) : undefined,
        contractPeriod: form.contractPeriod || undefined,
        salary: Number(form.salary) || undefined,
        benefits: form.benefits || undefined,
        others: form.others || undefined,
        instagramAccount: form.instagramAccount || undefined,
        tiktokAccount: form.tiktokAccount || undefined,
        facebookAccount: form.facebookAccount || undefined,
        photos: finalPhotos,
        contractFileId: finalContractFileId,
        contractFileUrl: finalContractFileUrl,
        isActive: form.isActive,
        notes: form.notes || undefined,
        createdAt: editTarget?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data });
      } else {
        await addMutation.mutateAsync(data);
      }
      
      setPhotos([]);
      setContractFile(null);
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save staff member');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  const roleLabels = {
    staff: t.role_staff,
    teacher: t.role_teacher,
    management: t.role_management,
    other: t.role_other,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.staff_management}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>{t.staff_list_desc} — {staff.length} {t.students_unit}</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          + {t.add_staff}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>{t.loading}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {[
                  t.name,
                  t.role,
                  t.specialty_assignment,
                  t.contact,
                  t.joined_date,
                  t.state,
                  t.actions
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
                      {s.isActive ? t.status_active : t.status_inactive}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(s)} style={{ padding: '4px 10px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>{t.edit}</button>
                      <button onClick={() => { if (confirm(t.confirm_delete)) deleteMutation.mutate(s.id); }} style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#991b1b' }}>{t.delete}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>{t.no_student_data}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editTarget ? t.edit_staff : t.add_staff} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.name} *</label>
              <input type="text" value={form.fullName} onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.furigana}</label>
              <input type="text" value={form.fullNameKana} onChange={(e) => setForm(p => ({ ...p, fullNameKana: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.role}</label>
              <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value as StaffMember['role'] }))} style={inputStyle}>
                <option value="staff">{roleLabels.staff}</option>
                <option value="teacher">{roleLabels.teacher}</option>
                <option value="management">{roleLabels.management}</option>
                <option value="other">{roleLabels.other}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.specialty_assignment}</label>
              <input type="text" value={form.specialty} placeholder={t.specialty_placeholder} onChange={(e) => setForm(p => ({ ...p, specialty: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.phone_number}</label>
              <input type="text" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>WhatsApp</label>
              <input type="text" value={form.whatsapp} onChange={(e) => setForm(p => ({ ...p, whatsapp: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.email}</label>
              <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
            </div>

            <div style={{ gridColumn: '1 / -1', height: 1, background: '#eee', margin: '8px 0' }} />

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.contract_date}</label>
              <input type="date" value={form.contractDate} onChange={(e) => setForm(p => ({ ...p, contractDate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.joined_date}</label>
              <input type="date" value={form.joinedDate} onChange={(e) => setForm(p => ({ ...p, joinedDate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.contract_period}</label>
              <input type="text" value={form.contractPeriod} placeholder={t.contract_period_placeholder} onChange={(e) => setForm(p => ({ ...p, contractPeriod: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.salary} (IDR)</label>
              <input type="number" value={form.salary} onChange={(e) => setForm(p => ({ ...p, salary: Number(e.target.value) }))} style={inputStyle} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.benefits}</label>
              <textarea value={form.benefits} onChange={(e) => setForm(p => ({ ...p, benefits: e.target.value }))} style={{ ...inputStyle, height: 40, resize: 'vertical' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', height: 1, background: '#eee', margin: '8px 0' }} />

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Instagram</label>
              <input type="text" value={form.instagramAccount} placeholder="@username" onChange={(e) => setForm(p => ({ ...p, instagramAccount: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>TikTok</label>
              <input type="text" value={form.tiktokAccount} placeholder="@username" onChange={(e) => setForm(p => ({ ...p, tiktokAccount: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Facebook</label>
              <input type="text" value={form.facebookAccount} placeholder="profile link" onChange={(e) => setForm(p => ({ ...p, facebookAccount: e.target.value }))} style={inputStyle} />
            </div>
            
            <div style={{ gridColumn: '1 / -1', height: 1, background: '#eee', margin: '8px 0' }} />

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 8 }}>{t.staff_photos} (Max 5)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {/* Existing Photos */}
                {editTarget?.photos?.map((p, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={p.url} alt="existing" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                    <button type="button" onClick={() => {
                      if (confirm('Delete this photo?')) {
                        const newPhotos = editTarget.photos?.filter((_, i) => i !== idx);
                        updateMutation.mutate({ id: editTarget.id, data: { photos: newPhotos } });
                      }
                    }} style={{ position: 'absolute', top: -4, right: -4, background: '#CC0000', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                {/* New Photo Selection */}
                {photos.map((p, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={p.previewUrl} alt="new" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '2px solid #CC0000' }} />
                    <button type="button" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: -4, right: -4, background: '#666', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                {photos.length + (editTarget?.photos?.length || 0) < 5 && (
                  <label style={{ width: 60, height: 60, border: '2px dashed #ddd', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', fontSize: 20 }}>
                    +
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.contract_upload}</label>
              {editTarget?.contractFileUrl && (
                <div style={{ marginBottom: 8, fontSize: 12 }}>
                  <a href={editTarget.contractFileUrl} target="_blank" rel="noreferrer" style={{ color: '#CC0000', textDecoration: 'underline' }}>
                    📄 {t.view_current_contract}
                  </a>
                </div>
              )}
              <input type="file" onChange={(e) => setContractFile(e.target.files?.[0] || null)} style={{ fontSize: 12 }} />
            </div>

            <div style={{ gridColumn: '1 / -1', height: 1, background: '#eee', margin: '8px 0' }} />

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.others}</label>
              <textarea value={form.others} onChange={(e) => setForm(p => ({ ...p, others: e.target.value }))} style={{ ...inputStyle, height: 40, resize: 'vertical' }} />
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.notes}</label>
              <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, height: 60, resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <input type="checkbox" id="staffActive" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="staffActive" style={{ fontSize: 13 }}>{t.status_active}</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 24 }}>
            {uploadProgress && <span style={{ fontSize: 12, color: '#666' }}>{uploadProgress}</span>}
            <button onClick={() => setShowModal(false)} disabled={submitting} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={handleSave} disabled={submitting} style={{ padding: '8px 24px', background: submitting ? '#aaa' : '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? t.saving : t.save}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
