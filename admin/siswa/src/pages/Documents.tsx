import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getStudents, getStudentDocuments, updateStudentDocument } from '../lib/firestore';
import { format } from 'date-fns';
import type { Student, StudentDocument } from '../lib/types';

type StudentDocWithStudent = StudentDocument & { studentName: string; studentId: string };

const COLLATERAL_TYPES = ['diploma_high_school', 'diploma_vocational'];

const docTypeLabel: Record<string, string> = {
  diploma_high_school: '高校卒業証書',
  diploma_vocational: '職業高校卒業証書',
  diploma_university: '大学卒業証書',
  transcript: '成績証明書',
  ktp: 'KTP',
  kk: 'KK',
  passport: 'パスポート',
  jlpt_certificate: 'JLPT合格証',
  jft_certificate: 'JFT合格証',
  ssw_certificate: 'SSW証明書',
  psychotest_result: '心理検査結果',
  mcu_result: '健康診断結果',
  job_offer_letter: '内定通知書',
  employment_contract: '雇用契約書',
  coe_document: 'COE',
  other: 'その他',
};

export default function Documents() {
  const { data: students = [], isLoading: loadingStudents } = useQuery({ queryKey: ['students'], queryFn: getStudents });

  const [collateralOnly, setCollateralOnly] = useState(false);
  const [allDocs, setAllDocs] = useState<StudentDocWithStudent[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const returnMutation = useMutation({
    mutationFn: ({ studentId, docId }: { studentId: string; docId: string }) =>
      updateStudentDocument(studentId, docId, { isHeld: false, returnedDate: new Date() }),
    onSuccess: () => {
      // Refetch by re-triggering
      setLoaded(false);
    },
  });

  const loadAllDocs = async (studentList: Student[]) => {
    setLoadingDocs(true);
    const results: StudentDocWithStudent[] = [];
    for (const s of studentList) {
      try {
        const docs = await getStudentDocuments(s.id);
        docs.forEach((d) => results.push({ ...d, studentName: s.fullName, studentId: s.id }));
      } catch {}
    }
    setAllDocs(results);
    setLoadingDocs(false);
    setLoaded(true);
  };

  // Load docs when students are available
  useMemo(() => {
    if (students.length > 0 && !loaded && !loadingDocs) {
      loadAllDocs(students);
    }
  }, [students, loaded, loadingDocs]);

  const filtered = useMemo(() => {
    if (!collateralOnly) return allDocs;
    return allDocs.filter((d) => COLLATERAL_TYPES.includes(d.documentType));
  }, [allDocs, collateralOnly]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>書類・担保管理</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>全生徒の書類一覧 — {filtered.length}件</p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={collateralOnly} onChange={(e) => setCollateralOnly(e.target.checked)} />
          担保証書のみ表示
        </label>
        <button
          onClick={() => { setLoaded(false); setAllDocs([]); }}
          style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
        >
          再読み込み
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '3px solid #CC0000' }}>
          <div style={{ fontSize: 12, color: '#888' }}>総書類数</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{allDocs.length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '3px solid #CC0000' }}>
          <div style={{ fontSize: 12, color: '#888' }}>担保預かり中</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#CC0000' }}>{allDocs.filter((d) => COLLATERAL_TYPES.includes(d.documentType) && d.isHeld).length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '3px solid #22c55e' }}>
          <div style={{ fontSize: 12, color: '#888' }}>返却済み</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{allDocs.filter((d) => COLLATERAL_TYPES.includes(d.documentType) && !d.isHeld).length}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loadingStudents || loadingDocs ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>読み込み中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['生徒名', '書類種別', 'タイトル', 'アップロード日', '担保状態', '操作'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const isCollateral = COLLATERAL_TYPES.includes(d.documentType);
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{d.studentName}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>
                      {isCollateral && '🔒 '}{docTypeLabel[d.documentType] || d.documentType}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>
                      {d.fileId ? (
                        <a href={`https://drive.google.com/file/d/${d.fileId}/view`} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>
                          {d.title}
                        </a>
                      ) : d.title}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#888' }}>
                      {format(d.uploadDate, 'dd/MM/yyyy')}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {isCollateral ? (
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                          color: d.isHeld ? '#991b1b' : '#166534',
                          background: d.isHeld ? '#fee2e2' : '#dcfce7',
                        }}>
                          {d.isHeld ? '預かり中' : '返却済'}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {isCollateral && d.isHeld && (
                        <button
                          onClick={() => returnMutation.mutate({ studentId: d.studentId, docId: d.id })}
                          style={{ padding: '4px 12px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#166534', fontWeight: 600 }}
                        >
                          返却済みにする
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>書類データがありません</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
