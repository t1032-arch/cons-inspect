import { supabase } from '@/lib/supabase';
import { ensureInspectionFolder, isDriveEnabled, uploadFileToDrive } from '@/lib/googleDrive';
import { getPendingPhotos, processPhotoQueue, queuePhoto, type QueuedPhoto } from '@/lib/offlineQueue';
import { compressImage } from '@/lib/imageCompression';
import type { InspectionResult } from '@/types';

export interface BasicInfo {
  inspection_date: string;
  inspection_time: string;
  location: string;
  inspector: string;
}

interface SubmitParams {
  projectId: string;
  projectName: string;
  basicInfo: BasicInfo;
  note: string;
  items: Record<number, InspectionResult>;
  inspectionLocalId: string; // 對應 offlineQueue 裡暫存的照片
  signatureBlob: Blob | null;
  userId: string; // 填報者本人，用來讓填報者事後能刪除自己上傳的照片
}

// 對應 workplan_v2.md §9 Step 8：紀錄可先建立，照片背景佇列補上傳，不因單張照片失敗而整筆失敗
export async function submitInspection({
  projectId,
  projectName,
  basicInfo,
  note,
  items,
  inspectionLocalId,
  signatureBlob,
  userId,
}: SubmitParams): Promise<string> {
  const { data: inspection, error: inspectionError } = await supabase
    .from('insp_inspections')
    .insert({ project_id: projectId, ...basicInfo, note, created_by: userId })
    .select('id')
    .single();

  if (inspectionError) throw inspectionError;
  const inspectionId: string = inspection.id;

  const itemRows = Object.entries(items).map(([itemNo, result]) => ({
    inspection_id: inspectionId,
    item_no: Number(itemNo),
    result,
  }));
  const { error: itemsError } = await supabase.from('insp_inspection_items').insert(itemRows);
  if (itemsError) throw itemsError;

  const folderName = `${basicInfo.inspection_date}_巡檢紀錄${inspectionId.slice(0, 8)}`;

  // 簽名上傳失敗（例如網路不穩）不應阻擋整筆送出：紀錄與10項結果已寫入，
  // 簽名留空即可，比照照片「不因單張上傳失敗而整筆失敗」的原則（§7.3）
  if (signatureBlob && isDriveEnabled()) {
    try {
      const folderId = await ensureInspectionFolder(projectName, folderName);
      const signatureFileId = await uploadFileToDrive(signatureBlob, 'signature.png', folderId);
      await supabase
        .from('insp_inspections')
        .update({ signature_file_id: signatureFileId })
        .eq('id', inspectionId);
    } catch {
      // 簽名上傳失敗，signature_file_id 維持 null，不中斷後續照片處理
    }
  }

  // 照片先在資料庫建立 pending 紀錄（一次性），UI 可依 upload_status 顯示「上傳中」；
  // 之後每次重試只更新既有列，不重複新增
  const pendingPhotos = await getPendingPhotos(inspectionLocalId);
  const photoRowIdByLocalId = new Map<string, string>();

  if (pendingPhotos.length > 0) {
    const { data: photoRows, error: photoInsertError } = await supabase
      .from('insp_inspection_photos')
      .insert(
        pendingPhotos.map((photo) => ({
          inspection_id: inspectionId,
          filename: photo.filename,
          caption: photo.caption,
          upload_status: 'pending' as const,
        })),
      )
      .select('id');
    if (photoInsertError) throw photoInsertError;

    photoRows.forEach((row, index) => {
      photoRowIdByLocalId.set(pendingPhotos[index].localId, row.id);
    });
  }

  await processPhotoQueue(inspectionLocalId, async (photo: QueuedPhoto) => {
    const photoRowId = photoRowIdByLocalId.get(photo.localId);
    if (!photoRowId) return; // 理論上不會發生，pendingPhotos 已預先建立對應列

    try {
      if (!isDriveEnabled()) {
        throw new Error('Drive 尚未授權，稍後由背景佇列重試');
      }

      const folderId = await ensureInspectionFolder(projectName, folderName);
      const driveFileId = await uploadFileToDrive(photo.blob, photo.filename, folderId);

      await supabase
        .from('insp_inspection_photos')
        .update({ drive_file_id: driveFileId, upload_status: 'uploaded' })
        .eq('id', photoRowId);
    } catch (err) {
      await supabase
        .from('insp_inspection_photos')
        .update({ upload_status: 'failed' })
        .eq('id', photoRowId);
      throw err;
    }
  });

  return inspectionId;
}

interface AddPhotosParams {
  inspectionId: string;
  projectName: string;
  inspectionDate: string;
  files: File[];
}

// 對應本次回報：已送出的紀錄當下沒能選到相簿照片，需要事後補傳
export async function addPhotosToInspection({
  inspectionId,
  projectName,
  inspectionDate,
  files,
}: AddPhotosParams): Promise<void> {
  const inspectionLocalId = `existing-${inspectionId}`;
  const folderName = `${inspectionDate}_巡檢紀錄${inspectionId.slice(0, 8)}`;

  const pendingPhotos: Array<{ localId: string; filename: string }> = [];
  for (const file of files) {
    const compressed = await compressImage(file);
    const filename = `photo_add_${Date.now()}_${pendingPhotos.length + 1}.jpg`;
    const localId = crypto.randomUUID();
    await queuePhoto({
      localId,
      inspectionLocalId,
      blob: compressed,
      filename,
      caption: null,
      status: 'pending',
      retries: 0,
      createdAt: Date.now(),
    });
    pendingPhotos.push({ localId, filename });
  }

  const { data: photoRows, error: photoInsertError } = await supabase
    .from('insp_inspection_photos')
    .insert(
      pendingPhotos.map((photo) => ({
        inspection_id: inspectionId,
        filename: photo.filename,
        caption: null,
        upload_status: 'pending' as const,
      })),
    )
    .select('id');
  if (photoInsertError) throw photoInsertError;

  const photoRowIdByLocalId = new Map<string, string>();
  photoRows.forEach((row, index) => {
    photoRowIdByLocalId.set(pendingPhotos[index].localId, row.id);
  });

  await processPhotoQueue(inspectionLocalId, async (photo: QueuedPhoto) => {
    const photoRowId = photoRowIdByLocalId.get(photo.localId);
    if (!photoRowId) return;

    try {
      if (!isDriveEnabled()) {
        throw new Error('Drive 尚未授權，稍後由背景佇列重試');
      }

      const folderId = await ensureInspectionFolder(projectName, folderName);
      const driveFileId = await uploadFileToDrive(photo.blob, photo.filename, folderId);

      await supabase
        .from('insp_inspection_photos')
        .update({ drive_file_id: driveFileId, upload_status: 'uploaded' })
        .eq('id', photoRowId);
    } catch (err) {
      await supabase
        .from('insp_inspection_photos')
        .update({ upload_status: 'failed' })
        .eq('id', photoRowId);
      throw err;
    }
  });
}
