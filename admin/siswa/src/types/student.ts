export interface Student {
  id?: string;
  name: string; // 名前
  nameKana?: string; // カタカナ
  email?: string;
  phone?: string;
  birthDate?: string; // 生年月日
  passportNumber?: string; // パスポート番号
  status: 'active' | 'graduated' | 'withdrawn'; // 状態
  gdriveFolderId?: string; // Google Driveの個人フォルダID
  createdAt: number;
  updatedAt: number;
}

export interface StudentStats {
  total: number;
  active: number;
  graduated: number;
  withdrawn: number;
}
