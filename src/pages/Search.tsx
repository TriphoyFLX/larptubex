import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Play, Flame, Users, BookOpen, Clock, Eye } from 'lucide-react';
import api from '../api/index.ts';
import { Video, User, Short, CommunityPost } from '../types.ts';
import { formatViews, formatRelativeDate, DEFAULT_AVATAR } from '../utils.ts';

interface SearchResults {
  videos: Video[];
  channels: any[];
  shorts: Short[];
  posts: CommunityPost[];
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResults>({ videos: [], channels: [], shorts: [], posts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      runQuerySearch();
    }
  }, [query]);

  const runQuerySearch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/search', { params: { q: query } });
      setResults(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex-1 bg-white p-6 animate-pulse space-y-4 h-96"></div>;
  }

  const totalResults = results.videos.length + results.channels.length + results.shorts.length + results.posts.length;

  return (
    <div className="flex-1 bg-white p-6 max-w-4xl mx-auto" id="search-view">
      <div className="border-b border-gray-200 pb-3 mb-6">
        <h2 className="font-sans font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <SearchIcon size={14} className="text-gray-500" />
          Результаты поиска по запросу: <span className="text-yt-red italic">"{query}"</span>
        </h2>
        <span className="text-[10px] text-gray-400 font-semibold block mt-1">Найдено совпадений: {totalResults}</span>
      </div>

      {totalResults === 0 ? (
        <div className="text-center py-20 text-gray-400 font-medium text-xs">
          Ничего не найдено. Пожалуйста, попробуйте изменить условия поиска или ввести другое ключевое слово.
        </div>
      ) : (
        <div className="space-y-8" id="search-results-cluster">
          {/* 1. SECTION CHANNELS */}
          {results.channels.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Users size={12} /> Каналы</h3>
              <div className="flex flex-col gap-3">
                {results.channels.map((chan) => (
                  <Link key={chan.id} to={`/channel/${chan.id}`} className="flex items-center gap-4 bg-gray-50 border p-3 border-gray-200 hover:border-gray-300 rounded-sm">
                    <img src={chan.avatar || DEFAULT_AVATAR} className="w-12 h-12 rounded-full border object-cover shrink-0" alt="Avatar" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-gray-950 block hover:text-blue-600 truncate">{chan.displayName}</span>
                      <p className="text-[11px] text-gray-500 line-clamp-1 truncate mt-0.5">{chan.bio || 'Этот канал пока без описания.'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 2. SECTION VIDEOS */}
          {results.videos.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Play size={12} /> Видеоролики</h3>
              <div className="flex flex-col gap-4">
                {results.videos.map((v) => (
                  <Link key={v.id} to={`/watch/${v.id}`} className="group flex flex-col sm:flex-row gap-4 border-b border-gray-50 pb-4 last:border-0" id={`search-v-${v.id}`}>
                    <div className="relative aspect-video w-full sm:w-56 overflow-hidden border border-gray-200 bg-black shrink-0">
                      <img src={v.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Thumb" />
                      <span className="absolute bottom-1 right-1 bg-black/85 text-white font-mono text-[9px] px-1 rounded">{v.duration}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-sans font-bold text-xs text-gray-950 leading-tight uppercase-none hover:text-blue-600 line-clamp-2">{v.title}</h4>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-1">{v.authorName}</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{formatViews(v.views)} • {formatRelativeDate(v.createdAt)}</span>
                      <p className="text-[11px] text-gray-600 mt-2 line-clamp-2 leading-relaxed bg-gray-50/50 p-2 border border-gray-100/60 rounded-sm italic">{v.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 3. SECTION SHORTS */}
          {results.shorts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Flame size={12} className="text-red-500" /> Короткие Shorts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {results.shorts.map((s) => (
                  <Link key={s.id} to="/shorts" className="block border border-gray-100 rounded bg-gray-50 p-2 hover:border-gray-200 text-center">
                    <span className="font-bold text-[11px] text-gray-950 block truncate leading-tight uppercase-none">{s.title}</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">{formatViews(s.views)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.posts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={12} /> Записи сообщества
              </h3>
              <div className="flex flex-col gap-3">
                {results.posts.map((p) => (
                  <Link key={p.id} to="/community" className="block bg-gray-50 border border-gray-200 p-3 rounded-sm hover:border-gray-300">
                    <span className="font-bold text-[10px] text-gray-500 block mb-1">{p.authorName}</span>
                    <p className="text-xs text-gray-800 line-clamp-3">{p.content}</p>
                    <span className="text-[9px] text-gray-400 mt-1 block">{formatRelativeDate(p.createdAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
