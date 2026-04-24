import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudents, getPayments, getStudentDocuments, getStudentLogs } from '../lib/firestore';
import { generateStudentReportPDF } from '../lib/report';
import { format } from 'date-fns';
import type { StudentStatus, ProgramType } from '../lib/types';

function StatusBadge({ status }: { status: StudentStatus }) {
  const map: Record<StudentStatus, { label: string; color: string; bg: string }> = {
    active: { label: '在籍中', color: '#166534', bg: '#dcfce7' },
    departed_japan: { label: '渡航済', color: '#1d4ed8', bg: '#dbeafe' },
    graduated: { label: '修了', color: '#92400e', bg: '#fef3c7' },
    withdrawn: { label: '退学', color: '#6b7280', bg: '#f3f4f6' },
    on_hold: { label: '保留', color: '#92400e', bg: '#fef9c3' },
  };
  const s = map[status];
  return (
    <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function programLabel(p: ProgramType) {
  const m: Record<ProgramType, string> = {
    tokutei_ginou: '特定技能',
    gijinkoku: '技人国',
    job_matching_only: 'JMのみ',
  };
  return m[p];
}

export default function Students() {
  const navigate = useNavigate();
  const { data: students = [], isLoading } = useQuery({ queryKey: ['students'], queryFn: getStudents });

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSource, setFilterSource] = useState('');

  const batches = useMemo(() => [...new Set(students.map((s) => s.batchNumber))].sort((a, b) => a - b), [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (search && !s.fullName.toLowerCase().includes(search.toLowerCase()) && !s.registrationNumber.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterBatch && s.batchNumber !== Number(filterBatch)) return false;
      if (filterProgram && s.programType !== filterProgram) return false;
      if (filterSource && s.source !== filterSource) return false;
      return true;
    });
  }, [students, search, filterStatus, filterBatch, filterProgram, filterSource]);

  const exportCSV = () => {
    const headers = ['登録番号', '氏名', 'バッチ', 'プログラム', 'ステータス', '入学日'];
    const rows = filtered.map((s) => [
      s.registrationNumber,
      s.fullName,
      s.batchNumber,
      programLabel(s.programType),
      s.status,
      format(s.enrollmentDate, 'dd/MM/yyyy'),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 13,
    color: '#333',
    background: '#fff',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>生徒管理</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>Manajemen Siswa — {filtered.length}名</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={exportCSV}
            style={{ ...inputStyle, cursor: 'pointer', border: '1px solid #ddd' }}
          >
            CSV出力
          </button>
          <button
            onClick={() => navigate('/students/new')}
            style={{
              padding: '8px 18px',
              background: '#CC0000',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            + 新規生徒登録
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="氏名・登録番号で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: 200 }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">全ステータス</option>
          <option value="active">在籍中</option>
          <option value="departed_japan">渡航済</option>
          <option value="graduated">修了</option>
          <option value="withdrawn">退学</option>
          <option value="on_hold">保留</option>
        </select>
        <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} style={inputStyle}>
          <option value="">全バッチ</option>
          {batches.map((b) => (
            <option key={b} value={b}>Batch {b}</option>
          ))}
        </select>
        <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} style={inputStyle}>
          <option value="">全プログラム</option>
          <option value="tokutei_ginou">特定技能</option>
          <option value="gijinkoku">技人国</option>
          <option value="job_matching_only">JMのみ</option>
        </select>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={inputStyle}>
          <option value="">全ソース</option>
          <option value="direct">直接</option>
          <option value="partner_school">提携校</option>
        </select>
        {(search || filterStatus || filterBatch || filterProgram || filterSource) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterBatch(''); setFilterProgram(''); setFilterSource(''); }}
            style={{ ...inputStyle, cursor: 'pointer', color: '#CC0000' }}
          >
            クリア
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>読み込み中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>写真</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>登録番号</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>氏名</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>バッチ</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>プログラム</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>警告</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>ステータス</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>入学日</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/students/${s.id}`)}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: idx % 2 === 0 ? '#fff' : '#fafafa',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fff5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                >
                  <td style={{ padding: '10px 16px' }}>
                    {((s as any).photos?.[0]?.url || s.photoUrl) ? (
                      <img
                        src={(s as any).photos?.[0]?.url || s.photoUrl}
                        alt={s.fullName}
                        onError={(e) => {
                          const fileId = (s as any).photos?.[0]?.fileId || (s as any).photoFileId;
                          if (fileId) {
                            (e.target as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w100`;
                          }
                        }}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: '#f3f4f6',
                          color: '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14,
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        {s.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>{s.registrationNumber}</td>
                  <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{s.fullName}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>Batch {s.batchNumber}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>{programLabel(s.programType)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {s.yellowCards?.map((_, i) => (
                        <span key={i} title="Yellow Card" style={{ fontSize: 14 }}>🟨</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#555' }}>
                    {format(s.enrollmentDate, 'dd/MM/yyyy')}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const [pmts, docs, logs] = await Promise.all([
                            getPayments(s.id),
                            getStudentDocuments(s.id),
                            getStudentLogs(s.id)
                          ]);
                          generateStudentReportPDF(s, pmts, docs, logs, language);
                        } catch (err) {
                          alert('Failed to generate report');
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="レポートPDF"
                    >
                      📄 レポート
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
                    該当する生徒が見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
