import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCommissionPayments, addCommissionPayment, updateCommissionPayment, getStudents, getScouters, getPartners } from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import type { CommissionPaymentType } from '../lib/types';

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

export default function Commissions() {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const t = translations[language];
  const { data: commissions = [], isLoading } = useQuery({ queryKey: ['commissions'], queryFn: getCommissionPayments });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });
  const { data: scouters = [] } = useQuery({ queryKey: ['scouters'], queryFn: getScouters });
  const { data: partners = [] } = useQuery({ queryKey: ['partners'], queryFn: getPartners });

  const [filterType, setFilterType] = useState('');
  const [filterPaid, setFilterPaid] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addData, setAddData] = useState({
    commissionType: 'to_scouter' as CommissionPaymentType,
    recipientId: '',
    recipientType: 'scouter' as 'scouter' | 'partner',
    studentId: '',
    amount: 0,
    currency: 'IDR' as 'IDR' | 'JPY',
    isPaid: false,
    notes: '',
  });

  const addMutation = useMutation({
    mutationFn: addCommissionPayment,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commissions'] }); setShowAdd(false); },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => updateCommissionPayment(id, { isPaid: true, paymentDate: new Date() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commissions'] }),
  });

  const studentMap = useMemo(() => {
    const m: Record<string, string> = {};
    students.forEach((s) => { m[s.id] = s.fullName; });
    return m;
  }, [students]);

  const scouterMap = useMemo(() => {
    const m: Record<string, string> = {};
    scouters.forEach((s) => { m[s.id] = s.fullName; });
    return m;
  }, [scouters]);

  const partnerMap = useMemo(() => {
    const m: Record<string, string> = {};
    partners.forEach((p) => { m[p.id] = p.partnerName; });
    return m;
  }, [partners]);

  const filtered = useMemo(() => {
    return commissions.filter((c) => {
      if (filterType && c.commissionType !== filterType) return false;
      if (filterPaid === 'paid' && !c.isPaid) return false;
      if (filterPaid === 'unpaid' && c.isPaid) return false;
      return true;
    });
  }, [commissions, filterType, filterPaid]);

  const getRecipientName = (c: typeof commissions[0]) => {
    if (c.recipientType === 'scouter') return scouterMap[c.recipientId] || c.recipientId;
    return partnerMap[c.recipientId] || c.recipientId;
  };

  const typeLabel = (ty: CommissionPaymentType) => {
    const labels: Record<string, string> = {
      to_scouter: language === 'ja' ? 'スカウターへ' : 'Ke Scouter',
      to_partner: language === 'ja' ? 'パートナーへ' : 'Ke Mitra',
      from_partner: language === 'ja' ? 'パートナーから' : 'Dari Mitra',
    };
    return labels[ty] || ty;
  };

  const totalUnpaid = filtered.filter((c) => !c.isPaid).reduce((a, c) => a + c.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{language === 'ja' ? 'コミッション管理' : 'Manajemen Komisi'}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>{language === 'ja' ? '未払い合計' : 'Total Belum Bayar'}: Rp {totalUnpaid.toLocaleString('id-ID')}</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          + {language === 'ja' ? 'コミッション追加' : 'Tambah Komisi'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 12 }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }}>
          <option value="">{language === 'ja' ? '全種別' : 'Semua Tipe'}</option>
          <option value="to_scouter">{language === 'ja' ? 'スカウターへ' : 'Ke Scouter'}</option>
          <option value="to_partner">{language === 'ja' ? 'パートナーへ' : 'Ke Mitra'}</option>
          <option value="from_partner">{language === 'ja' ? 'パートナーから' : 'Dari Mitra'}</option>
        </select>
        <select value={filterPaid} onChange={(e) => setFilterPaid(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">{language === 'ja' ? '全ステータス' : 'Semua Status'}</option>
          <option value="paid">{language === 'ja' ? '支払済' : 'Lunas'}</option>
          <option value="unpaid">{language === 'ja' ? '未払い' : 'Belum Bayar'}</option>
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
                {[language === 'ja' ? '種別' : 'Tipe', language === 'ja' ? '受取人' : 'Penerima', language === 'ja' ? '対象生徒' : 'Siswa', language === 'ja' ? '金額' : 'Nominal', language === 'ja' ? '通貨' : 'Mata Uang', language === 'ja' ? '支払日' : 'Tgl Bayar', t.status, language === 'ja' ? '操作' : 'Aksi'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid #f0f0f0', background: !c.isPaid ? '#fff8f8' : '#fff' }}
                >
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{typeLabel(c.commissionType)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{getRecipientName(c)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{studentMap[c.studentId] || c.studentId}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
                    {c.currency === 'IDR' ? `Rp ${c.amount.toLocaleString('id-ID')}` : `¥${c.amount.toLocaleString('ja-JP')}`}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{c.currency}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#888' }}>
                    {c.paymentDate ? format(c.paymentDate, 'dd/MM/yyyy') : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      color: c.isPaid ? '#166534' : '#991b1b',
                      background: c.isPaid ? '#dcfce7' : '#fee2e2',
                    }}>
                      {c.isPaid ? (language === 'ja' ? '支払済' : 'Lunas') : (language === 'ja' ? '未払い' : 'Belum Bayar')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {!c.isPaid && (
                      <button
                        onClick={() => markPaidMutation.mutate({ id: c.id })}
                        style={{ padding: '4px 12px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#166534', fontWeight: 600 }}
                      >
                        {language === 'ja' ? '支払済にする' : 'Tandai Lunas'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>{language === 'ja' ? 'コミッションデータがありません' : 'Tidak ada data komisi'}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title={language === 'ja' ? 'コミッション追加' : 'Tambah Komisi'} onClose={() => setShowAdd(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '種別' : 'Tipe'}</label>
            <select value={addData.commissionType} onChange={(e) => {
              const t = e.target.value as CommissionPaymentType;
              setAddData(p => ({ ...p, commissionType: t, recipientType: t === 'to_scouter' ? 'scouter' : 'partner' }));
            }} style={inputStyle}>
              <option value="to_scouter">スカウターへ</option>
              <option value="to_partner">パートナーへ</option>
              <option value="from_partner">パートナーから</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>受取人</label>
            <select value={addData.recipientId} onChange={(e) => setAddData(p => ({ ...p, recipientId: e.target.value }))} style={inputStyle}>
              <option value="">選択してください</option>
              {addData.recipientType === 'scouter'
                ? scouters.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)
                : partners.map((p) => <option key={p.id} value={p.id}>{p.partnerName}</option>)
              }
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>対象生徒</label>
            <select value={addData.studentId} onChange={(e) => setAddData(p => ({ ...p, studentId: e.target.value }))} style={inputStyle}>
              <option value="">選択してください</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>金額</label>
            <input type="number" value={addData.amount} onChange={(e) => setAddData(p => ({ ...p, amount: Number(e.target.value) }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>通貨</label>
            <select value={addData.currency} onChange={(e) => setAddData(p => ({ ...p, currency: e.target.value as 'IDR' | 'JPY' }))} style={inputStyle}>
              <option value="IDR">IDR</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button
              onClick={() => {
                addMutation.mutate({
                  commissionType: addData.commissionType,
                  recipientId: addData.recipientId,
                  recipientType: addData.recipientType,
                  studentId: addData.studentId,
                  amount: addData.amount,
                  currency: addData.currency,
                  isPaid: addData.isPaid,
                  notes: addData.notes || undefined,
                  createdAt: new Date(),
                });
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
