import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Components
import Navbar from './components/Navbar.tsx';
import Sidebar from './components/Sidebar.tsx';

// Pages
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

export default function App() {
  const { initialize, loading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Hydrate tokens and synchronize active sessions on startup
    initialize();
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="bg-[#cc181e] text-white font-black text-xs px-2.5 py-0.5 rounded-sm tracking-tight uppercase">LARP</span>
          <span className="font-display font-black text-xl tracking-tight text-gray-950">Tube<span className="text-[#cc181e]">X</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#cc181e] rounded-full animate-bounce delay-75"></div>
          <div className="w-1.5 h-1.5 bg-[#cc181e] rounded-full animate-bounce delay-150"></div>
          <div className="w-1.5 h-1.5 bg-[#cc181e] rounded-full animate-bounce delay-300"></div>
        </div>
        <p className="text-[10px] text-gray-400 mt-4 uppercase font-bold tracking-widest">Инициализация ретро-платформы...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans" id="larptubex-app">
        {/* Navigation Bar */}
        <Navbar onSidebarToggle={toggleSidebar} />

        {/* Lower Main Area */}
        <div className="flex flex-1 relative">
          {/* Dynamic Left sidebar panel drawer */}
          <Sidebar isOpen={sidebarOpen} />

          {/* Core Scrollable Content Route Outlets */}
          <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-50px)]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/watch/:id" element={<Watch />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/channel/:id" element={<Channel />} />
              <Route path="/playlist/:id" element={<PlaylistDetail />} />
              <Route path="/community" element={<Community />} />
              <Route path="/search" element={<Search />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
