import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { History, Trash2, Play, Clock, CheckCircle2, Flame } from 'lucide-react';
import api from '../api/index.ts';
import { useAuthStore } from '../store/authStore.ts';
import { WatchHistoryEntry } from '../types.ts';
import { formatViews, formatRelativeDate, formatVideoDuration, DEFAULT_AVATAR } from '../utils.ts';

type FilterTab = 'all' | 'continue' | 'completed';

export default function HistoryPage() {
  const { user } = useAuthStore();
  const [videos, setVideos] = useState<WatchHistoryEntry[]>([]);
  const [shorts, setShorts] = useState<WatchHistoryEntry[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (user) fetchHistory();
    else setLoading(false);
  }, [user, filter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/watch/history', { params: { filter } });
      setVideos(res.data.videos || []);
      setShorts(res.data.shorts || []);
    } catch (e) {
      console.error('History fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const removeEntry = async (id: number, type: 'video' | 'short') => {
    try {
      await api.delete(`/api/watch/history/${id}`, { params: { type } });
      if (type === 'video') {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      } else {
        setShorts((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearAll = async () => {
    if (!confirm('Очистить всю историю просмотров? Это действие нельзя отменить.')) return;
    setClearing(true);
    try {
      await api.delete('/api/watch/history');
      setVideos([]);
      setShorts([]);
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 bg-white p-12 text-center" id="history-view">
        <History size={40} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">История просмотров</h2>
        <p className="text-sm text-gray-500 mb-4">
          Войдите в аккаунт, чтобы видеть историю и продолжать просмотр с того места, где остановились.
        </p>
        <Link to="/login" className="inline-block bg-yt-red text-white px-4 py-2 text-xs font-bold uppercase border border-yt-darkred hover:bg-yt-darkred">
          Войти
        </Link>
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string; icon: ReactNode }[] = [
    { key: 'all', label: 'Вся история', icon: <History size={13} /> },
    { key: 'continue', label: 'Незавершённые', icon: <Clock size={13} /> },
    { key: 'completed', label: 'Просмотрено', icon: <CheckCircle2 size={13} /> },
  ];

  return (
    <div className="flex-1 bg-white p-6 max-w-5xl mx-auto" id="history-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <History size={22} className="text-yt-red" />
            История просмотров
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Прогресс сохраняется на сервере автоматически при просмотре
          </p>
        </div>
        {(videos.length > 0 || shorts.length > 0) && (
          <button
            onClick={clearAll}
            disabled={clearing}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 uppercase border border-red-200 px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={12} />
            {clearing ? 'Очистка...' : 'Очистить всё'}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase shrink-0 border transition-colors ${
              filter === tab.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-40 aspect-video bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 w-3/4" />
                <div className="h-3 bg-gray-100 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 && shorts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Play size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">История пуста</p>
          <p className="text-xs mt-1">Начните смотреть видео — прогресс сохранится автоматически</p>
          <Link to="/" className="inline-block mt-4 text-blue-600 text-xs font-bold hover:underline">
            Перейти на главную
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {videos.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Play size={12} className="text-yt-red" />
                Видео ({videos.length})
              </h2>
              <div className="space-y-3">
                {videos.map((entry) => (
                  <div
                    key={`v-${entry.id}`}
                    className="group flex gap-4 border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 p-2 transition-colors"
                  >
                    <Link to={`/watch/${entry.videoId}`} className="relative w-40 shrink-0 aspect-video bg-black border border-gray-200 overflow-hidden">
                      <img
                        src={entry.thumbnailUrl}
                        alt={entry.title}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                      {entry.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/85 text-white text-[9px] font-mono px-1">
                          {entry.duration}
                        </span>
                      )}
                      {!entry.completed && entry.progressPercent > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/60">
                          <div
                            className="h-full bg-yt-red"
                            style={{ width: `${entry.progressPercent}%` }}
                          />
                        </div>
                      )}
                      {entry.completed && (
                        <span className="absolute top-1 left-1 bg-green-600 text-white text-[8px] font-bold px-1 uppercase">
                          ✓
                        </span>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0 py-0.5">
                      <Link to={`/watch/${entry.videoId}`} className="font-bold text-sm text-gray-900 hover:text-blue-600 line-clamp-2 leading-snug">
                        {entry.title}
                      </Link>
                      <Link to={`/channel/${entry.authorId}`} className="text-xs text-gray-500 hover:text-gray-800 mt-1 block">
                        {entry.authorName}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                        <span>{formatViews(entry.views)}</span>
                        <span>•</span>
                        <span>{formatRelativeDate(entry.updatedAt)}</span>
                        {!entry.completed && entry.progressSeconds > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-yt-red font-bold">
                              Осталось ~{formatVideoDuration(Math.max(0, entry.durationSeconds - entry.progressSeconds))}
                            </span>
                          </>
                        )}
                      </div>
                      {!entry.completed && entry.progressPercent > 0 && (
                        <div className="mt-2 max-w-xs">
                          <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                            <span>Прогресс</span>
                            <span>{entry.progressPercent}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yt-red rounded-full transition-all"
                              style={{ width: `${entry.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeEntry(entry.id, 'video')}
                      className="self-start p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Удалить из истории"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {filter === 'all' && shorts.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Flame size={12} className="text-red-500" />
                Shorts ({shorts.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {shorts.map((entry) => (
                  <div key={`s-${entry.id}`} className="group relative border border-gray-100 hover:border-gray-200">
                    <Link to="/shorts" className="block">
                      <div className="aspect-[9/16] bg-black relative overflow-hidden">
                        <video
                          src={entry.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        {!entry.completed && entry.progressPercent > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/60">
                            <div className="h-full bg-yt-red" style={{ width: `${entry.progressPercent}%` }} />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-gray-800 p-2 line-clamp-2">{entry.title}</p>
                    </Link>
                    <button
                      onClick={() => removeEntry(entry.id, 'short')}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
