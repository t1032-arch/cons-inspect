import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { InspProject } from '@/types';

// 對應 workplan_v2.md §3 / §9 Step 1：預設顯示「進行中」且「自己被指派」的案件，可搜尋案件名稱
export function ProjectListPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<InspProject[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('insp_project_assignees')
        .select('insp_projects!inner(*)')
        .eq('user_email', user!.email!)
        .eq('insp_projects.status', 'active');

      if (error) {
        setError(error.message);
      } else {
        setProjects((data ?? []).map((row: any) => row.insp_projects));
      }
      setLoading(false);
    }

    load();
  }, [user?.email]);

  const filtered = useMemo(
    () => projects.filter((p) => p.project_name.includes(keyword)),
    [projects, keyword],
  );

  if (loading) return <div className="p-4 text-center text-slate-500">載入案件中…</div>;
  if (error) return <div className="p-4 text-center text-result-poor">讀取失敗：{error}</div>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold text-slate-900">選擇承攬案件</h1>
      <input
        type="search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜尋案件名稱"
        className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2"
      />
      {filtered.length === 0 ? (
        <p className="text-slate-500">
          目前沒有被指派的進行中案件。若有未列入的案件，請聯絡管理者於後台新增並指派。
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}/inspect`}
                className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
              >
                <p className="font-medium text-slate-900">{project.project_name}</p>
                <p className="text-sm text-slate-500">
                  {project.contractor} ・ {project.location}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
