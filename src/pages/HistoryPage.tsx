import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface HistoryRow {
  id: string;
  inspection_date: string;
  location: string;
  inspector: string;
  project: { project_name: string } | null;
  poor_count: number;
  photo_count: number;
}

// 對應 workplan_v2.md §12 歷史紀錄列表（基本版：先做查詢，篩選條件可再擴充）
export function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyPoor, setOnlyPoor] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('insp_inspections')
        .select(
          'id, inspection_date, location, inspector, insp_projects(project_name), insp_inspection_items(result), insp_inspection_photos(id)',
        )
        .order('inspection_date', { ascending: false });

      const mapped: HistoryRow[] = (data ?? []).map((row: any) => ({
        id: row.id,
        inspection_date: row.inspection_date,
        location: row.location,
        inspector: row.inspector,
        project: row.insp_projects,
        poor_count: row.insp_inspection_items.filter((i: any) => i.result === 'poor').length,
        photo_count: row.insp_inspection_photos.length,
      }));
      setRows(mapped);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = onlyPoor ? rows.filter((r) => r.poor_count > 0) : rows;

  if (loading) return <div className="p-4 text-center text-slate-500">載入中…</div>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">巡檢紀錄</h1>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyPoor} onChange={(e) => setOnlyPoor(e.target.checked)} />
        只顯示有「不良」的紀錄
      </label>
      <ul className="space-y-2">
        {filtered.map((row) => (
          <li key={row.id}>
            <Link
              to={`/inspections/${row.id}`}
              className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{row.project?.project_name}</p>
                <p className="text-sm text-slate-500">{row.inspection_date}</p>
              </div>
              <p className="text-sm text-slate-500">
                {row.location} ・ {row.inspector} ・ 照片 {row.photo_count} 張
              </p>
              {row.poor_count > 0 && (
                <p className="text-sm font-medium text-result-poor">不良項目 {row.poor_count} 項</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
