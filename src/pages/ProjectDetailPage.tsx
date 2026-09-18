import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { InspProject } from '@/types';

interface InspectionRow {
  id: string;
  inspection_date: string;
  location: string;
  inspector: string;
  poor_count: number;
  photo_count: number;
}

// 案件詳情：先列出該案件既有的巡檢紀錄，再提供「新增巡檢紀錄」入口
export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<InspProject | null>(null);
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    async function load() {
      setLoading(true);
      const [{ data: projectData }, { data: inspectionData }] = await Promise.all([
        supabase.from('insp_projects').select('*').eq('id', projectId).single(),
        supabase
          .from('insp_inspections')
          .select(
            'id, inspection_date, location, inspector, insp_inspection_items(result), insp_inspection_photos(id)',
          )
          .eq('project_id', projectId)
          .order('inspection_date', { ascending: false }),
      ]);

      setProject(projectData ?? null);
      setRows(
        (inspectionData ?? []).map((row: any) => ({
          id: row.id,
          inspection_date: row.inspection_date,
          location: row.location,
          inspector: row.inspector,
          poor_count: row.insp_inspection_items.filter((i: any) => i.result === 'poor').length,
          photo_count: row.insp_inspection_photos.length,
        })),
      );
      setLoading(false);
    }

    load();
  }, [projectId]);

  if (loading) return <div className="p-4 text-center text-slate-500">載入中…</div>;
  if (!project) return <div className="p-4 text-center text-slate-500">找不到案件</div>;

  return (
    <div className="p-4">
      <Link to="/" className="mb-4 inline-block text-sm text-slate-500 underline">
        ← 返回案件列表
      </Link>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{project.project_name}</h1>
          <p className="text-sm text-slate-500">
            {project.contractor} ・ {project.location}
          </p>
        </div>
        <Link
          to={`/projects/${project.id}/inspect`}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
        >
          新增巡檢紀錄
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-500">目前尚無巡檢紀錄。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/inspections/${row.id}`}
                className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{row.inspection_date}</p>
                  <p className="text-sm text-slate-500">照片 {row.photo_count} 張</p>
                </div>
                <p className="text-sm text-slate-500">
                  {row.location} ・ {row.inspector}
                </p>
                {row.poor_count > 0 && (
                  <p className="text-sm font-medium text-result-poor">不良項目 {row.poor_count} 項</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
