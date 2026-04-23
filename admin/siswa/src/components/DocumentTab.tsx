import { useState, useEffect } from 'react';
import type { Student } from '../types/student';
import { studentService } from '../lib/studentService';
import FileBrowser from './FileBrowser';
import { Search, User, ChevronRight, FolderOpen, Loader2, AlertCircle } from 'lucide-react';

interface DocumentTabProps {
  accessToken: string;
}

const DocumentTab = ({ accessToken }: DocumentTabProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await studentService.getStudents();
      setStudents(data);
      // 最初の一人を選択状態にする（オプション）
      if (data.length > 0) {
        setSelectedStudent(data[0]);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 左側: 生徒選択リスト */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="生徒を検索..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-4 border-b border-gray-50 bg-gray-50/30">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">生徒リスト</p>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            {filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`
                  w-full flex items-center gap-3 px-4 py-4 border-b border-gray-50 transition-all text-left
                  ${selectedStudent?.id === student.id 
                    ? 'bg-primary/5 border-l-4 border-l-primary' 
                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                  ${selectedStudent?.id === student.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}
                `}>
                  {student.name.charAt(0)}
                </div>
                <div className="flex-grow min-w-0">
                  <p className={`text-sm font-bold truncate ${selectedStudent?.id === student.id ? 'text-primary' : 'text-gray-700'}`}>
                    {student.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">
                    ID: {student.id?.slice(-6).toUpperCase()}
                  </p>
                </div>
                <ChevronRight size={14} className={selectedStudent?.id === student.id ? 'text-primary' : 'text-gray-200'} />
              </button>
            ))}
            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-gray-300 text-xs font-medium">
                生徒が見つかりません
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右側: ファイルブラウザ */}
      <div className="flex-grow">
        {selectedStudent ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-50">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <User size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedStudent.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase tracking-wider">
                    {selectedStudent.status}
                  </span>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium italic">
                    <FolderOpen size={10} />
                    {selectedStudent.gdriveFolderId || 'フォルダ未作成'}
                  </div>
                </div>
              </div>
            </div>

            {selectedStudent.gdriveFolderId ? (
              <FileBrowser 
                folderId={selectedStudent.gdriveFolderId} 
                accessToken={accessToken} 
                studentName={selectedStudent.name}
                studentId={selectedStudent.id}
              />
            ) : (
              <div className="p-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <AlertCircle className="mx-auto text-orange-400 mb-4" size={40} />
                <p className="text-gray-600 font-bold">Google Drive フォルダが設定されていません</p>
                <p className="text-sm text-gray-400 mt-1">生徒情報の編集からフォルダIDを確認してください</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20 px-8 bg-white/50 rounded-3xl border-2 border-dashed border-gray-100">
            <User size={48} className="opacity-10 mb-4" />
            <p className="text-xl font-bold tracking-tight">生徒を選択してください</p>
            <p className="text-sm mt-2 font-medium">左側のリストから生徒を選択して書類を管理できます</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentTab;
