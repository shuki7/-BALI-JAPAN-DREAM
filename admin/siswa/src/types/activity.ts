export type ActivityType = 
  | 'student_added' 
  | 'student_updated' 
  | 'student_deleted' 
  | 'file_uploaded' 
  | 'file_deleted';

export interface Activity {
  id?: string;
  type: ActivityType;
  studentName: string;
  studentId?: string;
  fileName?: string;
  performedBy: string; // User email or name
  timestamp: number;
}
