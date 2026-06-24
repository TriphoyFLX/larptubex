import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Upload, LogOut, ShieldAlert, User as UserIcon, Menu, Settings, Moon, Sun, X } from 'lucide-react';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (searchOpen) {
      mobileSearchRef.current?.focus();
    }
  }, [searchOpen]);

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
      setSearchOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <nav className="sticky top-0 z-40 yt-navbar border-b h-14 flex items-center justify-between px-2 sm:px-4 gap-2" id="yt-navbar">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-full yt-hover yt-text-secondary"
            id="btn-sidebar-toggle"
            aria-label="Меню"
          >
            <Menu size={20} />
          </button>
          <BrandLogo variant="navbar" />
        </div>

        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-[640px] px-2 lg:px-8 min-w-0" id="search-form">
          <div className="relative flex w-full min-w-0">
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
            className="h-10 px-4 sm:px-5 flex items-center yt-surface border border-l-0 rounded-r-full yt-text-secondary yt-hover shrink-0"
            id="search-button"
          >
            <Search size={16} />
          </button>
        </form>

        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-full yt-hover yt-text-secondary"
            aria-label="Поиск"
          >
            <Search size={20} />
          </button>

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
                  aria-label="Уведомления"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-yt-red text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-1rem))] yt-dropdown rounded-xl overflow-hidden z-50" id="notifications-box">
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
                <button onClick={() => setShowUserDropdown(!showUserDropdown)} className="flex items-center focus:outline-none p-1" id="btn-user-menu">
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
                      <Link to="/upload" className="p-3 yt-hover font-medium flex items-center gap-3 yt-text-primary sm:hidden">
                        <Upload size={16} className="yt-text-muted" />
                        Добавить видео
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
            <Link to="/login" className="flex items-center gap-1.5 border yt-border rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium yt-text-primary yt-hover shrink-0" id="btn-login-redirect">
              <UserIcon size={16} />
              <span className="hidden sm:inline">Войти</span>
            </Link>
          )}
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 top-14 z-50 yt-navbar border-b md:hidden px-3 py-2 flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-0">
            <input
              ref={mobileSearchRef}
              type="text"
              placeholder="Введите запрос"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 px-4 border yt-search rounded-l-full text-sm"
            />
            <button
              type="submit"
              className="h-10 px-4 flex items-center yt-surface border border-l-0 rounded-r-full yt-text-secondary shrink-0"
            >
              <Search size={16} />
            </button>
          </form>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="p-2 rounded-full yt-hover yt-text-secondary shrink-0"
            aria-label="Закрыть поиск"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}
