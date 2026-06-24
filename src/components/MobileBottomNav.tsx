import { NavLink, useLocation } from 'react-router-dom';
import { Home, Flame, Users, CircleUser } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 px-1 rounded-lg transition-colors ${
    isActive ? 'text-yt-red' : 'yt-text-secondary'
  }`;

export default function MobileBottomNav() {
  const { user } = useAuthStore();
  const location = useLocation();

  const hideOnWatch = location.pathname.startsWith('/watch/');
  if (hideOnWatch) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 yt-navbar border-t safe-area-bottom"
      id="mobile-bottom-nav"
      aria-label="Навигация"
    >
      <div className="flex items-stretch h-14 max-w-screen-xl mx-auto">
        <NavLink to="/" className={linkClass} end>
          <Home size={22} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] font-medium truncate">Главная</span>
        </NavLink>
        <NavLink to="/shorts" className={linkClass}>
          <Flame size={22} strokeWidth={location.pathname === '/shorts' ? 2.5 : 2} />
          <span className="text-[10px] font-medium truncate">Shorts</span>
        </NavLink>
        <NavLink to="/community" className={linkClass}>
          <Users size={22} strokeWidth={location.pathname === '/community' ? 2.5 : 2} />
          <span className="text-[10px] font-medium truncate">Сообщество</span>
        </NavLink>
        {user ? (
          <NavLink to={`/channel/${user.id}`} className={linkClass}>
            <CircleUser size={22} strokeWidth={location.pathname.startsWith('/channel/') ? 2.5 : 2} />
            <span className="text-[10px] font-medium truncate">Канал</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={linkClass}>
            <CircleUser size={22} />
            <span className="text-[10px] font-medium truncate">Войти</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
