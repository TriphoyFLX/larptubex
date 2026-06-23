import { useEffect, useRef, useCallback, useState, type RefObject } from 'react';
import { saveWatchProgress } from '../api/index.ts';

const SAVE_INTERVAL_MS = 5000;
const MIN_PROGRESS_TO_SAVE = 3;

interface UseWatchProgressOptions {
  videoId?: number;
  shortId?: number;
  initialProgress?: number;
  enabled?: boolean;
  onViewCounted?: (views: number) => void;
}

export function useWatchProgress(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: UseWatchProgressOptions
) {
  const { videoId, shortId, initialProgress = 0, enabled = true, onViewCounted } = options;
  const lastSavedRef = useRef(0);
  const viewCountedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [resumeOffered, setResumeOffered] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);

  const saveProgress = useCallback(async (force = false) => {
    const el = videoRef.current;
    if (!el || !enabled) return;
    if (!videoId && !shortId) return;

    const progress = el.currentTime;
    const duration = el.duration && isFinite(el.duration) ? el.duration : 0;

    if (!force && progress < MIN_PROGRESS_TO_SAVE && lastSavedRef.current === 0) return;
    if (!force && Math.abs(progress - lastSavedRef.current) < 2) return;

    try {
      const result = await saveWatchProgress({
        videoId,
        shortId,
        progressSeconds: progress,
        durationSeconds: duration,
      });
      lastSavedRef.current = progress;

      if (result.viewCounted && !viewCountedRef.current) {
        viewCountedRef.current = true;
        onViewCounted?.(result.views);
      }
    } catch (e) {
      console.error('Failed to save watch progress:', e);
    }
  }, [videoId, shortId, enabled, videoRef, onViewCounted]);

  const handleResume = useCallback(() => {
    const el = videoRef.current;
    if (!el || initialProgress <= MIN_PROGRESS_TO_SAVE) return;
    el.currentTime = initialProgress;
    setHasResumed(true);
    setResumeOffered(false);
    el.play().catch(() => {});
  }, [initialProgress, videoRef]);

  const handleStartFromBeginning = useCallback(() => {
    const el = videoRef.current;
    if (el) el.currentTime = 0;
    setHasResumed(true);
    setResumeOffered(false);
    el?.play().catch(() => {});
  }, [videoRef]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !enabled) return;
    if (initialProgress > MIN_PROGRESS_TO_SAVE && !hasResumed && el.readyState >= 1) {
      setResumeOffered(true);
    }
  }, [initialProgress, enabled, hasResumed, videoRef]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !enabled) return;

    const onLoadedMetadata = () => {
      if (initialProgress > MIN_PROGRESS_TO_SAVE && !hasResumed) {
        setResumeOffered(true);
      }
    };

    const onPause = () => saveProgress(true);
    const onEnded = () => saveProgress(true);

    const onBeforeUnload = () => {
      const progress = el.currentTime;
      const duration = el.duration && isFinite(el.duration) ? el.duration : 0;
      if (progress >= MIN_PROGRESS_TO_SAVE && (videoId || shortId)) {
        const body = JSON.stringify({
          videoId,
          shortId,
          progressSeconds: progress,
          durationSeconds: duration,
          sessionId: localStorage.getItem('larptubex_view_session'),
        });
        navigator.sendBeacon('/api/watch/progress', new Blob([body], { type: 'application/json' }));
      }
    };

    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    window.addEventListener('beforeunload', onBeforeUnload);

    intervalRef.current = setInterval(() => saveProgress(), SAVE_INTERVAL_MS);

    return () => {
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (intervalRef.current) clearInterval(intervalRef.current);
      saveProgress(true);
    };
  }, [videoRef, enabled, initialProgress, hasResumed, saveProgress, videoId, shortId]);

  return {
    resumeOffered,
    hasResumed,
    handleResume,
    handleStartFromBeginning,
    saveProgress,
  };
}
