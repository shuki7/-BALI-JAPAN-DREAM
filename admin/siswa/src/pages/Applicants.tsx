import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { format } from 'date-fns';
import { 
  Users, Search, Filter, UserCheck, Trash2, 
  ChevronRight, ExternalLink, Mail, Phone, Calendar
} from 'lucide-react';

export default function Applicants() {
  const { language } = useLanguage();
  const t = translations[language];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ['applicants'],
    queryFn: async () => {
      const q = query(collection(db, 'applicants'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async (applicant: any) => {
      // 1. Move to students collection
      const studentData = {
        ...applicant,
        status: 'active',
        enrollmentDate: new Date(),
        registrationNumber: `BJD-${new Date().getFullYear()}-S${Math.floor(Math.random() * 1000)}`, // Basic ID generation
        batchNumber: 0, // Admin needs to assign later
        photoUrl: '', // Default empty
        photos: []
      };
      delete studentData.id;
      
      await addDoc(collection(db, 'students'), studentData);
      
      // 2. Delete from applicants
      await deleteDoc(doc(db, 'applicants', applicant.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      alert('Successfully enrolled as a student!');
    }
  });

  const filtered = applicants.filter((a: any) => 
    a.fullName.toLowerCase().includes(search.toLowerCase()) ||
    a.whatsapp.includes(search)
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
            {language === 'ja' ? '申込者一覧' : 'Daftar Calon Siswa'}
          </h1>
          <p style={{ color: '#666', marginTop: 4 }}>
            {language === 'ja' ? '新規申し込み者の管理と承認' : 'Manajemen dan persetujuan calon siswa baru'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{language === 'ja' ? '総申込数' : 'Total Pendaftar'}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#CC0000', marginTop: 4 }}>{applicants.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ja' ? '名前または電話番号で検索' : 'Cari nama atau WhatsApp'}
            style={{ 
              width: '100%', padding: '10px 10px 10px 40px', borderRadius: 10, border: '1px solid #ddd', outline: 'none' 
            }} 
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '16px', fontSize: 12, color: '#666' }}>{language === 'ja' ? '氏名' : 'Nama'}</th>
              <th style={{ padding: '16px', fontSize: 12, color: '#666' }}>{language === 'ja' ? 'コース' : 'Program'}</th>
              <th style={{ padding: '16px', fontSize: 12, color: '#666' }}>WhatsApp</th>
              <th style={{ padding: '16px', fontSize: 12, color: '#666' }}>{language === 'ja' ? '申込日' : 'Tgl Daftar'}</th>
              <th style={{ padding: '16px', fontSize: 12, color: '#666' }}>{language === 'ja' ? 'アクション' : 'Aksi'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a: any) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600 }}>{a.fullName}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{a.email}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: a.programType === 'tokutei_ginou' ? '#fff1f1' : '#f0f9ff',
                    color: a.programType === 'tokutei_ginou' ? '#CC0000' : '#0369a1'
                  }}>
                    {a.programType === 'tokutei_ginou' ? 'TG' : 'JM'}
                  </span>
                </td>
                <td style={{ padding: '16px', fontSize: 13 }}>{a.whatsapp}</td>
                <td style={{ padding: '16px', fontSize: 13, color: '#666' }}>
                  {a.createdAt?.toDate ? format(a.createdAt.toDate(), 'dd MMM yyyy') : '-'}
                </td>
                <td style={{ padding: '16px' }}>
                  <button 
                    onClick={() => {
                      if (window.confirm('この申込者を生徒一覧へ移行しますか？')) {
                        enrollMutation.mutate(a);
                      }
                    }}
                    style={{ 
                      padding: '6px 12px', background: '#22c55e', color: '#fff', border: 'none', 
                      borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <UserCheck size={14} /> {language === 'ja' ? '承認して生徒へ' : 'Approve & Enroll'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  {language === 'ja' ? '申込データがありません' : 'Tidak ada data pendaftar'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
