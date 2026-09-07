// 對應 workplan_v2.md §7.1 照片壓縮規格
// createImageBitmap 會自動依 EXIF Orientation 校正方向，避免直拍照片顯示歪斜
export async function compressImage(
  file: File | Blob,
  { maxDimension = 1920, quality = 0.82 } = {},
): Promise<Blob> {
  const imageBitmap = await createImageBitmap(file);
  let { width, height } = imageBitmap;

  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(imageBitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('圖片壓縮失敗'))),
      'image/jpeg',
      quality,
    );
  });
}
