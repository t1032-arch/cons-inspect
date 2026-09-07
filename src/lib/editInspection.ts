import { supabase } from '@/lib/supabase';
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
export async function saveInspectionEdits(
  inspection: InspInspection,
  items: InspInspectionItem[],
  form: InspectionEditForm,
  editedBy: string,
): Promise<void> {
  const logRows: {
    inspection_id: string;
    edited_by: string;
    field_changed: string;
    old_value: string | null;
    new_value: string | null;
  }[] = [];

  const fieldUpdates: Partial<
    Pick<InspInspection, 'inspection_date' | 'inspection_time' | 'location' | 'inspector' | 'note'>
  > = {};

  (Object.keys(INSPECTION_FIELD_LABELS) as Array<keyof typeof INSPECTION_FIELD_LABELS>).forEach(
    (field) => {
      const oldValue = inspection[field] ?? '';
      const newValue = form[field] ?? '';
      if (oldValue !== newValue) {
        fieldUpdates[field] = form[field];
        logRows.push({
          inspection_id: inspection.id,
          edited_by: editedBy,
          field_changed: INSPECTION_FIELD_LABELS[field],
          old_value: oldValue || null,
          new_value: newValue || null,
        });
      }
    },
  );

  const itemUpdates: { item_no: number; result: InspectionResult }[] = [];
  const resultByItemNo = new Map(items.map((item) => [item.item_no, item.result]));

  for (const def of INSPECTION_ITEM_DEFINITIONS) {
    const oldResult = resultByItemNo.get(def.item_no) ?? null;
    const newResult = form.items[def.item_no] ?? null;
    if (oldResult !== newResult && newResult !== null) {
      itemUpdates.push({ item_no: def.item_no, result: newResult });
      logRows.push({
        inspection_id: inspection.id,
        edited_by: editedBy,
        field_changed: `第${def.item_no}項：${def.title}`,
        old_value: oldResult ? RESULT_LABELS[oldResult] : null,
        new_value: RESULT_LABELS[newResult],
      });
    }
  }

  if (logRows.length === 0) return;

  if (Object.keys(fieldUpdates).length > 0) {
    const { error } = await supabase
      .from('insp_inspections')
      .update(fieldUpdates)
      .eq('id', inspection.id);
    if (error) throw error;
  }

  for (const { item_no, result } of itemUpdates) {
    const { error } = await supabase
      .from('insp_inspection_items')
      .update({ result })
      .eq('inspection_id', inspection.id)
      .eq('item_no', item_no);
    if (error) throw error;
  }

  const { error: logError } = await supabase.from('insp_inspection_edit_log').insert(logRows);
  if (logError) throw logError;
}
