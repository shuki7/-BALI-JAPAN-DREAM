import { useState, useEffect } from 'react';
import type { Student } from '../types/student';
import { studentService } from '../lib/studentService';
import { 
  Mail, 
  Phone, 
  ExternalLink, 
  Plus, 
  Search,
  Filter,
  Trash2,
  Edit2
} from 'lucide-react';

interface StudentListProps {
  onAddClick: () => void;
  onEditClick: (student: Student) => void;
}

const StudentList = ({ onAddClick, onEditClick }: StudentListProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await studentService.getStudents();
      setStudents(data);
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この生徒情報を削除してもよろしいですか？")) return;
    try {
      await studentService.deleteStudent(id);
      setStudents(students.filter(s => s.id !== id));
    } catch (error) {
      alert("削除に失敗しました");
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: Student['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      graduated: 'bg-blue-100 text-blue-700',
      withdrawn: 'bg-gray-100 text-gray-700'
    };
    const labels = {
      active: '在籍中',
      graduated: '卒業',
      withdrawn: '退学'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">生徒一覧</h1>
          <p className="text-sm text-gray-500">登録されているすべての生徒情報を管理します</p>
        </div>
        <button 
          onClick={onAddClick}
          className="btn btn-primary flex items-center justify-center gap-2 px-4 py-2"
        >
          <Plus size={18} />
          新規生徒登録
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="名前やメールアドレスで検索..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter size={18} />
            フィルター
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">氏名</th>
                <th className="px-6 py-4">連絡先</th>
                <th className="px-6 py-4">ステータス</th>
                <th className="px-6 py-4">GDrive</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{student.name}</div>
                          {student.nameKana && <div className="text-xs text-gray-400">{student.nameKana}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {student.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail size={12} />
                            {student.email}
                          </div>
                        )}
                        {student.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone size={12} />
                            {student.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(student.status)}
                    </td>
                    <td className="px-6 py-4">
                      {student.gdriveFolderId ? (
                        <a 
                          href={`https://drive.google.com/drive/folders/${student.gdriveFolderId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium"
                        >
                          フォルダ <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">なし</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEditClick(student)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => student.id && handleDelete(student.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    生徒が見つかりませんでした
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentList;
