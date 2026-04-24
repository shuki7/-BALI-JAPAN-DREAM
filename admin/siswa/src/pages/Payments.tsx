import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPayments, getStudents, addPayment, updatePayment, deletePayment, updateStudent } from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { CurrencyInput } from '../components/CurrencyInput';
import { GDriveService } from '../lib/gdrive';
import { convertPhotoToWebP } from '../lib/imageUtils';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import type { PaymentType, PaymentStatus, PaymentMethod } from '../lib/types';

function StatusBadge({ status }: { status: PaymentStatus }) {
  const { language } = useLanguage();
  const m: Record<PaymentStatus, [string, string, string]> = {
    paid: [language === 'ja' ? '支払済' : 'Lunas', '#166534', '#dcfce7'],
    partial: [language === 'ja' ? '一部払い' : 'Sebagian', '#92400e', '#fef3c7'],
    unpaid: [language === 'ja' ? '未払い' : 'Belum Bayar', '#991b1b', '#fee2e2'],
  };
  const [label, color, bg] = m[status];
  return <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg }}>{label}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 13,
  color: '#333',
  boxSizing: 'border-box' as const,
};

export default function Payments() {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { googleToken, refreshGoogleToken } = useAuth();
  const t = translations[language];
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => getPayments() });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [addData, setAddData] = useState({
    studentId: '',
    paymentType: 'education',
    paymentMethod: 'lump_sum',
    totalAmount: 0,
    paidAmount: 0,
    notes: '',
    paidDate: format(new Date(), 'yyyy-MM-dd'),
    proofFileId: '',
    proofUrl: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  // Helper to ensure student folder exists and upload file
  const handleFileUpload = async (file: File, studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      alert('Please select a student first');
      return null;
    }
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
        await updateStudent(student.id, { driveFolderId: folderId });
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

  const addMutation = useMutation({
    mutationFn: addPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowAdd(false);
      setAddData({ 
        studentId: '', 
        paymentType: 'education', 
        paymentMethod: 'lump_sum', 
        totalAmount: 0, 
        paidAmount: 0, 
        notes: '',
        paidDate: format(new Date(), 'yyyy-MM-dd'),
        proofFileId: '',
        proofUrl: ''
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<any> }) => updatePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });

  const studentMap = useMemo(() => {
    const m: Record<string, string> = {};
    students.forEach((s) => { m[s.id] = s.fullName; });
    return m;
  }, [students]);

  const filtered = useMemo(() => {
    return payments.filter((p: any) => {
      if (filterStatus && p.paymentStatus !== filterStatus) return false;
      if (filterType && p.paymentType !== filterType) return false;
      return true;
    });
  }, [payments, filterStatus, filterType]);

  const typeLabel = (ty: PaymentType) => {
    const labels: Record<string, string> = {
      education: t.education_fee,
      job_matching: t.jm_fee,
      dormitory: t.dorm_fee,
      other: t.other
    };
    return labels[ty] || ty;
  };

  const handleSave = () => {
    const target = editTarget || addData;
    const total = Number(target.totalAmount);
    const paid = Number(target.paidAmount);
    const status: PaymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    
    const payload = {
      studentId: target.studentId,
      paymentType: target.paymentType as PaymentType,
      paymentMethod: target.paymentMethod as PaymentMethod,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: total - paid,
      paymentStatus: status,
      notes: target.notes || undefined,
      paidDate: target.paidDate ? new Date(target.paidDate) : undefined,
      proofFileId: target.proofFileId || undefined,
      proofUrl: target.proofUrl || undefined,
      updatedAt: new Date(),
    };

    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      addMutation.mutate({
        ...payload,
        createdAt: new Date(),
      });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.payments}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>{language === 'ja' ? '全生徒の支払い状況' : 'Status pembayaran semua siswa'} — {filtered.length} {language === 'ja' ? '件' : 'data'}</p>
        </div>
        <button
          onClick={() => {
            setAddData({ 
              studentId: '', 
              paymentType: 'education', 
              paymentMethod: 'lump_sum', 
              totalAmount: 0, 
              paidAmount: 0, 
              notes: '',
              paidDate: format(new Date(), 'yyyy-MM-dd'),
              proofFileId: '',
              proofUrl: ''
            });
            setShowAdd(true);
          }}
          style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
        >
          + {t.add_payment_record}
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 12 }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">{language === 'ja' ? '全ステータス' : 'Semua Status'}</option>
          <option value="paid">{language === 'ja' ? '支払済' : 'Lunas'}</option>
          <option value="partial">{language === 'ja' ? '一部払い' : 'Sebagian'}</option>
          <option value="unpaid">{language === 'ja' ? '未払い' : 'Belum Bayar'}</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">{language === 'ja' ? '全カテゴリー' : 'Semua Kategori'}</option>
          <option value="education">{t.education_fee}</option>
          <option value="job_matching">{t.jm_fee}</option>
          <option value="dormitory">{t.dorm_fee}</option>
          <option value="other">{t.other}</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>{t.loading}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {[t.full_name, language === 'ja' ? '項目' : 'Kategori', t.payment_date, language === 'ja' ? '総額 (IDR)' : 'Total (IDR)', language === 'ja' ? '支払済' : 'Terbayar', language === 'ja' ? '残金' : 'Sisa', t.status, language === 'ja' ? '操作' : 'Aksi'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    background: p.paymentStatus === 'unpaid' ? '#fff8f8' : '#fff',
                  }}
                >
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{studentMap[p.studentId] || p.studentId}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{typeLabel(p.paymentType)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    {p.paidDate ? format(p.paidDate, 'dd/MM/yyyy') : '-'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>Rp {p.totalAmount.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#166534' }}>Rp {p.paidAmount.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: p.remainingAmount > 0 ? '#CC0000' : '#166534' }}>
                    Rp {p.remainingAmount.toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusBadge status={p.paymentStatus} />
                      {p.proofUrl && (
                        <a href={p.proofUrl} target="_blank" rel="noreferrer" title={t.view_proof} style={{ fontSize: 16 }}>📄</a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => setEditTarget(p)}
                        style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#374151' }}
                      >
                        {t.edit}
                      </button>
                      <button 
                        onClick={() => { if(confirm(t.confirm_delete)) deleteMutation.mutate(p.id); }}
                        style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#991b1b' }}
                      >
                        {t.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>{language === 'ja' ? '支払いデータがありません' : 'Tidak ada data pembayaran'}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
        {[
          { label: language === 'ja' ? '総額合計' : 'Total Keseluruhan', value: filtered.reduce((a, p) => a + p.totalAmount, 0) },
          { label: language === 'ja' ? '支払済合計' : 'Total Terbayar', value: filtered.reduce((a, p) => a + p.paidAmount, 0) },
          { label: language === 'ja' ? '残金合計' : 'Total Sisa', value: filtered.reduce((a, p) => a + p.remainingAmount, 0) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '3px solid #CC0000' }}>
            <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginTop: 4 }}>
              Rp {value.toLocaleString('id-ID')}
            </div>
          </div>
        ))}
      </div>

      {(showAdd || editTarget) && (
        <Modal 
          title={editTarget ? t.edit_payment : t.add_payment} 
          onClose={() => { setShowAdd(false); setEditTarget(null); }}
        >
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '生徒' : 'Siswa'}</label>
            <select 
              value={editTarget ? editTarget.studentId : addData.studentId} 
              onChange={(e) => {
                const val = e.target.value;
                if (editTarget) setEditTarget({ ...editTarget, studentId: val });
                else setAddData({ ...addData, studentId: val });
              }} 
              style={inputStyle}
              disabled={!!editTarget}
            >
              <option value="">-- {language === 'ja' ? '選択してください' : 'Pilih Siswa'} --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_type}</label>
              <select 
                value={editTarget ? editTarget.paymentType : addData.paymentType} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (editTarget) setEditTarget({ ...editTarget, paymentType: val });
                  else setAddData({ ...addData, paymentType: val });
                }} 
                style={inputStyle}
              >
                <option value="education">{t.education_fee}</option>
                <option value="job_matching">{t.jm_fee}</option>
                <option value="dormitory">{t.dorm_fee}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_method}</label>
              <select 
                value={editTarget ? editTarget.paymentMethod : addData.paymentMethod} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (editTarget) setEditTarget({ ...editTarget, paymentMethod: val });
                  else setAddData({ ...addData, paymentMethod: val });
                }} 
                style={inputStyle}
              >
                <option value="lump_sum">{t.lump_sum}</option>
                <option value="installment">{t.installment}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.total_amount}</label>
              <CurrencyInput 
                value={editTarget ? editTarget.totalAmount : addData.totalAmount} 
                onChange={(val) => {
                  if (editTarget) setEditTarget({ ...editTarget, totalAmount: val });
                  else setAddData({ ...addData, totalAmount: val });
                }} 
                style={inputStyle}
                suffix="IDR"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.paid_amount}</label>
              <CurrencyInput 
                value={editTarget ? editTarget.paidAmount : addData.paidAmount} 
                onChange={(val) => {
                  if (editTarget) setEditTarget({ ...editTarget, paidAmount: val });
                  else setAddData({ ...addData, paidAmount: val });
                }} 
                style={inputStyle}
                suffix="IDR"
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_date}</label>
            <input 
              type="date" 
              value={editTarget ? (editTarget.paidDate ? format(editTarget.paidDate, 'yyyy-MM-dd') : '') : addData.paidDate} 
              onChange={(e) => {
                const val = e.target.value;
                if (editTarget) setEditTarget({ ...editTarget, paidDate: new Date(val) });
                else setAddData({ ...addData, paidDate: val });
              }} 
              style={inputStyle} 
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.payment_proof}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="file"
                id="global-payment-proof-upload"
                style={{ display: 'none' }}
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  const studentId = editTarget ? editTarget.studentId : addData.studentId;
                  if (file && studentId) {
                    const res = await handleFileUpload(file, studentId);
                    if (res) {
                      if (editTarget) setEditTarget({ ...editTarget, proofFileId: res.fileId, proofUrl: res.url });
                      else setAddData({ ...addData, proofFileId: res.fileId, proofUrl: res.url });
                    }
                  } else if (!studentId) {
                    alert(language === 'ja' ? '先に生徒を選択してください' : 'Pilih siswa terlebih dahulu');
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('global-payment-proof-upload')?.click()}
                disabled={isUploading}
                style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                {isUploading ? t.loading : (editTarget?.proofFileId || addData.proofFileId) ? '✅ ' + t.save : t.select_file}
              </button>
              {(editTarget?.proofUrl || addData.proofUrl) && (
                <a href={editTarget?.proofUrl || addData.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#CC0000' }}>{t.view_proof}</a>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.memo}</label>
            <textarea 
              value={editTarget ? editTarget.notes || '' : addData.notes} 
              onChange={(e) => {
                const val = e.target.value;
                if (editTarget) setEditTarget({ ...editTarget, notes: val });
                else setAddData({ ...addData, notes: val });
              }} 
              style={{ ...inputStyle, height: 60, resize: 'none' }} 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button 
              onClick={() => { setShowAdd(false); setEditTarget(null); }} 
              disabled={addMutation.isPending || updateMutation.isPending}
              style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={addMutation.isPending || updateMutation.isPending || isUploading}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', opacity: (addMutation.isPending || updateMutation.isPending) ? 0.7 : 1 }}
            >
              {(addMutation.isPending || updateMutation.isPending) ? t.saving + '...' : t.save}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
