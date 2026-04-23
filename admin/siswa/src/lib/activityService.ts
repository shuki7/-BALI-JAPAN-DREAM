import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { Activity, ActivityType } from '../types/activity';

const COLLECTION_NAME = 'activities';

export const activityService = {
  /**
   * アクティビティを記録
   */
  async logActivity(params: {
    type: ActivityType;
    studentName: string;
    studentId?: string;
    fileName?: string;
  }): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...params,
        performedBy: user.email || 'Unknown User',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  },

  /**
   * 最近のアクティビティを取得
   */
  async getRecentActivities(limitCount = 10): Promise<Activity[]> {
    const q = query(
      collection(db, COLLECTION_NAME), 
      orderBy('timestamp', 'desc'), 
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[];
  },

  /**
   * 特定期間のアクティビティを取得（統計用）
   */
  async getActivitiesInDateRange(startDate: number, endDate: number): Promise<Activity[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[];
  }
};
