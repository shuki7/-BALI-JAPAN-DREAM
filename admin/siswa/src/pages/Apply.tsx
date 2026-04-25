import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { 
  User, Users, Landmark, FileUp, CheckCircle, 
  ArrowRight, ArrowLeft, Loader2 
} from 'lucide-react';

export default function Apply() {
  const { language } = useLanguage();
  const t = translations[language];
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    programType: 'tokutei_ginou',
    fullName: '',
    fullNameFurigana: '',
    gender: 'male',
    dateOfBirth: '',
    birthPlace: '',
    nationality: 'Indonesia',
    religion: '',
    address: '',
    city: '',
    province: '',
    whatsapp: '',
    email: '',
    educationLevel: 'high_school',
    schoolName: '',
    graduationYear: '',
    
    // Guarantor Info
    guarantorName: '',
    guarantorRelation: '',
    guarantorWhatsapp: '',
    guarantorAddress: '',
    
    // Bank Info
    bankName: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    
    // Status
    status: 'applicant'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      window.scrollTo(0, 0);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'applicants'), {
        ...formData,
        dateOfBirth: new Date(formData.dateOfBirth),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send Email Notification
      try {
        await fetch('/admin/siswa/api/send_mail.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } catch (e) {
        console.warn('Email notification failed but application was saved', e);
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: '#f8fafc', padding: 20 
      }}>
        <div style={{ 
          maxWidth: 500, width: '100%', background: '#fff', borderRadius: 24, padding: 40, 
          textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' 
        }}>
          <div style={{ 
            width: 80, height: 80, background: '#dcfce7', color: '#22c55e', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' 
          }}>
            <CheckCircle size={40} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>
            {language === 'ja' ? '申し込み完了！' : 'Pendaftaran Berhasil!'}
          </h1>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 32 }}>
            {language === 'ja' 
              ? 'お申し込みありがとうございます。内容を確認後、スタッフよりWhatsAppにてご連絡いたします。しばらくお待ちください。' 
              : 'Terima kasih telah mendaftar. Staf kami akan segera menghubungi Anda melalui WhatsApp setelah memeriksa data Anda.'}
          </p>
          <button 
            onClick={() => window.location.href = 'https://balijapandream.com'}
            style={{ 
              width: '100%', padding: '14px', background: '#CC0000', color: '#fff', 
              borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer' 
            }}
          >
            {language === 'ja' ? 'ホームへ戻る' : 'Kembali ke Beranda'}
          </button>
        </div>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    marginTop: '6px'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 700,
    color: '#475569',
    display: 'block'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', 
            padding: '8px 20px', borderRadius: 99, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: 16 
          }}>
            <span style={{ fontSize: 20 }}>🇮🇩</span>
            <span style={{ fontWeight: 800, color: '#CC0000' }}>BALI JAPAN DREAM</span>
            <span style={{ fontSize: 20 }}>🇯🇵</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>
            {language === 'ja' ? '入学申し込みフォーム' : 'Formulir Pendaftaran'}
          </h1>
          <p style={{ color: '#64748b', marginTop: 8 }}>
            {language === 'ja' ? '各項目を入力してください。' : 'Silakan lengkapi formulir di bawah ini.'}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ 
              flex: 1, height: 6, borderRadius: 3, 
              background: s <= step ? '#CC0000' : '#e2e8f0',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} style={{ 
          background: '#fff', borderRadius: 24, padding: '32px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' 
        }}>
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <User size={24} color="#CC0000" /> {language === 'ja' ? 'コース選択と個人情報' : 'Pilihan Kursus & Data Pribadi'}
              </h2>
              
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>{language === 'ja' ? '希望コース' : 'Pilihan Program'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                  <div 
                    onClick={() => setFormData(p => ({ ...p, programType: 'tokutei_ginou' }))}
                    style={{ 
                      padding: '16px', borderRadius: 16, border: '2px solid', 
                      borderColor: formData.programType === 'tokutei_ginou' ? '#CC0000' : '#f1f5f9',
                      background: formData.programType === 'tokutei_ginou' ? '#fff1f1' : '#fff',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: formData.programType === 'tokutei_ginou' ? '#CC0000' : '#64748b' }}>
                      {language === 'ja' ? '特定技能コース' : 'Tokutei Ginou'}
                    </div>
                    <div style={{ fontSize: 10, marginTop: 4, color: '#94a3b8' }}>(6 Months)</div>
                  </div>
                  <div 
                    onClick={() => setFormData(p => ({ ...p, programType: 'job_matching_only' }))}
                    style={{ 
                      padding: '16px', borderRadius: 16, border: '2px solid', 
                      borderColor: formData.programType === 'job_matching_only' ? '#CC0000' : '#f1f5f9',
                      background: formData.programType === 'job_matching_only' ? '#fff1f1' : '#fff',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: formData.programType === 'job_matching_only' ? '#CC0000' : '#64748b' }}>
                      {language === 'ja' ? 'JMのみ' : 'JM Only'}
                    </div>
                    <div style={{ fontSize: 10, marginTop: 4, color: '#94a3b8' }}>(Job Matching)</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{language === 'ja' ? '氏名 (ローマ字)' : 'Nama Lengkap'}</label>
                  <input required name="fullName" value={formData.fullName} onChange={handleChange} style={inputStyle} placeholder="SHUKI UEMURA" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{language === 'ja' ? 'フリガナ (カタカナ)' : 'Nama Katakana'}</label>
                  <input required name="fullNameFurigana" value={formData.fullNameFurigana} onChange={handleChange} style={inputStyle} placeholder="シュキ ウエムラ" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{language === 'ja' ? '生年月日' : 'Tanggal Lahir'}</label>
                  <input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{language === 'ja' ? '出生地' : 'Tempat Lahir'}</label>
                  <input required name="birthPlace" value={formData.birthPlace} onChange={handleChange} style={inputStyle} placeholder="Denpasar" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{language === 'ja' ? '性別' : 'Jenis Kelamin'}</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} style={inputStyle}>
                    <option value="male">{language === 'ja' ? '男性' : 'Laki-laki'}</option>
                    <option value="female">{language === 'ja' ? '女性' : 'Perempuan'}</option>
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{language === 'ja' ? '宗教' : 'Agama'}</label>
                  <input required name="religion" value={formData.religion} onChange={handleChange} style={inputStyle} placeholder="Islam / Hindu / etc" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>WhatsApp</label>
                  <input required name="whatsapp" value={formData.whatsapp} onChange={handleChange} style={inputStyle} placeholder="0812..." />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Email</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} placeholder="example@mail.com" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Users size={24} color="#CC0000" /> {language === 'ja' ? '保証人情報' : 'Informasi Penjamin'}
              </h2>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{language === 'ja' ? '保証人氏名' : 'Nama Penjamin'}</label>
                <input required name="guarantorName" value={formData.guarantorName} onChange={handleChange} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{language === 'ja' ? '続柄' : 'Hubungan'}</label>
                <input required name="guarantorRelation" value={formData.guarantorRelation} onChange={handleChange} style={inputStyle} placeholder="Orang Tua / Wali" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>WhatsApp ({language === 'ja' ? '保証人' : 'Penjamin'})</label>
                <input required name="guarantorWhatsapp" value={formData.guarantorWhatsapp} onChange={handleChange} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{language === 'ja' ? '保証人住所' : 'Alamat Penjamin'}</label>
                <input required name="guarantorAddress" value={formData.guarantorAddress} onChange={handleChange} style={inputStyle} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Landmark size={24} color="#CC0000" /> {language === 'ja' ? '銀行口座情報' : 'Informasi Rekening Bank'}
              </h2>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{language === 'ja' ? '銀行名' : 'Nama Bank'}</label>
                <input required name="bankName" value={formData.bankName} onChange={handleChange} style={inputStyle} placeholder="BCA / BNI / BRI" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{language === 'ja' ? '口座名義' : 'Nama Pemilik Rekening'}</label>
                  <input required name="bankAccountHolder" value={formData.bankAccountHolder} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{language === 'ja' ? '口座番号' : 'Nomor Rekening'}</label>
                  <input required name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} style={inputStyle} />
                </div>
              </div>
              <div style={{ padding: '16px', background: '#fff9f0', borderRadius: 12, border: '1px solid #ffedd5', color: '#9a3412', fontSize: 12 }}>
                ⚠️ {language === 'ja' 
                  ? '銀行口座は、入学金の返金が必要になった場合などに使用されます。正確に入力してください。' 
                  : 'Rekening bank akan digunakan jika diperlukan pengembalian dana atau administrasi lainnya. Mohon isi dengan teliti.'}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <FileUp size={24} color="#CC0000" /> {language === 'ja' ? '書類確認と送信' : 'Konfirmasi & Kirim'}
              </h2>
              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, marginBottom: 24 }}>
                <p style={{ fontSize: 14, color: '#475569', marginBottom: 0 }}>
                  {language === 'ja' 
                    ? 'すべての入力内容を確認し、問題がなければ「送信する」を押してください。' 
                    : 'Mohon periksa kembali semua data yang telah Anda masukkan. Jika sudah benar, klik tombol Kirim di bawah.'}
                </p>
              </div>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{language === 'ja' ? '氏名' : 'Nama'}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{formData.fullName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{language === 'ja' ? 'コース' : 'Program'}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#CC0000' }}>
                    {formData.programType === 'tokutei_ginou' ? (language === 'ja' ? '特定技能' : 'Tokutei Ginou') : 'JM Only'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>WhatsApp</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{formData.whatsapp}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
            {step > 1 && (
              <button 
                type=\"button\"
                onClick={() => setStep(step - 1)}
                style={{ 
                  flex: 1, padding: '14px', background: '#fff', color: '#64748b', 
                  borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 700, 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 
                }}
              >
                <ArrowLeft size={18} /> {language === 'ja' ? '戻る' : 'Kembali'}
              </button>
            )}
              <button 
                type="submit"
                disabled={loading}
                style={{ 
                  flex: 2, padding: '14px', background: '#CC0000', color: '#fff', 
                  borderRadius: 12, border: 'none', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 12px rgba(204,0,0,0.2)', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    {step === 4 ? (language === 'ja' ? '送信する' : 'Kirim Sekarang') : (language === 'ja' ? '次へ進む' : 'Lanjutkan')}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
          </div>

        </form>

        {/* Footer info */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#94a3b8' }}>
          &copy; {new Date().getFullYear()} BALI JAPAN DREAM. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
