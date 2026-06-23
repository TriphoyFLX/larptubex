import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock } from 'lucide-react';
import api from '../api/index.ts';
import { useAuthStore } from '../store/authStore.ts';
import { Video, Category, WatchHistoryEntry } from '../types.ts';
import { formatViews, formatRelativeDate, formatVideoDuration } from '../utils.ts';

export default function Home() {
  const { user } = useAuthStore();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [activeCategory]);

  useEffect(() => {
    if (user) {
      api.get('/api/watch/continue', { params: { limit: 8 } })
        .then((res) => setContinueWatching(res.data || []))
        .catch(() => setContinueWatching([]));
    } else {
      setContinueWatching([]);
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/categories');
      setCategories(res.data);
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeCategory) {
        params.category = activeCategory;
      }
      const res = await api.get('/api/videos', { params });
      setVideos(res.data);
    } catch (e) {
      console.error('Error loading videos:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-white p-6" id="home-view">
      {/* Category Slider Rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-[#eee] uppercase text-[11px]" id="categories-tabs-rail">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 font-bold rounded-sm transition-all border ${activeCategory === null ? 'bg-[#333] border-[#333] text-white' : 'bg-[#f8f8f8] hover:bg-[#efefef] border-[#ccc] text-[#333] shadow-sm'}`}
        >
          Все видео
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-3 py-1.5 font-bold rounded-sm transition-all border shrink-0 ${activeCategory === c.id ? 'bg-[#333] border-[#333] text-white' : 'bg-[#f8f8f8] hover:bg-[#efefef] border-[#ccc] text-[#333] shadow-sm'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {continueWatching.length > 0 && (
        <section className="mb-8" id="continue-watching-section">
          <div className="flex items-center justify-between mb-4 border-b border-[#eee] pb-3">
            <h2 className="text-base font-bold text-[#222] flex items-center gap-2">
              <Clock size={16} className="text-yt-red" />
              Продолжить просмотр
            </h2>
            <Link to="/history" className="text-[10px] font-bold text-blue-600 hover:underline uppercase">
              Вся история →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {continueWatching.map((entry) => (
              <Link
                key={entry.id}
                to={`/watch/${entry.videoId}`}
                className="group shrink-0 w-44"
              >
                <div className="relative aspect-video bg-[#eee] border border-[#ddd] overflow-hidden">
                  <img
                    src={entry.thumbnailUrl}
                    alt={entry.title}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                  {entry.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[10px] font-bold px-1">
                      {entry.duration}
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
                    <div
                      className="h-full bg-yt-red"
                      style={{ width: `${entry.progressPercent}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <Play size={24} className="text-white fill-white" />
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-[#333] mt-1.5 line-clamp-2 group-hover:text-blue-600">
                  {entry.title}
                </h3>
                <p className="text-[10px] text-yt-red font-bold mt-0.5">
                  {formatVideoDuration(entry.progressSeconds)} / {entry.duration || formatVideoDuration(entry.durationSeconds)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-between items-center mb-5 border-b border-[#eee] pb-4">
        <h2 className="text-lg font-medium text-[#222]" id="home-title-heading">
          Рекомендованные видео
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="skeleton-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="bg-[#eee] border border-[#ddd] h-36 w-full rounded-sm"></div>
              <div className="h-4 bg-[#eee] rounded-sm w-3/4"></div>
              <div className="h-3 bg-[#eee] rounded-sm w-1/2"></div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-gray-400 font-medium text-xs">
          В данной категории пока еще нет загруженных видео. Станьте первым автором!
        </div>
      ) : (
        /* Video cards grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8" id="videos-showcase-grid">
          {videos.map((video) => (
            <div key={video.id} className="flex flex-col gap-2 group cursor-pointer" id={`video-card-${video.id}`}>
              {/* Thumbnail Container */}
              <Link to={`/watch/${video.id}`} className="relative aspect-video w-full bg-[#eee] border border-[#ddd]">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                />
                {/* Duration Tag */}
                <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[11px] font-bold px-1 rounded-sm select-none">
                  {video.duration}
                </span>
              </Link>

              {/* Video Info metadata in Clean Minimalism */}
              <div className="flex flex-col">
                <Link to={`/watch/${video.id}`} className="block">
                  <h3 className="text-sm font-semibold leading-tight text-[#333] mb-1 line-clamp-2 hover:text-blue-600 transition-colors">
                    {video.title}
                  </h3>
                </Link>
                <div className="flex items-center gap-1">
                  <Link to={`/channel/${video.authorId}`} className="text-xs text-[#767676] hover:text-[#333] cursor-pointer truncate font-medium">
                    {video.authorName}
                  </Link>
                </div>
                {/* View count & relative time */}
                <p className="text-xs text-[#767676] mt-0.5">
                  {formatViews(video.views)} • {formatRelativeDate(video.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
