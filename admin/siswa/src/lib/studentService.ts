import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import type { Student } from '../types/student';
import { GDriveService } from './gdrive';
import { activityService } from './activityService';

const COLLECTION_NAME = 'students';

export const studentService = {
  /**
   * 全生徒を取得
   */
  async getStudents(): Promise<Student[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];
  },

  /**
   * 生徒を追加（Google Driveフォルダ作成を含む）
   */
  async addStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>, googleAccessToken: string): Promise<string> {
    const gdrive = new GDriveService(googleAccessToken);
    
    // 1. Google Driveフォルダの作成
    let gdriveFolderId = '';
    try {
      // 親フォルダIDは環境変数から取得
      const parentId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
      gdriveFolderId = await gdrive.createFolder(studentData.name, parentId);
    } catch (error) {
      console.error("GDrive folder creation failed:", error);
      // フォルダ作成に失敗しても継続するか、エラーを投げるかは要件次第
      // ここでは失敗として扱う
      throw new Error("生徒用フォルダの作成に失敗したため、登録を中断しました。");
    }

    // 2. Firestoreに保存
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...studentData,
      gdriveFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. アクティビティログを記録
    await activityService.logActivity({
      type: 'student_added',
      studentName: studentData.name,
      studentId: docRef.id
    });

    return docRef.id;
  },

  /**
   * 生徒情報を更新
   */
  async updateStudent(id: string, data: Partial<Student>): Promise<void> {
    const studentRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(studentRef, {
      ...data,
      updatedAt: Date.now(),
    });

    // アクティビティログを記録（名前が不明な場合はIDで代用）
    await activityService.logActivity({
      type: 'student_updated',
      studentName: data.name || `生徒ID: ${id.slice(-6)}`,
      studentId: id
    });
  },

  /**
   * 生徒を削除
   */
  async deleteStudent(id: string): Promise<void> {
    const studentRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(studentRef);

    // アクティビティログを記録（削除時は名前が取れないので簡易的に）
    await activityService.logActivity({
      type: 'student_deleted',
      studentName: `生徒ID: ${id.slice(-6)}`,
      studentId: id
    });
  }
};
