/**
 * Google Drive API 連携サービス
 * 注意: クライアントサイドでの実装のため、アクセストークンは
 * Google Identity Services (GIS) を通じて取得することを想定しています。
 */

const GDRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const GDRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export class GDriveService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 指定した名前のフォルダを作成する
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    const rootFolderId = parentId || import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
    
    const response = await fetch(`${GDRIVE_API_URL}/files`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: rootFolderId ? [rootFolderId] : [],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Folder creation failed");
    return data.id;
  }

  /**
   * ファイルをアップロードする
   */
  async uploadFile(file: File, folderId: string): Promise<string> {
    // 1. メタデータの作成
    const metadata = {
      name: file.name,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    const response = await fetch(`${GDRIVE_UPLOAD_URL}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "File upload failed");
    return data.id;
  }

  /**
   * フォルダ内のファイル一覧を取得
   */
  async listFiles(folderId: string) {
    const response = await fetch(
      `${GDRIVE_API_URL}/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,thumbnailLink,webViewLink)`,
      {
        headers: this.headers,
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "File listing failed");
    return data.files;
  }

  /**
   * ファイルを誰でも閲覧可能にする（img src で表示するために必要）
   */
  async makePublic(fileId: string): Promise<void> {
    await fetch(`${GDRIVE_API_URL}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ type: 'anyone', role: 'reader' }),
    });
  }

  /**
   * ファイルの表示URL を返す (makePublic後に使用)
   */
  getViewUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  getThumbnailUrl(fileId: string, size = 200): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }

  /**
   * ファイルを削除する
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${GDRIVE_API_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return; // すでに削除されている
      const data = await response.json();
      throw new Error(data.error?.message || "File deletion failed");
    }
  }
}
