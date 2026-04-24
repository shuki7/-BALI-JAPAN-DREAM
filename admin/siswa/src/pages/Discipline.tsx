import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, updateStudent } from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useAuth } from '../context/AuthContext';
import { GDriveService } from '../lib/gdrive';
import { generateYellowCardInvoicePDF } from '../lib/invoice';
import { AlertTriangle, Plus, FileDown, Search } from 'lucide-react';
import type { Student, YellowCardRecord } from '../lib/types';
import { format } from 'date-fns';

const CARD_STYLE = {
  background: '#fff',
  borderRadius: 12,
  padding: '24px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  border: '1px solid #eee',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 540, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Discipline() {
  const { language } = useLanguage();
  const t = translations[language];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState<Student | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<{ student: Student; card: YellowCardRecord } | null>(null);
  const [dueDate, setDueDate] = useState(format(new Date().setDate(new Date().getDate() + 7), 'yyyy-MM-dd'));
  
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowAddModal(null);
      setReason('');
      setFile(null);
    },
  });

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const yellowCardStudents = useMemo(() => {
    return students.filter(s => s.yellowCards && s.yellowCards.length > 0);
  }, [students]);

  const handleIssueCard = async () => {
    if (!showAddModal || !reason) return;
    setUploading(true);
    
    try {
      let photoUrls: string[] = [];
      if (file && (user as any)?.accessToken) {
        const drive = new GDriveService((user as any).accessToken);
        // Ensure folder exists or use student folder
        const folderId = showAddModal.driveFolderId || (await drive.createFolder(showAddModal.fullName));
        const fileId = await drive.uploadFile(file, folderId);
        await drive.makePublic(fileId);
        photoUrls = [drive.getViewUrl(fileId)];
      }

      const newCard: YellowCardRecord = {
        id: crypto.randomUUID(),
        date: new Date(),
        reason,
        photoUrls,
        issuedBy: user?.displayName || 'Admin',
      };

      const updatedCards = [...(showAddModal.yellowCards || []), newCard];
      await updateMutation.mutateAsync({ id: showAddModal.id, data: { yellowCards: updatedCards } });
    } catch (err) {
      console.error(err);
      alert('Failed to issue yellow card');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle color="#CC0000" size={28} />
            {t.discipline}
          </h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 14 }}>{language === 'ja' ? '生徒の規律状態とイエローカードの発行・管理' : 'Status disiplin siswa dan penerbitan/manajemen kartu kuning'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Main Section: Search and History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Search Card */}
          <div style={CARD_STYLE}>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <Search size={18} color="#999" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                placeholder={language === 'ja' ? '生徒名・IDで検索してイエローカードを発行...' : 'Cari nama/ID siswa untuk menerbitkan kartu kuning...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 42 }}
              />
            </div>
            
            {searchTerm && (
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
                {filteredStudents.length > 0 ? (
                  filteredStudents.slice(0, 5).map(s => (
                    <div key={s.id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f9f9f9' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.fullName}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{s.registrationNumber} · Batch {s.batchNumber}</div>
                      </div>
                      <button 
                        onClick={() => setShowAddModal(s)}
                        style={{ padding: '6px 14px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Plus size={14} /> {t.issue_yellow_card}
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>{t.no_student_data}</div>
                )}
              </div>
            )}
          </div>

          {/* History List */}
          <div style={CARD_STYLE}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#333' }}>{t.discipline_history}</h3>
            {yellowCardStudents.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#aaa' }}>
                <AlertTriangle size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <div>{language === 'ja' ? '現在イエローカードを保持している生徒はいません' : 'Saat ini tidak ada siswa yang memegang kartu kuning'}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {yellowCardStudents.map(s => (
                  <div key={s.id} style={{ border: '1px solid #f0f0f0', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{s.fullName}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{s.registrationNumber} · {t.batch} {s.batchNumber}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {s.yellowCards?.map((_, i) => (
                          <div key={i} style={{ width: 14, height: 20, background: '#ffd700', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 12 }}>
                      {s.yellowCards?.map((card, i) => (
                        <div key={card.id} style={{ marginBottom: i === (s.yellowCards?.length || 0) - 1 ? 0 : 12, borderBottom: i === (s.yellowCards?.length || 0) - 1 ? 'none' : '1px solid #eee', paddingBottom: i === (s.yellowCards?.length || 0) - 1 ? 0 : 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, color: '#CC0000' }}>#{i+1} イエローカード</span>
                            <span style={{ color: '#888' }}>{format(card.date, 'dd/MM/yyyy')}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{card.reason}</div>
                          {card.photoUrls && card.photoUrls.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              {card.photoUrls.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#0066cc', textDecoration: 'none' }}>🖼 {t.evidence}</a>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                            <div style={{ fontSize: 11, color: '#999' }}>{t.issuer}: {card.issuedBy}</div>
                            <button 
                              onClick={() => setShowInvoiceModal({ student: s, card })}
                              style={{ padding: '4px 10px', background: '#fff', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <FileDown size={12} /> {language === 'ja' ? '請求書発行' : 'Invoice'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ ...CARD_STYLE, background: '#fff8f8', borderColor: '#fee2e2' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#991b1b' }}>{language === 'ja' ? '規律ガイドライン' : 'Pedoman Disiplin'}</h4>
            <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#991b1b', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{language === 'ja' ? '遅刻・欠席の累積' : 'Akumulasi keterlambatan/absen'}</li>
              <li>{language === 'ja' ? '校則違反（服装・態度）' : 'Pelanggaran tata tertib (pakaian/sikap)'}</li>
              <li>{language === 'ja' ? '寮内でのトラブル' : 'Masalah di dalam asrama'}</li>
              <li>{language === 'ja' ? '3枚のイエローカードでレッドカード（退学検討）' : '3 Kartu Kuning = Kartu Merah (DO)'}</li>
            </ul>
          </div>

          <div style={CARD_STYLE}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{language === 'ja' ? '総発行数' : 'Total Diterbitkan'}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#111' }}>
              {students.reduce((acc, s) => acc + (s.yellowCards?.length || 0), 0)}
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
              {language === 'ja' ? '今月の新規発行: ' : 'Terbit bulan ini: '} 
              <span style={{ fontWeight: 700, color: '#CC0000' }}>
                {students.reduce((acc, s) => acc + (s.yellowCards?.filter(c => new Date(c.date).getMonth() === new Date().getMonth()).length || 0), 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Yellow Card Modal */}
      {showAddModal && (
        <Modal title={`${t.issue_yellow_card}: ${showAddModal.fullName}`} onClose={() => setShowAddModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>{t.reason} (Reason)</label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={language === 'ja' ? '理由を詳しく記入してください...' : 'Tuliskan alasan secara detail...'}
                style={{ ...inputStyle, height: 120, resize: 'none' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>{t.evidence_photo} (Evidence)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
                style={{ fontSize: 13 }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#999' }}>{language === 'ja' ? '証拠となる写真やスクショがあればアップロードしてください' : 'Unggah foto atau tangkapan layar jika ada bukti'}</p>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button 
                onClick={() => setShowAddModal(null)}
                disabled={uploading}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleIssueCard}
                disabled={uploading || !reason}
                style={{ flex: 1, padding: '12px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer', opacity: (uploading || !reason) ? 0.6 : 1 }}
              >
                {uploading ? t.editing : t.register}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice Date Modal */}
      {showInvoiceModal && (
        <Modal title={language === 'ja' ? '請求書の作成' : 'Buat Invoice'} onClose={() => setShowInvoiceModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#666' }}>{t.students}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{showInvoiceModal.student.fullName}</div>
              <div style={{ fontSize: 13, color: '#CC0000', marginTop: 8 }}>{t.reason}: {showInvoiceModal.card.reason}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>{t.due_date_label}</label>
              <input 
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button 
                onClick={() => setShowInvoiceModal(null)}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => {
                  generateYellowCardInvoicePDF(showInvoiceModal.student, showInvoiceModal.card, dueDate, language);
                  setShowInvoiceModal(null);
                }}
                style={{ flex: 1, padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <FileDown size={18} /> {language === 'ja' ? 'PDFをダウンロード' : 'Unduh PDF'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
