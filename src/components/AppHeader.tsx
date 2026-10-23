import clsx from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { signOut } from '@/lib/auth';

const INACTIVE_LINK = 'text-slate-700 hover:text-slate-900 hover:underline';
const ACTIVE_LINK = 'text-primary underline underline-offset-2';

function isPathActive(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// 讓測試時能切換帳號比對 admin / user 權限——原本整個 app 沒有任何登出入口
export function AppHeader() {
  const { user, role } = useAuth();
  const { pathname } = useLocation();

  // 案件列表／案件詳情／填報表單都算「首頁」這條動線的一部分；
  // 巡檢紀錄列表跟單筆詳情頁則算「巡檢紀錄」這條，兩者互斥才不會同時高亮
  const isHome = pathname === '/' || isPathActive(pathname, '/projects');
  const isHistory = isPathActive(pathname, '/history') || isPathActive(pathname, '/inspections');
  const isAdmin = isPathActive(pathname, '/admin');

  return (
    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <span className="text-xs text-slate-500 md:text-sm">
        {user?.email}（{role === 'admin' ? '管理者' : '一般使用者'}）
      </span>
      <nav className="flex items-center gap-4 text-sm font-medium underline-offset-2 md:text-base">
        <Link to="/" className={clsx(isHome ? ACTIVE_LINK : INACTIVE_LINK)}>
          首頁
        </Link>
        <Link to="/history" className={clsx(isHistory ? ACTIVE_LINK : INACTIVE_LINK)}>
          巡檢紀錄
        </Link>
        {role === 'admin' && (
          <Link to="/admin/projects" className={clsx(isAdmin ? ACTIVE_LINK : INACTIVE_LINK)}>
            後台管理
          </Link>
        )}
        <button type="button" onClick={() => signOut()} className={INACTIVE_LINK}>
          登出
        </button>
      </nav>
    </header>
  );
}
