import { Link } from 'react-router-dom';

type VideoThumbnailProps = {
  src: string;
  alt: string;
  duration?: string;
  to?: string;
  onClick?: () => void;
  className?: string;
  showHoverPlay?: boolean;
};

export default function VideoThumbnail({
  src,
  alt,
  duration,
  to,
  onClick,
  className = '',
  showHoverPlay = false,
}: VideoThumbnailProps) {
  const thumb = (
    <div className={`yt-video-thumb group/thumb ${className}`}>
      <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" />
      {duration && (
        <span className="yt-video-duration">{duration}</span>
      )}
      {showHoverPlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumb:bg-black/25 transition-colors pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
          </div>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className="block w-full">
        {thumb}
      </Link>
    );
  }

  return thumb;
}
