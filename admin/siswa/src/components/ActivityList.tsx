import { useState, useEffect } from 'react';
import { activityService } from '../lib/activityService';
import type { Activity } from '../types/activity';
import { 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  FileUp, 
  FileMinus,
  Clock,
  Loader2
} from 'lucide-react';

const ActivityList = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await activityService.getRecentActivities(8);
      setActivities(data);
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'student_added': return <UserPlus size={14} className="text-green-500" />;
      case 'student_updated': return <UserCheck size={14} className="text-blue-500" />;
      case 'student_deleted': return <UserMinus size={14} className="text-red-500" />;
      case 'file_uploaded': return <FileUp size={14} className="text-orange-500" />;
      case 'file_deleted': return <FileMinus size={14} className="text-gray-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    return `${days}日前`;
  };

  const getMessage = (activity: Activity) => {
    switch (activity.type) {
      case 'student_added': return <span>生徒 <b>{activity.studentName}</b> を登録しました</span>;
      case 'student_updated': return <span>生徒 <b>{activity.studentName}</b> の情報を更新しました</span>;
      case 'student_deleted': return <span>生徒 <b>{activity.studentName}</b> を削除しました</span>;
      case 'file_uploaded': return <span><b>{activity.studentName}</b> に書類 「{activity.fileName}」 を追加しました</span>;
      case 'file_deleted': return <span><b>{activity.studentName}</b> の書類 「{activity.fileName}」 を削除しました</span>;
      default: return <span>不明な操作が発生しました</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-gray-200" size={24} />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-300">
        <Clock size={32} className="opacity-20 mb-2" />
        <p className="text-xs font-medium">アクティビティがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-4 items-start group animation-in fade-in slide-in-from-left-2 duration-300">
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-white transition-colors">
            {getIcon(activity.type)}
          </div>
          <div className="flex-grow pt-1.5">
            <p className="text-xs text-gray-600 leading-relaxed">
              {getMessage(activity)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-300 font-medium">{formatTime(activity.timestamp)}</span>
              <span className="text-[8px] text-gray-200">•</span>
              <span className="text-[10px] text-gray-300 font-medium italic">{activity.performedBy}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityList;
