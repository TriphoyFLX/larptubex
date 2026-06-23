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
    return <div className="flex-1 yt-page p-6 animate-pulse space-y-4 h-96"></div>;
  }

  const totalResults = results.videos.length + results.channels.length + results.shorts.length + results.posts.length;

  return (
    <div className="flex-1 yt-page p-6 max-w-4xl mx-auto" id="search-view">
      <div className="yt-border-b pb-3 mb-6">
        <h2 className="font-sans font-bold text-sm yt-text-primary uppercase tracking-wider flex items-center gap-2">
          <SearchIcon size={14} className="yt-text-secondary" />
          Результаты поиска по запросу: <span className="text-yt-red italic">"{query}"</span>
        </h2>
        <span className="text-[10px] yt-text-muted font-semibold block mt-1">Найдено совпадений: {totalResults}</span>
      </div>

      {totalResults === 0 ? (
        <div className="text-center py-20 yt-text-muted font-medium text-xs">
          Ничего не найдено. Пожалуйста, попробуйте изменить условия поиска или ввести другое ключевое слово.
        </div>
      ) : (
        <div className="space-y-8" id="search-results-cluster">
          {/* 1. SECTION CHANNELS */}
          {results.channels.length > 0 && (
            <div>
              <h3 className="text-xs font-bold yt-text-primary yt-border-b pb-1 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Users size={12} /> Каналы</h3>
              <div className="flex flex-col gap-3">
                {results.channels.map((chan) => (
                  <Link key={chan.id} to={`/channel/${chan.id}`} className="flex items-center gap-4 yt-surface border p-3 border-[var(--yt-border)] yt-hover rounded-sm">
                    <img src={chan.avatar || DEFAULT_AVATAR} className="w-12 h-12 rounded-full border border-[var(--yt-border)] object-cover shrink-0" alt="Avatar" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs yt-text-primary block hover:text-[#3ea6ff] truncate">{chan.displayName}</span>
                      <p className="text-[11px] yt-text-secondary line-clamp-1 truncate mt-0.5">{chan.bio || 'Этот канал пока без описания.'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 2. SECTION VIDEOS */}
          {results.videos.length > 0 && (
            <div>
              <h3 className="text-xs font-bold yt-text-primary yt-border-b pb-1 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Play size={12} /> Видеоролики</h3>
              <div className="flex flex-col gap-4">
                {results.videos.map((v) => (
                  <Link key={v.id} to={`/watch/${v.id}`} className="group flex flex-col sm:flex-row gap-4 yt-border-b pb-4 last:border-0" id={`search-v-${v.id}`}>
                    <div className="relative aspect-video w-full sm:w-56 overflow-hidden border border-[var(--yt-border)] bg-black shrink-0">
                      <img src={v.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Thumb" />
                      <span className="absolute bottom-1 right-1 bg-black/85 text-white font-mono text-[9px] px-1 rounded">{v.duration}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-sans font-bold text-xs yt-text-primary leading-tight uppercase-none hover:text-[#3ea6ff] line-clamp-2">{v.title}</h4>
                      <span className="text-[10px] yt-text-muted font-semibold block mt-1">{v.authorName}</span>
                      <span className="text-[9px] yt-text-muted block mt-0.5">{formatViews(v.views)} • {formatRelativeDate(v.createdAt)}</span>
                      <p className="text-[11px] yt-text-secondary mt-2 line-clamp-2 leading-relaxed yt-desc-box p-2 italic">{v.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 3. SECTION SHORTS */}
          {results.shorts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold yt-text-primary yt-border-b pb-1 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Flame size={12} className="text-red-500" /> Короткие Shorts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {results.shorts.map((s) => (
                  <Link key={s.id} to="/shorts" className="block border border-[var(--yt-border)] rounded yt-surface p-2 yt-hover text-center">
                    <span className="font-bold text-[11px] yt-text-primary block truncate leading-tight uppercase-none">{s.title}</span>
                    <span className="text-[10px] yt-text-muted mt-1 block">{formatViews(s.views)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.posts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold yt-text-primary yt-border-b pb-1 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={12} /> Записи сообщества
              </h3>
              <div className="flex flex-col gap-3">
                {results.posts.map((p) => (
                  <Link key={p.id} to="/community" className="block yt-surface border border-[var(--yt-border)] p-3 rounded-sm yt-hover">
                    <span className="font-bold text-[10px] yt-text-secondary block mb-1">{p.authorName}</span>
                    <p className="text-xs yt-text-primary line-clamp-3">{p.content}</p>
                    <span className="text-[9px] yt-text-muted mt-1 block">{formatRelativeDate(p.createdAt)}</span>
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
