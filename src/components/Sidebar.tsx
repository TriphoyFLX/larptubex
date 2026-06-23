import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Flame, Users, History } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api from '../api/index.ts';
import { DEFAULT_AVATAR } from '../utils.ts';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-5 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
    isActive
      ? 'bg-[var(--yt-bg-hover)] yt-text-primary font-semibold'
      : 'yt-text-primary hover:bg-[var(--yt-bg-hover)]'
  }`;

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const { user } = useAuthStore();
  const [subs, setSubs] = useState<{ id: number; displayName: string; avatar: string | null }[]>([]);

  useEffect(() => {
    if (user) {
      api.get('/api/user/profile')
        .then(res => setSubs(res.data.subscriptions || []))
        .catch(err => console.error('Error fetching sidebar subscriptions', err));
    } else {
      setSubs([]);
    }
  }, [user]);

  if (!isOpen) return null;

  return (
    <aside className="w-56 yt-sidebar flex flex-col pt-3 shrink-0 border-r min-h-[calc(100vh-56px)] pb-4 overflow-y-auto" id="sidebar-panel">
      <div className="flex flex-col gap-0.5 px-3 pb-2">
        <NavLink to="/" className={navClass} end>
          <Home size={20} />
          <span>Главная</span>
        </NavLink>
        <NavLink to="/shorts" className={navClass}>
          <Flame size={20} className="text-yt-red" />
          <span>Shorts</span>
        </NavLink>
        <NavLink to="/community" className={navClass}>
          <Users size={20} />
          <span>Сообщество</span>
        </NavLink>
        {user && (
          <NavLink to="/history" className={navClass}>
            <History size={20} />
            <span>История</span>
          </NavLink>
        )}
      </div>

      <div className="h-px bg-[var(--yt-border)] my-3 mx-3" />

      <div className="flex flex-col gap-1 px-3 pb-2">
        <h3 className="px-3 mb-1 text-xs font-semibold yt-text-secondary uppercase tracking-wider">Подписки</h3>
        {user ? (
          subs.length === 0 ? (
            <span className="px-3 text-xs yt-text-muted italic">Нет подписок</span>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {subs.map((sub) => (
                <NavLink
                  key={sub.id}
                  to={`/channel/${sub.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm truncate ${
                      isActive ? 'bg-[var(--yt-bg-hover)] font-semibold yt-text-primary' : 'yt-text-primary hover:bg-[var(--yt-bg-hover)]'
                    }`
                  }
                >
                  <img src={sub.avatar || DEFAULT_AVATAR} className="w-6 h-6 rounded-full object-cover" alt="" />
                  <span className="truncate">{sub.displayName}</span>
                </NavLink>
              ))}
            </div>
          )
        ) : (
          <div className="mx-0 p-3 yt-surface rounded-xl">
            <p className="text-xs yt-text-secondary leading-normal mb-2">Войдите, чтобы видеть подписки</p>
            <NavLink to="/login" className="text-xs text-[#3ea6ff] hover:underline font-semibold">
              Войти
            </NavLink>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-[var(--yt-border)] pt-4 text-[10px] yt-text-muted leading-relaxed px-6 select-none">
        <p className="font-semibold yt-text-secondary uppercase tracking-wider">LarpTubeX</p>
        <p className="mt-1">Видеоплатформа в стиле YouTube</p>
        <p className="mt-2 text-[9px]">© 2026 LarpTubeX</p>
      </div>
    </aside>
  );
}
