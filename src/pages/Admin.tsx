import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Film, MessageSquare, Trash2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../store/authStore.ts';
import api from '../api/index.ts';
import { DEFAULT_AVATAR } from '../utils.ts';

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [channels, setChannels] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [shorts, setShorts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<'stats' | 'users' | 'videos' | 'shorts' | 'posts'>('stats');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate('/');
      return;
    }
    loadAdminDashboard();
  }, [user]);

  const loadAdminDashboard = async () => {
    setLoading(true);
    try {
      // 1. Fetch channel lists
      const usersRes = await api.get('/api/admin/users');
      setChannels(usersRes.data);

      // 2. Fetch structural videos
      const videosRes = await api.get('/api/videos');
      setVideos(videosRes.data);

      // 3. Fetch shorts
      const shortsRes = await api.get('/api/shorts');
      setShorts(shortsRes.data);

      // 4. Fetch posts
      const postsRes = await api.get('/api/posts');
      setPosts(postsRes.data);

      const statsRes = await api.get('/api/admin/stats');
      setStats(statsRes.data);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeAuthorizeUser = async (id: number) => {
    if (!confirm('Вы действительно хотите НАВСЕГДА деактивировать аккаунт этого пользователя?')) return;
    try {
      await api.delete(`/api/admin/users/${id}`);
      setChannels(channels.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVideo = async (id: number) => {
    if (!confirm('Вы действительно хотите удалить это стандартное видео?')) return;
    try {
      await api.delete(`/api/admin/videos/${id}`);
      setVideos(videos.filter((v) => v.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteShort = async (id: number) => {
    if (!confirm('Вы действительно хотите удалить этот клип Shorts?')) return;
    try {
      await api.delete(`/api/admin/shorts/${id}`);
      setShorts(shorts.filter((s) => s.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!confirm('Вы действительно хотите удалить этот пост сообщества?')) return;
    try {
      await api.delete(`/api/admin/posts/${id}`);
      setPosts(posts.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const chartData = stats
    ? [
        { name: 'Пользователи', count: stats.users },
        { name: 'Видео', count: stats.videos },
        { name: 'Shorts', count: stats.shorts },
        { name: 'Посты', count: stats.posts },
        { name: 'Комментарии', count: stats.comments },
        { name: 'Лайки', count: stats.likes },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex-1 bg-white p-6 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 w-1/4 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(idx => <div key={idx} className="h-20 bg-gray-100 rounded"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white p-6" id="admin-view">
      {/* Header banner */}
      <div className="border-b border-gray-200 pb-3 mb-6 flex justify-between items-center bg-red-50/40 p-4 border rounded">
        <div>
          <h1 className="font-sans font-bold text-sm text-gray-950 uppercase tracking-widest flex items-center gap-2">
            <Shield size={16} className="text-yt-red" />
            Панель управления LarpTubeX Администратора
          </h1>
          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Добро пожаловать в центр комплексной системной модерации.</p>
        </div>
        <span className="bg-red-200 border border-red-300 text-yt-darkred font-bold text-[10px] px-2.5 py-0.5 select-none uppercase">
          Права: Root Admin
        </span>
      </div>

      {/* Tabs list representation */}
      <div className="flex text-xs font-bold border-b border-gray-200 uppercase mb-6" id="admin-dashboard-tabs">
        {(['stats', 'users', 'videos', 'shorts', 'posts'] as const).map((t) => {
          const names = {
            stats: 'Аналитика / Графики',
            users: 'Каналы / Пользователи',
            videos: 'Модерация Видео',
            shorts: 'Модерация Shorts',
            posts: 'Записи Сообщества',
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 px-4 border-b-2 transition-all ${tab === t ? 'border-yt-red text-yt-red font-black' : 'border-transparent text-gray-500 font-semibold'}`}
            >
              {names[t]}
            </button>
          );
        })}
      </div>

      {/* Contents modules */}
      {tab === 'stats' && (
        <div className="space-y-6" id="stats-dashboard">
          {/* Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-sm flex items-center gap-3">
              <Users className="text-blue-500" size={24} />
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Авторы / Каналы</span>
                <span className="text-sm font-bold text-gray-900">{stats?.users ?? channels.length}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-sm flex items-center gap-3">
              <Film className="text-yt-red" size={24} />
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Видео Клипы</span>
                <span className="text-sm font-bold text-gray-900">{stats?.videos ?? videos.length}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-sm flex items-center gap-3">
              <Film className="text-purple-500" size={24} />
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Shorts клипы</span>
                <span className="text-sm font-bold text-gray-900">{stats?.shorts ?? shorts.length}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-sm flex items-center gap-3">
              <MessageSquare className="text-green-500" size={24} />
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Посты сообщества</span>
                <span className="text-sm font-bold text-gray-900">{stats?.posts ?? posts.length}</span>
              </div>
            </div>
          </div>

          {/* Chart metrics */}
          <div className="bg-white border border-gray-200 p-5 rounded-sm">
            <h3 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" />
              Статистика платформы (реальные данные из БД)
            </h3>
            {stats && (
              <p className="text-[10px] text-gray-500 mb-2">Всего просмотров: {stats.totalViews?.toLocaleString() ?? 0}</p>
            )}
            <div className="h-64 mt-4" id="chart-panel">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#888" style={{ fontSize: 10 }} />
                  <YAxis stroke="#888" style={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#cc181e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 2. CHANNELS TABLE */}
      {tab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden" id="admin-users-table">
          <table className="w-full text-xs text-left text-gray-700">
            <thead className="bg-gray-50 border-b text-[10px] uppercase font-bold text-gray-500">
              <tr>
                <th className="p-3">Аватар / ID</th>
                <th className="p-3">Название канала</th>
                <th className="p-3">Эл. почта</th>
                <th className="p-3">Статус Role</th>
                <th className="p-3 text-right">Модерация</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {channels.map((chan) => (
                <tr key={chan.id} className="hover:bg-gray-50/50">
                  <td className="p-3 flex items-center gap-2">
                    <img src={chan.avatar || DEFAULT_AVATAR} className="w-6 h-6 rounded-full object-cover border" alt="V" />
                    <span className="font-mono font-bold text-[10px] text-gray-400">#{chan.id}</span>
                  </td>
                  <td className="p-3 font-bold">{chan.displayName}</td>
                  <td className="p-3 font-mono">{chan.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${chan.isAdmin ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                      {chan.isAdmin ? 'ADMIN' : 'USER'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {!chan.isAdmin && (
                      <button onClick={() => handleDeAuthorizeUser(chan.id)} className="text-red-500 font-bold hover:underline uppercase text-[10px]">
                        Деактивировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. VIDEOS MODERATION */}
      {tab === 'videos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="admin-videos-mod">
          {videos.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-10 col-span-full italic">На платформе отсутствуют стандартные видео.</p>
          ) : (
            videos.map((v) => (
              <div key={v.id} className="border border-gray-200 bg-gray-50 rounded-sm overflow-hidden flex flex-col p-3">
                <div className="aspect-video bg-black relative border">
                  <img src={v.thumbnailUrl} className="w-full h-full object-cover" alt="Cover" />
                </div>
                <h4 className="font-bold text-[11px] text-gray-950 mt-2 truncate">{v.title}</h4>
                <p className="text-[10px] text-gray-400 mt-1">Автор: {v.authorName}</p>
                <div className="flex justify-between items-center mt-3 border-t pt-2.5">
                  <span className="text-[9px] text-gray-400 uppercase font-black">Просмотры: {v.views}</span>
                  <button onClick={() => handleDeleteVideo(v.id)} className="p-1 px-2.5 border border-red-300 bg-red-50 text-red-600 rounded text-[10px] font-bold hover:bg-red-100 transition-colors flex items-center gap-1 uppercase select-none">
                    <Trash2 size={11} /> Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. SHORTS MODERATION */}
      {tab === 'shorts' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="admin-shorts-mod">
          {shorts.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-10 col-span-full italic">На платформе отсутствуют короткие клипы Shorts.</p>
          ) : (
            shorts.map((s) => (
              <div key={s.id} className="border border-gray-200 bg-gray-50 rounded-sm overflow-hidden flex flex-col p-2.5">
                <span className="font-bold text-[11px] text-gray-950 leading-tight block truncate uppercase-none">{s.title}</span>
                <p className="text-[9px] text-gray-400 mt-1">Автор: {s.authorName}</p>
                <button onClick={() => handleDeleteShort(s.id)} className="mt-4 w-full border border-red-300 bg-red-100/30 text-red-600 hover:bg-red-100 rounded text-[9px] font-black uppercase py-1 select-none flex items-center justify-center gap-1">
                  <Trash2 size={11} /> Удалить клип
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. POSTS MODERATION */}
      {tab === 'posts' && (
        <div className="space-y-4" id="admin-posts-mod">
          {posts.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-10 italic">Записи в ленте сообщества отсутствуют.</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="border border-gray-200 p-4 rounded-sm bg-gray-50 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <span className="font-bold text-xs text-gray-950 block mb-1">
                    Пост от @{p.authorName} <span className="font-normal text-[10px] text-gray-400">({new Date(p.createdAt).toLocaleDateString()})</span>
                  </span>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{p.content}</p>
                </div>
                <button onClick={() => handleDeletePost(p.id)} className="text-red-500 font-bold hover:underline uppercase text-[10px]">
                  Удалить запись
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
