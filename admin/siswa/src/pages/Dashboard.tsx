import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudents, getPayments, getCommissionPayments } from '../lib/firestore';
import { useAuth } from '../context/AuthContext';
import { addDays } from 'date-fns';

const CARD_STYLE = {
  background: '#fff',
  borderRadius: 10,
  padding: '20px 24px',
  borderLeft: '4px solid #CC0000',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => getPayments(),
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: getCommissionPayments,
    enabled: isAdmin,
  });

  const activeStudents = students.filter((s) => s.status === 'active');
  const maxBatch = students.length > 0 ? Math.max(...students.map((s) => s.batchNumber)) : 0;
  const currentBatchStudents = students.filter((s) => s.batchNumber === maxBatch && s.status === 'active');

  const now = new Date();
  const in30Days = addDays(now, 30);
  const upcomingDepartures = students.filter(
    (s) => s.departureDate && s.departureDate >= now && s.departureDate <= in30Days
  );

  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const unpaidPayments = payments.filter((p) => {
    if (p.paymentStatus === 'paid') return false;
    const d = new Date(p.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const unpaidCommissions = commissions.filter((c) => !c.isPaid);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>ダッシュボード</h1>
        <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>BJD生徒管理システム概要</p>
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Card 1 */}
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>アクティブ生徒数</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#CC0000' }}>{activeStudents.length}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>現在在籍中の生徒</div>
        </div>

        {/* Card 2 */}
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>最新バッチ在籍</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#CC0000' }}>{currentBatchStudents.length}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Batch {maxBatch} アクティブ</div>
        </div>

        {/* Card 3 */}
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>今月支払い未払い</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: unpaidPayments.length > 0 ? '#CC0000' : '#22c55e' }}>
            {unpaidPayments.length}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>件の未払い</div>
        </div>

        {/* Card 4 */}
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>出発予定（30日以内）</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: upcomingDepartures.length > 0 ? '#f59e0b' : '#22c55e' }}>
            {upcomingDepartures.length}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>名が出発予定</div>
        </div>

        {/* Card 5: 書類担保 */}
        <HeldDocumentsCard />

        {/* Card 6: Commission (admin only) */}
        {isAdmin && (
          <div style={CARD_STYLE}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>未払いコミッション</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: unpaidCommissions.length > 0 ? '#CC0000' : '#22c55e' }}>
              {unpaidCommissions.length}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>件の未払い</div>
          </div>
        )}
      </div>

      {/* Quick access */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>クイックアクセス</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/students/new')}
            style={{
              padding: '10px 20px',
              background: '#CC0000',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            + 新規生徒登録
          </button>
          <button
            onClick={() => navigate('/students')}
            style={{
              padding: '10px 20px',
              background: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            生徒一覧
          </button>
          <button
            onClick={() => navigate('/payments')}
            style={{
              padding: '10px 20px',
              background: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            支払い管理
          </button>
        </div>
      </div>

      {/* Recent students */}
      <div style={{ marginTop: 20, background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>最近登録した生徒</h2>
        {students.slice(0, 5).map((s) => (
          <div
            key={s.id}
            onClick={() => navigate(`/students/${s.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid #f0f0f0',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#CC0000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {s.fullName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.fullName}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{s.registrationNumber} · Batch {s.batchNumber}</div>
            </div>
            <StatusBadge status={s.status} />
          </div>
        ))}
        {students.length === 0 && (
          <div style={{ color: '#aaa', fontSize: 13 }}>生徒データがありません</div>
        )}
      </div>
    </div>
  );
}

function HeldDocumentsCard() {
  return (
    <div style={CARD_STYLE}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>担保証書預かり中</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: '#CC0000' }}>-</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>書類管理で確認</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: '在籍中', color: '#166534', bg: '#dcfce7' },
    departed_japan: { label: '渡航済', color: '#1d4ed8', bg: '#dbeafe' },
    graduated: { label: '修了', color: '#92400e', bg: '#fef3c7' },
    withdrawn: { label: '退学', color: '#6b7280', bg: '#f3f4f6' },
    on_hold: { label: '保留', color: '#92400e', bg: '#fef9c3' },
  };
  const s = map[status] || { label: status, color: '#333', bg: '#eee' };
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
      }}
    >
      {s.label}
    </span>
  );
}
