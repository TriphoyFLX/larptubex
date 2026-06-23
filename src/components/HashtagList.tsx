import { Link } from 'react-router-dom';

type HashtagListProps = {
  tags: string[];
  size?: 'sm' | 'md';
  className?: string;
};

export default function HashtagList({ tags, size = 'sm', className = '' }: HashtagListProps) {
  if (!tags?.length) return null;

  const chip =
    size === 'md'
      ? 'px-2.5 py-1 text-xs'
      : 'px-2 py-0.5 text-[10px]';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((tag) => (
        <Link
          key={tag}
          to={`/search?q=${encodeURIComponent(`#${tag}`)}`}
          className={`${chip} font-semibold rounded-full bg-[var(--yt-bg-hover)] text-[#3ea6ff] border border-[var(--yt-border)] hover:bg-[var(--yt-bg-active)] transition-colors`}
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}
