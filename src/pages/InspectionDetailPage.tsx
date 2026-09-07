import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { INSPECTION_ITEM_DEFINITIONS, RESULT_LABELS } from '@/constants/inspectionItems';
import type { InspInspection, InspInspectionItem, InspInspectionPhoto, InspProject } from '@/types';

interface DetailData {
  inspection: InspInspection;
  project: InspProject;
  items: InspInspectionItem[];
  photos: InspInspectionPhoto[];
}

// 對應 workplan_v2.md §13 單筆巡檢紀錄查看頁
export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
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
    load();
  }, [id]);

  if (loading) return <div className="p-4 text-center text-slate-500">載入中…</div>;
  if (!data) return <div className="p-4 text-center text-slate-500">找不到紀錄</div>;

  const resultByItemNo = new Map(data.items.map((item) => [item.item_no, item.result]));
  const poorItems = INSPECTION_ITEM_DEFINITIONS.filter(
    (def) => resultByItemNo.get(def.item_no) === 'poor',
  );

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold">{data.project.project_name}</h1>
        <p className="text-sm text-slate-500">
          {data.inspection.inspection_date} {data.inspection.inspection_time} ・{' '}
          {data.inspection.location} ・ {data.inspection.inspector}
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">巡檢結果</h2>
        <ul className="space-y-1 text-sm">
          {INSPECTION_ITEM_DEFINITIONS.map((def) => (
            <li key={def.item_no} className="flex justify-between border-b border-slate-100 py-1">
              <span>
                {def.item_no}. {def.title}
              </span>
              <span
                className={
                  resultByItemNo.get(def.item_no) === 'poor' ? 'font-medium text-result-poor' : ''
                }
              >
                {RESULT_LABELS[resultByItemNo.get(def.item_no) ?? ''] ?? '未填寫'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {poorItems.length > 0 && (
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

      {data.inspection.note && (
        <div>
          <h2 className="mb-2 font-semibold">備註</h2>
          <p className="whitespace-pre-wrap text-sm">{data.inspection.note}</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">現場照片（{data.photos.length} 張）</h2>
        <ul className="space-y-1 text-sm text-slate-500">
          {data.photos.map((photo) => (
            <li key={photo.id}>
              {photo.filename} —{' '}
              {photo.upload_status === 'uploaded'
                ? '已上傳'
                : photo.upload_status === 'failed'
                  ? '上傳失敗'
                  : '上傳中'}
            </li>
          ))}
        </ul>
        {/* TODO: 依 drive_file_id 顯示縮圖，需另建後端代理或 Drive 縮圖 API 呼叫 */}
      </div>

      <p className="text-xs text-slate-400">
        建立時間：{data.inspection.created_at} ・ 最後修改：{data.inspection.updated_at}
      </p>
    </div>
  );
}
