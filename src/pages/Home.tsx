import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import api from '../api/index.ts';
import { useAuthStore } from '../store/authStore.ts';
import { Video, Category, WatchHistoryEntry } from '../types.ts';
import { formatViews, formatRelativeDate, formatVideoDuration, normalizeVideoList } from '../utils.ts';
import { SITE, setPageMeta } from '../seo.ts';
import VideoThumbnail from '../components/VideoThumbnail.tsx';

export default function Home() {
  const { user } = useAuthStore();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({ title: SITE.title, description: SITE.description });
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [activeCategory, user]);

  useEffect(() => {
    if (user) {
      api.get('/api/watch/continue', { params: { limit: 8 } })
        .then((res) => {
          const data = res.data;
          setContinueWatching(Array.isArray(data) ? data : []);
        })
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
      const params: Record<string, string | number> = { limit: 24 };
      if (activeCategory) {
        params.category = activeCategory;
      }

      let list: Video[] = [];
      try {
        const res = await api.get('/api/recommendations/home', { params });
        list = normalizeVideoList<Video>(res.data);
      } catch {
        // fall through to legacy feed
      }

      if (list.length === 0) {
        const fallbackParams = activeCategory ? { category: activeCategory } : {};
        const fallback = await api.get('/api/videos', { params: fallbackParams });
        list = normalizeVideoList<Video>(fallback.data);
      }

      setVideos(list);
    } catch (e) {
      console.error('Error loading videos:', e);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 yt-page p-3 sm:p-4 lg:p-6 w-full max-w-[2560px] mx-auto" id="home-view">
      {/* Category Slider Rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 yt-border-b uppercase text-[11px]" id="categories-tabs-rail">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 font-bold rounded-sm transition-all border ${activeCategory === null ? 'yt-chip-active' : 'yt-chip yt-hover shadow-sm'}`}
        >
          Все видео
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-3 py-1.5 font-bold rounded-sm transition-all border shrink-0 ${activeCategory === c.id ? 'yt-chip-active' : 'yt-chip yt-hover shadow-sm'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {continueWatching.length > 0 && (
        <section className="mb-8" id="continue-watching-section">
          <div className="flex items-center justify-between mb-4 yt-border-b pb-3">
            <h2 className="text-base font-bold yt-text-primary flex items-center gap-2">
              <Clock size={16} className="text-yt-red" />
              Продолжить просмотр
            </h2>
            <Link to="/history" className="text-[10px] font-bold text-[#3ea6ff] hover:underline uppercase">
              Вся история →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {continueWatching.map((entry) => (
              <div key={entry.id} className="group shrink-0 w-44">
                <div className="relative">
                  <VideoThumbnail
                    src={entry.thumbnailUrl || ''}
                    alt={entry.title}
                    duration={entry.duration}
                    to={`/watch/${entry.videoId}`}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50 rounded-b-xl overflow-hidden pointer-events-none">
                    <div
                      className="h-full bg-yt-red"
                      style={{ width: `${entry.progressPercent}%` }}
                    />
                  </div>
                </div>
                <Link to={`/watch/${entry.videoId}`}>
                  <h3 className="text-xs font-semibold yt-text-primary mt-1.5 line-clamp-2 group-hover:text-[#3ea6ff]">
                    {entry.title}
                  </h3>
                  <p className="text-[10px] text-yt-red font-bold mt-0.5">
                    {formatVideoDuration(entry.progressSeconds)} / {entry.duration || formatVideoDuration(entry.durationSeconds)}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-between items-center mb-5 yt-border-b pb-4">
        <h2 className="text-lg font-medium yt-text-primary" id="home-title-heading">
          {activeCategory ? 'Рекомендации в категории' : 'Рекомендованные видео'}
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 sm:gap-x-4 gap-y-6 sm:gap-y-10" id="skeleton-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="yt-skeleton w-full aspect-video rounded-xl" />
              <div className="h-4 yt-skeleton rounded w-3/4" />
              <div className="h-3 yt-skeleton rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 yt-text-muted font-medium text-xs">
          В данной категории пока еще нет загруженных видео. Станьте первым автором!
        </div>
      ) : (
        /* Video cards grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 sm:gap-x-4 gap-y-6 sm:gap-y-10" id="videos-showcase-grid">
          {videos.map((video) => (
            <div key={video.id} className="flex flex-col gap-2.5 group" id={`video-card-${video.id}`}>
              <VideoThumbnail
                src={video.thumbnailUrl}
                alt={video.title}
                duration={video.duration}
                to={`/watch/${video.id}`}
                showHoverPlay
              />
              <div className="flex flex-col px-0.5">
                <Link to={`/watch/${video.id}`} className="block">
                  <h3 className="text-sm font-semibold leading-snug yt-text-primary mb-1 line-clamp-2 group-hover:text-[#3ea6ff] transition-colors">
                    {video.title}
                  </h3>
                </Link>
                <Link to={`/channel/${video.authorId}`} className="text-xs yt-text-secondary hover:yt-text-primary truncate font-medium">
                  {video.authorName}
                </Link>
                <p className="text-xs yt-text-secondary mt-0.5">
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
