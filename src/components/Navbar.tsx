import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Upload, LogOut, ShieldAlert, User as UserIcon, Menu, Settings, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import { useThemeStore } from '../store/themeStore.ts';
import api from '../api/index.ts';
import { Notification } from '../types.ts';
import { formatRelativeDate, DEFAULT_AVATAR, formatChannelHandle } from '../utils.ts';
import BrandLogo from './BrandLogo.tsx';

export default function Navbar({ onSidebarToggle }: { onSidebarToggle: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { resolved, toggle } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchNotifications();
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
    <nav className="sticky top-0 z-40 yt-navbar border-b h-14 flex items-center justify-between px-4" id="yt-navbar">
      <div className="flex items-center gap-4">
        <button
          onClick={onSidebarToggle}
          className="p-2 rounded-full yt-hover yt-text-secondary"
          id="btn-sidebar-toggle"
        >
          <Menu size={20} />
        </button>
        <BrandLogo variant="navbar" />
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-[640px] px-4 lg:px-8" id="search-form">
        <div className="relative flex w-full">
          <input
            type="text"
            placeholder="Введите запрос"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 px-4 border yt-search rounded-l-full text-sm shadow-inner focus:border-[#1c62b9]"
            id="search-input"
          />
        </div>
        <button
          type="submit"
          className="h-10 px-5 flex items-center yt-surface border border-l-0 rounded-r-full yt-text-secondary yt-hover"
          id="search-button"
        >
          <Search size={16} />
        </button>
      </form>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggle}
          className="p-2 rounded-full yt-hover yt-text-secondary hidden sm:flex"
          title={resolved === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          id="btn-theme-toggle"
        >
          {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <>
            <Link
              to="/upload"
              className="yt-hover yt-text-secondary p-2 rounded-full hidden sm:flex items-center gap-1.5"
              id="link-upload"
              title="Добавить видео"
            >
              <Upload size={20} />
            </Link>

            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full yt-hover yt-text-secondary"
                id="btn-notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-yt-red text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 yt-dropdown rounded-xl overflow-hidden z-50" id="notifications-box">
                  <div className="px-4 py-3 yt-border-b flex justify-between items-center">
                    <span className="font-semibold text-sm yt-text-primary">Уведомления</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm yt-text-muted">Нет уведомлений</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-3 yt-border-b flex gap-3 yt-hover cursor-pointer ${!n.isRead ? 'bg-yt-red/10' : ''}`}
                        >
                          <img src={n.triggerUserAvatar || DEFAULT_AVATAR} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-xs yt-text-primary leading-tight">{n.title}</h4>
                            <p className="text-xs yt-text-secondary mt-0.5 line-clamp-2">{n.body}</p>
                            <span className="text-[10px] yt-text-muted mt-1 block">{formatRelativeDate(n.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={userRef}>
              <button onClick={() => setShowUserDropdown(!showUserDropdown)} className="flex items-center focus:outline-none" id="btn-user-menu">
                <img
                  src={user.avatar || DEFAULT_AVATAR}
                  className="w-8 h-8 rounded-full object-cover border-2 border-transparent hover:border-yt-red transition-all"
                  alt="user avatar"
                />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 yt-dropdown rounded-xl overflow-hidden z-50" id="user-menu-dropdown">
                  <div className="p-3 yt-border-b">
                    <p className="font-bold text-sm yt-text-primary truncate">{user.displayName}</p>
                    <p className="text-xs yt-text-secondary truncate">{formatChannelHandle(user)}</p>
                  </div>
                  <div className="flex flex-col text-sm">
                    <Link to={`/channel/${user.id}`} className="p-3 yt-hover font-medium flex items-center gap-3 yt-text-primary">
                      <UserIcon size={16} className="yt-text-muted" />
                      Мой канал
                    </Link>
                    <Link to="/settings" className="p-3 yt-hover font-medium flex items-center gap-3 yt-text-primary">
                      <Settings size={16} className="yt-text-muted" />
                      Настройка канала
                    </Link>
                    <Link to="/settings" state={{ tab: 'appearance' }} className="p-3 yt-hover font-medium flex items-center gap-3 yt-text-primary sm:hidden">
                      {resolved === 'dark' ? <Sun size={16} className="yt-text-muted" /> : <Moon size={16} className="yt-text-muted" />}
                      Оформление
                    </Link>
                    {user.isAdmin && (
                      <Link to="/admin" className="p-3 yt-hover font-bold flex items-center gap-3 text-yt-red">
                        <ShieldAlert size={16} />
                        Панель админа
                      </Link>
                    )}
                    <button onClick={logout} className="p-3 yt-hover font-medium text-left flex items-center gap-3 yt-text-secondary yt-border-t w-full">
                      <LogOut size={16} className="yt-text-muted" />
                      Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link to="/login" className="flex items-center gap-2 border yt-border rounded-full px-4 py-2 text-sm font-medium yt-text-primary yt-hover" id="btn-login-redirect">
            <UserIcon size={16} />
            <span>Войти</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
