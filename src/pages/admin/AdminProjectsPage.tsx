import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { InspProject, InspProjectAssignee } from '@/types';

const emptyForm = {
  project_name: '',
  contractor: '',
  location: '',
  start_date: '',
  end_date: '',
  department: '',
  manager: '',
  note: '',
};

// 對應 workplan_v2.md §2.2 / §3 / §18：後台新增、編輯、停用承攬案件，並指派填報人員
export function AdminProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<InspProject[]>([]);
  const [assignees, setAssignees] = useState<Record<string, InspProjectAssignee[]>>({});
  const [form, setForm] = useState(emptyForm);
  const [newAssigneeEmail, setNewAssigneeEmail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  async function loadProjects() {
    setLoading(true);
    const { data } = await supabase
      .from('insp_projects')
      .select('*')
      .order('created_at', { ascending: false });
    setProjects(data ?? []);

    const { data: assigneeRows } = await supabase.from('insp_project_assignees').select('*');
    const grouped: Record<string, InspProjectAssignee[]> = {};
    for (const row of assigneeRows ?? []) {
      (grouped[row.project_id] ??= []).push(row);
    }
    setAssignees(grouped);
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreate() {
    if (!form.project_name) return;
    setCreateError(null);
    // 空字串對 date 欄位（start_date/end_date）是不合法的值，需轉成 null
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]),
    );
    const { error } = await supabase.from('insp_projects').insert({ ...payload, status: 'active' });
    if (error) {
      setCreateError(error.message);
      return;
    }
    setForm(emptyForm);
    await loadProjects();
  }

  async function handleSetStatus(projectId: string, status: InspProject['status']) {
    await supabase.from('insp_projects').update({ status }).eq('id', projectId);
    await loadProjects();
  }

  async function handleAssign(projectId: string) {
    const email = newAssigneeEmail[projectId]?.trim();
    if (!email || !user) return;
    await supabase
      .from('insp_project_assignees')
      .insert({ project_id: projectId, user_email: email, assigned_by: user.id });
    setNewAssigneeEmail((prev) => ({ ...prev, [projectId]: '' }));
    await loadProjects();
  }

  async function handleUnassign(assigneeId: string) {
    await supabase.from('insp_project_assignees').delete().eq('id', assigneeId);
    await loadProjects();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <div>
        <h1 className="mb-4 text-xl font-bold">新增承攬案件</h1>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(emptyForm) as Array<keyof typeof emptyForm>).map((key) => (
            <input
              key={key}
              placeholder={key}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-white"
        >
          新增案件
        </button>
        {createError && <p className="mt-2 text-sm text-result-poor">新增失敗：{createError}</p>}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold">案件列表</h2>
        {loading ? (
          <p className="text-slate-500">載入中…</p>
        ) : (
          <ul className="space-y-4">
            {projects.map((project) => (
              <li key={project.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {project.project_name}（{project.status}）
                  </p>
                  <select
                    value={project.status}
                    onChange={(e) =>
                      handleSetStatus(project.id, e.target.value as InspProject['status'])
                    }
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="active">進行中</option>
                    <option value="completed">已完成</option>
                    <option value="disabled">停用</option>
                  </select>
                </div>
                <p className="text-sm text-slate-500">
                  {project.contractor} ・ {project.location}
                </p>

                <div className="mt-3">
                  <p className="mb-1 text-sm font-medium">指派填報人員</p>
                  <ul className="mb-2 space-y-1">
                    {(assignees[project.id] ?? []).map((assignee) => (
                      <li key={assignee.id} className="flex items-center justify-between text-sm">
                        <span>{assignee.user_email}</span>
                        <button
                          type="button"
                          onClick={() => handleUnassign(assignee.id)}
                          className="text-result-poor"
                        >
                          移除
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="user@school.edu.tw"
                      value={newAssigneeEmail[project.id] ?? ''}
                      onChange={(e) =>
                        setNewAssigneeEmail((prev) => ({ ...prev, [project.id]: e.target.value }))
                      }
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleAssign(project.id)}
                      className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
                    >
                      指派
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
