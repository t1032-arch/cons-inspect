import clsx from 'clsx';
import type { InspectionResult } from '@/types';
import { RESULT_LABELS } from '@/constants/inspectionItems';

const OPTIONS: InspectionResult[] = ['good', 'acceptable', 'poor', 'na'];

const SELECTED_CLASSES: Record<InspectionResult, string> = {
  good: 'bg-result-good text-white border-result-good',
  acceptable: 'bg-result-acceptable text-white border-result-acceptable',
  poor: 'bg-result-poor text-white border-result-poor',
  na: 'bg-result-na text-white border-result-na',
};

interface Props {
  value: InspectionResult | null;
  onChange: (value: InspectionResult) => void;
}

// 對應 workplan_v2.md §5 / §10：四個選項無預設值，按鈕需有明確選中狀態，
// 「不適用」採獨立色系，避免與良好混淆
export function ResultButtonGroup({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((option) => {
        const isSelected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={clsx(
              'rounded-lg border-2 px-4 py-3 text-lg font-medium transition-colors',
              isSelected ? SELECTED_CLASSES[option] : 'border-slate-300 bg-white text-slate-700',
            )}
          >
            {RESULT_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
