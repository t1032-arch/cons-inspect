import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { INSPECTION_ITEM_DEFINITIONS } from '@/constants/inspectionItems';
import { InspectionItemCard } from '@/components/InspectionItemCard';
import { SignaturePad, type SignaturePadHandle } from '@/components/SignaturePad';
import { compressImage } from '@/lib/imageCompression';
import { getClipboardImageFiles, isEditableTarget } from '@/lib/clipboardImages';
import {
  queuePhoto,
  getPendingPhotos,
  saveDraftInspection,
  getDraftInspection,
  deleteDraftInspection,
} from '@/lib/offlineQueue';
import { requestDriveAccess, isDriveEnabled } from '@/lib/googleDrive';
import { submitInspection, type BasicInfo } from '@/lib/submitInspection';
import type { InspProject, InspectionResult } from '@/types';

type Step = 'basic' | 'items' | 'note' | 'photos' | 'signature' | 'review';
const STEPS: Step[] = ['basic', 'items', 'note', 'photos', 'signature', 'review'];

interface PendingPhoto {
  localId: string;
  previewUrl: string;
  filename: string;
  caption: string;
}

export function InspectionFormPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<InspProject | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(() => {
    const now = new Date();
    // 用本地日期，toISOString() 是 UTC，台灣 00:00–07:59 會變成前一天
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      inspection_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      inspection_time: now.toTimeString().slice(0, 5),
      location: '',
      // 先用帳號帶預設值，稍後在還原草稿的 effect 裡試著換成標案管理平台的職稱（user_roles.display_name）
      inspector: user?.email?.split('@')[0] ?? '',
    };
  });
  // 記錄使用者是否手動改過日期／時間：開表單就會自動存草稿，沒改過的預設值也會被存起來，
  // 隔天還原草稿時若照抄就會停在舊日期，因此沒改過的一律改用現在時間
  const [dateTimeTouched, setDateTimeTouched] = useState({ date: false, time: false });
  const [items, setItems] = useState<Record<number, InspectionResult>>({});
  // 預設「無異常」，多數情況不用再手動打字；有問題時使用者自行改掉
  const [note, setNote] = useState('無異常');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [addingPhotos, setAddingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // 處理中鎖定：檔名編號依 photos.length 計算，連續快速貼上／選檔會拿到同一個編號
  const addingPhotosRef = useRef(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [driveReady, setDriveReady] = useState(isDriveEnabled());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signatureHandle = useRef<SignaturePadHandle | null>(null);
  const inspectionLocalId = useMemo(() => `draft-${projectId}`, [projectId]);
  // 草稿是否已嘗試還原過（不論有沒有還原到東西），還原完成前不能讓下面的自動存檔
  // effect 把預設空白狀態寫回去蓋掉尚未載入的草稿
  const draftRestoredRef = useRef(false);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('insp_projects')
      .select('*')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        setProject(data);
        // 帶入案件地點作為預設值，使用者仍可自行修改；若已輸入過則不覆蓋
        if (data?.location) {
          setBasicInfo((prev) => (prev.location ? prev : { ...prev, location: data.location }));
        }
      });
  }, [projectId]);

  // 對應 workplan_v2.md §7.3：巡檢表單資料先寫入本機暫存，避免填到一半斷線／
  // 重新整理遺失。頁面載入時嘗試還原草稿，之後每次變更都存回 IndexedDB。
  useEffect(() => {
    draftRestoredRef.current = false;
    getDraftInspection(inspectionLocalId).then(async (draft) => {
      const formData = draft?.formData as
        | {
            basicInfo?: BasicInfo;
            dateTimeTouched?: { date: boolean; time: boolean };
            items?: Record<number, InspectionResult>;
            note?: string;
          }
        | undefined;
      if (formData?.basicInfo) {
        const draftInfo = formData.basicInfo;
        // 舊版草稿沒有這個欄位，視為沒改過
        const touched = formData.dateTimeTouched ?? { date: false, time: false };
        setBasicInfo((prev) => ({
          ...draftInfo,
          inspection_date: touched.date ? draftInfo.inspection_date : prev.inspection_date,
          inspection_time: touched.time ? draftInfo.inspection_time : prev.inspection_time,
        }));
        setDateTimeTouched(touched);
      }
      if (formData?.items) setItems(formData.items);
      if (typeof formData?.note === 'string') setNote(formData.note);
      draftRestoredRef.current = true;

      // 照片也還原：本機佇列裡的照片送出時都會一起上傳，畫面要顯示出來，
      // 張數與檔名編號才會跟實際送出的一致（否則重新整理後看起來 2 張、實際送出 5 張）
      const queued = (await getPendingPhotos(inspectionLocalId))
        .filter((photo) => photo.status !== 'uploaded')
        .sort((a, b) => a.createdAt - b.createdAt);
      setPhotos(
        queued.map((photo) => ({
          localId: photo.localId,
          previewUrl: URL.createObjectURL(photo.blob),
          filename: photo.filename,
          caption: photo.caption ?? '',
        })),
      );

      // 草稿沒有已填的巡檢人員時，改用標案管理平台 user_roles 的職稱（如「總務主任」）
      // 取代帳號名稱；user_roles 屬於另一個系統，讀不到就維持帳號名稱
      if (!formData?.basicInfo?.inspector && user?.id) {
        const naiveDefault = user.email?.split('@')[0] ?? '';
        try {
          const { data } = await supabase
            .from('user_roles')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle();
          // 只在使用者還沒自己改過（仍是帳號名稱的預設值）時才覆蓋，避免蓋掉手動輸入
          if (data?.display_name) {
            setBasicInfo((prev) =>
              prev.inspector === naiveDefault ? { ...prev, inspector: data.display_name } : prev,
            );
          }
        } catch {
          // 忽略，維持帳號名稱
        }
      }
    });
  }, [inspectionLocalId, user?.id]);

  useEffect(() => {
    if (!draftRestoredRef.current) return;
    saveDraftInspection({
      localId: inspectionLocalId,
      projectId: projectId ?? '',
      formData: { basicInfo, dateTimeTouched, items, note },
      updatedAt: Date.now(),
    });
  }, [inspectionLocalId, projectId, basicInfo, dateTimeTouched, items, note]);

  const step = STEPS[stepIndex];

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const allItemsAnswered = INSPECTION_ITEM_DEFINITIONS.every((def) => items[def.item_no]);
  const basicInfoValid =
    basicInfo.inspection_date && basicInfo.location && basicInfo.inspector;
  // driveReady 只在授權/被擋時更新，另外即時檢查是否過期或重新整理後已失效
  const driveActive = driveReady && isDriveEnabled();
  // 有照片或簽名卻沒有有效授權時，送出會讓照片標為失敗、簽名被略過，因此擋下送出
  const driveMissingForSubmit = (photos.length > 0 || !signatureEmpty) && !driveActive;

  async function handlePhotoSelect(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0 || addingPhotosRef.current) return;
    addingPhotosRef.current = true;
    setAddingPhotos(true);
    setPhotoError(null);
    const newPhotos: PendingPhoto[] = [];
    try {
      for (const file of Array.from(fileList)) {
        const compressed = await compressImage(file);
        const filename = `photo_${String(photos.length + newPhotos.length + 1).padStart(2, '0')}.jpg`;
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
        newPhotos.push({
          localId,
          previewUrl: URL.createObjectURL(compressed),
          filename,
          caption: '',
        });
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '照片處理失敗，請換一張圖片再試');
    } finally {
      // 已成功落地佇列的照片照樣顯示，與送出時實際上傳的張數一致
      setPhotos((prev) => [...prev, ...newPhotos]);
      addingPhotosRef.current = false;
      setAddingPhotos(false);
    }
  }

  // 選檔／貼上前先確認已啟用照片功能（Drive 授權，含過期），未啟用就不收，提示使用者先點「啟用照片功能」；
  // 不在此時自動跳 OAuth，維持「使用者主動點擊才授權」的原則
  function ensureDriveForPhotos(): boolean {
    if (isDriveEnabled()) return true;
    setDriveReady(false);
    setPhotoError('尚未啟用照片功能（或授權已過期），請先點上方「啟用照片功能」再加入照片');
    return false;
  }

  function handlePastedFiles(files: File[]) {
    if (!ensureDriveForPhotos()) return;
    handlePhotoSelect(files);
  }

  // 貼上事件的 listener 只註冊一次，透過 ref 呼叫最新的處理函式，避免拿到舊的 photos
  const handlePastedFilesRef = useRef(handlePastedFiles);
  handlePastedFilesRef.current = handlePastedFiles;

  // 只在照片步驟接受 Ctrl+V 貼上圖片；游標在文字欄位時不攔截
  useEffect(() => {
    if (step !== 'photos') return;
    function onPaste(event: ClipboardEvent) {
      if (isEditableTarget(event.target)) return;
      const files = getClipboardImageFiles(event);
      if (files.length === 0) return;
      event.preventDefault();
      handlePastedFilesRef.current(files);
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [step]);

  async function handleEnableDrive() {
    if (!user?.email) return;
    try {
      await requestDriveAccess(user.email);
      setDriveReady(true);
      setPhotoError(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Drive 授權失敗');
    }
  }

  async function handleSubmit() {
    if (!project || !user) return;
    // 停在檢查頁期間授權可能剛好過期，送出當下再確認一次
    if ((photos.length > 0 || !signatureEmpty) && !isDriveEnabled()) {
      setDriveReady(false);
      setError('照片功能授權已失效，請先點「啟用照片功能」再送出');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const signatureBlob = signatureHandle.current
        ? await signatureHandle.current.toPngBlob()
        : null;

      const inspectionId = await submitInspection({
        projectId: project.id,
        projectName: project.project_name,
        basicInfo,
        note,
        items,
        inspectionLocalId,
        signatureBlob,
        userId: user.id,
      });

      await deleteDraftInspection(inspectionLocalId);
      navigate(`/inspections/${inspectionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  if (!project) return <div className="p-4 text-center text-slate-500">載入案件資料中…</div>;

  return (
    <div className="mx-auto max-w-xl p-4 pb-24">
      <p className="mb-4 text-sm text-slate-500 md:text-base">
        {project.project_name} ・ 步驟 {stepIndex + 1} / {STEPS.length}
      </p>

      {step === 'basic' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold md:text-2xl">基本資料</h1>
          <label className="block">
            <span className="text-sm text-slate-600 md:text-base">巡檢日期</span>
            <input
              type="date"
              value={basicInfo.inspection_date}
              onChange={(e) => {
                setBasicInfo({ ...basicInfo, inspection_date: e.target.value });
                setDateTimeTouched((prev) => ({ ...prev, date: true }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 py-2 pl-3 pr-4"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600 md:text-base">巡檢時間</span>
            <input
              type="time"
              value={basicInfo.inspection_time}
              onChange={(e) => {
                setBasicInfo({ ...basicInfo, inspection_time: e.target.value });
                setDateTimeTouched((prev) => ({ ...prev, time: true }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 py-2 pl-3 pr-4"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600 md:text-base">巡檢地點</span>
            <input
              type="text"
              value={basicInfo.location}
              onChange={(e) => setBasicInfo({ ...basicInfo, location: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600 md:text-base">巡檢人員</span>
            <input
              type="text"
              value={basicInfo.inspector}
              onChange={(e) => setBasicInfo({ ...basicInfo, inspector: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      )}

      {step === 'items' && (
        <div className="space-y-6">
          <h1 className="text-xl font-bold md:text-2xl">
            巡檢項目（{INSPECTION_ITEM_DEFINITIONS.length} 項）
          </h1>
          {INSPECTION_ITEM_DEFINITIONS.map((def) => (
            <InspectionItemCard
              key={def.item_no}
              definition={def}
              value={items[def.item_no] ?? null}
              onChange={(value) => setItems((prev) => ({ ...prev, [def.item_no]: value }))}
            />
          ))}
        </div>
      )}

      {step === 'note' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold md:text-2xl">備註</h1>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            placeholder="缺失位置、異常情況、改善要求、廠商回應等"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
      )}

      {step === 'photos' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold md:text-2xl">現場照片</h1>
          {!driveActive && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 md:text-base">
              尚未啟用照片上傳功能。
              <button
                type="button"
                onClick={handleEnableDrive}
                className="ml-2 underline"
              >
                啟用照片功能
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={addingPhotos}
            onChange={(e) => {
              // 清空 value，被擋下後使用者授權完再選同一批檔案時 onChange 才會再次觸發
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0 && ensureDriveForPhotos()) handlePhotoSelect(files);
              e.target.value = '';
            }}
            className="block w-full text-sm md:text-base"
          />
          <p className="text-xs text-slate-500 md:text-sm">
            電腦版也可以直接按 Ctrl+V 貼上複製的圖片或截圖
          </p>
          {addingPhotos && <p className="text-xs text-slate-500 md:text-sm">處理中…</p>}
          {photoError && <p className="text-xs text-result-poor md:text-sm">{photoError}</p>}
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <img
                key={photo.localId}
                src={photo.previewUrl}
                alt={photo.filename}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {step === 'signature' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold md:text-2xl">巡檢人員簽名</h1>
          <SignaturePad handleRef={signatureHandle} onChange={setSignatureEmpty} />
          <button
            type="button"
            onClick={() => signatureHandle.current?.clear()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm md:text-base"
          >
            清除重簽
          </button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold md:text-2xl">送出前檢查</h1>
          <ul className="space-y-1 text-sm md:text-base">
            <li>基本資料：{basicInfoValid ? '完成' : '尚未完成'}</li>
            <li>
              10 項巡檢：{Object.keys(items).length} / {INSPECTION_ITEM_DEFINITIONS.length}
              {!allItemsAnswered && '（尚有未選擇項目）'}
            </li>
            <li>照片：{photos.length} 張</li>
            <li>簽名：{signatureEmpty ? '尚未簽名' : '已簽名'}</li>
          </ul>
          {driveMissingForSubmit && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 md:text-base">
              照片功能尚未啟用或授權已過期，照片與簽名將無法存檔，請先啟用再送出。
              <button
                type="button"
                onClick={handleEnableDrive}
                className="ml-2 underline"
              >
                啟用照片功能
              </button>
            </div>
          )}
          {error && <p className="text-result-poor">{error}</p>}
          <button
            type="button"
            disabled={!basicInfoValid || !allItemsAnswered || submitting || driveMissingForSubmit}
            onClick={handleSubmit}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-lg font-medium text-white disabled:opacity-40"
          >
            {submitting ? '送出中…' : '送出巡檢紀錄'}
          </button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 flex justify-between border-t border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
        >
          上一步
        </button>
        {step !== 'review' && (
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            下一步
          </button>
        )}
      </div>
    </div>
  );
}
