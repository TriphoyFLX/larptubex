import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'larptubex_theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  initialize: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  resolved: 'dark',

  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyTheme(mode);
    set({ mode, resolved: resolveTheme(mode) });
  },

  toggle: () => {
    const next = get().resolved === 'dark' ? 'light' : 'dark';
    get().setMode(next);
  },

  initialize: () => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark';
    const mode: ThemeMode = ['light', 'dark', 'system'].includes(saved) ? saved : 'dark';
    applyTheme(mode);
    set({ mode, resolved: resolveTheme(mode) });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (get().mode === 'system') {
        applyTheme('system');
        set({ resolved: resolveTheme('system') });
      }
    };
    mq.addEventListener('change', onChange);
  },
}));

// Sync before React paint (also called from index.html inline script)
export function initThemeEarly() {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  const mode: ThemeMode = saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'dark';
  applyTheme(mode);
}
