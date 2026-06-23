import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, Megaphone, Sparkles } from 'lucide-react';
import { AD_TELEGRAM_URL, PREROLL_DURATION_SEC, PREROLL_SKIP_AFTER_SEC } from '../utils/ads.ts';
import { SITE } from '../seo.ts';

type LarpTubeXPrerollAdProps = {
  variant?: 'video' | 'short';
  onComplete: () => void;
};

export default function LarpTubeXPrerollAd({ variant = 'video', onComplete }: LarpTubeXPrerollAdProps) {
  const [elapsed, setElapsed] = useState(0);
  const remaining = Math.max(0, PREROLL_DURATION_SEC - elapsed);
  const canSkip = elapsed >= PREROLL_SKIP_AFTER_SEC;
  const progress = Math.min(100, (elapsed / PREROLL_DURATION_SEC) * 100);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (elapsed >= PREROLL_DURATION_SEC) {
      finish();
      return;
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [elapsed, finish]);

  const isShort = variant === 'short';

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-[#0a0a0a] overflow-hidden"
      role="dialog"
      aria-label="Реклама LarpTubeX"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a0c] via-[#0f0f0f] to-[#0a1628] opacity-95" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_30%_20%,#cc181e_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,#3ea6ff_0%,transparent_45%)]" />

      <div className="relative flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
        <div className="flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
          <Megaphone size={14} className="text-[#ff6b6b]" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/90">Реклама</span>
        </div>

        <img
          src={SITE.logo}
          alt="LarpTubeX"
          className={`${isShort ? 'h-14' : 'h-16 sm:h-20'} w-auto object-contain mb-4 drop-shadow-2xl`}
        />

        <h2 className={`font-bold text-white ${isShort ? 'text-lg' : 'text-xl sm:text-2xl'} leading-tight max-w-md`}>
          Реклама от <span className="text-[#ff4444]">Larp</span>
          <span className="text-white">Tube</span>
          <span className="text-[#ff4444]">X</span>
        </h2>

        <p className={`mt-3 text-white/75 ${isShort ? 'text-xs max-w-[260px]' : 'text-sm sm:text-base max-w-lg'} leading-relaxed`}>
          Разместите свою рекламу на платформе и найдите новую аудиторию среди зрителей видео и Shorts.
        </p>

        <a
          href={AD_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm bg-gradient-to-r from-[#cc181e] to-[#e63946] text-white shadow-lg shadow-red-900/40 hover:brightness-110 transition-all ${isShort ? 'text-xs px-4 py-2' : ''}`}
        >
          <Sparkles size={16} />
          @larptubexadd
          <ExternalLink size={14} className="opacity-80" />
        </a>

        <p className="mt-3 text-[10px] text-white/40">Telegram · размещение рекламы</p>
      </div>

      <div className="relative px-4 pb-4 pt-2 space-y-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="h-1 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#cc181e] to-[#ff6b6b] transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-white/50 tabular-nums">
            {remaining > 0 ? `Реклама · 0:${remaining.toString().padStart(2, '0')}` : 'Завершение...'}
          </span>
          <button
            type="button"
            onClick={finish}
            disabled={!canSkip}
            className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-all ${
              canSkip
                ? 'bg-white/15 text-white border border-white/25 hover:bg-white/25 cursor-pointer'
                : 'bg-white/5 text-white/35 border border-white/10 cursor-not-allowed'
            }`}
          >
            {canSkip ? 'Пропустить' : `Пропустить через ${PREROLL_SKIP_AFTER_SEC - elapsed}с`}
          </button>
        </div>
      </div>
    </div>
  );
}
