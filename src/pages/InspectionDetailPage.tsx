import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { INSPECTION_ITEM_DEFINITIONS, RESULT_LABELS } from '@/constants/inspectionItems';
import { saveInspectionEdits, type InspectionEditForm } from '@/lib/editInspection';
import { fetchDriveFileAsObjectUrl, isDriveEnabled, requestDriveAccess } from '@/lib/googleDrive';
import { generateInspectionPdf } from '@/lib/reports/generateInspectionPdf';
import { addPhotosToInspection } from '@/lib/submitInspection';
import type {
  InspInspection,
  InspInspectionEditLog,
  InspInspectionItem,
  InspInspectionPhoto,
  InspProject,
  InspUserRole,
} from '@/types';

interface DetailData {
  inspection: InspInspection;
  project: InspProject;
  items: InspInspectionItem[];
  photos: InspInspectionPhoto[];
}

function toEditForm(data: DetailData): InspectionEditForm {
  const items: InspectionEditForm['items'] = {};
  for (const item of data.items) items[item.item_no] = item.result;
  return {
    inspection_date: data.inspection.inspection_date,
    inspection_time: data.inspection.inspection_time,
    location: data.inspection.location,
    inspector: data.inspection.inspector,
    note: data.inspection.note ?? '',
    items,
  };
}

// 對應 workplan_v2.md §13 單筆巡檢紀錄查看頁
export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editLogs, setEditLogs] = useState<InspInspectionEditLog[]>([]);
  const [editorEmails, setEditorEmails] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<InspectionEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [addPhotoError, setAddPhotoError] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [deletePhotoError, setDeletePhotoError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const { data: inspection } = await supabase
      .from('insp_inspections')
      .select('*, insp_projects(*), insp_inspection_items(*), insp_inspection_photos(*)')
      .eq('id', id)
      .single();

    if (inspection) {
      setData({
        inspection,
        project: inspection.insp_projects,
        items: inspection.insp_inspection_items,
        photos: inspection.insp_inspection_photos,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // 只有 admin 能讀 insp_inspection_edit_log（RLS），一般使用者不需嘗試查詢
    if (role !== 'admin' || !id) return;
    async function loadLogs() {
      const { data: logs } = await supabase
        .from('insp_inspection_edit_log')
        .select('*')
        .eq('inspection_id', id)
        .order('edited_at', { ascending: false });
      setEditLogs(logs ?? []);

      const { data: roles } = await supabase
        .from('insp_user_roles')
        .select('user_id, user_email');
      const map: Record<string, string> = {};
      for (const r of (roles ?? []) as Pick<InspUserRole, 'user_id' | 'user_email'>[]) {
        map[r.user_id] = r.user_email;
      }
      setEditorEmails(map);
    }
    loadLogs();
  }, [role, id]);

  useEffect(() => {
    // 卸載時釋放 blob URL，避免記憶體累積
    return () => {
      Object.values(thumbnails).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-4 text-center text-slate-500">載入中…</div>;
  if (!data) return <div className="p-4 text-center text-slate-500">找不到紀錄</div>;

  const resultByItemNo = new Map(data.items.map((item) => [item.item_no, item.result]));
  const poorItems = INSPECTION_ITEM_DEFINITIONS.filter(
    (def) => resultByItemNo.get(def.item_no) === 'poor',
  );

  function startEditing() {
    if (!data) return;
    setEditForm(toEditForm(data));
    setIsEditing(true);
    setSaveError(null);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditForm(null);
    setSaveError(null);
  }

  async function handleShowThumbnails() {
    if (!data || !user?.email) return;
    setThumbnailError(null);
    setLoadingThumbnails(true);
    try {
      if (!isDriveEnabled()) {
        await requestDriveAccess(user.email);
      }
      const uploadedPhotos = data.photos.filter(
        (photo) => photo.upload_status === 'uploaded' && photo.drive_file_id,
      );
      const entries = await Promise.all(
        uploadedPhotos.map(async (photo) => {
          const url = await fetchDriveFileAsObjectUrl(photo.drive_file_id!);
          return [photo.id, url] as const;
        }),
      );
      setThumbnails(Object.fromEntries(entries));
    } catch (err) {
      setThumbnailError(err instanceof Error ? err.message : '照片預覽載入失敗');
    } finally {
      setLoadingThumbnails(false);
    }
  }

  async function handleGenerateReport() {
    if (!data || !user?.email) return;
    setReportError(null);
    setGeneratingReport(true);
    try {
      await generateInspectionPdf(data, user.email);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : '報表產生失敗');
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleAddPhotos(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !data || !user?.email) return;
    setAddPhotoError(null);
    setUploadingPhotos(true);
    try {
      if (!isDriveEnabled()) {
        await requestDriveAccess(user.email);
      }
      await addPhotosToInspection({
        inspectionId: data.inspection.id,
        projectName: data.project.project_name,
        inspectionDate: data.inspection.inspection_date,
        files: Array.from(fileList),
      });
      await load();
    } catch (err) {
      setAddPhotoError(err instanceof Error ? err.message : '照片上傳失敗，請稍後再試');
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    setDeletePhotoError(null);
    setDeletingPhotoId(photoId);
    try {
      const { error } = await supabase.from('insp_inspection_photos').delete().eq('id', photoId);
      if (error) throw error;
      setThumbnails((prev) => {
        const { [photoId]: removed, ...rest } = prev;
        if (removed) URL.revokeObjectURL(removed);
        return rest;
      });
      await load();
    } catch (err) {
      setDeletePhotoError(err instanceof Error ? err.message : '刪除失敗，請稍後再試');
    } finally {
      setDeletingPhotoId(null);
    }
  }

  async function handleSave() {
    if (!data || !editForm || !user) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveInspectionEdits(data.inspection, data.items, editForm, user.id);
      setIsEditing(false);
      setEditForm(null);
      await load();
      if (role === 'admin') {
        const { data: logs } = await supabase
          .from('insp_inspection_edit_log')
          .select('*')
          .eq('inspection_id', id)
          .order('edited_at', { ascending: false });
        setEditLogs(logs ?? []);
      }
    } catch (err) {
      // 部分欄位／項目可能已寫入成功（見 editInspection.ts 的逐項寫入設計），
      // 重新載入讓 data 反映實際已生效的異動，避免下次重試時用舊資料重複比對、重複寫入 log
      setSaveError(err instanceof Error ? err.message : '儲存失敗，請稍後再試');
      await load();
      if (role === 'admin') {
        const { data: logs } = await supabase
          .from('insp_inspection_edit_log')
          .select('*')
          .eq('inspection_id', id)
          .order('edited_at', { ascending: false });
        setEditLogs(logs ?? []);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{data.project.project_name}</h1>
          {isEditing && editForm ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={editForm.inspection_date}
                onChange={(e) => setEditForm({ ...editForm, inspection_date: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                type="time"
                value={editForm.inspection_time}
                onChange={(e) => setEditForm({ ...editForm, inspection_time: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="地點"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="巡檢人員"
                value={editForm.inspector}
                onChange={(e) => setEditForm({ ...editForm, inspector: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {data.inspection.inspection_date} {data.inspection.inspection_time} ・{' '}
              {data.inspection.location} ・ {data.inspection.inspector}
            </p>
          )}
        </div>

        {!isEditing && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {generatingReport ? '產生中…' : '產生報表 PDF'}
            </button>
            {role === 'admin' && (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                編輯
              </button>
            )}
          </div>
        )}
      </div>
      {reportError && <p className="text-sm text-result-poor">報表產生失敗：{reportError}</p>}

      <div>
        <h2 className="mb-2 font-semibold">巡檢結果</h2>
        <ul className="space-y-1 text-sm">
          {INSPECTION_ITEM_DEFINITIONS.map((def) => (
            <li key={def.item_no} className="flex items-center justify-between border-b border-slate-100 py-1">
              <span>
                {def.item_no}. {def.title}
              </span>
              {isEditing && editForm ? (
                <select
                  value={editForm.items[def.item_no] ?? ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      items: {
                        ...editForm.items,
                        [def.item_no]: (e.target.value || null) as InspectionEditForm['items'][number],
                      },
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="">未填寫</option>
                  {Object.entries(RESULT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={
                    resultByItemNo.get(def.item_no) === 'poor' ? 'font-medium text-result-poor' : ''
                  }
                >
                  {RESULT_LABELS[resultByItemNo.get(def.item_no) ?? ''] ?? '未填寫'}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!isEditing && poorItems.length > 0 && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-result-poor">
          <p className="font-medium">不良項目：</p>
          <ul className="list-inside list-disc">
            {poorItems.map((def) => (
              <li key={def.item_no}>
                {def.item_no}. {def.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">備註</h2>
        {isEditing && editForm ? (
          <textarea
            value={editForm.note}
            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
            rows={3}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        ) : (
          data.inspection.note && (
            <p className="whitespace-pre-wrap text-sm">{data.inspection.note}</p>
          )
        )}
      </div>

      {isEditing && (
        <div className="space-y-2">
          {saveError && (
            <p className="text-sm text-result-poor">
              儲存失敗：{saveError}（已成功的部分已儲存並留下修改紀錄，可重試尚未成功的部分）
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? '儲存中…' : '儲存修改'}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">現場照片（{data.photos.length} 張）</h2>
          {Object.keys(thumbnails).length === 0 && (
            <button
              type="button"
              onClick={handleShowThumbnails}
              disabled={loadingThumbnails}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50"
            >
              {loadingThumbnails ? '載入中…' : '顯示照片預覽'}
            </button>
          )}
        </div>
        {thumbnailError && <p className="mb-2 text-xs text-result-poor">{thumbnailError}</p>}
        <div className="mb-3">
          <label className="block text-xs text-slate-500">
            補上傳照片
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploadingPhotos}
              onChange={(e) => {
                handleAddPhotos(e.target.files);
                e.target.value = '';
              }}
              className="mt-1 block w-full text-sm"
            />
          </label>
          {uploadingPhotos && <p className="mt-1 text-xs text-slate-500">上傳中…</p>}
          {addPhotoError && <p className="mt-1 text-xs text-result-poor">{addPhotoError}</p>}
        </div>
        {deletePhotoError && (
          <p className="mb-2 text-xs text-result-poor">刪除失敗：{deletePhotoError}</p>
        )}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.photos.map((photo) => {
            const canDelete = role === 'admin' || (!!user && user.id === data.inspection.created_by);
            return (
              <li key={photo.id} className="space-y-1 text-sm text-slate-500">
                {thumbnails[photo.id] ? (
                  <img
                    src={thumbnails[photo.id]}
                    alt={photo.filename}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                    尚未載入
                  </div>
                )}
                <p className="truncate text-xs">
                  {photo.filename} —{' '}
                  {photo.upload_status === 'uploaded'
                    ? '已上傳'
                    : photo.upload_status === 'failed'
                      ? '上傳失敗'
                      : '上傳中'}
                </p>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={deletingPhotoId === photo.id}
                    className="text-xs text-result-poor underline disabled:opacity-50"
                  >
                    {deletingPhotoId === photo.id ? '刪除中…' : '刪除'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-slate-400">
        建立時間：{data.inspection.created_at} ・ 最後修改：{data.inspection.updated_at}
      </p>

      {role === 'admin' && editLogs.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">修改紀錄</h2>
          <ul className="space-y-2 text-xs text-slate-500">
            {editLogs.map((log) => (
              <li key={log.id} className="rounded border border-slate-100 p-2">
                <p>
                  <span className="font-medium text-slate-700">{log.field_changed}</span>：
                  {log.old_value ?? '（空白）'} → {log.new_value ?? '（空白）'}
                </p>
                <p className="mt-1">
                  {editorEmails[log.edited_by] ?? log.edited_by} ・ {log.edited_at}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
