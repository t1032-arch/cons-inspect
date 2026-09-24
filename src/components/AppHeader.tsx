import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { signOut } from '@/lib/auth';

// 讓測試時能切換帳號比對 admin / user 權限——原本整個 app 沒有任何登出入口
export function AppHeader() {
  const { user, role } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <span className="text-xs text-slate-500 md:text-sm">
        {user?.email}（{role === 'admin' ? '管理者' : '一般使用者'}）
      </span>
      <nav className="flex items-center gap-4 text-sm font-medium md:text-base">
        <Link to="/" className="text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline">
          首頁
        </Link>
        <Link to="/history" className="text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline">
          巡檢紀錄
        </Link>
        {role === 'admin' && (
          <Link
            to="/admin/projects"
            className="text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
          >
            後台管理
          </Link>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          登出
        </button>
      </nav>
    </header>
  );
}
