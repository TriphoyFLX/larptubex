import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Upload, LogOut, ShieldAlert, User as UserIcon, Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api from '../api/index.ts';
import { Notification } from '../types.ts';
import { formatRelativeDate, DEFAULT_AVATAR } from '../utils.ts';

export default function Navbar({ onSidebarToggle }: { onSidebarToggle: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-[#e8e8e8] h-14 flex items-center justify-between px-4" id="yt-navbar">
      {/* Left section: Hamburger + YouTube Logo in Clean Minimalism */}
      <div className="flex items-center gap-4">
        <button onClick={onSidebarToggle} className="p-1 hover:bg-[#e2e2e2] rounded text-[#666]" id="btn-sidebar-toggle">
          <Menu size={20} />
        </button>
        <Link to="/" className="flex items-center gap-1.5 focus:outline-none" id="logo-larptubex">
          <div className="bg-[#cc181e] text-white px-1.5 py-0.5 rounded-sm flex items-center justify-center shrink-0">
            <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5"></div>
          </div>
          <span className="font-sans font-bold text-lg tracking-tighter select-none text-[#222]">
            LarpTube<span className="text-gray-400 font-normal">X</span>
          </span>
          <span className="text-[10px] text-[#777] font-normal align-top ml-0.5">RU</span>
        </Link>
      </div>

      {/* Middle section: High-fidelity Search Box in Clean Minimalism */}
      <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-[640px] px-8" id="search-form">
        <div className="relative flex w-full">
          <input
            type="text"
            placeholder="Введите поисковый запрос"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 px-3 border border-[#ccc] focus:outline-none focus:border-blue-500 shadow-inner rounded-l-sm bg-white text-sm text-[#111111]"
            id="search-input"
          />
        </div>
        <button type="submit" className="bg-[#f8f8f8] border border-[#ccc] border-l-0 px-5 flex items-center hover:bg-[#efefef] rounded-r-sm shadow-sm text-[#666] cursor-pointer" id="search-button">
          <Search size={14} className="stroke-[3]" />
        </button>
      </form>

      {/* Right section: Upload, Notifications, User details */}
      <div className="flex items-center gap-5">
        {user ? (
          <>
            {/* Upload Button */}
            <Link to="/upload" className="bg-[#f8f8f8] border border-[#d3d3d3] px-3 py-1 text-xs font-semibold rounded-sm text-[#333] hover:shadow-sm flex items-center gap-1.5 transition-shadow" id="link-upload">
              <Upload size={14} className="text-[#cc181e]" />
              <span className="hidden sm:inline">Добавить видео</span>
            </Link>

            {/* Notification bell and dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 hover:bg-[#e2e2e2] text-[#666] hover:text-black rounded transition-colors cursor-pointer"
                id="btn-notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-[#cc181e] text-white text-[9px] font-bold px-1 rounded-full border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#e8e8e8] rounded-sm shadow-md overflow-hidden z-50 yt-card" id="notifications-box">
                  <div className="px-3 py-2 border-b border-[#e8e8e8] bg-[#f8f8f8] flex justify-between items-center">
                    <span className="font-semibold text-xs text-gray-700">Уведомления</span>
                    <span className="text-[10px] text-gray-400">последние</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">Нет новых уведомлений</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-3 border-b border-[#e8e8e8] flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-red-50/40' : ''}`}
                        >
                          <img
                            src={n.triggerUserAvatar || DEFAULT_AVATAR}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                            alt="Notify origin avatar"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[11px] text-gray-900 leading-tight">{n.title}</h4>
                            <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>
                            <span className="text-[10px] text-gray-400 mt-1 block">{formatRelativeDate(n.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile circular button and dropdown */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1 focus:outline-none cursor-pointer"
                id="btn-user-menu"
              >
                <img
                  src={user.avatar || DEFAULT_AVATAR}
                  className="w-8 h-8 rounded-full object-cover border border-[#d3d3d3] hover:ring-2 hover:ring-[#cc181e] transition-all"
                  alt="user avatar"
                />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e8e8e8] rounded-sm shadow-md overflow-hidden z-50 yt-card" id="user-menu-dropdown">
                  <div className="p-3 border-b border-[#e8e8e8] bg-[#f8f8f8]">
                    <p className="font-bold text-xs text-gray-900 truncate">{user.displayName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="flex flex-col text-xs text-gray-700">
                    <Link to={`/channel/${user.id}`} className="p-2.5 hover:bg-gray-100 font-semibold flex items-center gap-2 border-b border-[#e8e8e8]">
                      <UserIcon size={14} className="text-gray-400" />
                      Мой Канал
                    </Link>
                    {user.isAdmin && (
                      <Link to="/admin" className="p-2.5 hover:bg-gray-100 text-[#cc181e] font-bold flex items-center gap-2 border-b border-[#e8e8e8] bg-red-50/20">
                        <ShieldAlert size={14} />
                        Панель Админа
                      </Link>
                    )}
                    <button onClick={logout} className="p-2.5 hover:bg-gray-100 font-semibold text-left flex items-center gap-2 text-gray-600 hover:text-black cursor-pointer">
                      <LogOut size={14} className="text-gray-400" />
                      Выйти из аккаунта
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Sign In trigger for anonymous visitors in Clean Minimalism style */
          <Link to="/login" className="bg-[#f8f8f8] border border-[#d3d3d3] px-3 py-1.5 text-xs font-semibold rounded-sm text-[#333] hover:shadow-sm flex items-center gap-1.5 transition-shadow" id="btn-login-redirect">
            <UserIcon size={14} />
            <span>Войти</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
