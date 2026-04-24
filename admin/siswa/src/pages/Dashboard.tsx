import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudents, getPayments, getCommissionPayments, getAnnouncement, updateAnnouncement } from '../lib/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { addDays, format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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
  const { language } = useLanguage();
  const t = translations[language];

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{t.dashboard}</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>{t.dashboard_desc}</p>
        </div>
        <AnnouncementBoard />
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
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{t.total_active_students}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#CC0000' }}>{activeStudents.length}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{t.currently_enrolled}</div>
        </div>

        {/* Card 2 */}
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{t.latest_batch_enrollment}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#CC0000' }}>{currentBatchStudents.length}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Batch {maxBatch} {t.batch_active}</div>
        </div>

        {/* Card 3 */}
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{t.unpaid_this_month}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: unpaidPayments.length > 0 ? '#CC0000' : '#22c55e' }}>
            {unpaidPayments.length}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{unpaidPayments.length} {t.unpaid_count}</div>
        </div>

        {/* Card 4 */}
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{t.departure_within_30_days}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: upcomingDepartures.length > 0 ? '#f59e0b' : '#22c55e' }}>
            {upcomingDepartures.length}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{upcomingDepartures.length} {t.departure_count}</div>
        </div>

        {/* Card 5: 書類担保 */}
        <HeldDocumentsCard />

        {/* Card 6: Commission (admin only) */}
        {isAdmin && (
          <div style={CARD_STYLE}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{t.commissions}</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: unpaidCommissions.length > 0 ? '#CC0000' : '#22c55e' }}>
              {unpaidCommissions.length}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{unpaidCommissions.length} {t.unpaid_count}</div>
          </div>
        )}
      </div>

      {/* Quick access */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>{t.quick_access}</h2>
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
            {t.add_student}
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
            {t.student_list}
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
            {t.payment_management}
          </button>
        </div>
      </div>

      {/* Recent students */}
      <div style={{ marginTop: 20, background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>{t.recent_registered_students}</h2>
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
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6', border: '1px solid #eee' }}>
              {((s as any).photos?.[0]?.url || s.photoUrl) ? (
                <img
                  src={(s as any).photos?.[0]?.url || s.photoUrl}
                  alt={s.fullName}
                  onError={(e) => {
                    const fileId = (s as any).photos?.[0]?.fileId || (s as any).photoFileId;
                    if (fileId) {
                      (e.target as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${fileId}&sz=100`;
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                  {s.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.fullName}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{s.registrationNumber} · Batch {s.batchNumber}</div>
            </div>
            <StatusBadge status={s.status} />
          </div>
        ))}
        {students.length === 0 && (
          <div style={{ color: '#aaa', fontSize: 13 }}>{t.no_student_data}</div>
        )}
      </div>
    </div>
  );
}

function HeldDocumentsCard() {
  const { language } = useLanguage();
  const t = translations[language];
  return (
    <div style={CARD_STYLE}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{t.held_documents}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: '#CC0000' }}>-</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{t.check_in_documents}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { language } = useLanguage();
  const t = translations[language];
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: t.status_active, color: '#166534', bg: '#dcfce7' },
    departed_japan: { label: t.status_departed, color: '#1d4ed8', bg: '#dbeafe' },
    graduated: { label: t.status_graduated, color: '#92400e', bg: '#fef3c7' },
    withdrawn: { label: t.status_withdrawn, color: '#6b7280', bg: '#f3f4f6' },
    on_hold: { label: t.status_on_hold, color: '#92400e', bg: '#fef9c3' },
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

function AnnouncementBoard() {
  const { isAdmin } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const { data: announcement } = useQuery({
    queryKey: ['announcement'],
    queryFn: getAnnouncement,
  });

  const mutation = useMutation({
    mutationFn: updateAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement'] });
      setIsEditing(false);
    },
  });

  if (!announcement && !isAdmin) return null;

  return (
    <div
      style={{
        flex: 1,
        maxWidth: 600,
        background: '#fff9e6',
        border: '1px solid #ffe699',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#856404', display: 'flex', alignItems: 'center', gap: 6 }}>
          📢 {t.message_board}
        </div>
        {isAdmin && !isEditing && (
          <button
            onClick={() => {
              setEditContent(announcement?.content || '');
              setIsEditing(true);
            }}
            style={{ fontSize: 11, background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0 }}
          >
            [{t.edit_message}]
          </button>
        )}
      </div>

      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder={t.message_placeholder}
            style={{
              width: '100%',
              height: 100,
              padding: 10,
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 13,
              fontFamily: 'inherit',
              marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setIsEditing(false)}
              style={{ padding: '4px 12px', fontSize: 12, borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
            >
              {t.cancel}
            </button>
            <button
              onClick={() => mutation.mutate(editContent)}
              style={{ padding: '4px 12px', fontSize: 12, borderRadius: 4, border: 'none', background: '#CC0000', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 14, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {announcement?.content || t.no_message}
          </div>
          {announcement?.updatedAt && (
            <div style={{ fontSize: 10, color: '#999', marginTop: 10, textAlign: 'right' }}>
              {language === 'ja' ? '更新日' : 'Diperbarui'}: {format(announcement.updatedAt, 'yyyy/MM/dd HH:mm')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
