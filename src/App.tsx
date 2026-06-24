import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useMediaQuery } from './hooks/useMediaQuery';

import Navbar from './components/Navbar.tsx';
import Sidebar from './components/Sidebar.tsx';
import MobileBottomNav from './components/MobileBottomNav.tsx';
import BrandLogo from './components/BrandLogo.tsx';
import { SITE, setPageMeta } from './seo.ts';

import Home from './pages/Home.tsx';
import Watch from './pages/Watch.tsx';
import Shorts from './pages/Shorts.tsx';
import Channel from './pages/Channel.tsx';
import PlaylistDetail from './pages/PlaylistDetail.tsx';
import Community from './pages/Community.tsx';
import Search from './pages/Search.tsx';
import Upload from './pages/Upload.tsx';
import Admin from './pages/Admin.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import HistoryPage from './pages/History.tsx';
import Settings from './pages/Settings.tsx';

export default function App() {
  const { initialize, initializing } = useAuthStore();
  const { initialize: initTheme } = useThemeStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initTheme();
    initialize();
    setPageMeta({ title: SITE.title, description: SITE.description });
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (initializing) {
    return (
      <div className="min-h-screen yt-app flex flex-col items-center justify-center p-6 select-none font-sans">
        <BrandLogo variant="splash" linked={false} className="mb-4" />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yt-red rounded-full animate-bounce" />
          <div className="w-1.5 h-1.5 bg-yt-red rounded-full animate-bounce delay-150" />
          <div className="w-1.5 h-1.5 bg-yt-red rounded-full animate-bounce delay-300" />
        </div>
        <p className="text-[10px] yt-text-muted mt-4 uppercase font-bold tracking-widest">Загрузка...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col yt-app font-sans" id="larptubex-app">
        <Navbar onSidebarToggle={toggleSidebar} />
        <div className="flex flex-1 relative">
          <Sidebar isOpen={sidebarOpen} isMobile={!isDesktop} onClose={closeSidebar} />
          <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-56px)] pb-14 lg:pb-0 w-full min-w-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/watch/:id" element={<Watch />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/channel/:id" element={<Channel />} />
              <Route path="/playlist/:id" element={<PlaylistDetail />} />
              <Route path="/community" element={<Community />} />
              <Route path="/search" element={<Search />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </Router>
  );
}
