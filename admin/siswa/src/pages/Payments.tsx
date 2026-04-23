import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPayments, getStudents, addPayment } from '../lib/firestore';
import type { PaymentType, PaymentStatus, PaymentMethod } from '../lib/types';

function StatusBadge({ status }: { status: PaymentStatus }) {
  const m: Record<PaymentStatus, [string, string, string]> = {
    paid: ['支払済', '#166534', '#dcfce7'],
    partial: ['一部払い', '#92400e', '#fef3c7'],
    unpaid: ['未払い', '#991b1b', '#fee2e2'],
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
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => getPayments() });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addData, setAddData] = useState({
    studentId: '',
    paymentType: 'education',
    paymentMethod: 'lump_sum',
    totalAmount: 0,
    paidAmount: 0,
    notes: '',
  });

  const addMutation = useMutation({
    mutationFn: addPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowAdd(false);
    },
  });

  const studentMap = useMemo(() => {
    const m: Record<string, string> = {};
    students.forEach((s) => { m[s.id] = s.fullName; });
    return m;
  }, [students]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (filterStatus && p.paymentStatus !== filterStatus) return false;
      if (filterType && p.paymentType !== filterType) return false;
      return true;
    });
  }, [payments, filterStatus, filterType]);

  const typeLabel = (t: PaymentType) => ({ education: '教育費', job_matching: 'JM費', dormitory: '寮費', other: 'その他' }[t]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>支払い管理</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>全生徒の支払い状況 — {filtered.length}件</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ padding: '8px 18px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
        >
          + 支払い記録追加
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 12 }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">全ステータス</option>
          <option value="paid">支払済</option>
          <option value="partial">一部払い</option>
          <option value="unpaid">未払い</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">全種別</option>
          <option value="education">教育費</option>
          <option value="job_matching">JM費</option>
          <option value="dormitory">寮費</option>
          <option value="other">その他</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>読み込み中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['生徒名', '支払種別', '総額 (IDR)', '支払済', '残金', 'ステータス'].map((h) => (
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
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>Rp {p.totalAmount.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#166534' }}>Rp {p.paidAmount.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: p.remainingAmount > 0 ? '#CC0000' : '#166534' }}>
                    Rp {p.remainingAmount.toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <StatusBadge status={p.paymentStatus} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>支払いデータがありません</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
        {[
          { label: '総額合計', value: filtered.reduce((a, p) => a + p.totalAmount, 0) },
          { label: '支払済合計', value: filtered.reduce((a, p) => a + p.paidAmount, 0) },
          { label: '残金合計', value: filtered.reduce((a, p) => a + p.remainingAmount, 0) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '3px solid #CC0000' }}>
            <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginTop: 4 }}>
              Rp {value.toLocaleString('id-ID')}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="支払い記録追加" onClose={() => setShowAdd(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>生徒</label>
            <select value={addData.studentId} onChange={(e) => setAddData(p => ({ ...p, studentId: e.target.value }))} style={inputStyle}>
              <option value="">選択してください</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>支払種別</label>
            <select value={addData.paymentType} onChange={(e) => setAddData(p => ({ ...p, paymentType: e.target.value }))} style={inputStyle}>
              <option value="education">教育費</option>
              <option value="job_matching">JM費</option>
              <option value="dormitory">寮費</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>支払方法</label>
            <select value={addData.paymentMethod} onChange={(e) => setAddData(p => ({ ...p, paymentMethod: e.target.value }))} style={inputStyle}>
              <option value="lump_sum">一括</option>
              <option value="installment">分割</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>総額 (IDR)</label>
            <input type="number" value={addData.totalAmount} onChange={(e) => setAddData(p => ({ ...p, totalAmount: Number(e.target.value) }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>支払済額 (IDR)</label>
            <input type="number" value={addData.paidAmount} onChange={(e) => setAddData(p => ({ ...p, paidAmount: Number(e.target.value) }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
            <button
              onClick={() => {
                const total = addData.totalAmount;
                const paid = addData.paidAmount;
                const status: PaymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
                addMutation.mutate({
                  studentId: addData.studentId,
                  paymentType: addData.paymentType as PaymentType,
                  paymentMethod: addData.paymentMethod as PaymentMethod,
                  totalAmount: total,
                  paidAmount: paid,
                  remainingAmount: total - paid,
                  paymentStatus: status,
                  notes: addData.notes || undefined,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }}
              disabled={!addData.studentId}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', opacity: addData.studentId ? 1 : 0.5 }}
            >
              保存
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
