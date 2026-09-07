import type { InspInspectionItemDefinition } from '@/types';

// 對應 workplan_v2.md 第5節「巡檢項目清單」，與 insp_inspection_item_definitions 種子資料一致（見 supabase/migrations/0001_init.sql）
export const INSPECTION_ITEM_DEFINITIONS: InspInspectionItemDefinition[] = [
  { item_no: 1, title: '人員防護', description: '是否配戴必要防護具，有無明顯危險行為。' },
  { item_no: 2, title: '區域隔離與警示', description: '施工區、危險區是否有圍設或警示。' },
  { item_no: 3, title: '高處作業安全', description: '梯具、施工架是否穩固，防墜措施是否適當。' },
  { item_no: 4, title: '施工用電安全', description: '電線、插座、配電及電動工具有無明顯危險。' },
  { item_no: 5, title: '機具設備安全', description: '機具、工具是否正常使用，有無明顯危險。' },
  { item_no: 6, title: '吊掛與重物作業', description: '吊掛區是否管制，重物搬運是否安全。' },
  { item_no: 7, title: '動火與防火安全', description: '動火周邊是否安全，滅火設備及鋼瓶是否妥善。' },
  { item_no: 8, title: '材料與現場整理', description: '材料、工具及廢料是否整齊，通道是否暢通。' },
  { item_no: 9, title: '通風與照明', description: '作業場所通風及照明是否足夠。' },
  { item_no: 10, title: '校園動線與環境', description: '是否影響師生通行，粉塵、噪音等是否妥善控制。' },
];

export const RESULT_LABELS: Record<string, string> = {
  good: '良好',
  acceptable: '尚可',
  poor: '不良',
  na: '不適用',
};
