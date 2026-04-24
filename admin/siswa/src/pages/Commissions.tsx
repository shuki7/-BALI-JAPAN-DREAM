import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCommissionPayments, addCommissionPayment, updateCommissionPayment, deleteCommissionPayment, getStudents, getScouters, getPartners } from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { CurrencyInput } from '../components/CurrencyInput';
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
  const [filterType, setFilterType] = useState('');
  const [filterPaid, setFilterPaid] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [addData, setAddData] = useState({
    commissionType: 'to_scouter' as CommissionPaymentType,
    scouterId: '',
    partnerId: '',
    studentId: '',
    amount: 0,
    currency: 'IDR' as 'IDR' | 'JPY',
    notes: '',
  });

  const { data: commissions = [], isLoading } = useQuery({ queryKey: ['commissions'], queryFn: getCommissionPayments });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });
  const { data: scouters = [] } = useQuery({ queryKey: ['scouters'], queryFn: getScouters });
  const { data: partners = [] } = useQuery({ queryKey: ['partners'], queryFn: getPartners });

  const addMutation = useMutation({
    mutationFn: addCommissionPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setShowAdd(false);
      setAddData({ commissionType: 'to_scouter', scouterId: '', partnerId: '', studentId: '', amount: 0, currency: 'IDR', notes: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<any> }) => updateCommissionPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCommissionPayment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commissions'] }),
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

  const filtered = useMemo(() => {
    return commissions.filter((c: any) => {
      if (filterType && c.commissionType !== filterType) return false;
      if (filterPaid === 'paid' && !c.isPaid) return false;
      if (filterPaid === 'unpaid' && c.isPaid) return false;
      return true;
    });
  }, [commissions, filterType, filterPaid]);

  const getRecipientName = (c: any) => {
    if (c.commissionType === 'to_scouter') {
      return scouters.find((s: any) => s.id === c.scouterId)?.fullName || c.scouterId || 'Unknown';
    }
    return partners.find((p: any) => p.id === c.partnerId)?.partnerName || c.partnerId || 'Unknown';
  };

  const typeLabel = (ty: CommissionPaymentType) => {
    const labels: Record<string, string> = {
      to_scouter: language === 'ja' ? 'スカウターへ' : 'Ke Scouter',
      to_partner: language === 'ja' ? 'パートナーへ' : 'Ke Mitra',
      from_partner: language === 'ja' ? 'パートナーから' : 'Dari Mitra',
    };
    return labels[ty] || ty;
  };

  const handleSave = () => {
    const target = editTarget || addData;
    const payload = {
      commissionType: target.commissionType,
      scouterId: target.scouterId || undefined,
      partnerId: target.partnerId || undefined,
      recipientId: target.commissionType === 'to_scouter' ? target.scouterId : target.partnerId,
      recipientType: (target.commissionType === 'to_scouter' ? 'scouter' : 'partner') as 'scouter' | 'partner',
      studentId: target.studentId,
      amount: Number(target.amount),
      currency: target.currency,
      notes: target.notes || undefined,
    };

    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      addMutation.mutate({
        ...payload,
        isPaid: false,
        createdAt: new Date(),
      });
    }
  };

  const totalUnpaid = filtered.filter((c: any) => !c.isPaid).reduce((a, c) => a + c.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{language === 'ja' ? 'コミッション管理' : 'Manajemen Komisi'}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>{language === 'ja' ? '未払い合計' : 'Total Belum Bayar'}: Rp {totalUnpaid.toLocaleString('id-ID')}</p>
        </div>
        <button 
          onClick={() => {
            setAddData({ commissionType: 'to_scouter', scouterId: '', partnerId: '', studentId: '', amount: 0, currency: 'IDR', notes: '' });
            setShowAdd(true);
          }} 
          style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
        >
          + {language === 'ja' ? 'コミッション追加' : 'Tambah Komisi'}
        </button>
      </div>

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
              {filtered.map((c: any) => (
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
                    {c.paymentDate ? format(c.paymentDate instanceof Date ? c.paymentDate : new Date(c.paymentDate), 'dd/MM/yyyy') : '—'}
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
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!c.isPaid && (
                        <button
                          onClick={() => markPaidMutation.mutate({ id: c.id })}
                          style={{ padding: '4px 10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#166534', fontWeight: 600 }}
                        >
                          {language === 'ja' ? '支払済' : 'Lunas'}
                        </button>
                      )}
                      <button 
                        onClick={() => setEditTarget(c)}
                        style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#374151' }}
                      >
                        {t.edit}
                      </button>
                      <button 
                        onClick={() => { if(confirm(t.confirm_delete)) deleteMutation.mutate(c.id); }}
                        style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#991b1b' }}
                      >
                        {t.delete}
                      </button>
                    </div>
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

      {(showAdd || editTarget) && (
        <Modal title={editTarget ? t.edit : (language === 'ja' ? 'コミッション追加' : 'Tambah Komisi')} onClose={() => { setShowAdd(false); setEditTarget(null); }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{language === 'ja' ? '種別' : 'Tipe'}</label>
            <select 
              value={editTarget ? editTarget.commissionType : addData.commissionType} 
              onChange={(e) => {
                const val = e.target.value as CommissionPaymentType;
                if (editTarget) setEditTarget({...editTarget, commissionType: val});
                else setAddData(p => ({ ...p, commissionType: val }));
              }} 
              style={inputStyle}
            >
              <option value="to_scouter">{language === 'ja' ? 'スカウターへ' : 'Ke Scouter'}</option>
              <option value="to_partner">{language === 'ja' ? 'パートナーへ' : 'Ke Mitra'}</option>
              <option value="from_partner">{language === 'ja' ? 'パートナーから' : 'Dari Mitra'}</option>
            </select>
          </div>
          
          {(editTarget ? editTarget.commissionType : addData.commissionType) === 'to_scouter' ? (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>スカウター</label>
              <select 
                value={editTarget ? editTarget.scouterId : addData.scouterId} 
                onChange={(e) => {
                  if (editTarget) setEditTarget({...editTarget, scouterId: e.target.value});
                  else setAddData(p => ({ ...p, scouterId: e.target.value }));
                }} 
                style={inputStyle}
              >
                <option value="">選択してください</option>
                {scouters.map((s: any) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>パートナー</label>
              <select 
                value={editTarget ? editTarget.partnerId : addData.partnerId} 
                onChange={(e) => {
                  if (editTarget) setEditTarget({...editTarget, partnerId: e.target.value});
                  else setAddData(p => ({ ...p, partnerId: e.target.value }));
                }} 
                style={inputStyle}
              >
                <option value="">選択してください</option>
                {partners.map((p: any) => <option key={p.id} value={p.id}>{p.partnerName}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>対象生徒</label>
            <select 
              value={editTarget ? editTarget.studentId : addData.studentId} 
              onChange={(e) => {
                if (editTarget) setEditTarget({...editTarget, studentId: e.target.value});
                else setAddData(p => ({ ...p, studentId: e.target.value }));
              }} 
              style={inputStyle}
            >
              <option value="">選択してください</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>金額</label>
              <CurrencyInput 
                value={editTarget ? editTarget.amount : addData.amount} 
                onChange={(val) => {
                  if (editTarget) setEditTarget({...editTarget, amount: val});
                  else setAddData(p => ({ ...p, amount: val }));
                }} 
                style={inputStyle}
                suffix={editTarget ? editTarget.currency : addData.currency}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>通貨</label>
              <select 
                value={editTarget ? editTarget.currency : addData.currency} 
                onChange={(e) => {
                  if (editTarget) setEditTarget({...editTarget, currency: e.target.value as 'IDR' | 'JPY'});
                  else setAddData(p => ({ ...p, currency: e.target.value as 'IDR' | 'JPY' }));
                }} 
                style={inputStyle}
              >
                <option value="IDR">IDR</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={() => { setShowAdd(false); setEditTarget(null); }} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button 
              onClick={handleSave}
              disabled={editTarget ? !editTarget.studentId : !addData.studentId}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', opacity: (editTarget ? editTarget.studentId : addData.studentId) ? 1 : 0.5 }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
