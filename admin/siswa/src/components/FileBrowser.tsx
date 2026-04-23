import { useState, useEffect, useRef } from 'react';
import { GDriveService } from '../lib/gdrive';
import { activityService } from '../lib/activityService';
import { convertToWebP, isImageFile } from '../utils/imageConverter';
import { 
  File, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  ExternalLink, 
  Upload, 
  Loader2,
  AlertCircle
} from 'lucide-react';

interface FileBrowserProps {
  folderId: string;
  accessToken: string;
  studentName: string;
  studentId?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
}

const FileBrowser = ({ folderId, accessToken, studentName, studentId }: FileBrowserProps) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gdrive = new GDriveService(accessToken);

  useEffect(() => {
    loadFiles();
  }, [folderId, accessToken]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await gdrive.listFiles(folderId);
      setFiles(driveFiles);
    } catch (err: any) {
      setError(err.message || "ファイルの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        let file = selectedFiles[i];
        
        // 画像ならWebP変換
        if (isImageFile(file)) {
          file = await convertToWebP(file);
        }

        await gdrive.uploadFile(file, folderId);

        // アクティビティログを記録
        await activityService.logActivity({
          type: 'file_uploaded',
          studentName: studentName,
          studentId: studentId,
          fileName: file.name
        });
      }
      await loadFiles();
    } catch (err: any) {
      alert("アップロードに失敗しました: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!window.confirm(`「${fileName}」を削除してもよろしいですか？`)) return;

    try {
      await gdrive.deleteFile(fileId);
      setFiles(files.filter(f => f.id !== fileId));

      // アクティビティログを記録
      await activityService.logActivity({
        type: 'file_deleted',
        studentName: studentName,
        studentId: studentId,
        fileName: fileName
      });
    } catch (err: any) {
      alert("削除に失敗しました: " + err.message);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image/')) return <ImageIcon size={20} className="text-blue-500" />;
    return <FileText size={20} className="text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm text-gray-400 font-medium tracking-wider">ファイルを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">ドキュメント</h2>
          <p className="text-xs text-gray-500 mt-0.5">Google Drive フォルダ内のファイル</p>
        </div>
        
        <label className={`
          btn btn-primary flex items-center gap-2 px-4 py-2 cursor-pointer transition-all
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-lg shadow-primary/20'}
        `}>
          {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          {uploading ? 'アップロード中...' : 'ファイルを追加'}
          <input 
            type="file" 
            className="hidden" 
            multiple 
            ref={fileInputRef}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {error ? (
        <div className="p-8 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center text-center gap-3">
          <AlertCircle className="text-red-500" size={32} />
          <div>
            <p className="text-red-800 font-bold">アクセスエラー</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={loadFiles} className="text-xs font-bold text-red-500 underline decoration-2 underline-offset-4">再試行する</button>
        </div>
      ) : files.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center text-center bg-gray-50/30">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
            <File className="text-gray-200" size={32} />
          </div>
          <p className="text-gray-400 font-medium">この生徒のフォルダは空です</p>
          <p className="text-xs text-gray-300 mt-1">右上のボタンから書類をアップロードしてください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.id} className="group relative bg-white p-4 rounded-2xl border border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 group-hover:bg-primary/5 transition-colors">
                  {file.thumbnailLink ? (
                    <img src={file.thumbnailLink} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getFileIcon(file.mimeType)
                  )}
                </div>
                <div className="flex-grow min-w-0 pr-6">
                  <p className="text-sm font-bold text-gray-800 truncate leading-tight mb-0.5">{file.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">
                    {file.mimeType.split('/')[1] || 'FILE'}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                <a 
                  href={file.webViewLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-grow py-1.5 bg-gray-50 hover:bg-primary/10 text-gray-600 hover:text-primary rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={12} />
                  開く
                </a>
                <button 
                  onClick={() => handleDelete(file.id, file.name)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="削除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileBrowser;
