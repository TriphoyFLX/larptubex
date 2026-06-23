const PLAYBACK_COUNT_KEY = 'larptubex_playback_count';

/** Увеличивает счётчик просмотров в сессии. true = показать преролл (каждое 5-е). */
export function registerPlaybackForAd(): boolean {
  const next = (parseInt(sessionStorage.getItem(PLAYBACK_COUNT_KEY) || '0', 10) || 0) + 1;
  sessionStorage.setItem(PLAYBACK_COUNT_KEY, String(next));
  return next % 5 === 0;
}

export const PREROLL_DURATION_SEC = 15;
export const PREROLL_SKIP_AFTER_SEC = 5;
export const AD_TELEGRAM_URL = 'https://t.me/larptubexadd';
