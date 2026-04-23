import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  getStudent,
  updateStudent,
  getPayments,
  addPayment,
  getStudentDocuments,
  addStudentDocument,
  updateStudentDocument,
  getBankAccounts,
  addBankAccount,
  deleteBankAccount,
} from '../lib/firestore';
import { useAuth } from '../context/AuthContext';
import type { StudentStatus, DocumentType, PaymentType, PaymentMethod, PaymentStatus } from '../lib/types';

const TABS = ['基本情報', '家族情報', '支払い', '銀行口座', '書類管理', '渡航情報', '備考'];

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 13,
  color: '#333',
  boxSizing: 'border-box' as const,
};

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const m: Record<StudentStatus, [string, string, string]> = {
    active: ['在籍中', '#166534', '#dcfce7'],
    departed_japan: ['渡航済', '#1d4ed8', '#dbeafe'],
    graduated: ['修了', '#92400e', '#fef3c7'],
    withdrawn: ['退学', '#6b7280', '#f3f4f6'],
    on_hold: ['保留', '#92400e', '#fef9c3'],
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string | boolean | number>>({});

  const { data: student, isLoading } = useQuery({
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

  const [addPaymentData, setAddPaymentData] = useState({ paymentType: 'education', totalAmount: 0, paidAmount: 0, paymentMethod: 'lump_sum', notes: '' });
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [addDocData, setAddDocData] = useState({ documentType: 'diploma_high_school', title: '', fileId: '', isHeld: false, notes: '' });
  const [showAddBank, setShowAddBank] = useState(false);
  const [addBankData, setAddBankData] = useState({ bankName: '', accountNumber: '', accountHolder: '', accountType: 'savings', isPrimary: false });

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>読み込み中...</div>;
  if (!student) return <div style={{ padding: 40, textAlign: 'center', color: '#CC0000' }}>生徒が見つかりません</div>;

  const saveBasicEdit = () => {
    updateMutation.mutate(editData as any);
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

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map((tab, i) => {
          if (i === 3 && !isAdmin) return null;
          const active = activeTab === i;
          return (
            <button
              key={tab}
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
              {tab}
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
                  📷 {student.photos.length}枚
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>個人情報</h3>
                <button
                  onClick={() => { setEditModal('basic'); setEditData({ status: student.status, batchNumber: student.batchNumber, notes: student.notes || '' }); }}
                  style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  編集
                </button>
              </div>
              <InfoRow label="登録番号" value={student.registrationNumber} />
              <InfoRow label="入学日" value={format(student.enrollmentDate, 'dd/MM/yyyy')} />
              <InfoRow label="ステータス" value={student.status} />
              <InfoRow label="プログラム" value={student.programType} />
              <InfoRow label="性別" value={student.gender === 'male' ? '男性' : '女性'} />
              <InfoRow label="生年月日" value={format(student.dateOfBirth, 'dd/MM/yyyy')} />
              <InfoRow label="国籍" value={student.nationality} />
              <InfoRow label="出生地" value={student.birthPlace} />
              <InfoRow label="宗教" value={student.religion} />
              <InfoRow label="NIK" value={student.nik} />
              <InfoRow label="WhatsApp" value={student.whatsapp ? <a href={`https://wa.me/${student.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>{student.whatsapp}</a> : null} />
              <InfoRow label="メール" value={student.email} />
              <InfoRow label="住所" value={`${student.address}, ${student.city}, ${student.province}`} />
            </div>
          </div>

          {/* SNS アカウント */}
          {(student.instagramAccount || student.tiktokAccount) && (
            <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#888', width: '100%' }}>SNS アカウント</h3>
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
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>学歴・資格</h3>
              <button
                onClick={() => { setEditModal('qualifications'); setEditData({ jlptLevel: student.jlptLevel, jftPassed: student.jftPassed, sswPassed: student.sswPassed, psychotestDone: student.psychotestDone, mcuDone: student.mcuDone }); }}
                style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                編集
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Badge color="#1e40af" bg="#dbeafe">JLPT {student.jlptLevel.toUpperCase()}</Badge>
              {student.jftPassed && <Badge color="#166534" bg="#dcfce7">JFT 合格</Badge>}
              {!student.jftPassed && <Badge color="#6b7280" bg="#f3f4f6">JFT 未</Badge>}
              {student.sswPassed && <Badge color="#166534" bg="#dcfce7">SSW 合格</Badge>}
              {!student.sswPassed && <Badge color="#6b7280" bg="#f3f4f6">SSW 未</Badge>}
              {student.psychotestDone && <Badge color="#166534" bg="#dcfce7">心理検査 済</Badge>}
              {!student.psychotestDone && <Badge color="#6b7280" bg="#f3f4f6">心理検査 未</Badge>}
              {student.mcuDone && <Badge color="#166534" bg="#dcfce7">健康診断 済</Badge>}
              {!student.mcuDone && <Badge color="#6b7280" bg="#f3f4f6">健康診断 未</Badge>}
            </div>
            <div style={{ marginTop: 12 }}>
              <InfoRow label="学歴" value={student.educationLevel.toUpperCase()} />
              <InfoRow label="学校名" value={student.schoolName} />
              <InfoRow label="卒業年度" value={student.graduationYear?.toString()} />
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
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#CC0000' }}>保証人情報</h3>
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
                編集
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>※ 保証人として署名された法的責任者</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#CC0000', borderBottom: '1px solid #fecaca', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase' }}>基本情報</div>
                <InfoRow label="氏名" value={student.parentName} />
                <InfoRow label="続柄" value={student.parentRelationship === 'father' ? '父 (Ayah)' : student.parentRelationship === 'mother' ? '母 (Ibu)' : '後見人 (Wali)'} />
                <InfoRow label="性別" value={(student as any).parentGender === 'male' ? '男性' : (student as any).parentGender === 'female' ? '女性' : undefined} />
                <InfoRow label="生年月日" value={(student as any).parentDateOfBirth ? format(new Date((student as any).parentDateOfBirth), 'dd/MM/yyyy') : undefined} />
                <InfoRow label="職業" value={student.parentOccupation} />
                <InfoRow label="KTP番号 (NIK)" value={(student as any).parentNik} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#CC0000', borderBottom: '1px solid #fecaca', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase' }}>連絡先・住所</div>
                <InfoRow label="WhatsApp" value={student.parentWhatsapp ? <a href={`https://wa.me/${student.parentWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>{student.parentWhatsapp}</a> : null} />
                <InfoRow label="メール" value={(student as any).parentEmail} />
                <InfoRow label="住所" value={student.parentAddress} />
                <InfoRow label="市 (Kota)" value={(student as any).parentCity} />
                <InfoRow label="州 (Provinsi)" value={(student as any).parentProvince} />
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
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>緊急連絡先（保証人と別の場合）</h3>
            </div>
            {student.emergencyContact ? (
              <>
                <InfoRow label="氏名" value={student.emergencyContact} />
                <InfoRow label="続柄" value={(student as any).emergencyRelationship} />
                <InfoRow label="電話番号" value={student.emergencyPhone} />
              </>
            ) : (
              <p style={{ color: '#aaa', fontSize: 13 }}>—（保証人を緊急連絡先として使用）</p>
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
              + 支払い記録追加
            </button>
          </div>
          {payments.map((p) => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #CC0000' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {p.paymentType === 'education' ? '教育費' : p.paymentType === 'job_matching' ? 'JM費' : p.paymentType === 'dormitory' ? '寮費' : 'その他'}
                  </span>
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{p.paymentMethod === 'lump_sum' ? '一括' : '分割'}</span>
                </div>
                <Badge
                  color={p.paymentStatus === 'paid' ? '#166534' : p.paymentStatus === 'partial' ? '#92400e' : '#991b1b'}
                  bg={p.paymentStatus === 'paid' ? '#dcfce7' : p.paymentStatus === 'partial' ? '#fef3c7' : '#fee2e2'}
                >
                  {p.paymentStatus === 'paid' ? '支払済' : p.paymentStatus === 'partial' ? '一部' : '未払い'}
                </Badge>
              </div>
              <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                <div><span style={{ color: '#888' }}>総額: </span><strong>Rp {p.totalAmount.toLocaleString('id-ID')}</strong></div>
                <div><span style={{ color: '#888' }}>支払済: </span><strong style={{ color: '#166534' }}>Rp {p.paidAmount.toLocaleString('id-ID')}</strong></div>
                <div><span style={{ color: '#888' }}>残金: </span><strong style={{ color: '#CC0000' }}>Rp {p.remainingAmount.toLocaleString('id-ID')}</strong></div>
              </div>
              {p.paymentType === 'job_matching' && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>JM段階進捗</div>
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
          {payments.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>支払い記録がありません</div>}
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
              + 口座追加
            </button>
          </div>
          {bankAccounts.map((a) => (
            <div key={a.id} style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.bankName} {a.isPrimary && <Badge color="#1d4ed8" bg="#dbeafe">主口座</Badge>}</div>
                <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{a.accountNumber} — {a.accountHolder}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{a.accountType === 'savings' ? '普通' : '当座'}</div>
              </div>
              <button
                onClick={() => { if (confirm('削除しますか？')) deleteBankMutation.mutate(a.id); }}
                style={{ border: 'none', background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                削除
              </button>
            </div>
          ))}
          {bankAccounts.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>口座情報がありません</div>}
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
              + 書類追加
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>書類種別</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>タイトル</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>アップロード日</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>担保</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>操作</th>
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
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>書類がありません</td></tr>
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
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>渡航情報</h3>
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
              編集
            </button>
          </div>
          <InfoRow label="出発日" value={student.departureDate ? format(student.departureDate, 'dd/MM/yyyy') : undefined} />
          <InfoRow label="就職先企業" value={student.destinationCompany} />
          <InfoRow label="都道府県" value={student.destinationPrefecture} />
          <InfoRow label="ビザ種別" value={student.visaType} />
          <InfoRow label="COE発行日" value={student.coeIssueDate ? format(student.coeIssueDate, 'dd/MM/yyyy') : undefined} />
          <InfoRow label="COE失効日" value={student.coeCancellationDate ? format(student.coeCancellationDate, 'dd/MM/yyyy') : undefined} />

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
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>備考・メモ</h3>
          <textarea
            defaultValue={student.notes || ''}
            onBlur={(e) => updateMutation.mutate({ notes: e.target.value })}
            style={{ ...inputStyle, height: 200, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="自由にメモを記入できます..."
          />
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>フォーカスを外すと自動保存されます</div>
        </div>
      )}

      {/* Edit Modal: basic */}
      {editModal === 'basic' && (
        <Modal title="基本情報を編集" onClose={() => setEditModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>ステータス</label>
            <select value={String(editData.status || '')} onChange={(e) => setEditData(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
              <option value="active">在籍中</option>
              <option value="departed_japan">渡航済</option>
              <option value="graduated">修了</option>
              <option value="withdrawn">退学</option>
              <option value="on_hold">保留</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>バッチ番号</label>
            <input type="number" value={String(editData.batchNumber || '')} onChange={(e) => setEditData(p => ({ ...p, batchNumber: Number(e.target.value) }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button onClick={saveBasicEdit} style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>保存</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal: qualifications */}
      {editModal === 'qualifications' && (
        <Modal title="資格情報を編集" onClose={() => setEditModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>JLPTレベル</label>
            <select value={String(editData.jlptLevel || 'none')} onChange={(e) => setEditData(p => ({ ...p, jlptLevel: e.target.value }))} style={inputStyle}>
              <option value="none">なし</option>
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
              <label style={{ fontSize: 13 }}>{field === 'jftPassed' ? 'JFT合格' : field === 'sswPassed' ? 'SSW合格' : field === 'psychotestDone' ? '心理検査済' : '健康診断済'}</label>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button onClick={saveBasicEdit} style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>保存</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal: family */}
      {editModal === 'family' && (
        <Modal title="家族情報を編集" onClose={() => setEditModal(null)}>
          {(['parentName', 'parentWhatsapp', 'parentAddress', 'parentOccupation', 'emergencyContact', 'emergencyPhone'] as const).map((field) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{field}</label>
              <input value={String(editData[field] || '')} onChange={(e) => setEditData(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button onClick={saveBasicEdit} style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>保存</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal: departure */}
      {editModal === 'departure' && (
        <Modal title="渡航情報を編集" onClose={() => setEditModal(null)}>
          {[
            { field: 'departureDate', label: '出発日', type: 'date' },
            { field: 'destinationCompany', label: '就職先企業', type: 'text' },
            { field: 'destinationPrefecture', label: '都道府県', type: 'text' },
            { field: 'coeIssueDate', label: 'COE発行日', type: 'date' },
          ].map(({ field, label, type }) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
              <input type={type} value={String(editData[field] || '')} onChange={(e) => setEditData(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>ビザ種別</label>
            <select value={String(editData.visaType || '')} onChange={(e) => setEditData(p => ({ ...p, visaType: e.target.value }))} style={inputStyle}>
              <option value="">未定</option>
              <option value="ssw">特定技能</option>
              <option value="gijinkoku">技人国</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button
              onClick={() => {
                const data: any = { ...editData };
                if (data.departureDate) data.departureDate = new Date(data.departureDate);
                if (data.coeIssueDate) data.coeIssueDate = new Date(data.coeIssueDate);
                updateMutation.mutate(data);
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              保存
            </button>
          </div>
        </Modal>
      )}

      {/* Add Payment Modal */}
      {showAddPayment && (
        <Modal title="支払い記録追加" onClose={() => setShowAddPayment(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>支払種別</label>
            <select value={addPaymentData.paymentType} onChange={(e) => setAddPaymentData(p => ({ ...p, paymentType: e.target.value }))} style={inputStyle}>
              <option value="education">教育費</option>
              <option value="job_matching">JM費</option>
              <option value="dormitory">寮費</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>支払方法</label>
            <select value={addPaymentData.paymentMethod} onChange={(e) => setAddPaymentData(p => ({ ...p, paymentMethod: e.target.value }))} style={inputStyle}>
              <option value="lump_sum">一括</option>
              <option value="installment">分割</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>総額 (IDR)</label>
            <input type="number" value={addPaymentData.totalAmount} onChange={(e) => setAddPaymentData(p => ({ ...p, totalAmount: Number(e.target.value) }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>支払済額 (IDR)</label>
            <input type="number" value={addPaymentData.paidAmount} onChange={(e) => setAddPaymentData(p => ({ ...p, paidAmount: Number(e.target.value) }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>備考</label>
            <input value={addPaymentData.notes} onChange={(e) => setAddPaymentData(p => ({ ...p, notes: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowAddPayment(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button
              onClick={() => {
                const total = addPaymentData.totalAmount;
                const paid = addPaymentData.paidAmount;
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
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                setShowAddPayment(false);
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              保存
            </button>
          </div>
        </Modal>
      )}

      {/* Add Document Modal */}
      {showAddDoc && (
        <Modal title="書類追加" onClose={() => setShowAddDoc(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>書類種別</label>
            <select value={addDocData.documentType} onChange={(e) => setAddDocData(p => ({ ...p, documentType: e.target.value }))} style={inputStyle}>
              <option value="diploma_high_school">高校卒業証書</option>
              <option value="diploma_vocational">職業高校卒業証書</option>
              <option value="diploma_university">大学卒業証書</option>
              <option value="transcript">成績証明書</option>
              <option value="ktp">KTP</option>
              <option value="kk">KK</option>
              <option value="passport">パスポート</option>
              <option value="jlpt_certificate">JLPT合格証</option>
              <option value="jft_certificate">JFT合格証</option>
              <option value="ssw_certificate">SSW証明書</option>
              <option value="psychotest_result">心理検査結果</option>
              <option value="mcu_result">健康診断結果</option>
              <option value="job_offer_letter">内定通知書</option>
              <option value="employment_contract">雇用契約書</option>
              <option value="coe_document">COE</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>タイトル</label>
            <input value={addDocData.title} onChange={(e) => setAddDocData(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Google Drive File ID</label>
            <input value={addDocData.fileId} onChange={(e) => setAddDocData(p => ({ ...p, fileId: e.target.value }))} style={inputStyle} placeholder="Google DriveのファイルID" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="checkbox" id="isHeld" checked={addDocData.isHeld} onChange={(e) => setAddDocData(p => ({ ...p, isHeld: e.target.checked }))} />
            <label htmlFor="isHeld" style={{ fontSize: 13 }}>担保として預かり中</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowAddDoc(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button
              onClick={() => {
                addDocMutation.mutate({
                  data: {
                    studentId: id!,
                    documentType: addDocData.documentType as DocumentType,
                    title: addDocData.title,
                    fileId: addDocData.fileId,
                    uploadDate: new Date(),
                    isHeld: addDocData.isHeld,
                    heldDate: addDocData.isHeld ? new Date() : undefined,
                    notes: addDocData.notes || undefined,
                  },
                });
                setShowAddDoc(false);
              }}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              保存
            </button>
          </div>
        </Modal>
      )}

      {/* Add Bank Modal */}
      {showAddBank && (
        <Modal title="銀行口座追加" onClose={() => setShowAddBank(false)}>
          {[
            { field: 'bankName', label: '銀行名', type: 'text' },
            { field: 'accountNumber', label: '口座番号', type: 'text' },
            { field: 'accountHolder', label: '名義人', type: 'text' },
          ].map(({ field, label, type }) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
              <input type={type} value={(addBankData as any)[field]} onChange={(e) => setAddBankData(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>口座種別</label>
            <select value={addBankData.accountType} onChange={(e) => setAddBankData(p => ({ ...p, accountType: e.target.value }))} style={inputStyle}>
              <option value="savings">普通</option>
              <option value="current">当座</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="checkbox" id="isPrimary" checked={addBankData.isPrimary} onChange={(e) => setAddBankData(p => ({ ...p, isPrimary: e.target.checked }))} />
            <label htmlFor="isPrimary" style={{ fontSize: 13 }}>主口座</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowAddBank(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
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
              保存
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
