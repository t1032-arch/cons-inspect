import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// 對應 workplan_v2.md §7.3 離線佇列：
// - 巡檢表單資料先寫入 IndexedDB，避免填到一半斷線遺失
// - 照片壓縮後的 Blob 先存本機，背景佇列逐張上傳，失敗自動重試

export interface DraftInspection {
  localId: string;
  projectId: string;
  formData: Record<string, unknown>;
  updatedAt: number;
}

export interface QueuedPhoto {
  localId: string;
  inspectionLocalId: string;
  blob: Blob;
  filename: string;
  caption: string | null;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  retries: number;
  createdAt: number;
}

interface OfflineDB extends DBSchema {
  draft_inspections: {
    key: string;
    value: DraftInspection;
  };
  queued_photos: {
    key: string;
    value: QueuedPhoto;
    indexes: { by_inspection: string };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>('cons-inspect-offline', 1, {
      upgrade(db) {
        db.createObjectStore('draft_inspections', { keyPath: 'localId' });
        const photoStore = db.createObjectStore('queued_photos', { keyPath: 'localId' });
        photoStore.createIndex('by_inspection', 'inspectionLocalId');
      },
    });
  }
  return dbPromise;
}

export async function saveDraftInspection(draft: DraftInspection) {
  const db = await getDB();
  await db.put('draft_inspections', draft);
}

export async function getDraftInspection(localId: string) {
  const db = await getDB();
  return db.get('draft_inspections', localId);
}

export async function deleteDraftInspection(localId: string) {
  const db = await getDB();
  await db.delete('draft_inspections', localId);
}

export async function queuePhoto(photo: QueuedPhoto) {
  const db = await getDB();
  await db.put('queued_photos', photo);
}

export async function getPendingPhotos(inspectionLocalId: string) {
  const db = await getDB();
  return db.getAllFromIndex('queued_photos', 'by_inspection', inspectionLocalId);
}

export async function updatePhotoStatus(
  localId: string,
  status: QueuedPhoto['status'],
  retries?: number,
) {
  const db = await getDB();
  const photo = await db.get('queued_photos', localId);
  if (!photo) return;
  photo.status = status;
  if (retries !== undefined) photo.retries = retries;
  await db.put('queued_photos', photo);
}

// 背景上傳佇列：逐張嘗試上傳，失敗自動重試，不需使用者手動重傳
export async function processPhotoQueue(
  inspectionLocalId: string,
  uploadFn: (photo: QueuedPhoto) => Promise<void>,
  { maxRetries = 5 } = {},
) {
  const photos = await getPendingPhotos(inspectionLocalId);
  for (const photo of photos) {
    if (photo.status === 'uploaded') continue;
    if (photo.retries >= maxRetries) continue;

    await updatePhotoStatus(photo.localId, 'uploading');
    try {
      await uploadFn(photo);
      await updatePhotoStatus(photo.localId, 'uploaded');
    } catch {
      await updatePhotoStatus(photo.localId, 'failed', photo.retries + 1);
    }
  }
}
