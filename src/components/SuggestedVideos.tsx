import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Video } from '../types.ts';
import { formatViews } from '../utils.ts';

type SuggestedVideosProps = {
  videos: Video[];
  variant?: 'sidebar' | 'sheet' | 'grid';
  title?: string;
  onVideoClick?: () => void;
};

export default function SuggestedVideos({
  videos,
  variant = 'sidebar',
  title = 'Рекомендуем посмотреть',
  onVideoClick,
}: SuggestedVideosProps) {
  if (videos.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic py-4 text-center">Пока нет рекомендаций</p>
    );
  }

  const card = (s: Video) => (
    <Link
      key={s.id}
      to={`/watch/${s.id}`}
      onClick={onVideoClick}
      className="group flex gap-3 rounded-sm hover:bg-gray-50/80 transition-colors p-1 -mx-1"
    >
      <div className="relative shrink-0 yt-video-thumb w-[168px] sm:w-40 rounded-lg">
        <img
          src={s.thumbnailUrl}
          alt={s.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span className="yt-video-duration">{s.duration}</span>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25">
          <Play size={28} className="text-white fill-white drop-shadow-lg" />
        </div>
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h4 className="font-bold text-[12px] text-gray-950 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {s.title}
        </h4>
        <p className="text-[11px] text-gray-500 font-medium mt-1 truncate">{s.authorName}</p>
        <span className="text-[10px] text-gray-400 mt-0.5 block">{formatViews(s.views)}</span>
      </div>
    </Link>
  );

  if (variant === 'grid') {
    return (
      <div>
        <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <Play size={12} className="text-yt-red fill-yt-red" />
          {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.map(card)}
        </div>
      </div>
    );
  }

  if (variant === 'sheet') {
    return (
      <div className="space-y-1">
        <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-3 sticky top-0 bg-white/95 backdrop-blur py-2 z-10 border-b border-gray-100">
          <Play size={14} className="text-yt-red fill-yt-red" />
          {title}
        </h3>
        <div className="flex flex-col gap-2 pb-6">{videos.map(card)}</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-2 uppercase tracking-wide flex items-center gap-1.5">
        <Play size={11} className="text-yt-red fill-yt-red" />
        {title}
      </h3>
      <div className="flex flex-col gap-3 mt-4">{videos.map(card)}</div>
    </div>
  );
}
