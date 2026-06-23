import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  RotateCcw,
} from 'lucide-react';
import LarpTubeXPrerollAd from './LarpTubeXPrerollAd.tsx';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatVideoDuration(seconds: number): string {
  return formatTime(seconds);
}

type VideoPlayerProps = {
  src: string;
  poster?: string;
  title?: string;
  compact?: boolean;
  className?: string;
  autoPlay?: boolean;
  externalVideoRef?: RefObject<HTMLVideoElement | null>;
  resumeOffered?: boolean;
  resumeAtSeconds?: number;
  onResume?: () => void;
  onStartFromBeginning?: () => void;
  showPreroll?: boolean;
};

export default function VideoPlayer({
  src,
  poster,
  title,
  compact = false,
  className = '',
  autoPlay = true,
  externalVideoRef,
  resumeOffered = false,
  resumeAtSeconds = 0,
  onResume,
  onStartFromBeginning,
  showPreroll = false,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [adActive, setAdActive] = useState(showPreroll);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [seekHover, setSeekHover] = useState<number | null>(null);

  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2800);
    }
  }, [playing]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const vid = videoRef.current;
    if (!vid || !duration) return;
    vid.currentTime = Math.min(Math.max(time, 0), duration);
  }, [duration]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    setAdActive(showPreroll);
  }, [showPreroll, src]);

  const handleAdComplete = useCallback(() => {
    setAdActive(false);
    const vid = videoRef.current;
    if (vid && !resumeOffered) {
      vid.play().catch(() => {});
    }
  }, [resumeOffered]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const vid = videoRef.current;
      if (!vid) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          seekTo(vid.currentTime - 5);
          break;
        case 'ArrowRight':
          seekTo(vid.currentTime + 5);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          setMuted((m) => !m);
          break;
        default:
          break;
      }
      revealControls();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seekTo, toggleFullscreen, revealControls]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.volume = volume;
    vid.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    revealControls();
  }, [playing, revealControls]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hoverProgress = seekHover !== null && duration > 0 ? (seekHover / duration) * 100 : null;

  const setVideoElementRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (externalVideoRef) {
        externalVideoRef.current = node;
      }
    },
    [externalVideoRef]
  );

  return (
    <div
      ref={containerRef}
      className={`yt-player group relative bg-black overflow-hidden select-none ${compact ? 'rounded-none' : 'rounded-sm shadow-lg ring-1 ring-black/10'} ${className}`}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setShowControls(false)}
      onTouchStart={revealControls}
    >
      <video
        ref={setVideoElementRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain bg-black"
        playsInline
        autoPlay={autoPlay && !resumeOffered && !adActive}
        onClick={togglePlay}
        onPlay={() => { setPlaying(true); setBuffering(false); }}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setShowControls(true)}
      />

      {adActive && (
        <LarpTubeXPrerollAd variant="video" onComplete={handleAdComplete} />
      )}

      {resumeOffered && !adActive && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-20">
          <p className="text-white text-sm font-bold">
            Продолжить с {formatVideoDuration(resumeAtSeconds)}?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-1.5 bg-[#cc181e] text-white px-4 py-2 text-xs font-bold uppercase border border-[#9a1217] hover:bg-[#b31217]"
            >
              <Play size={14} className="fill-white" />
              Продолжить
            </button>
            <button
              type="button"
              onClick={onStartFromBeginning}
              className="flex items-center gap-1.5 bg-white/10 text-white px-4 py-2 text-xs font-bold uppercase border border-white/30 hover:bg-white/20"
            >
              <RotateCcw size={12} />
              С начала
            </button>
          </div>
        </div>
      )}

      {/* Top gradient + title */}
      <div
        className={`absolute inset-x-0 top-0 pt-3 px-4 pb-10 bg-gradient-to-b from-black/75 to-transparent pointer-events-none transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}
      >
        {title && (
          <p className="text-white text-xs sm:text-sm font-semibold line-clamp-2 drop-shadow-md pr-8">
            {title}
          </p>
        )}
      </div>

      {/* Center play / buffering */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${adActive ? 'hidden' : ''}`}>
        {buffering && (
          <div className="w-12 h-12 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {!playing && !buffering && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="pointer-events-auto w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-[#cc181e]/95 hover:bg-[#b31217] flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95"
            aria-label="Воспроизвести"
          >
            <Play size={32} className="text-white fill-white ml-1" />
          </button>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute inset-x-0 bottom-0 px-3 pb-3 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${adActive ? 'hidden' : ''} ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Progress bar */}
        <div
          className="relative h-1.5 mb-3 group/progress cursor-pointer rounded-full bg-white/25 hover:h-2 transition-all"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setSeekHover(ratio * duration);
          }}
          onMouseLeave={() => setSeekHover(null)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            seekTo(ratio * duration);
          }}
          role="slider"
          aria-label="Прогресс воспроизведения"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${progress}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#cc181e]" style={{ width: `${progress}%` }} />
          {hoverProgress !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#cc181e] rounded-full shadow border-2 border-white opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${hoverProgress}% - 6px)` }}
            />
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-white">
          <button type="button" onClick={() => seekTo(currentTime - 10)} className="p-1.5 hover:bg-white/15 rounded hidden sm:block" aria-label="Назад 10 сек">
            <SkipBack size={18} />
          </button>
          <button type="button" onClick={togglePlay} className="p-1.5 hover:bg-white/15 rounded" aria-label={playing ? 'Пауза' : 'Воспроизведение'}>
            {playing ? <Pause size={22} className="fill-white" /> : <Play size={22} className="fill-white" />}
          </button>
          <button type="button" onClick={() => seekTo(currentTime + 10)} className="p-1.5 hover:bg-white/15 rounded hidden sm:block" aria-label="Вперёд 10 сек">
            <SkipForward size={18} />
          </button>

          <div className="flex items-center gap-1.5 group/vol">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="p-1.5 hover:bg-white/15 rounded"
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            >
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setMuted(v === 0);
              }}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-[#cc181e] h-1 cursor-pointer hidden sm:block"
              aria-label="Громкость"
            />
          </div>

          <span className="text-[11px] sm:text-xs font-mono tabular-nums ml-1 shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-white/15 rounded"
            aria-label={fullscreen ? 'Выйти из полноэкранного режима' : 'Полный экран'}
          >
            {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
