import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Clock, Award, Play } from 'lucide-react';
import api from '../api/index.ts';
import { Video, Category } from '../types.ts';
import { formatViews, formatRelativeDate } from '../utils.ts';

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [activeCategory]);

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
