import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { addStudent, updateStudent, getPartners, getScouters, addStudentDocument, addPayment } from '../lib/firestore';
import { convertPhotoToWebP } from '../lib/imageUtils';
import { GDriveService } from '../lib/gdrive';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import type { StudentStatus, ProgramType, StudentSource, GenderType, ParentRelationship, EducationLevel, JLPTLevel, DocumentType, PaymentStatus } from '../lib/types';

const step1Schema = z.object({
  fullName: z.string().min(2, '氏名を入力してください'),
  fullNameKana: z.string().optional(),
  dateOfBirth: z.string().min(1, '生年月日を入力してください'),
  gender: z.enum(['male', 'female']),
  nationality: z.string().min(1, '国籍を入力してください'),
  birthPlace: z.string().min(1, '出生地を入力してください'),
  address: z.string().min(1, '住所を入力してください'),
  city: z.string().min(1, '市を入力してください'),
  province: z.string().min(1, '州を入力してください'),
  whatsapp: z.string().min(1, 'WhatsApp番号を入力してください'),
  email: z.string().email().optional().or(z.literal('')),
  nik: z.string().optional(),
  religion: z.string().optional(),
  instagramAccount: z.string().optional(),
  tiktokAccount: z.string().optional(),
  programType: z.enum(['tokutei_ginou', 'gijinkoku', 'job_matching_only']),
  batchNumber: z.coerce.number().min(1, 'バッチ番号を入力してください'),
  source: z.enum(['direct', 'partner_school']),
  partnerSchoolId: z.string().optional(),
  scouterId: z.string().optional(),
  enrollmentDate: z.string().min(1, '入学日を入力してください'),
  // 学歴
  educationLevel: z.enum(['sma', 'smk', 'd3', 's1']),
  schoolName: z.string().min(1, '学校名を入力してください'),
  graduationYear: z.coerce.number().optional(),
});

// 保証人情報は全て必須
const step2Schema = z.object({
  // 保証人情報
  parentName: z.string().min(1, '保証人名を入力してください'),
  parentRelationship: z.enum(['father', 'mother', 'guardian']),
  parentDateOfBirth: z.string().optional(),
  parentGender: z.enum(['male', 'female']).optional(),
  parentNik: z.string().min(1, '保証人のKTP番号を入力してください'),
  parentWhatsapp: z.string().min(1, '保証人のWhatsAppを入力してください'),
  parentAddress: z.string().min(1, '保証人の住所を入力してください'),
  parentCity: z.string().min(1, '保証人の市を入力してください'),
  parentProvince: z.string().min(1, '保証人の州を入力してください'),
  parentOccupation: z.string().min(1, '保証人の職業を入力してください'),
  parentEmail: z.string().email().optional().or(z.literal('')),
  // 緊急連絡先（別の場合）
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelationship: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

interface ScheduleItem {
  dueDate: string;
  amount: number;
  isPaid: boolean;
  notes: string;
}

interface Step3Data {
  educationPaymentMethod: 'lump_sum' | 'installment';
  educationAmount: number;
  educationInstallments: number;
  educationSchedules: ScheduleItem[];
  hasDorm: boolean;
  dormAmount: number;
  hasJM: boolean;
  jmAmount: number;
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  color: '#333',
  boxSizing: 'border-box' as const,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
  marginBottom: 5,
};

const requiredLabel: React.CSSProperties = {
  ...labelStyle,
  color: '#CC0000',
};

function FormGroup({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={required ? requiredLabel : labelStyle}>
        {label} {required && <span style={{ color: '#CC0000' }}>*</span>}
      </label>
      {children}
      {error && <span style={{ color: '#CC0000', fontSize: 11, marginTop: 3, display: 'block' }}>{error}</span>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#CC0000', borderBottom: '2px solid #CC0000', paddingBottom: 6, marginBottom: 14, marginTop: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </h3>
  );
}

function generateRegistrationNumber(batchNumber: number): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `BJD-${year}-B${batchNumber}-${rand}`;
}

export default function StudentNew() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Data>({
    educationPaymentMethod: 'lump_sum',
    educationAmount: 0,
    educationInstallments: 3,
    educationSchedules: Array(5).fill({ dueDate: '', amount: 0, isPaid: false, notes: '' }),
    hasDorm: false,
    dormAmount: 500000,
    hasJM: false,
    jmAmount: 0,
  });
  // 複数写真 (blob + preview URL + caption)
  const [photos, setPhotos] = useState<{ blob: Blob; previewUrl: string; caption: string }[]>([]);
  // 学歴証明書 (最大5枚)
  const [eduDocs, setEduDocs] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const { googleToken } = useAuth();

  const { data: partners = [] } = useQuery({ queryKey: ['partners'], queryFn: getPartners });
  const { data: scouters = [] } = useQuery({ queryKey: ['scouters'], queryFn: getScouters });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) as any, defaultValues: { nationality: 'Indonesia', gender: 'male', programType: 'tokutei_ginou', source: 'direct', batchNumber: 5, educationLevel: 'smk' } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) as any, defaultValues: { parentRelationship: 'father', parentGender: 'male' } });

  const watchSource = form1.watch('source');

  // --- Autosave / Draft logic ---
  const DRAFT_KEY = 'student_new_draft';
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const draftStr = localStorage.getItem(DRAFT_KEY);
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.step) setStep(draft.step);
        if (draft.step1Data) {
          setStep1Data(draft.step1Data);
          form1.reset(draft.step1Data);
        }
        if (draft.step2Data) {
          setStep2Data(draft.step2Data);
          form2.reset(draft.step2Data);
        }
        if (draft.step3Data) {
          setStep3Data(draft.step3Data);
        }
        setHasDraft(true);
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
  }, [form1, form2]);

  const form1Values = form1.watch();
  const form2Values = form2.watch();

  useEffect(() => {
    const dataToSave = {
      step,
      step1Data: Object.keys(form1Values).length > 0 ? form1Values : step1Data,
      step2Data: Object.keys(form2Values).length > 0 ? form2Values : step2Data,
      step3Data,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(dataToSave));
  }, [step, form1Values, form2Values, step3Data, step1Data, step2Data]);

  const clearDraft = () => {
    if (confirm('下書きを削除して最初からやり直しますか？（写真と書類は再度選択が必要です）')) {
      localStorage.removeItem(DRAFT_KEY);
      setStep(1);
      setStep1Data(null);
      setStep2Data(null);
      form1.reset({ nationality: 'Indonesia', gender: 'male', programType: 'tokutei_ginou', source: 'direct', batchNumber: 5, educationLevel: 'smk', fullName: '', dateOfBirth: '', birthPlace: '', address: '', city: '', province: '', whatsapp: '' });
      form2.reset({ parentRelationship: 'father', parentGender: 'male', parentName: '', parentNik: '', parentWhatsapp: '', parentAddress: '', parentCity: '', parentProvince: '', parentOccupation: '' });
      setStep3Data({
        educationPaymentMethod: 'lump_sum',
        educationAmount: 0,
        educationInstallments: 3,
        educationSchedules: Array(5).fill({ dueDate: '', amount: 0, isPaid: false, notes: '' }),
        hasDorm: false,
        dormAmount: 500000,
        hasJM: false,
        jmAmount: 0,
      });
      setPhotos([]);
      setEduDocs([]);
      setHasDraft(false);
    }
  };

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    setStep2Data(data);
    setStep(3);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // 現在の写真数と追加する写真数の合計が5を超えないように制限
    const availableSlots = 5 - photos.length;
    if (availableSlots <= 0) {
      alert('写真は最大5枚までです。');
      e.target.value = '';
      return;
    }
    
    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      alert(`写真は最大5枚までです。選択されたファイルのうち最初の${availableSlots}枚のみ追加されます。`);
    }

    const newPhotos: { blob: Blob; previewUrl: string; caption: string }[] = [];
    for (const file of filesToUpload) {
      try {
        const webp = await convertPhotoToWebP(file);
        const previewUrl = URL.createObjectURL(webp);
        newPhotos.push({ blob: webp, previewUrl, caption: '' });
      } catch (err) {
        console.error(err);
      }
    }
    
    if (newPhotos.length > 0) {
      setPhotos(prev => [...prev, ...newPhotos]);
    }
    e.target.value = '';
  };

  const handleEduDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const availableSlots = 5 - eduDocs.length;
    if (availableSlots <= 0) {
      alert('書類は最大5枚までです。');
      e.target.value = '';
      return;
    }
    const filesToAdd = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      alert(`書類は最大5枚までです。最初の${availableSlots}枚のみ追加されます。`);
    }
    setEduDocs(prev => [...prev, ...filesToAdd]);
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    const photo = photos[idx];
    URL.revokeObjectURL(photo.previewUrl);
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const removeEduDoc = (idx: number) => {
    setEduDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCaption = (idx: number, caption: string) => {
    setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p));
  };

  const handleFinalSubmit = async () => {
    if (!step1Data || !step2Data) return;
    setSubmitting(true);
    try {
      const registrationNumber = generateRegistrationNumber(step1Data.batchNumber);

      setUploadProgress('生徒情報を保存中...');
      const studentId = await addStudent({
        registrationNumber,
        enrollmentDate: new Date(step1Data.enrollmentDate),
        status: 'active' as StudentStatus,
        programType: step1Data.programType as ProgramType,
        batchNumber: step1Data.batchNumber,
        source: step1Data.source as StudentSource,
        partnerSchoolId: step1Data.partnerSchoolId || undefined,
        scouterId: step1Data.scouterId || undefined,
        fullName: step1Data.fullName,
        fullNameKana: step1Data.fullNameKana || undefined,
        dateOfBirth: new Date(step1Data.dateOfBirth),
        gender: step1Data.gender as GenderType,
        religion: step1Data.religion || undefined,
        nationality: step1Data.nationality,
        birthPlace: step1Data.birthPlace,
        address: step1Data.address,
        city: step1Data.city,
        province: step1Data.province,
        phone: step1Data.whatsapp, // 電話番号はWhatsAppと同じものを保存
        whatsapp: step1Data.whatsapp,
        email: step1Data.email || undefined,
        nik: step1Data.nik || undefined,
        instagramAccount: step1Data.instagramAccount || undefined,
        tiktokAccount: step1Data.tiktokAccount || undefined,
        photos: [],
        educationLevel: step1Data.educationLevel as EducationLevel,
        schoolName: step1Data.schoolName,
        graduationYear: step1Data.graduationYear || undefined,
        jlptLevel: 'none' as JLPTLevel,
        jftPassed: false,
        sswPassed: false,
        psychotestDone: false,
        mcuDone: false,
        parentName: step2Data.parentName,
        parentRelationship: step2Data.parentRelationship as ParentRelationship,
        parentDateOfBirth: step2Data.parentDateOfBirth ? new Date(step2Data.parentDateOfBirth) : undefined,
        parentGender: step2Data.parentGender as GenderType | undefined,
        parentNik: step2Data.parentNik,
        parentPhone: step2Data.parentWhatsapp, // 保証人の電話番号もWhatsAppと同じものを保存
        parentWhatsapp: step2Data.parentWhatsapp,
        parentAddress: step2Data.parentAddress,
        parentCity: step2Data.parentCity,
        parentProvince: step2Data.parentProvince,
        parentOccupation: step2Data.parentOccupation,
        parentEmail: step2Data.parentEmail || undefined,
        emergencyContact: step2Data.emergencyContact || undefined,
        emergencyPhone: step2Data.emergencyPhone || undefined,
        emergencyRelationship: step2Data.emergencyRelationship || undefined,
        dormResident: step3Data.hasDorm,
        dormCheckOutDate: undefined,
        departureDate: undefined,
        destinationCompany: undefined,
        destinationPrefecture: undefined,
        visaType: undefined,
        coeIssueDate: undefined,
        coeCancellationDate: undefined,
        driveFolderId: undefined,
        notes: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 教育費の支払いレコードを作成
      if (step3Data.educationAmount > 0) {
        const totalAmount = step3Data.educationAmount;
        let paidAmount = 0;
        let status: PaymentStatus = 'unpaid';
        let installments: any[] = [];
        
        if (step3Data.educationPaymentMethod === 'installment') {
          installments = step3Data.educationSchedules.slice(0, step3Data.educationInstallments).map((s, idx) => {
            if (s.isPaid) paidAmount += s.amount;
            return {
              installmentNumber: idx + 1,
              dueDate: s.dueDate ? new Date(s.dueDate) : new Date(),
              amount: s.amount,
              isPaid: s.isPaid,
              paidDate: s.isPaid ? new Date() : undefined,
              notes: s.notes || undefined,
            };
          });
          status = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
        } else {
          status = 'unpaid';
        }

        await addPayment({
          studentId,
          paymentType: 'education',
          paymentMethod: step3Data.educationPaymentMethod,
          totalAmount,
          paidAmount,
          remainingAmount: totalAmount - paidAmount,
          paymentStatus: status,
          installments: installments.length > 0 ? installments : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Google Drive に写真をアップロード
      if (photos.length > 0 && googleToken) {
        setUploadProgress('Google Driveにフォルダを作成中...');
        const drive = new GDriveService(googleToken);
        const rootId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
        const studentFolderId = await drive.createFolder(
          `${studentId}_${step1Data.fullName}`,
          rootId
        );
        const photoFolderId = await drive.createFolder('Photos', studentFolderId);

        const uploadedPhotos: { fileId: string; url: string; caption?: string }[] = [];
        for (let i = 0; i < photos.length; i++) {
          setUploadProgress(`写真をアップロード中 (${i + 1}/${photos.length})...`);
          const { blob, caption } = photos[i];
          const file = new File([blob], `photo_${i + 1}.webp`, { type: 'image/webp' });
          const fileId = await drive.uploadFile(file, photoFolderId);
          await drive.makePublic(fileId);
          const url = drive.getThumbnailUrl(fileId, 400);
          uploadedPhotos.push({ fileId, url, caption: caption || undefined });
        }

        setUploadProgress('情報を更新中...');
        await updateStudent(studentId, {
          driveFolderId: studentFolderId,
          photos: uploadedPhotos,
          photoUrl: uploadedPhotos[0] ? drive.getViewUrl(uploadedPhotos[0].fileId) : undefined,
          updatedAt: new Date(),
        });

        // 学歴証明書のアップロード
        if (eduDocs.length > 0) {
          setUploadProgress('学歴証明書をアップロード中...');
          const docsFolderId = await drive.createFolder('Documents', studentFolderId);
          
          for (let i = 0; i < eduDocs.length; i++) {
            setUploadProgress(`学歴証明書をアップロード中 (${i + 1}/${eduDocs.length})...`);
            const file = eduDocs[i];
            const fileId = await drive.uploadFile(file, docsFolderId);
            await drive.makePublic(fileId);
            const fileUrl = drive.getViewUrl(fileId);
            
            let docType: DocumentType = 'other';
            if (step1Data.educationLevel === 'sma') docType = 'diploma_high_school';
            else if (step1Data.educationLevel === 'smk') docType = 'diploma_vocational';
            else if (step1Data.educationLevel === 'd3' || step1Data.educationLevel === 's1') docType = 'diploma_university';
            
            await addStudentDocument(studentId, {
              studentId,
              documentType: docType,
              title: `学歴証明書 ${i + 1} (${file.name})`,
              fileId,
              fileUrl,
              uploadDate: new Date(),
              isHeld: false,
            });
          }
        }
      } else if (photos.length > 0 && !googleToken) {
        alert('Googleトークンが期限切れです。再ログインして写真をアップロードしてください。');
      }

      // 下書きをクリア
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);

      navigate('/students');
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`登録に失敗しました。再度お試しください。\n詳細: ${errMsg}`);
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  const STEPS = [t.step1, t.step2, t.step3, t.step4];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 24 }}>{t.new_student_reg}</h1>

      {hasDraft && (
        <div style={{ background: '#e0f2fe', borderLeft: '4px solid #0284c7', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{t.draft_restored}</div>
            <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>※写真や書類は復元されないため、再アップロードしてください。</div>
          </div>
          <button type="button" onClick={clearDraft} style={{ background: '#fff', border: '1px solid #bae6fd', color: '#0369a1', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {t.clear_draft}
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div style={{ display: 'flex', marginBottom: 28 }}>
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div key={n} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: active ? '#CC0000' : done ? '#990000' : '#ddd', color: active || done ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                  {done ? '✓' : n}
                </div>
                <span style={{ fontSize: 11, color: active ? '#CC0000' : '#888', fontWeight: active ? 700 : 400 }}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ height: 2, flex: 1, background: done ? '#CC0000' : '#e0e0e0', marginBottom: 20 }} />}
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>

        {/* ── Step 1: 基本情報 ── */}
        {step === 1 && (
          <form onSubmit={form1.handleSubmit(onStep1Submit as SubmitHandler<Step1Data>)}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#CC0000' }}>Step 1 — {t.step1}</h2>

            <SectionTitle>{t.personal_info}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label={t.full_name} required error={form1.formState.errors.fullName?.message}>
                <input {...form1.register('fullName')} style={inputStyle} placeholder="例: Budi Santoso" />
              </FormGroup>
              <FormGroup label={t.kana}>
                <input {...form1.register('fullNameKana')} style={inputStyle} placeholder="ブディ・サントソ" />
              </FormGroup>

              <div style={{ gridColumn: '1 / -1', marginBottom: 8, marginTop: 8 }}>
                <FormGroup label={t.photo_upload}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'inline-block', padding: '8px 16px', background: photos.length >= 5 ? '#ccc' : '#CC0000', color: '#fff', borderRadius: 6, cursor: photos.length >= 5 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                      📷 {t.add_photo}
                      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} disabled={photos.length >= 5} style={{ display: 'none' }} />
                    </label>
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#888' }}>{language === 'ja' ? 'WebP自動変換 · 複数選択可' : 'Konversi WebP otomatis · Bisa pilih banyak'}</span>
                  </div>

                  {photos.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                      {photos.map((photo, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 120 }}>
                          <img src={photo.previewUrl} alt={`photo-${idx}`} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: idx === 0 ? '3px solid #CC0000' : '2px solid #ddd' }} />
                          {idx === 0 && <span style={{ position: 'absolute', top: 4, left: 4, background: '#CC0000', color: '#fff', fontSize: 9, padding: '2px 5px', borderRadius: 4 }}>{t.main}</span>}
                          <button type="button" onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11 }}>✕</button>
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => updateCaption(idx, e.target.value)}
                            placeholder={t.caption}
                            style={{ width: '100%', fontSize: 11, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 4, marginTop: 4, boxSizing: 'border-box' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </FormGroup>
              </div>
              <FormGroup label={t.birth_date} required>
                <input type="date" {...form1.register('dateOfBirth')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.gender} required>
                <select {...form1.register('gender')} style={inputStyle}>
                  <option value="male">{t.male}</option>
                  <option value="female">{t.female}</option>
                </select>
              </FormGroup>
              <FormGroup label={t.nationality} required>
                <input {...form1.register('nationality')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.birth_place} required>
                <input {...form1.register('birthPlace')} style={inputStyle} placeholder="例: Denpasar" />
              </FormGroup>
              <FormGroup label={t.religion}>
                <input {...form1.register('religion')} style={inputStyle} placeholder="例: Islam" />
              </FormGroup>
              <FormGroup label={t.nik}>
                <input {...form1.register('nik')} style={inputStyle} placeholder={language === 'ja' ? '16桁' : '16 digit'} />
              </FormGroup>
            </div>

            <SectionTitle>{t.address_contact}</SectionTitle>
            <FormGroup label={t.address} required>
              <input {...form1.register('address')} style={inputStyle} placeholder="Jl. ..." />
            </FormGroup>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label={t.city} required>
                <input {...form1.register('city')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.province} required>
                <input {...form1.register('province')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.whatsapp} required>
                <input {...form1.register('whatsapp')} style={inputStyle} placeholder="+62..." />
              </FormGroup>
              <FormGroup label={t.email}>
                <input type="email" {...form1.register('email')} style={inputStyle} />
              </FormGroup>
            </div>

            <SectionTitle>{t.sns_accounts}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label="Instagram">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#888', fontSize: 14 }}>@</span>
                  <input {...form1.register('instagramAccount')} style={{ ...inputStyle, flex: 1 }} placeholder="username" />
                </div>
              </FormGroup>
              <FormGroup label="TikTok">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#888', fontSize: 14 }}>@</span>
                  <input {...form1.register('tiktokAccount')} style={{ ...inputStyle, flex: 1 }} placeholder="username" />
                </div>
              </FormGroup>
            </div>

            <SectionTitle>{t.enrollment_info}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <FormGroup label={t.program} required>
                <select {...form1.register('programType')} style={inputStyle}>
                  <option value="tokutei_ginou">特定技能</option>
                  <option value="gijinkoku">技人国</option>
                  <option value="job_matching_only">JMのみ</option>
                </select>
              </FormGroup>
              <FormGroup label={t.batch} required>
                <input type="number" {...form1.register('batchNumber')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.enroll_date} required>
                <input type="date" {...form1.register('enrollmentDate')} style={inputStyle} />
              </FormGroup>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label={t.enroll_route} required>
                <select {...form1.register('source')} style={inputStyle}>
                  <option value="direct">直接入学</option>
                  <option value="partner_school">提携校経由</option>
                </select>
              </FormGroup>
              {watchSource === 'partner_school' && (
                <FormGroup label={t.partner_school}>
                  <select {...form1.register('partnerSchoolId')} style={inputStyle}>
                    <option value="">{language === 'ja' ? '選択してください' : 'Silakan pilih'}</option>
                    {partners.filter(p => p.partnerType === 'school' || p.partnerType === 'university').map(p => (
                      <option key={p.id} value={p.id}>{p.partnerName}</option>
                    ))}
                  </select>
                </FormGroup>
              )}
              <FormGroup label={t.scouter}>
                <select {...form1.register('scouterId')} style={inputStyle}>
                  <option value="">{language === 'ja' ? '選択なし' : 'Tidak ada'}</option>
                  {scouters.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </select>
              </FormGroup>
            </div>

            <SectionTitle>{t.education_info}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <FormGroup label={t.education_level} required>
                <select {...form1.register('educationLevel')} style={inputStyle}>
                  <option value="sma">SMA (高校)</option>
                  <option value="smk">SMK (職業高校)</option>
                  <option value="d3">D3 (短大)</option>
                  <option value="s1">S1 (大学)</option>
                </select>
              </FormGroup>
              <FormGroup label={t.school_name} required error={form1.formState.errors.schoolName?.message}>
                <input {...form1.register('schoolName')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.graduation_year}>
                <input type="number" {...form1.register('graduationYear')} style={inputStyle} placeholder="2023" />
              </FormGroup>
            </div>
            
            <div style={{ gridColumn: '1 / -1', marginBottom: 8, marginTop: 8 }}>
              <FormGroup label={t.edu_docs}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'inline-block', padding: '8px 16px', background: eduDocs.length >= 5 ? '#ccc' : '#CC0000', color: '#fff', borderRadius: 6, cursor: eduDocs.length >= 5 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                    📄 {t.add_doc}
                    <input type="file" accept="image/*,.pdf" multiple onChange={handleEduDocUpload} disabled={eduDocs.length >= 5} style={{ display: 'none' }} />
                  </label>
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#888' }}>{language === 'ja' ? 'PDF・画像可（最大5枚まで）' : 'PDF/Gambar (Maks 5)'}</span>
                </div>
                {eduDocs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {eduDocs.map((doc, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, border: '1px solid #ddd' }}>
                        <span style={{ fontSize: 16 }}>📄</span>
                        <span style={{ flex: 1, fontSize: 13, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                        <button type="button" onClick={() => removeEduDoc(idx)} style={{ background: 'transparent', color: '#CC0000', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕ {t.delete}</button>
                      </div>
                    ))}
                  </div>
                )}
              </FormGroup>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="submit" style={{ padding: '10px 28px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {t.next} →
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: 保証人情報 ── */}
        {step === 2 && (
          <form onSubmit={form2.handleSubmit(onStep2Submit as SubmitHandler<Step2Data>)}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#CC0000' }}>Step 2 — {t.step2}</h2>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>{t.required_fields}</p>

            <SectionTitle>{t.guarantor_info}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label={t.full_name} required error={form2.formState.errors.parentName?.message}>
                <input {...form2.register('parentName')} style={inputStyle} placeholder="例: Wayan Santosa" />
              </FormGroup>
              <FormGroup label={t.relationship} required>
                <select {...form2.register('parentRelationship')} style={inputStyle}>
                  <option value="father">{t.father}</option>
                  <option value="mother">{t.mother}</option>
                  <option value="guardian">{t.guardian}</option>
                </select>
              </FormGroup>
              <FormGroup label={t.birth_date}>
                <input type="date" {...form2.register('parentDateOfBirth')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.gender}>
                <select {...form2.register('parentGender')} style={inputStyle}>
                  <option value="male">{t.male}</option>
                  <option value="female">{t.female}</option>
                </select>
              </FormGroup>
              <FormGroup label={t.nik} required error={form2.formState.errors.parentNik?.message}>
                <input {...form2.register('parentNik')} style={inputStyle} placeholder="16桁のNIK番号" />
              </FormGroup>
              <FormGroup label={t.occupation} required error={form2.formState.errors.parentOccupation?.message}>
                <input {...form2.register('parentOccupation')} style={inputStyle} placeholder="例: Petani, PNS, Swasta" />
              </FormGroup>
            </div>

            <SectionTitle>{t.contact_info}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label={t.whatsapp} required error={form2.formState.errors.parentWhatsapp?.message}>
                <input {...form2.register('parentWhatsapp')} style={inputStyle} placeholder="+62..." />
              </FormGroup>
              <FormGroup label={t.email}>
                <input type="email" {...form2.register('parentEmail')} style={inputStyle} />
              </FormGroup>
            </div>

            <SectionTitle>{t.address}</SectionTitle>
            <FormGroup label={t.address} required error={form2.formState.errors.parentAddress?.message}>
              <input {...form2.register('parentAddress')} style={inputStyle} placeholder="Jl. ..." />
            </FormGroup>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label={t.city} required error={form2.formState.errors.parentCity?.message}>
                <input {...form2.register('parentCity')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.province} required error={form2.formState.errors.parentProvince?.message}>
                <input {...form2.register('parentProvince')} style={inputStyle} />
              </FormGroup>
            </div>

            <SectionTitle>{t.emergency_contact}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <FormGroup label={t.full_name}>
                <input {...form2.register('emergencyContact')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.phone}>
                <input {...form2.register('emergencyPhone')} style={inputStyle} />
              </FormGroup>
              <FormGroup label={t.relationship}>
                <input {...form2.register('emergencyRelationship')} style={inputStyle} placeholder="例: Saudara" />
              </FormGroup>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button type="button" onClick={() => setStep(1)} style={{ padding: '10px 20px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 7, fontWeight: 600, cursor: 'pointer' }}>
                ← {t.back}
              </button>
              <button type="submit" style={{ padding: '10px 28px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {t.next} →
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: 支払い設定 ── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#CC0000' }}>Step 3 — {t.step3}</h2>

            <SectionTitle>{t.education_fee}</SectionTitle>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormGroup label={t.payment_method}>
                  <select value={step3Data.educationPaymentMethod} onChange={(e) => setStep3Data(p => ({ ...p, educationPaymentMethod: e.target.value as 'lump_sum' | 'installment' }))} style={inputStyle}>
                    <option value="lump_sum">{t.lump_sum} (Rp 20,000,000)</option>
                    <option value="installment">{t.installment} (Rp 25,000,000)</option>
                  </select>
                </FormGroup>
                <FormGroup label={t.amount + ' (IDR)'}>
                  <input type="number" value={step3Data.educationAmount} onChange={(e) => setStep3Data(p => ({ ...p, educationAmount: Number(e.target.value) }))} style={inputStyle} />
                </FormGroup>
                {step3Data.educationPaymentMethod === 'installment' && (
                  <FormGroup label={t.installment_count + ' (最大5回)'}>
                    <select 
                      value={step3Data.educationInstallments} 
                      onChange={(e) => setStep3Data(p => ({ ...p, educationInstallments: Number(e.target.value) }))} 
                      style={inputStyle}
                    >
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}回</option>)}
                    </select>
                  </FormGroup>
                )}
              </div>
              
              {step3Data.educationPaymentMethod === 'installment' && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 12 }}>{t.payment_schedule}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Array.from({ length: step3Data.educationInstallments }).map((_, idx) => {
                      const s = step3Data.educationSchedules[idx] || { dueDate: '', amount: 0, isPaid: false, notes: '' };
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8 }}>
                          <div style={{ width: 40, fontWeight: 700, color: '#CC0000', fontSize: 13 }}>{idx + 1}回目</div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>{t.due_date}</label>
                            <input 
                              type="date" 
                              value={s.dueDate} 
                              onChange={(e) => {
                                const newScheds = [...step3Data.educationSchedules];
                                newScheds[idx] = { ...newScheds[idx], dueDate: e.target.value };
                                setStep3Data(p => ({ ...p, educationSchedules: newScheds }));
                              }} 
                              style={{ ...inputStyle, padding: '6px 10px' }} 
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>{t.amount} (IDR)</label>
                            <input 
                              type="number" 
                              value={s.amount} 
                              onChange={(e) => {
                                const newScheds = [...step3Data.educationSchedules];
                                newScheds[idx] = { ...newScheds[idx], amount: Number(e.target.value) };
                                setStep3Data(p => ({ ...p, educationSchedules: newScheds }));
                              }} 
                              style={{ ...inputStyle, padding: '6px 10px' }} 
                            />
                          </div>
                          <div style={{ flex: 1.5 }}>
                            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>{t.memo}</label>
                            <input 
                              type="text" 
                              value={s.notes} 
                              placeholder="メモ..."
                              onChange={(e) => {
                                const newScheds = [...step3Data.educationSchedules];
                                newScheds[idx] = { ...newScheds[idx], notes: e.target.value };
                                setStep3Data(p => ({ ...p, educationSchedules: newScheds }));
                              }} 
                              style={{ ...inputStyle, padding: '6px 10px' }} 
                            />
                          </div>
                          <div style={{ width: 80, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>{t.is_paid}</label>
                            <input 
                              type="checkbox" 
                              checked={s.isPaid} 
                              onChange={(e) => {
                                const newScheds = [...step3Data.educationSchedules];
                                newScheds[idx] = { ...newScheds[idx], isPaid: e.target.checked };
                                setStep3Data(p => ({ ...p, educationSchedules: newScheds }));
                              }} 
                              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#CC0000' }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <SectionTitle>{t.dorm_info}</SectionTitle>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <input type="checkbox" id="hasDorm" checked={step3Data.hasDorm} onChange={(e) => setStep3Data(p => ({ ...p, hasDorm: e.target.checked }))} />
                <label htmlFor="hasDorm" style={{ fontWeight: 600, fontSize: 14 }}>{t.dorm_resident}</label>
              </div>
              {step3Data.hasDorm && (
                <FormGroup label={t.monthly_dorm_fee + ' (IDR)'}>
                  <input type="number" value={step3Data.dormAmount} onChange={(e) => setStep3Data(p => ({ ...p, dormAmount: Number(e.target.value) }))} style={{ ...inputStyle, maxWidth: 200 }} />
                </FormGroup>
              )}
            </div>

            <SectionTitle>{t.jm_fee}</SectionTitle>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <input type="checkbox" id="hasJM" checked={step3Data.hasJM} onChange={(e) => setStep3Data(p => ({ ...p, hasJM: e.target.checked }))} />
                <label htmlFor="hasJM" style={{ fontWeight: 600, fontSize: 14 }}>{t.has_jm} (合計 Rp 20,000,000)</label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button type="button" onClick={() => setStep(2)} style={{ padding: '10px 20px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 7, fontWeight: 600, cursor: 'pointer' }}>
                ← {t.back}
              </button>
              <button type="button" onClick={() => setStep(4)} style={{ padding: '10px 28px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {t.next} →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: 写真・確認 ── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#CC0000' }}>Step 4 — {t.step4}</h2>

            <SectionTitle>{t.confirm_reg}</SectionTitle>
            {step1Data && step2Data && (
              <div style={{ fontSize: 13, color: '#555', lineHeight: 2, background: '#f9fafb', padding: 16, borderRadius: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <div><strong>{t.full_name}:</strong> {step1Data.fullName}</div>
                  <div><strong>{t.batch}:</strong> Batch {step1Data.batchNumber}</div>
                  <div><strong>{t.program}:</strong> {step1Data.programType}</div>
                  <div><strong>{t.enroll_date}:</strong> {step1Data.enrollmentDate}</div>
                  <div><strong>{t.education_level}:</strong> {step1Data.educationLevel.toUpperCase()} ({step1Data.schoolName})</div>
                  <div><strong>{t.graduation_year}:</strong> {step1Data.graduationYear || '—'}</div>
                  <div><strong>{t.whatsapp}:</strong> <a href={`https://wa.me/${step1Data.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>{step1Data.whatsapp}</a></div>
                  {step1Data.instagramAccount && <div><strong>Instagram:</strong> <a href={`https://instagram.com/${step1Data.instagramAccount.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>@{step1Data.instagramAccount.replace(/^@/, '')}</a></div>}
                  {step1Data.tiktokAccount && <div><strong>TikTok:</strong> <a href={`https://tiktok.com/@${step1Data.tiktokAccount.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>@{step1Data.tiktokAccount.replace(/^@/, '')}</a></div>}
                  <div style={{ gridColumn: '1/-1', borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4 }}>
                    <strong>{t.guarantor_info}:</strong> {step2Data.parentName} ({step2Data.parentRelationship === 'father' ? (t.male === '男性' ? '父' : 'Ayah') : step2Data.parentRelationship === 'mother' ? (t.male === '男性' ? '母' : 'Ibu') : (t.male === '男性' ? '後見人' : 'Wali')})
                  </div>
                  <div><strong>KTP:</strong> {step2Data.parentNik}</div>
                  <div><strong>{t.whatsapp}:</strong> <a href={`https://wa.me/${step2Data.parentWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>{step2Data.parentWhatsapp}</a></div>
                  <div><strong>{t.address}:</strong> {step2Data.parentAddress}, {step2Data.parentCity}</div>
                  
                  <div style={{ gridColumn: '1/-1', borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4 }}>
                    <strong>{t.payment_settings} ({t.education_fee}):</strong> {step3Data.educationPaymentMethod === 'lump_sum' ? t.lump_sum : t.installment}
                  </div>
                  <div><strong>{t.amount}:</strong> Rp {step3Data.educationAmount.toLocaleString('id-ID')}</div>
                  {step3Data.educationPaymentMethod === 'installment' && (
                    <div style={{ gridColumn: '1/-1', background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #eee', marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>{t.payment_schedule} ({step3Data.educationInstallments}回)</div>
                      {step3Data.educationSchedules.slice(0, step3Data.educationInstallments).map((s, idx) => (
                        <div key={idx} style={{ fontSize: 12, display: 'flex', gap: 12, borderBottom: idx === step3Data.educationInstallments - 1 ? 'none' : '1px solid #f5f5f5', padding: '2px 0' }}>
                          <span style={{ width: 45, fontWeight: 600 }}>{idx + 1}{language === 'ja' ? '回目' : ''}:</span>
                          <span style={{ width: 85 }}>{s.dueDate || (language === 'ja' ? '日付未定' : 'Tgl belum ditentukan')}</span>
                          <span style={{ flex: 1 }}>Rp {s.amount.toLocaleString('id-ID')}</span>
                          {s.isPaid && <span style={{ color: '#166534', fontWeight: 700 }}>[{t.is_paid}]</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ gridColumn: '1/-1', borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4 }}>
                    <strong>{language === 'ja' ? 'その他設定' : 'Pengaturan Lainnya'}:</strong> {step3Data.hasDorm ? `${t.dorm_resident} (Rp ${step3Data.dormAmount.toLocaleString('id-ID')}/月)` : (language === 'ja' ? '寮入居なし' : 'Tidak ada asrama')} / {step3Data.hasJM ? t.has_jm : (language === 'ja' ? 'JM費なし' : 'Tidak ada JM')}
                  </div>
                  <div><strong>{language === 'ja' ? '写真枚数' : 'Jumlah Foto'}:</strong> {photos.length}{language === 'ja' ? '枚' : ''} {photos.length > 0 ? `(Google Drive ${language === 'ja' ? 'へアップロード' : 'diunggah'})` : ''}</div>
                  {!googleToken && photos.length > 0 && <div style={{ gridColumn: '1/-1', color: '#CC0000', fontSize: 12 }}>⚠ {language === 'ja' ? 'Googleトークンが期限切れです。再ログインしてください。' : 'Token Google kedaluwarsa. Silakan login kembali.'}</div>}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button type="button" onClick={() => setStep(3)} style={{ padding: '10px 20px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 7, fontWeight: 600, cursor: 'pointer' }}>
                ← {t.back}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                {uploadProgress && (
                  <span style={{ fontSize: 12, color: '#666' }}>{uploadProgress}</span>
                )}
                <button type="button" onClick={handleFinalSubmit} disabled={submitting}
                  style={{ padding: '10px 28px', background: submitting ? '#aaa' : '#CC0000', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? t.editing : `✓ ${t.register}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
