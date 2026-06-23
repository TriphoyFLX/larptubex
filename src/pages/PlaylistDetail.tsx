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
    return <div className="flex-1 bg-white p-6 animate-pulse space-y-4 h-96"></div>;
  }

  if (!playlist) {
    return <div className="p-12 text-center text-sm text-gray-500">Плейлист не найден.</div>;
  }

  return (
    <div className="flex-1 bg-white p-6 grid grid-cols-1 md:grid-cols-3 gap-6" id="playlist-view">
      {/* Left Column info card */}
      <div className="md:col-span-1 bg-gray-50 border border-gray-200 p-5 rounded-sm" id="playlist-left-rail">
        <div className="bg-gray-300 aspect-video w-full flex items-center justify-center text-gray-500 rounded border font-bold select-none">
          <PlaySquare size={36} />
        </div>
        <h2 className="font-bold text-base text-gray-950 mt-4 leading-snug uppercase-none">{playlist.name}</h2>
        <span className="text-[10px] text-gray-400 mt-1 block uppercase font-bold tracking-tight">Создано: {new Date(playlist.createdAt).toLocaleDateString()}</span>
        <p className="text-xs text-gray-600 mt-3 whitespace-pre-wrap leading-relaxed">{playlist.description || 'У плейлиста нет описания.'}</p>
        <span className="text-xs text-gray-500 font-bold block mt-6">Количество видео: {playlist.videos?.length || 0}</span>
      </div>

      {/* Right list of video entries */}
      <div className="md:col-span-2 space-y-4" id="playlist-right-rail">
        <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5 uppercase tracking-wider flex items-center gap-1.5"><List size={13} /> Все ролики в списке</h3>
        
        {playlist.videos?.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 italic">Простите, в этом плейлисте пока нет видео.</p>
        ) : (
          <div className="flex flex-col gap-3" id="playlist-v-list">
            {playlist.videos?.map((v: any, index: number) => (
              <div key={v.id} className="flex gap-3 border-b border-gray-100 pb-3 last:border-0 items-center">
                <span className="text-xs font-bold text-gray-400 w-4 select-none">#{index + 1}</span>
                <Link to={`/watch/${v.id}`} className="relative w-36 shrink-0 aspect-video overflow-hidden border border-gray-200 bg-black">
                  <img src={v.thumbnailUrl} className="w-full h-full object-cover" alt="Thumb" />
                  <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[9px] px-1 rounded text-white">{v.duration}</span>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/watch/${v.id}`} className="block font-bold text-xs text-gray-950 truncate hover:text-blue-600 leading-tight uppercase-none">{v.title}</Link>
                  <span className="text-[10px] text-gray-500 font-semibold block mt-1">{v.authorName}</span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">{formatViews(v.views)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
