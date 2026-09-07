import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { signInWithGoogle } from '@/lib/auth';

export function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-4 text-center text-slate-500">載入中…</div>;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">施工巡檢填報紀錄系統</h1>
        <p className="mt-2 text-slate-500">請使用學校 Google 帳號登入</p>
      </div>
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="rounded-lg bg-slate-900 px-6 py-3 text-lg font-medium text-white"
      >
        使用 Google 帳號登入
      </button>
    </div>
  );
}
