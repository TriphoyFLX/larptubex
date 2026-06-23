import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Flame, PlaySquare, Compass, Users, Clock, History, Tv, Landmark, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api from '../api/index.ts';
import { DEFAULT_AVATAR } from '../utils.ts';

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const { user } = useAuthStore();
  const [subs, setSubs] = useState<{ id: number; displayName: string; avatar: string | null }[]>([]);

  useEffect(() => {
    if (user) {
      api.get('/api/user/profile')
        .then(res => {
          setSubs(res.data.subscriptions || []);
        })
        .catch(err => console.error('Error fetching sidebar subscriptions', err));
    } else {
      setSubs([]);
    }
  }, [user]);

  if (!isOpen) return null;

  return (
    <aside className="w-56 bg-[#f1f1f1] flex flex-col pt-3 shrink-0 border-r border-[#e8e8e8] min-h-[calc(100vh-56px)] pb-4 text-xs" id="sidebar-panel">
      {/* Block 1: Main navigation links */}
      <div className="flex flex-col gap-0.5 pb-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-4 px-6 py-2 transition-colors font-semibold text-sm ${isActive ? 'bg-[#e2e2e2] border-l-4 border-l-[#cc181e] text-gray-950' : 'border-l-4 border-transparent hover:bg-[#e2e2e2] text-[#444]'}`
          }
          end
        >
          <Home size={16} />
          <span>Главная</span>
        </NavLink>
        <NavLink
          to="/shorts"
          className={({ isActive }) =>
            `flex items-center gap-4 px-6 py-2 transition-colors font-semibold text-sm ${isActive ? 'bg-[#e2e2e2] border-l-4 border-l-[#cc181e] text-gray-950' : 'border-l-4 border-transparent hover:bg-[#e2e2e2] text-[#444]'}`
          }
        >
          <Flame size={16} className="text-red-500" />
          <span>Shorts</span>
        </NavLink>
        <NavLink
          to="/community"
          className={({ isActive }) =>
            `flex items-center gap-4 px-6 py-2 transition-colors font-semibold text-sm ${isActive ? 'bg-[#e2e2e2] border-l-4 border-l-[#cc181e] text-gray-950' : 'border-l-4 border-transparent hover:bg-[#e2e2e2] text-[#444]'}`
          }
        >
          <Users size={16} />
          <span>Сообщество</span>
        </NavLink>
        {user && (
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex items-center gap-4 px-6 py-2 transition-colors font-semibold text-sm ${isActive ? 'bg-[#e2e2e2] border-l-4 border-l-[#cc181e] text-gray-950' : 'border-l-4 border-transparent hover:bg-[#e2e2e2] text-[#444]'}`
            }
          >
            <History size={16} />
            <span>История</span>
          </NavLink>
        )}
      </div>

      <div className="h-[1px] bg-[#e2e2e2] my-3 mx-4"></div>

      {/* Block 2: Subscriptions sections */}
      <div className="flex flex-col gap-1 pb-2">
        <h3 className="px-6 mb-2 text-[11px] font-bold text-[#666] uppercase tracking-wider">Подписки</h3>
        {user ? (
          subs.length === 0 ? (
            <span className="px-6 text-[11px] text-[#777] italic">Нет подписок</span>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {subs.map((sub) => (
                <NavLink
                  key={sub.id}
                  to={`/channel/${sub.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-2 hover:bg-[#e2e2e2] text-sm text-[#444] font-semibold truncate ${isActive ? 'bg-[#e2e2e2] font-bold text-gray-950' : ''}`
                  }
                >
                  <img
                    src={sub.avatar || DEFAULT_AVATAR}
                    className="w-5 h-5 rounded-full object-cover border border-[#e8e8e8]"
                    alt="channel icon"
                  />
                  <span className="truncate">{sub.displayName}</span>
                </NavLink>
              ))}
            </div>
          )
        ) : (
          <div className="mx-6 my-1 p-3 bg-white border border-[#e8e8e8] rounded-sm shadow-sm">
            <p className="text-[10px] text-gray-500 leading-normal mb-2">Авторизуйтесь, чтобы видеть подписки и любимые каналы.</p>
            <NavLink to="/login" className="text-[10px] text-blue-600 hover:underline font-bold uppercase tracking-wider">
              Войти
            </NavLink>
          </div>
        )}
      </div>

      {/* Block 3: Additional details & static info */}
      <div className="mt-auto border-t border-[#e2e2e2] pt-4 text-[10px] text-[#777] leading-relaxed px-6 select-none">
        <p className="font-bold text-[#666] uppercase tracking-wider">LarpTubeX</p>
        <p className="mt-1">Полноценная ретро-платформа. Дизайн YouTube Clean Minimalism.</p>
        <p className="mt-2 text-[9px] text-[#999]">© 2026 LarpTubeX CORP.</p>
      </div>
    </aside>
  );
}
