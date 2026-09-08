import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { INSPECTION_ITEM_DEFINITIONS } from '@/constants/inspectionItems';
import { InspectionItemCard } from '@/components/InspectionItemCard';
import { SignaturePad, type SignaturePadHandle } from '@/components/SignaturePad';
import { compressImage } from '@/lib/imageCompression';
import {
  queuePhoto,
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
    return {
      inspection_date: now.toISOString().slice(0, 10),
      inspection_time: now.toTimeString().slice(0, 5),
      location: '',
      inspector: '',
    };
  });
  const [items, setItems] = useState<Record<number, InspectionResult>>({});
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
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
    getDraftInspection(inspectionLocalId).then((draft) => {
      const formData = draft?.formData as
        | { basicInfo?: BasicInfo; items?: Record<number, InspectionResult>; note?: string }
        | undefined;
      if (formData?.basicInfo) setBasicInfo(formData.basicInfo);
      if (formData?.items) setItems(formData.items);
      if (typeof formData?.note === 'string') setNote(formData.note);
      draftRestoredRef.current = true;
    });
  }, [inspectionLocalId]);

  useEffect(() => {
    if (!draftRestoredRef.current) return;
    saveDraftInspection({
      localId: inspectionLocalId,
      projectId: projectId ?? '',
      formData: { basicInfo, items, note },
      updatedAt: Date.now(),
    });
  }, [inspectionLocalId, projectId, basicInfo, items, note]);

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

  async function handlePhotoSelect(fileList: FileList | null) {
    if (!fileList) return;
    const newPhotos: PendingPhoto[] = [];
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
    setPhotos((prev) => [...prev, ...newPhotos]);
  }

  async function handleEnableDrive() {
    if (!user?.email) return;
    try {
      await requestDriveAccess(user.email);
      setDriveReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Drive 授權失敗');
    }
  }

  async function handleSubmit() {
    if (!project) return;
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
      <p className="mb-4 text-sm text-slate-500">
        {project.project_name} ・ 步驟 {stepIndex + 1} / {STEPS.length}
      </p>

      {step === 'basic' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">基本資料</h1>
          <label className="block">
            <span className="text-sm text-slate-600">巡檢日期</span>
            <input
              type="date"
              value={basicInfo.inspection_date}
              onChange={(e) => setBasicInfo({ ...basicInfo, inspection_date: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">巡檢時間</span>
            <input
              type="time"
              value={basicInfo.inspection_time}
              onChange={(e) => setBasicInfo({ ...basicInfo, inspection_time: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">巡檢地點</span>
            <input
              type="text"
              value={basicInfo.location}
              onChange={(e) => setBasicInfo({ ...basicInfo, location: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">巡檢人員</span>
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
          <h1 className="text-xl font-bold">巡檢項目（{INSPECTION_ITEM_DEFINITIONS.length} 項）</h1>
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
          <h1 className="text-xl font-bold">備註</h1>
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
          <h1 className="text-xl font-bold">現場照片</h1>
          {!driveReady && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
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
            capture="environment"
            multiple
            onChange={(e) => handlePhotoSelect(e.target.files)}
            className="block w-full text-sm"
          />
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
          <h1 className="text-xl font-bold">巡檢人員簽名</h1>
          <SignaturePad handleRef={signatureHandle} onChange={setSignatureEmpty} />
          <button
            type="button"
            onClick={() => signatureHandle.current?.clear()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            清除重簽
          </button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">送出前檢查</h1>
          <ul className="space-y-1 text-sm">
            <li>基本資料：{basicInfoValid ? '完成' : '尚未完成'}</li>
            <li>
              10 項巡檢：{Object.keys(items).length} / {INSPECTION_ITEM_DEFINITIONS.length}
              {!allItemsAnswered && '（尚有未選擇項目）'}
            </li>
            <li>照片：{photos.length} 張</li>
            <li>簽名：{signatureEmpty ? '尚未簽名' : '已簽名'}</li>
          </ul>
          {error && <p className="text-result-poor">{error}</p>}
          <button
            type="button"
            disabled={!basicInfoValid || !allItemsAnswered || submitting}
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
