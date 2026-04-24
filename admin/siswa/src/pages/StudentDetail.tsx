import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  getStudent,
  updateStudent,
  getPayments,
  addPayment,
  updatePayment,
  deletePayment,
  getStudentDocuments,
  addStudentDocument,
  updateStudentDocument,
  getBankAccounts,
  addBankAccount,
  deleteBankAccount,
  getStudentLogs,
  addStudentLog,
} from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useAuth } from '../context/AuthContext';
import { GDriveService } from '../lib/gdrive';
import { convertPhotoToWebP } from '../lib/imageUtils';
import { CurrencyInput } from '../components/CurrencyInput';
import type { Student, StudentStatus, DocumentType, Payment, PaymentType, PaymentMethod, PaymentStatus } from '../lib/types';

const SSW_CATEGORIES = [
  'SSW 介護',
  'SSW ビルクリーニング',
  'SSW 工業製品製造業',
  'SSW 建設',
  'SSW 造船・舶用工業',
  'SSW 自動車整備',
  'SSW 航空',
  'SSW 宿泊',
  'SSW 農業',
  'SSW 漁業',
  'SSW 飲食料品製造業',
  'SSW 外食業',
  'SSW 自動車運送業',
  'SSW 鉄道',
  'SSW 林業',
  'SSW 木材産業',
];

const TABS_KEYS = ['basic', 'family', 'payment', 'bank', 'documents', 'departure', 'notes', 'logs', 'exams'];

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 13,
  color: '#333',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
  marginBottom: 5,
};

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const { language } = useLanguage();
  const t = translations[language];
  const m: Record<StudentStatus, [string, string, string]> = {
    active: [t.status_active, '#166534', '#dcfce7'],
    departed_japan: [t.status_departed, '#1d4ed8', '#dbeafe'],
    graduated: [t.status_graduated, '#92400e', '#fef3c7'],
    withdrawn: [t.status_withdrawn, '#6b7280', '#f3f4f6'],
    on_hold: [t.status_on_hold, '#92400e', '#fef9c3'],
  };
  const [label, color, bg] = m[status];
  return <Badge color={color} bg={bg}>{label}</Badge>;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ width: 160, fontSize: 12, color: '#888', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function StudentDetail() {
  const { language } = useLanguage();
  const t = translations[language];
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, user, googleToken, refreshGoogleToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => getPayments(id!),
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => getStudentDocuments(id!),
    enabled: !!id,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts', id],
    queryFn: () => getBankAccounts(id!),
    enabled: !!id,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['studentLogs', id],
    queryFn: () => getStudentLogs(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateStudent>[1]) => updateStudent(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      setEditModal(null);
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: addPayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments', id] }),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: Partial<Payment> }) =>
      updatePayment(paymentId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments', id] }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments', id] }),
  });

  const addDocMutation = useMutation({
    mutationFn: ({ data }: { data: Parameters<typeof addStudentDocument>[1] }) =>
      addStudentDocument(id!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', id] }),
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: Parameters<typeof updateStudentDocument>[2] }) =>
      updateStudentDocument(id!, docId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', id] }),
  });

  const addBankMutation = useMutation({
    mutationFn: (data: Parameters<typeof addBankAccount>[1]) => addBankAccount(id!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bankAccounts', id] }),
  });

  const deleteBankMutation = useMutation({
    mutationFn: (accountId: string) => deleteBankAccount(id!, accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bankAccounts', id] }),
  });

  const addLogMutation = useMutation({
    mutationFn: (data: Parameters<typeof addStudentLog>[1]) => addStudentLog(id!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studentLogs', id] }),
  });

  const [addPaymentData, setAddPaymentData] = useState({ 
    paymentType: 'education', 
    totalAmount: 0, 
    paidAmount: 0, 
    paymentMethod: 'lump_sum', 
    notes: '',
    paidDate: format(new Date(), 'yyyy-MM-dd'),
    proofFileId: '',
    proofUrl: ''
  });
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditPayment, setShowEditPayment] = useState<Payment | null>(null);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [addDocData, setAddDocData] = useState({ documentType: 'diploma_high_school', title: '', fileId: '', url: '', isHeld: false, notes: '' });
  const [isUploading, setIsUploading] = useState(false);

  // Helper to ensure student folder exists and upload file
  const handleFileUpload = async (file: File) => {
    if (!student) return null;
    if (!googleToken) {
      if (confirm(language === 'ja' ? 'Google Driveに接続されていません。接続しますか？' : 'Google Drive belum terhubung. Hubungkan sekarang?')) {
        await refreshGoogleToken();
        return null;
      }
      return null;
    }
    setIsUploading(true);
    try {
      const gDrive = new GDriveService(googleToken);
      let folderId = student.driveFolderId;
      if (!folderId) {
        const folderName = `${student.fullName}_${student.registrationNumber || student.id}`;
        folderId = await gDrive.createFolder(folderName, import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID);
        await updateStudent(id!, { driveFolderId: folderId });
      }

      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        const webpBlob = await convertPhotoToWebP(file);
        fileToUpload = new File([webpBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' });
      }

      const fileId = await gDrive.uploadFile(fileToUpload, folderId);
      await gDrive.makePublic(fileId);
      return { fileId, url: gDrive.getViewUrl(fileId) };
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + (err as Error).message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  const [showAddBank, setShowAddBank] = useState(false);
  const [addBankData, setAddBankData] = useState({ bankName: '', accountNumber: '', accountHolder: '', accountType: 'savings', isPrimary: false });
  const [showAddLog, setShowAddLog] = useState(false);
  const [addLogData, setAddLogData] = useState({ content: '', date: format(new Date(), 'yyyy-MM-dd') });

  const tabLabels: Record<string, string> = {
    basic: t.personal_info,
    family: t.guarantor_info,
    payment: t.payments,
    bank: language === 'ja' ? '銀行口座' : 'Rekening Bank',
    documents: t.documents,
    departure: language === 'ja' ? '渡航情報' : 'Informasi Keberangkatan',
    notes: t.memo,
    logs: t.daily_log,
    exams: t.exam_interview,
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>{t.loading}...</div>;
  if (!student) return <div style={{ padding: 40, textAlign: 'center', color: '#CC0000' }}>{t.student_not_found}</div>;

  const saveBasicEdit = async () => {
    setIsSaving(true);
    try {
      const data: any = { ...editData };
      
      // Handle Photo Upload if any
      if (newPhoto) {
        if (!googleToken) {
          if (confirm(t.google_token_expired)) {
            await refreshGoogleToken();
            setIsSaving(false);
            return;
          }
          throw new Error("No Google token");
        }

        const drive = new GDriveService(googleToken);
        let studentFolderId = student.driveFolderId;
        
        // 1. Ensure folder exists
        if (!studentFolderId) {
          const rootId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
          studentFolderId = await drive.createFolder(`${student.id}_${data.fullName || student.fullName}`, rootId);
        }
        
        // 2. Upload photo
        const photoFolderId = await drive.createFolder('Photos', studentFolderId);
        const webp = await convertPhotoToWebP(newPhoto);
        const file = new File([webp], `photo_updated_${Date.now()}.webp`, { type: 'image/webp' });
        const fileId = await drive.uploadFile(file, photoFolderId);
        await drive.makePublic(fileId);
        
        const url = drive.getThumbnailUrl(fileId, 400);
        const viewUrl = drive.getViewUrl(fileId);
        
        // Add to photos array or replace first
        const currentPhotos = student.photos || [];
        const newPhotos = [{ fileId, url, caption: '' }, ...currentPhotos].slice(0, 5);
        
        data.photos = newPhotos;
        data.photoUrl = viewUrl;
        data.driveFolderId = studentFolderId;
      }

      // Format dates
      if (data.enrollmentDate) data.enrollmentDate = new Date(data.enrollmentDate);
      if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);

      await updateMutation.mutateAsync(data);
      setNewPhoto(null);
    } catch (err) {
      console.error(err);
      alert("Error saving: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => navigate('/students')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888', fontSize: 20 }}>←</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{student.fullName}</h1>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{student.registrationNumber} · Batch {student.batchNumber}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusBadge status={student.status} />
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 24, overflowX: 'auto' }}>
        {TABS_KEYS.map((key, i) => {
          if (key === 'bank' && !isAdmin) return null;
          const active = activeTab === i;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(i)}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: 'none',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? '#CC0000' : '#666',
                borderBottom: active ? '3px solid #CC0000' : '3px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: -2,
              }}
            >
              {tabLabels[key]}
            </button>
          );
        })}
      </div>

      {/* Tab 0: 基本情報 */}
      {activeTab === 0 && (
        <div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Photos */}
            <div style={{ flexShrink: 0 }}>
              {/* メイン写真 */}
              {(student.photos && student.photos.length > 0) || student.photoUrl ? (
                <img
                  src={student.photos?.[0]?.url || student.photoUrl || ''}
                  alt={student.fullName}
                  onError={(e) => {
                    // If the primary URL fails, try to use the drive ID to get a thumbnail if possible
                    if (student.photos?.[0]?.fileId) {
                      (e.target as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${student.photos[0].fileId}&sz=w400`;
                    }
                  }}
                  style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 10, border: '3px solid #CC0000' }}
                />
              ) : (
                <div style={{ width: 150, height: 150, borderRadius: 10, background: '#CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 48, fontWeight: 700 }}>
                  {student.fullName.charAt(0)}
                </div>
              )}
              {/* 追加写真サムネイル */}
              {student.photos && student.photos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', maxWidth: 150 }}>
                  {student.photos.slice(1).map((p, i) => (
                    <img
                      key={i}
                      src={p.url}
                      alt={p.caption || `photo-${i + 2}`}
                      title={p.caption}
                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              )}
              {student.photos && student.photos.length > 0 && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 6, textAlign: 'center' }}>
                  📷 {t.photo_count_format.replace('{count}', student.photos.length.toString())}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t.personal_info}</h3>
                <button
                  onClick={() => { 
                    setEditModal('basic'); 
                    setEditData({ 
                      fullName: student.fullName,
                      fullNameKana: student.fullNameKana || '',
                      registrationNumber: student.registrationNumber,
                      enrollmentDate: format(student.enrollmentDate, 'yyyy-MM-dd'),
                      status: student.status, 
                      batchNumber: student.batchNumber, 
                      programType: student.programType,
                      gender: student.gender,
                      dateOfBirth: format(student.dateOfBirth, 'yyyy-MM-dd'),
                      nationality: student.nationality,
                      birthPlace: student.birthPlace,
                      religion: student.religion || '',
                      nik: student.nik || '',
                      whatsapp: student.whatsapp || '',
                      email: student.email || '',
                      address: student.address,
                      city: student.city,
                      province: student.province,
                      instagramAccount: student.instagramAccount || '',
                      tiktokAccount: student.tiktokAccount || '',
                      educationLevel: student.educationLevel,
                      schoolName: student.schoolName,
                      graduationYear: student.graduationYear || '',
                      notes: student.notes || '' 
                    }); 
                    setNewPhoto(null);
                  }}
                  style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  {t.edit}
                </button>
              </div>
              <InfoRow label={t.reg_number} value={student.registrationNumber} />
              <InfoRow label={t.enroll_date} value={format(student.enrollmentDate, 'dd/MM/yyyy')} />
              <InfoRow label={t.status} value={t[`status_${student.status}`] || student.status} />
              <InfoRow label={t.program} value={student.programType} />
              <InfoRow label={t.gender} value={student.gender === 'male' ? t.male : t.female} />
              <InfoRow label={t.birth_date} value={format(student.dateOfBirth, 'dd/MM/yyyy')} />
              <InfoRow label={t.nationality} value={student.nationality} />
              <InfoRow label={t.birth_place} value={student.birthPlace} />
              <InfoRow label={t.religion} value={student.religion} />
              <InfoRow label={t.nik} value={student.nik} />
              <InfoRow label={t.whatsapp} value={student.whatsapp ? <a href={`https://wa.me/${student.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>{student.whatsapp}</a> : null} />
              <InfoRow label={t.email} value={student.email} />
              <InfoRow label={t.address} value={`${student.address}, ${student.city}, ${student.province}`} />
            </div>
          </div>

          {/* SNS アカウント */}
          {(student.instagramAccount || student.tiktokAccount) && (
            <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#888', width: '100%' }}>{t.sns_accounts}</h3>
              {student.instagramAccount && (
                <a
                  href={`https://www.instagram.com/${student.instagramAccount.replace(/^@/, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E1306C', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
                >
                  <span style={{ fontSize: 20 }}>📸</span> @{student.instagramAccount.replace(/^@/, '')}
                </a>
              )}
              {student.tiktokAccount && (
                <a
                  href={`https://www.tiktok.com/@${student.tiktokAccount.replace(/^@/, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#000', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
                >
                  <span style={{ fontSize: 20 }}>🎵</span> @{student.tiktokAccount.replace(/^@/, '')}
                </a>
              )}
            </div>
          )}

          {/* 学歴・資格 */}
          <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t.edu_qualifications}</h3>
              <button
                onClick={() => { setEditModal('qualifications'); setEditData({ jlptLevel: student.jlptLevel, jftPassed: student.jftPassed, sswPassed: student.sswPassed, psychotestDone: student.psychotestDone, mcuDone: student.mcuDone }); }}
                style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                {t.edit}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Badge color="#1e40af" bg="#dbeafe">JLPT {student.jlptLevel.toUpperCase()}</Badge>
              {student.jftPassed && <Badge color="#166534" bg="#dcfce7">JFT {t.passed}</Badge>}
              {!student.jftPassed && <Badge color="#6b7280" bg="#f3f4f6">JFT {t.not_passed}</Badge>}
              {student.sswPassed && <Badge color="#166534" bg="#dcfce7">SSW {t.passed}</Badge>}
              {!student.sswPassed && <Badge color="#6b7280" bg="#f3f4f6">SSW {t.not_passed}</Badge>}
              {student.psychotestDone && <Badge color="#166534" bg="#dcfce7">{t.psychotest} {t.done}</Badge>}
              {!student.psychotestDone && <Badge color="#6b7280" bg="#f3f4f6">{t.psychotest} {t.not_done}</Badge>}
              {student.mcuDone && <Badge color="#166534" bg="#dcfce7">{t.mcu} {t.done}</Badge>}
              {!student.mcuDone && <Badge color="#6b7280" bg="#f3f4f6">{t.mcu} {t.not_done}</Badge>}
            </div>
            <div style={{ marginTop: 12 }}>
              <InfoRow label={t.education_level} value={student.educationLevel.toUpperCase()} />
              <InfoRow label={t.school_name} value={student.schoolName} />
              <InfoRow label={t.graduation_year} value={student.graduationYear?.toString()} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: 家族情報 */}
      {activeTab === 1 && (
        <div>
          {/* 保証人情報カード */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🛡️</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#CC0000' }}>{t.guarantor_info}</h3>
              </div>
              <button
                onClick={() => {
                  setEditModal('family');
                  setEditData({
                    parentName: student.parentName,
                    parentRelationship: student.parentRelationship,
                    parentNik: (student as any).parentNik || '',
                    parentPhone: student.parentPhone,
                    parentWhatsapp: student.parentWhatsapp || '',
                    parentAddress: student.parentAddress || '',
                    parentCity: (student as any).parentCity || '',
                    parentProvince: (student as any).parentProvince || '',
                    parentOccupation: student.parentOccupation || '',
                    parentEmail: (student as any).parentEmail || '',
                    emergencyContact: student.emergencyContact || '',
                    emergencyPhone: student.emergencyPhone || '',
                    emergencyRelationship: (student as any).emergencyRelationship || '',
                  });
                }}
                style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                {t.edit}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>※ {t.guarantor_desc}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#CC0000', borderBottom: '1px solid #fecaca', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase' }}>{t.personal_info}</div>
                <InfoRow label={t.full_name} value={student.parentName} />
                <InfoRow label={t.relationship} value={student.parentRelationship === 'father' ? t.father : student.parentRelationship === 'mother' ? t.mother : t.guardian} />
                <InfoRow label={t.gender} value={student.parentGender === 'male' ? t.male : student.parentGender === 'female' ? t.female : undefined} />
                <InfoRow label={t.birth_date} value={student.parentDateOfBirth ? format(student.parentDateOfBirth, 'dd/MM/yyyy') : undefined} />
                <InfoRow label={t.occupation} value={student.parentOccupation} />
                <InfoRow label={t.nik} value={student.parentNik} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#CC0000', borderBottom: '1px solid #fecaca', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase' }}>{t.contact_info}</div>
                <InfoRow label={t.whatsapp} value={student.parentWhatsapp ? <a href={`https://wa.me/${student.parentWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>{student.parentWhatsapp}</a> : null} />
                <InfoRow label={t.email} value={student.parentEmail} />
                <InfoRow label={t.address} value={student.parentAddress} />
                <InfoRow label={t.city} value={student.parentCity} />
                <InfoRow label={t.province} value={student.parentProvince} />
                <InfoRow label={language === 'ja' ? '入寮日' : 'Tanggal Masuk Asrama'} value={student.dormCheckInDate ? format(student.dormCheckInDate, 'dd/MM/yyyy') : undefined} />
              </div>
            </div>

            {/* 保証人KTP画像 */}
            {(student as any).parentKtpFileId && (
              <div style={{ marginTop: 14, padding: 10, background: '#f9fafb', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🪪</span>
                <a
                  href={`https://drive.google.com/file/d/${(student as any).parentKtpFileId}/view`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#1d4ed8', fontSize: 13, fontWeight: 600 }}
                >
                  KTP画像を表示
                </a>
              </div>
            )}
          </div>

          {/* 緊急連絡先カード */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>🚨</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t.emergency_contact_alt}</h3>
            </div>
            {student.emergencyContact ? (
              <>
                <InfoRow label={t.full_name} value={student.emergencyContact} />
                <InfoRow label={t.relationship} value={(student as any).emergencyRelationship} />
                <InfoRow label={t.phone_number} value={student.emergencyPhone} />
              </>
            ) : (
              <p style={{ color: '#aaa', fontSize: 13 }}>—（{t.use_guarantor_as_emergency}）</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: 支払い */}
      {activeTab === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => setShowAddPayment(true)}
              style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              + {t.add_payment_record}
            </button>
          </div>
          {payments.map((p) => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #CC0000' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {p.paymentType === 'education' ? t.education_fee : p.paymentType === 'job_matching' ? t.jm_fee : p.paymentType === 'dormitory' ? t.dorm_fee : t.other}
                  </span>
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{p.paymentMethod === 'lump_sum' ? t.lump_sum_short : t.installment_short}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Badge
                    color={p.paymentStatus === 'paid' ? '#166534' : p.paymentStatus === 'partial' ? '#92400e' : '#991b1b'}
                    bg={p.paymentStatus === 'paid' ? '#dcfce7' : p.paymentStatus === 'partial' ? '#fef3c7' : '#fee2e2'}
                  >
                    {p.paymentStatus === 'paid' ? t.paid : p.paymentStatus === 'partial' ? t.partial : t.unpaid}
                  </Badge>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setShowEditPayment(p)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontSize: 16 }}
                      title={t.edit}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(language === 'ja' ? 'この支払い記録を削除してもよろしいですか？' : 'Apakah Anda yakin ingin menghapus catatan pembayaran ini?')) {
                          deletePaymentMutation.mutate(p.id);
                        }
                      }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontSize: 16 }}
                      title={t.delete}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, fontSize: 13, flexWrap: 'wrap', rowGap: 8 }}>
                <div><span style={{ color: '#888' }}>{t.total_amount}: </span><strong>Rp {p.totalAmount.toLocaleString('id-ID')}</strong></div>
                <div><span style={{ color: '#888' }}>{t.paid_amount}: </span><strong style={{ color: '#166534' }}>Rp {p.paidAmount.toLocaleString('id-ID')}</strong></div>
                <div><span style={{ color: '#888' }}>{t.remaining_balance}: </span><strong style={{ color: '#CC0000' }}>Rp {p.remainingAmount.toLocaleString('id-ID')}</strong></div>
                {p.paidDate && (
                  <div><span style={{ color: '#888' }}>{t.payment_date}: </span><strong>{format(p.paidDate, 'dd/MM/yyyy')}</strong></div>
                )}
                {p.proofUrl && (
                  <div>
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>📄</span> {t.view_proof || 'Proof'}
                    </a>
                  </div>
                )}
              </div>
              {p.paymentType === 'job_matching' && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{t.jm_stage_progress}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3].map((stage) => {
                      const paid = stage === 1 ? p.jmStage1Paid : stage === 2 ? p.jmStage2Paid : p.jmStage3Paid;
                      return (
                        <div key={stage} style={{ flex: 1, height: 24, borderRadius: 4, background: paid ? '#CC0000' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: paid ? '#fff' : '#888', fontWeight: 600 }}>
                          Stage {stage}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
          {payments.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>{t.no_payment_records}</div>}
        </div>
      )}

      {/* Tab 3: 銀行口座 (admin only) */}
      {activeTab === 3 && isAdmin && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => setShowAddBank(true)}
              style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              + {t.add_account}
            </button>
          </div>
          {bankAccounts.map((a) => (
            <div key={a.id} style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.bankName} {a.isPrimary && <Badge color="#1d4ed8" bg="#dbeafe">{t.primary_account}</Badge>}</div>
                <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{a.accountNumber} — {a.accountHolder}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{a.accountType === 'savings' ? t.savings : t.current}</div>
              </div>
              <button
                onClick={() => { if (confirm(t.confirm_delete)) deleteBankMutation.mutate(a.id); }}
                style={{ border: 'none', background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                {t.delete}
              </button>
            </div>
          ))}
          {bankAccounts.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>{t.no_account_data}</div>}
        </div>
      )}

      {/* Tab 4: 書類管理 */}
      {activeTab === 4 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => setShowAddDoc(true)}
              style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              + {t.add_doc}
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{t.doc_type}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{t.title}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{t.upload_date}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{t.collateral}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => {
                  const isCollateral = d.documentType === 'diploma_high_school' || d.documentType === 'diploma_vocational';
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 16px', fontSize: 13 }}>
                        {isCollateral && '🔒 '}{d.documentType}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13 }}>
                        {d.fileId ? (
                          <a href={`https://drive.google.com/file/d/${d.fileId}/view`} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>
                            {d.title}
                          </a>
                        ) : d.title}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13 }}>{format(d.uploadDate, 'dd/MM/yyyy')}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {isCollateral ? (
                          d.isHeld ? <Badge color="#991b1b" bg="#fee2e2">預かり中</Badge> : <Badge color="#166534" bg="#dcfce7">返却済</Badge>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {isCollateral && d.isHeld && (
                          <button
                            onClick={() => updateDocMutation.mutate({ docId: d.id, data: { isHeld: false, returnedDate: new Date() } })}
                            style={{ padding: '4px 10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#166534' }}
                          >
                            返却済にする
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {documents.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>{t.no_documents}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: 渡航情報 */}
      {activeTab === 5 && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t.departure_info}</h3>
            <button
              onClick={() => {
                setEditModal('departure');
                setEditData({
                  departureDate: student.departureDate ? format(student.departureDate, 'yyyy-MM-dd') : '',
                  destinationCompany: student.destinationCompany || '',
                  destinationPrefecture: student.destinationPrefecture || '',
                  visaType: student.visaType || '',
                  coeIssueDate: student.coeIssueDate ? format(student.coeIssueDate, 'yyyy-MM-dd') : '',
                });
              }}
              style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              {t.edit}
            </button>
          </div>
          <InfoRow label={t.departure_date} value={student.departureDate ? format(student.departureDate, 'dd/MM/yyyy') : undefined} />
          <InfoRow label={t.destination_company} value={student.destinationCompany} />
          <InfoRow label={t.prefecture} value={student.destinationPrefecture} />
          <InfoRow label={t.visa_type} value={student.visaType} />
          <InfoRow label={t.coe_issue_date} value={student.coeIssueDate ? format(student.coeIssueDate, 'dd/MM/yyyy') : undefined} />
          <InfoRow label={t.coe_cancel_date} value={student.coeCancellationDate ? format(student.coeCancellationDate, 'dd/MM/yyyy') : undefined} />

          <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 20, marginBottom: 12 }}>試験結果</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Badge color="#1e40af" bg="#dbeafe">JLPT {student.jlptLevel.toUpperCase()}</Badge>
            {student.jlptPassDate && <Badge color="#166534" bg="#dcfce7">合格日: {format(student.jlptPassDate, 'dd/MM/yyyy')}</Badge>}
            {student.jftPassed && <Badge color="#166534" bg="#dcfce7">JFT 合格</Badge>}
            {student.sswPassed && <Badge color="#166534" bg="#dcfce7">SSW 合格</Badge>}
          </div>
        </div>
      )}

      {/* Tab 6: 備考 */}
      {activeTab === 6 && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{t.memo}</h3>
          <textarea
            defaultValue={student.notes || ''}
            onBlur={(e) => updateMutation.mutate({ notes: e.target.value })}
            style={{ ...inputStyle, height: 200, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder={t.memo_placeholder}
          />
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{t.auto_save_on_blur}</div>
        </div>
      )}

      {/* Tab 7: 日誌 */}
      {activeTab === TABS_KEYS.indexOf('logs') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => setShowAddLog(true)}
              style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              + {t.add_log}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {logs.map((log) => (
              <div key={log.id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: '#CC0000', fontSize: 14 }}>
                    📅 {format(log.date, 'yyyy/MM/dd')}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    ✍️ {log.staffName}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {log.content}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                {t.no_daily_logs}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Tab 8: 試験・面接 */}
      {activeTab === TABS_KEYS.indexOf('exams') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => {
                setEditModal('exams');
                setEditData({
                  jftPlannedDate: student.jftPlannedDate ? format(student.jftPlannedDate, 'yyyy-MM-dd') : '',
                  jftPassedDate: student.jftPassedDate ? format(student.jftPassedDate, 'yyyy-MM-dd') : '',
                  sswCategory: student.sswCategory || '',
                  sswPlannedDate: student.sswPlannedDate ? format(student.sswPlannedDate, 'yyyy-MM-dd') : '',
                  sswPassedDate: student.sswPassedDate ? format(student.sswPassedDate, 'yyyy-MM-dd') : '',
                });
              }}
              style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              {language === 'ja' ? '試験情報を編集' : 'Edit Info Ujian'}
            </button>
          </div>

          {/* JFT-A2 Section */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#CC0000' }}>JFT-A2</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <InfoRow label={t.jft_planned} value={student.jftPlannedDate ? format(student.jftPlannedDate, 'dd/MM/yyyy') : undefined} />
              <InfoRow label={t.jft_passed_date} value={student.jftPassedDate ? <Badge color="#166534" bg="#dcfce7">{format(student.jftPassedDate, 'dd/MM/yyyy')}</Badge> : undefined} />
            </div>
          </div>

          {/* SSW Section */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#CC0000' }}>SSW (Tokutei Ginou)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <InfoRow label={t.ssw_category} value={student.sswCategory} />
              <div />
              <InfoRow label={t.ssw_planned} value={student.sswPlannedDate ? format(student.sswPlannedDate, 'dd/MM/yyyy') : undefined} />
              <InfoRow label={t.ssw_passed_date} value={student.sswPassedDate ? <Badge color="#166534" bg="#dcfce7">{format(student.sswPassedDate, 'dd/MM/yyyy')}</Badge> : undefined} />
            </div>
          </div>

          {/* Interviews Section */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#CC0000' }}>{t.interview_info}</h3>
              <button
                onClick={() => {
                  setEditModal('interviews');
                  setEditData({ interviews: student.interviews || [] });
                }}
                style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                {language === 'ja' ? '面接を追加・編集' : 'Tambah/Edit Wawancara'}
              </button>
            </div>
            {student.interviews && student.interviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {student.interviews.map((iv, idx) => (
                  <div key={idx} style={{ padding: 12, borderLeft: '3px solid #CC0000', background: '#f9fafb', borderRadius: '0 8px 8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{language === 'ja' ? `第${idx + 1}回 面接` : `Wawancara Ke-${idx + 1}`}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>📅 {format(iv.date, 'yyyy/MM/dd HH:mm')}</div>
                    </div>
                    {iv.notes && (
                      <div style={{ fontSize: 12, color: '#333', whiteSpace: 'pre-wrap', background: '#fff', padding: 8, borderRadius: 4, marginTop: 4 }}>
                        <strong>{t.interview_notes}:</strong><br />
                        {iv.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#aaa', fontSize: 13 }}>
                {language === 'ja' ? '面接記録がありません' : 'Belum ada catatan wawancara'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal: basic */}
      {editModal === 'basic' && (
        <Modal title={t.edit_personal_info} onClose={() => setEditModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Photo Section */}
            <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CC0000', marginBottom: 8, textTransform: 'uppercase' }}>{t.photo_upload}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={newPhoto ? URL.createObjectURL(newPhoto) : (student.photos?.[0]?.url || student.photoUrl || '')}
                    alt="Preview"
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #ddd' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'inline-block', padding: '6px 12px', background: '#CC0000', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {t.add_photo}
                    <input type="file" accept="image/*" onChange={(e) => setNewPhoto(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  </label>
                  <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{language === 'ja' ? 'WebPに自動変換されます' : 'Akan dikonversi ke WebP'}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.full_name}</label>
                <input value={String(editData.fullName || '')} onChange={(e) => setEditData(p => ({ ...p, fullName: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.kana}</label>
                <input value={String(editData.fullNameKana || '')} onChange={(e) => setEditData(p => ({ ...p, fullNameKana: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.status}</label>
                <select value={String(editData.status || '')} onChange={(e) => setEditData(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option value="active">{t.status_active}</option>
                  <option value="departed_japan">{t.status_departed}</option>
                  <option value="graduated">{t.status_graduated}</option>
                  <option value="withdrawn">{t.status_withdrawn}</option>
                  <option value="on_hold">{t.status_on_hold}</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.batch_number}</label>
                <input type="number" value={String(editData.batchNumber || '')} onChange={(e) => setEditData(p => ({ ...p, batchNumber: Number(e.target.value) }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.program}</label>
                <select value={String(editData.programType || '')} onChange={(e) => setEditData(p => ({ ...p, programType: e.target.value }))} style={inputStyle}>
                  <option value="tokutei_ginou">{t.tokutei_ginou}</option>
                  <option value="gijinkoku">{t.gijinkoku}</option>
                  <option value="job_matching_only">{t.job_matching_only}</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.enroll_date}</label>
                <input type="date" value={String(editData.enrollmentDate || '')} onChange={(e) => setEditData(p => ({ ...p, enrollmentDate: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.gender}</label>
                <select value={String(editData.gender || '')} onChange={(e) => setEditData(p => ({ ...p, gender: e.target.value }))} style={inputStyle}>
                  <option value="male">{t.male}</option>
                  <option value="female">{t.female}</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.birth_date}</label>
                <input type="date" value={String(editData.dateOfBirth || '')} onChange={(e) => setEditData(p => ({ ...p, dateOfBirth: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.nationality}</label>
                <input value={String(editData.nationality || '')} onChange={(e) => setEditData(p => ({ ...p, nationality: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.birth_place}</label>
                <input value={String(editData.birthPlace || '')} onChange={(e) => setEditData(p => ({ ...p, birthPlace: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.religion}</label>
                <input value={String(editData.religion || '')} onChange={(e) => setEditData(p => ({ ...p, religion: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.nik}</label>
                <input value={String(editData.nik || '')} onChange={(e) => setEditData(p => ({ ...p, nik: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.whatsapp}</label>
                <input value={String(editData.whatsapp || '')} onChange={(e) => setEditData(p => ({ ...p, whatsapp: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.email}</label>
                <input type="email" value={String(editData.email || '')} onChange={(e) => setEditData(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.address}</label>
              <input value={String(editData.address || '')} onChange={(e) => setEditData(p => ({ ...p, address: e.target.value }))} style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.city}</label>
                <input value={String(editData.city || '')} onChange={(e) => setEditData(p => ({ ...p, city: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.province}</label>
                <input value={String(editData.province || '')} onChange={(e) => setEditData(p => ({ ...p, province: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Instagram (@)</label>
                <input value={String(editData.instagramAccount || '')} onChange={(e) => setEditData(p => ({ ...p, instagramAccount: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>TikTok (@)</label>
                <input value={String(editData.tiktokAccount || '')} onChange={(e) => setEditData(p => ({ ...p, tiktokAccount: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.education_level}</label>
                <select value={String(editData.educationLevel || '')} onChange={(e) => setEditData(p => ({ ...p, educationLevel: e.target.value }))} style={inputStyle}>
                  <option value="sma">SMA</option>
                  <option value="smk">SMK</option>
                  <option value="d3">D3</option>
                  <option value="s1">S1</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.school_name}</label>
                <input value={String(editData.schoolName || '')} onChange={(e) => setEditData(p => ({ ...p, schoolName: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.graduation_year}</label>
                <input type="number" value={String(editData.graduationYear || '')} onChange={(e) => setEditData(p => ({ ...p, graduationYear: Number(e.target.value) }))} style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={() => setEditModal(null)} disabled={isSaving} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={saveBasicEdit} disabled={isSaving} style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {isSaving ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {t.saving}...
                </>
              ) : t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal: qualifications */}
      {editModal === 'qualifications' && (
        <Modal title={t.edit_qualifications} onClose={() => setEditModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.jlpt_level}</label>
            <select value={String(editData.jlptLevel || 'none')} onChange={(e) => setEditData(p => ({ ...p, jlptLevel: e.target.value }))} style={inputStyle}>
              <option value="none">{t.none}</option>
              <option value="n5">N5</option>
              <option value="n4">N4</option>
              <option value="n3">N3</option>
              <option value="n2">N2</option>
              <option value="n1">N1</option>
            </select>
          </div>
          {(['jftPassed', 'sswPassed', 'psychotestDone', 'mcuDone'] as const).map((field) => (
            <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <input type="checkbox" checked={Boolean(editData[field])} onChange={(e) => setEditData(p => ({ ...p, [field]: e.target.checked }))} />
              <label style={{ fontSize: 13 }}>
                {field === 'jftPassed' ? `JFT ${t.passed}` : 
                 field === 'sswPassed' ? `SSW ${t.passed}` : 
                 field === 'psychotestDone' ? `${t.psychotest} ${t.done}` : 
                 `${t.mcu} ${t.done}`}
              </label>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={saveBasicEdit} style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>{t.save}</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal: family */}
      {editModal === 'family' && (
        <Modal title={t.edit_family_info} onClose={() => setEditModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>{t.parent_name}</label>
              <input value={String(editData.parentName || '')} onChange={(e) => setEditData(p => ({ ...p, parentName: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.relationship}</label>
              <select value={String(editData.parentRelationship || '')} onChange={(e) => setEditData(p => ({ ...p, parentRelationship: e.target.value }))} style={inputStyle}>
                <option value="father">{t.father}</option>
                <option value="mother">{t.mother}</option>
                <option value="guardian">{t.guardian}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t.birth_date}</label>
              <input type="date" value={String(editData.parentDateOfBirth || '')} onChange={(e) => setEditData(p => ({ ...p, parentDateOfBirth: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.gender}</label>
              <select value={String(editData.parentGender || '')} onChange={(e) => setEditData(p => ({ ...p, parentGender: e.target.value }))} style={inputStyle}>
                <option value="male">{t.male}</option>
                <option value="female">{t.female}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t.nik}</label>
              <input value={String(editData.parentNik || '')} onChange={(e) => setEditData(p => ({ ...p, parentNik: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.occupation}</label>
              <input value={String(editData.parentOccupation || '')} onChange={(e) => setEditData(p => ({ ...p, parentOccupation: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.whatsapp}</label>
              <input value={String(editData.parentWhatsapp || '')} onChange={(e) => setEditData(p => ({ ...p, parentWhatsapp: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={String(editData.parentEmail || '')} onChange={(e) => setEditData(p => ({ ...p, parentEmail: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>{t.address}</label>
            <input value={String(editData.parentAddress || '')} onChange={(e) => setEditData(p => ({ ...p, parentAddress: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div>
              <label style={labelStyle}>{t.city}</label>
              <input value={String(editData.parentCity || '')} onChange={(e) => setEditData(p => ({ ...p, parentCity: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.province}</label>
              <input value={String(editData.parentProvince || '')} onChange={(e) => setEditData(p => ({ ...p, parentProvince: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{t.emergency_contact}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t.full_name}</label>
                <input value={String(editData.emergencyContact || '')} onChange={(e) => setEditData(p => ({ ...p, emergencyContact: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t.phone}</label>
                <input value={String(editData.emergencyPhone || '')} onChange={(e) => setEditData(p => ({ ...p, emergencyPhone: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t.relationship}</label>
                <input value={String(editData.emergencyRelationship || '')} onChange={(e) => setEditData(p => ({ ...p, emergencyRelationship: e.target.value }))} style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button
              onClick={() => {
                const data: any = { ...editData };
                if (data.parentDateOfBirth) data.parentDateOfBirth = new Date(data.parentDateOfBirth);
                updateMutation.mutate(data);
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal: departure */}
      {editModal === 'departure' && (
        <Modal title={t.edit_departure_info} onClose={() => setEditModal(null)}>
          {[
            { field: 'departureDate', label: t.departure_date, type: 'date' },
            { field: 'destinationCompany', label: t.destination_company, type: 'text' },
            { field: 'destinationPrefecture', label: t.prefecture, type: 'text' },
            { field: 'coeIssueDate', label: t.coe_issue_date, type: 'date' },
            { field: 'dormCheckInDate', label: language === 'ja' ? '入寮日' : 'Tgl Masuk Asrama', type: 'date' },
          ].map(({ field, label, type }) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
              <input type={type} value={String(editData[field] || '')} onChange={(e) => setEditData(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <input type="checkbox" checked={Boolean(editData.dormResident)} onChange={(e) => setEditData(p => ({ ...p, dormResident: e.target.checked }))} />
            <label style={{ fontSize: 13 }}>{language === 'ja' ? '寮に入居している' : 'Tinggal di asrama'}</label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.visa_type}</label>
            <select value={String(editData.visaType || '')} onChange={(e) => setEditData(p => ({ ...p, visaType: e.target.value }))} style={inputStyle}>
              <option value="">{t.undecided}</option>
              <option value="ssw">{t.ssw_tokutei_ginou}</option>
              <option value="gijinkoku">{t.gijinkoku}</option>
              <option value="other">{t.other}</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button
              onClick={() => {
                const data: any = { ...editData };
                if (data.departureDate) data.departureDate = new Date(data.departureDate);
                if (data.coeIssueDate) data.coeIssueDate = new Date(data.coeIssueDate);
                if (data.dormCheckInDate) data.dormCheckInDate = new Date(data.dormCheckInDate);
                updateMutation.mutate(data);
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Payment Modal */}
      {showAddPayment && (
        <Modal title={t.add_payment_record} onClose={() => setShowAddPayment(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_type}</label>
            <select value={addPaymentData.paymentType} onChange={(e) => setAddPaymentData(p => ({ ...p, paymentType: e.target.value }))} style={inputStyle}>
              <option value="education">{t.education_fee}</option>
              <option value="job_matching">{t.jm_fee}</option>
              <option value="dormitory">{t.dorm_fee}</option>
              <option value="other">{t.other}</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_method}</label>
            <select value={addPaymentData.paymentMethod} onChange={(e) => setAddPaymentData(p => ({ ...p, paymentMethod: e.target.value }))} style={inputStyle}>
              <option value="lump_sum">{t.lump_sum}</option>
              <option value="installment">{t.installment}</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.total_amount}</label>
            <CurrencyInput 
              value={addPaymentData.totalAmount} 
              onChange={(val) => setAddPaymentData(p => ({ ...p, totalAmount: val }))} 
              style={inputStyle}
              suffix="IDR"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.paid_amount}</label>
            <CurrencyInput 
              value={addPaymentData.paidAmount} 
              onChange={(val) => setAddPaymentData(p => ({ ...p, paidAmount: val }))} 
              style={inputStyle}
              suffix="IDR"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.memo}</label>
            <input value={addPaymentData.notes} onChange={(e) => setAddPaymentData(p => ({ ...p, notes: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_date}</label>
            <input type="date" value={addPaymentData.paidDate} onChange={(e) => setAddPaymentData(p => ({ ...p, paidDate: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_proof}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="file"
                id="payment-proof-upload"
                style={{ display: 'none' }}
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const res = await handleFileUpload(file);
                    if (res) {
                      setAddPaymentData(p => ({ ...p, proofFileId: res.fileId, proofUrl: res.url }));
                    }
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('payment-proof-upload')?.click()}
                disabled={isUploading}
                style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                {isUploading ? t.loading : addPaymentData.proofFileId ? '✅ ' + t.save : t.select_file}
              </button>
              {addPaymentData.proofUrl && (
                <a href={addPaymentData.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#CC0000' }}>{t.view_proof}</a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button 
              onClick={() => setShowAddPayment(false)} 
              disabled={addPaymentMutation.isPending}
              style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}
            >
              {t.cancel}
            </button>
            <button
              disabled={addPaymentMutation.isPending}
              onClick={() => {
                const total = Number(addPaymentData.totalAmount) || 0;
                const paid = Number(addPaymentData.paidAmount) || 0;
                const status: PaymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
                
                addPaymentMutation.mutate({
                  studentId: id!,
                  paymentType: addPaymentData.paymentType as PaymentType,
                  paymentMethod: addPaymentData.paymentMethod as PaymentMethod,
                  totalAmount: total,
                  paidAmount: paid,
                  remainingAmount: total - paid,
                  paymentStatus: status,
                  notes: addPaymentData.notes || undefined,
                  paidDate: addPaymentData.paidDate ? new Date(addPaymentData.paidDate) : undefined,
                  proofFileId: addPaymentData.proofFileId || undefined,
                  proofUrl: addPaymentData.proofUrl || undefined,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }, {
                  onSuccess: () => {
                    setShowAddPayment(false);
                    setAddPaymentData({ 
                      paymentType: 'education', 
                      totalAmount: 0, 
                      paidAmount: 0, 
                      paymentMethod: 'lump_sum', 
                      notes: '',
                      paidDate: format(new Date(), 'yyyy-MM-dd'),
                      proofFileId: '',
                      proofUrl: ''
                    });
                  },
                  onError: (err) => {
                    alert('Error saving payment: ' + (err as Error).message);
                  }
                });
              }}
              style={{ 
                padding: '8px 20px', 
                background: '#CC0000', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 6, 
                fontWeight: 700, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: addPaymentMutation.isPending ? 0.7 : 1
              }}
            >
              {addPaymentMutation.isPending ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {t.saving}...
                </>
              ) : t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Payment Modal */}
      {showEditPayment && (
        <Modal title={t.edit_payment} onClose={() => setShowEditPayment(null)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_type}</label>
            <select value={showEditPayment.paymentType} onChange={(e) => setShowEditPayment((p: Payment | null) => p ? ({ ...p, paymentType: e.target.value as PaymentType }) : null)} style={inputStyle}>
              <option value="education">{t.education_fee}</option>
              <option value="job_matching">{t.jm_fee}</option>
              <option value="dormitory">{t.dorm_fee}</option>
              <option value="other">{t.other}</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_method}</label>
            <select value={showEditPayment.paymentMethod} onChange={(e) => setShowEditPayment((p: Payment | null) => p ? ({ ...p, paymentMethod: e.target.value as PaymentMethod }) : null)} style={inputStyle}>
              <option value="lump_sum">{t.lump_sum}</option>
              <option value="installment">{t.installment}</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.total_amount}</label>
            <CurrencyInput 
              value={showEditPayment.totalAmount} 
              onChange={(val) => setShowEditPayment((p: Payment | null) => p ? ({ ...p, totalAmount: val }) : null)} 
              style={inputStyle}
              suffix="IDR"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.paid_amount}</label>
            <CurrencyInput 
              value={showEditPayment.paidAmount} 
              onChange={(val) => setShowEditPayment((p: Payment | null) => p ? ({ ...p, paidAmount: val }) : null)} 
              style={inputStyle}
              suffix="IDR"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.memo}</label>
            <input value={showEditPayment.notes || ''} onChange={(e) => setShowEditPayment((p: Payment | null) => p ? ({ ...p, notes: e.target.value }) : null)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_date}</label>
            <input 
              type="date" 
              value={showEditPayment.paidDate ? format(showEditPayment.paidDate, 'yyyy-MM-dd') : ''} 
              onChange={(e) => setShowEditPayment((p: Payment | null) => p ? ({ ...p, paidDate: new Date(e.target.value) }) : null)} 
              style={inputStyle} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_proof}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="file"
                id="edit-payment-proof-upload"
                style={{ display: 'none' }}
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const res = await handleFileUpload(file);
                    if (res) {
                      setShowEditPayment((p: Payment | null) => p ? ({ ...p, proofFileId: res.fileId, proofUrl: res.url }) : null);
                    }
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('edit-payment-proof-upload')?.click()}
                disabled={isUploading}
                style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                {isUploading ? t.loading : showEditPayment.proofFileId ? '✅ ' + t.save : t.select_file}
              </button>
              {showEditPayment.proofUrl && (
                <a href={showEditPayment.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#CC0000' }}>{t.view_proof}</a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowEditPayment(null)} disabled={updatePaymentMutation.isPending} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button
              disabled={updatePaymentMutation.isPending}
              onClick={() => {
                const total = Number(showEditPayment.totalAmount) || 0;
                const paid = Number(showEditPayment.paidAmount) || 0;
                const status: PaymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
                
                updatePaymentMutation.mutate({
                  paymentId: showEditPayment.id,
                  data: {
                    paymentType: showEditPayment.paymentType,
                    paymentMethod: showEditPayment.paymentMethod,
                    totalAmount: total,
                    paidAmount: paid,
                    remainingAmount: total - paid,
                    paymentStatus: status,
                    notes: showEditPayment.notes,
                    paidDate: showEditPayment.paidDate,
                    proofFileId: showEditPayment.proofFileId,
                    proofUrl: showEditPayment.proofUrl,
                    updatedAt: new Date(),
                  }
                }, {
                  onSuccess: () => setShowEditPayment(null),
                  onError: (err) => alert('Error: ' + (err as Error).message)
                });
              }}
              style={{ 
                padding: '8px 20px', 
                background: '#CC0000', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 6, 
                fontWeight: 700, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: updatePaymentMutation.isPending ? 0.7 : 1
              }}
            >
              {updatePaymentMutation.isPending ? t.saving + '...' : t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Document Modal */}
      {showAddDoc && (
        <Modal title={t.add_doc} onClose={() => setShowAddDoc(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.doc_type}</label>
            <select value={addDocData.documentType} onChange={(e) => setAddDocData(p => ({ ...p, documentType: e.target.value }))} style={inputStyle}>
              <option value="diploma_high_school">{t.doc_diploma_high_school}</option>
              <option value="diploma_vocational">{t.doc_diploma_vocational}</option>
              <option value="diploma_university">{t.doc_diploma_university}</option>
              <option value="transcript">{t.doc_transcript}</option>
              <option value="ktp">{t.doc_ktp}</option>
              <option value="kk">{t.doc_kk}</option>
              <option value="passport">{t.doc_passport}</option>
              <option value="jlpt_certificate">{t.doc_jlpt}</option>
              <option value="jft_certificate">{t.doc_jft}</option>
              <option value="ssw_certificate">{t.doc_ssw}</option>
              <option value="psychotest_result">{t.doc_psychotest}</option>
              <option value="mcu_result">{t.doc_mcu}</option>
              <option value="job_offer_letter">{t.doc_job_offer}</option>
              <option value="employment_contract">{t.doc_employment_contract}</option>
              <option value="coe_document">{t.doc_coe}</option>
              <option value="other">{t.other}</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.title}</label>
            <input value={addDocData.title} onChange={(e) => setAddDocData(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.select_file}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="file"
                id="doc-file-upload"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const res = await handleFileUpload(file);
                    if (res) {
                      setAddDocData(p => ({ ...p, fileId: res.fileId, url: res.url }));
                    }
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('doc-file-upload')?.click()}
                disabled={isUploading}
                style={{ padding: '8px 16px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}
              >
                {isUploading ? t.loading : addDocData.fileId ? '✅ ' + t.save : t.select_file}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="checkbox" id="isHeld" checked={addDocData.isHeld} onChange={(e) => setAddDocData(p => ({ ...p, isHeld: e.target.checked }))} />
            <label htmlFor="isHeld" style={{ fontSize: 13 }}>{t.held_as_collateral}</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowAddDoc(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button
              onClick={() => {
                addDocMutation.mutate({
                  data: {
                    studentId: id!,
                    documentType: addDocData.documentType as DocumentType,
                    title: addDocData.title,
                    fileId: addDocData.fileId,
                    url: addDocData.url,
                    uploadDate: new Date(),
                    isHeld: addDocData.isHeld,
                    heldDate: addDocData.isHeld ? new Date() : undefined,
                    notes: addDocData.notes || undefined,
                  },
                });
                setShowAddDoc(false);
                setAddDocData({ documentType: 'diploma_high_school', title: '', fileId: '', url: '', isHeld: false, notes: '' });
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Bank Modal */}
      {showAddBank && (
        <Modal title={t.add_account} onClose={() => setShowAddBank(false)}>
          {[
            { field: 'bankName', label: t.bank_name, type: 'text' },
            { field: 'accountNumber', label: t.account_number, type: 'text' },
            { field: 'accountHolder', label: t.account_holder, type: 'text' },
          ].map(({ field, label, type }) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
              <input type={type} value={(addBankData as any)[field]} onChange={(e) => setAddBankData(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.account_type}</label>
            <select value={addBankData.accountType} onChange={(e) => setAddBankData(p => ({ ...p, accountType: e.target.value }))} style={inputStyle}>
              <option value="savings">{t.savings}</option>
              <option value="current">{t.current}</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="checkbox" id="isPrimary" checked={addBankData.isPrimary} onChange={(e) => setAddBankData(p => ({ ...p, isPrimary: e.target.checked }))} />
            <label htmlFor="isPrimary" style={{ fontSize: 13 }}>{t.primary_account}</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowAddBank(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button
              onClick={() => {
                addBankMutation.mutate({
                  studentId: id!,
                  bankName: addBankData.bankName,
                  accountNumber: addBankData.accountNumber,
                  accountHolder: addBankData.accountHolder,
                  accountType: addBankData.accountType as 'savings' | 'current',
                  isPrimary: addBankData.isPrimary,
                  createdAt: new Date(),
                });
                setShowAddBank(false);
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Log Modal */}
      {showAddLog && (
        <Modal title={t.add_log} onClose={() => setShowAddLog(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.date}</label>
            <input type="date" value={addLogData.date} onChange={(e) => setAddLogData(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{t.log_content}</label>
            <textarea
              value={addLogData.content}
              onChange={(e) => setAddLogData(p => ({ ...p, content: e.target.value }))}
              style={{ ...inputStyle, height: 150, resize: 'vertical' }}
              placeholder={t.log_content_placeholder}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowAddLog(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button
              onClick={() => {
                addLogMutation.mutate({
                  studentId: id!,
                  staffId: user?.uid || 'unknown',
                  staffName: user?.displayName || user?.email || 'Staff', 
                  content: addLogData.content,
                  date: new Date(addLogData.date),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                setShowAddLog(false);
                setAddLogData({ content: '', date: format(new Date(), 'yyyy-MM-dd') });
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal: exams */}
      {editModal === 'exams' && (
        <Modal title={language === 'ja' ? '試験情報を編集' : 'Edit Info Ujian'} onClose={() => setEditModal(null)}>
          <div style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>JFT-A2</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>{t.jft_planned}</label>
                <input type="date" value={String(editData.jftPlannedDate || '')} onChange={(e) => setEditData(p => ({ ...p, jftPlannedDate: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>{t.jft_passed_date}</label>
                <input type="date" value={String(editData.jftPassedDate || '')} onChange={(e) => setEditData(p => ({ ...p, jftPassedDate: e.target.value }))} style={inputStyle} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>SSW</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>{t.ssw_category}</label>
              <select value={String(editData.sswCategory || '')} onChange={(e) => setEditData(p => ({ ...p, sswCategory: e.target.value }))} style={inputStyle}>
                <option value="">未選択</option>
                {SSW_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>{t.ssw_planned}</label>
                <input type="date" value={String(editData.sswPlannedDate || '')} onChange={(e) => setEditData(p => ({ ...p, sswPlannedDate: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>{t.ssw_passed_date}</label>
                <input type="date" value={String(editData.sswPassedDate || '')} onChange={(e) => setEditData(p => ({ ...p, sswPassedDate: e.target.value }))} style={inputStyle} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button
              onClick={() => {
                const data: any = { ...editData };
                if (data.jftPlannedDate) data.jftPlannedDate = new Date(data.jftPlannedDate);
                if (data.jftPassedDate) data.jftPassedDate = new Date(data.jftPassedDate);
                if (data.sswPlannedDate) data.sswPlannedDate = new Date(data.sswPlannedDate);
                if (data.sswPassedDate) data.sswPassedDate = new Date(data.sswPassedDate);
                updateMutation.mutate(data);
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal: interviews */}
      {editModal === 'interviews' && (
        <Modal title={t.interview_info} onClose={() => setEditModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[0, 1, 2].map(idx => {
              const current = (editData.interviews as any[])?.[idx] || { date: '', notes: '' };
              let dateVal = '';
              if (current.date) {
                const d = new Date(current.date);
                if (!isNaN(d.getTime())) {
                  dateVal = format(d, "yyyy-MM-dd'T'HH:mm");
                }
              }
              
              return (
                <div key={idx} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{language === 'ja' ? `第${idx + 1}回 面接` : `Wawancara Ke-${idx + 1}`}</div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>{t.interview_date}</label>
                    <input
                      type="datetime-local"
                      value={dateVal}
                      onChange={(e) => {
                        const newIv = [...(editData.interviews as any[] || [])];
                        newIv[idx] = { ...current, date: e.target.value };
                        setEditData(p => ({ ...p, interviews: newIv }));
                      }}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>{t.interview_notes}</label>
                    <textarea
                      value={current.notes || ''}
                      onChange={(e) => {
                        const newIv = [...(editData.interviews as any[] || [])];
                        newIv[idx] = { ...current, notes: e.target.value };
                        setEditData(p => ({ ...p, interviews: newIv }));
                      }}
                      style={{ ...inputStyle, height: 60, resize: 'vertical' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button
              onClick={() => {
                const ivs = (editData.interviews as any[])
                  .filter(iv => iv && iv.date)
                  .map(iv => ({
                    ...iv,
                    date: new Date(iv.date)
                  }))
                  .sort((a, b) => a.date.getTime() - b.date.getTime());
                
                updateMutation.mutate({ interviews: ivs });
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
