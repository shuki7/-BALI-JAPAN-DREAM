import imageCompression from 'browser-image-compression';

/**
 * 画像をWebP形式に圧縮・変換するユーティリティ
 */
export const convertToWebP = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1, // 最大1MB
    maxWidthOrHeight: 1920, // 最大解像度
    useWebWorker: true,
    fileType: 'image/webp' as string, // WebP形式を指定
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // 拡張子を .webp に変更した新しいファイルを作成
    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([compressedFile], newFileName, { type: 'image/webp' });
  } catch (error) {
    console.error("WebP conversion failed:", error);
    throw error;
  }
};

/**
 * ファイルのバリデーション (画像のみ)
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};
