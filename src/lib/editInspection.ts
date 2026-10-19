import { supabase } from '@/lib/supabase';
import { ensureInspectionFolder, uploadFileToDrive } from '@/lib/googleDrive';
import { INSPECTION_ITEM_DEFINITIONS, RESULT_LABELS } from '@/constants/inspectionItems';
import type { InspInspection, InspInspectionItem, InspectionResult } from '@/types';

export interface InspectionEditForm {
  inspection_date: string;
  inspection_time: string;
  location: string;
  inspector: string;
  note: string;
  items: Record<number, InspectionResult | null>;
}

const INSPECTION_FIELD_LABELS: Record<
  'inspection_date' | 'inspection_time' | 'location' | 'inspector' | 'note',
  string
> = {
  inspection_date: '巡檢日期',
  inspection_time: '巡檢時間',
  location: '地點',
  inspector: '巡檢人員',
  note: '備註',
};

// 對應 workplan_v2.md §13：允許修改既有巡檢紀錄，但需將修改人／時間／修改前後內容寫入
// insp_inspection_edit_log，避免直接覆寫而無紀錄。只有 admin 能呼叫（RLS 只允許 admin 寫入
// insp_inspections / insp_inspection_items / insp_inspection_edit_log）。
interface EditLogRow {
  inspection_id: string;
  edited_by: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
}

export async function saveInspectionEdits(
  inspection: InspInspection,
  items: InspInspectionItem[],
  form: InspectionEditForm,
  editedBy: string,
): Promise<void> {
  const fieldUpdates: Partial<
    Pick<InspInspection, 'inspection_date' | 'inspection_time' | 'location' | 'inspector' | 'note'>
  > = {};
  const fieldLogRows: EditLogRow[] = [];

  (Object.keys(INSPECTION_FIELD_LABELS) as Array<keyof typeof INSPECTION_FIELD_LABELS>).forEach(
    (field) => {
      const oldValue = inspection[field] ?? '';
      const newValue = form[field] ?? '';
      if (oldValue !== newValue) {
        fieldUpdates[field] = form[field];
        fieldLogRows.push({
          inspection_id: inspection.id,
          edited_by: editedBy,
          field_changed: INSPECTION_FIELD_LABELS[field],
          old_value: oldValue || null,
          new_value: newValue || null,
        });
      }
    },
  );

  const itemUpdates: { item_no: number; result: InspectionResult; logRow: EditLogRow }[] = [];
  const resultByItemNo = new Map(items.map((item) => [item.item_no, item.result]));

  for (const def of INSPECTION_ITEM_DEFINITIONS) {
    const oldResult = resultByItemNo.get(def.item_no) ?? null;
    const newResult = form.items[def.item_no] ?? null;
    if (oldResult !== newResult && newResult !== null) {
      itemUpdates.push({
        item_no: def.item_no,
        result: newResult,
        logRow: {
          inspection_id: inspection.id,
          edited_by: editedBy,
          field_changed: `第${def.item_no}項：${def.title}`,
          old_value: oldResult ? RESULT_LABELS[oldResult] : null,
          new_value: RESULT_LABELS[newResult],
        },
      });
    }
  }

  if (fieldLogRows.length === 0 && itemUpdates.length === 0) return;

  // 每完成一項異動就立刻寫入對應的 edit_log，而不是全部改完最後才一次寫入：
  // 避免中途（例如網路中斷）失敗時，前面已經生效的異動反而完全沒有留下修改紀錄，
  // 違反這個功能存在的目的——見 workplan §13「避免直接覆寫而無紀錄」。
  if (Object.keys(fieldUpdates).length > 0) {
    const { error } = await supabase
      .from('insp_inspections')
      .update(fieldUpdates)
      .eq('id', inspection.id);
    if (error) throw error;

    const { error: logError } = await supabase
      .from('insp_inspection_edit_log')
      .insert(fieldLogRows);
    if (logError) throw logError;
  }

  for (const { item_no, result, logRow } of itemUpdates) {
    const { error } = await supabase
      .from('insp_inspection_items')
      .update({ result })
      .eq('inspection_id', inspection.id)
      .eq('item_no', item_no);
    if (error) throw error;

    const { error: logError } = await supabase.from('insp_inspection_edit_log').insert(logRow);
    if (logError) throw logError;
  }
}

interface UpdateSignatureParams {
  inspectionId: string;
  projectName: string;
  inspectionDate: string;
  signatureBlob: Blob;
}

// 已送出紀錄的補簽／重簽：簽名檔上傳到該筆紀錄的 Drive 資料夾後，透過 RPC
// insp_update_signature 更新 signature_file_id 並寫入修改紀錄（見 migration 0003）。
// admin 與填報者本人都能呼叫；舊簽名檔留在 Drive 不刪除，修改紀錄保留舊檔 ID 可追溯。
// 呼叫前須已取得 Drive 授權。
export async function updateInspectionSignature({
  inspectionId,
  projectName,
  inspectionDate,
  signatureBlob,
}: UpdateSignatureParams): Promise<void> {
  const folderName = `${inspectionDate}_巡檢紀錄${inspectionId.slice(0, 8)}`;
  const folderId = await ensureInspectionFolder(projectName, folderName);
  const signatureFileId = await uploadFileToDrive(
    signatureBlob,
    `signature_${Date.now()}.png`,
    folderId,
  );

  const { error } = await supabase.rpc('insp_update_signature', {
    p_inspection_id: inspectionId,
    p_signature_file_id: signatureFileId,
  });
  if (error) throw error;
}
