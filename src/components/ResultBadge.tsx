import type { InspectionResult } from '@/types';
import { RESULT_LABELS } from '@/constants/inspectionItems';

// 淡底色塊（色底 10% 透明度 + 深色文字），跟填報頁 ResultButtonGroup 的實心按鈕
// 呼應同一組語意色，但用在唯讀的列表/詳情頁不會太搶眼
const COLOR_CLASSES: Record<InspectionResult, string> = {
  good: 'bg-result-good/10 text-result-good',
  acceptable: 'bg-result-acceptable/10 text-result-acceptable',
  poor: 'bg-result-poor/10 text-result-poor',
  na: 'bg-result-na/10 text-result-na',
};

interface Props {
  result: InspectionResult | null | undefined;
}

export function ResultBadge({ result }: Props) {
  if (!result) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400 md:text-sm">
        未填寫
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium md:text-sm ${COLOR_CLASSES[result]}`}
    >
      {RESULT_LABELS[result]}
    </span>
  );
}
