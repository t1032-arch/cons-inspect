import { useAuth } from '@/lib/AuthContext';
import { signOut } from '@/lib/auth';

// 讓測試時能切換帳號比對 admin / user 權限——原本整個 app 沒有任何登出入口
export function AppHeader() {
  const { user, role } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
      <span>
        {user?.email}（{role === 'admin' ? '管理者' : '一般使用者'}）
      </span>
      <button type="button" onClick={() => signOut()} className="underline">
        登出
      </button>
    </header>
  );
}
