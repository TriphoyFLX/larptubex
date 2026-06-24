import { Link } from 'react-router-dom';
import { SITE } from '../seo.ts';

type BrandLogoProps = {
  variant?: 'navbar' | 'auth' | 'splash';
  linked?: boolean;
  showWordmark?: boolean;
  className?: string;
};

const heights = {
  navbar: 'h-9',
  auth: 'h-14',
  splash: 'h-20',
} as const;

const wordmarkSizes = {
  navbar: 'text-lg',
  auth: 'text-2xl',
  splash: 'text-3xl',
} as const;

export default function BrandLogo({
  variant = 'navbar',
  linked = true,
  showWordmark = variant === 'navbar',
  className = '',
}: BrandLogoProps) {
  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={SITE.logo}
        alt={`${SITE.name} — логотип`}
        className={`${heights[variant]} w-auto object-contain select-none`}
        width={variant === 'navbar' ? 120 : variant === 'auth' ? 160 : 200}
        height={variant === 'navbar' ? 36 : variant === 'auth' ? 56 : 80}
        decoding="async"
      />
      {showWordmark && (
        <span
          className={`font-sans font-bold tracking-tight yt-text-primary select-none hidden sm:inline ${wordmarkSizes[variant]}`}
          id="logo-larptubex"
        >
          Larp<span className="text-[#cc181e]">Tubex</span>
        </span>
      )}
    </div>
  );

  if (!linked) return content;

  return (
    <Link to="/" className="flex items-center shrink-0 focus:outline-none" aria-label={`${SITE.name} — на главную`}>
      {content}
    </Link>
  );
}
