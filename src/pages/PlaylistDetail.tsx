import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlaySquare, Clock, Eye, Trash2, List } from 'lucide-react';
import api from '../api/index.ts';
import { formatViews } from '../utils.ts';

export default function PlaylistDetail() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaylist();
  }, [id]);

  const loadPlaylist = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/playlists/${id}`);
      setPlaylist(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex-1 yt-page p-6 animate-pulse space-y-4 h-96"></div>;
  }

  if (!playlist) {
    return <div className="p-12 text-center text-sm yt-text-secondary">Плейлист не найден.</div>;
  }

  return (
    <div className="flex-1 yt-page p-6 grid grid-cols-1 md:grid-cols-3 gap-6" id="playlist-view">
      {/* Left Column info card */}
      <div className="md:col-span-1 yt-surface border border-[var(--yt-border)] p-5 rounded-sm" id="playlist-left-rail">
        <div className="yt-skeleton aspect-video w-full flex items-center justify-center yt-text-muted rounded border border-[var(--yt-border)] font-bold select-none">
          <PlaySquare size={36} />
        </div>
        <h2 className="font-bold text-base yt-text-primary mt-4 leading-snug uppercase-none">{playlist.name}</h2>
        <span className="text-[10px] yt-text-muted mt-1 block uppercase font-bold tracking-tight">Создано: {new Date(playlist.createdAt).toLocaleDateString()}</span>
        <p className="text-xs yt-text-secondary mt-3 whitespace-pre-wrap leading-relaxed">{playlist.description || 'У плейлиста нет описания.'}</p>
        <span className="text-xs yt-text-secondary font-bold block mt-6">Количество видео: {playlist.videos?.length || 0}</span>
      </div>

      {/* Right list of video entries */}
      <div className="md:col-span-2 space-y-4" id="playlist-right-rail">
        <h3 className="text-xs font-bold yt-text-primary yt-border-b pb-1.5 uppercase tracking-wider flex items-center gap-1.5"><List size={13} /> Все ролики в списке</h3>
        
        {playlist.videos?.length === 0 ? (
          <p className="text-sm yt-text-muted py-10 italic">Простите, в этом плейлисте пока нет видео.</p>
        ) : (
          <div className="flex flex-col gap-3" id="playlist-v-list">
            {playlist.videos?.map((v: any, index: number) => (
              <div key={v.id} className="flex gap-3 yt-border-b pb-3 last:border-0 items-center">
                <span className="text-xs font-bold yt-text-muted w-4 select-none">#{index + 1}</span>
                <Link to={`/watch/${v.id}`} className="relative w-36 shrink-0 aspect-video overflow-hidden border border-[var(--yt-border)] bg-black">
                  <img src={v.thumbnailUrl} className="w-full h-full object-cover" alt="Thumb" />
                  <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[9px] px-1 rounded text-white">{v.duration}</span>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/watch/${v.id}`} className="block font-bold text-xs yt-text-primary truncate hover:text-[#3ea6ff] leading-tight uppercase-none">{v.title}</Link>
                  <span className="text-[10px] yt-text-secondary font-semibold block mt-1">{v.authorName}</span>
                  <span className="text-[9px] yt-text-muted block mt-0.5">{formatViews(v.views)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
