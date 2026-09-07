import type { InspInspectionItemDefinition, InspectionResult } from '@/types';
import { ResultButtonGroup } from '@/components/ResultButtonGroup';

interface Props {
  definition: InspInspectionItemDefinition;
  value: InspectionResult | null;
  onChange: (value: InspectionResult) => void;
}

// 對應 workplan_v2.md §9 Step 3 / §10：一次顯示一個完整項目，項目名稱字級大於說明
export function InspectionItemCard({ definition, value, onChange }: Props) {
  return (
    <div className="space-y-4 border-b border-slate-200 pb-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {definition.item_no}. {definition.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{definition.description}</p>
      </div>
      <ResultButtonGroup value={value} onChange={onChange} />
      {value === 'poor' && (
        <p className="text-sm text-result-poor">
          建議填寫備註或拍照記錄不良狀況（不強制阻擋送出）。
        </p>
      )}
    </div>
  );
}
