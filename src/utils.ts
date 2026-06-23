export function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)} млн просмотров`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(0)} тыс. просмотров`;
  }
  return `${views} просмотров`;
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return 'Сегодня';
  if (diffDays <= 2) return 'Вчера';
  if (diffDays <= 7) return `${diffDays} дней назад`;
  if (diffDays <= 30) return `${Math.floor(diffDays / 7)} нед. назад`;
  if (diffDays <= 365) return `${Math.floor(diffDays / 30)} мес. назад`;
  return `${Math.floor(diffDays / 365)} г. назад`;
}

export const BANNER_RECOMMENDED = { width: 2560, height: 1440 };

export function getImageFileDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });
}

export const DEFAULT_AVATAR = '/uploads/default-avatar.svg';

export function formatChannelHandle(user: { handle?: string | null; id: number }): string {
  return user.handle ? `@${user.handle}` : `@user${user.id}`;
}

export interface FlatComment {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  parentId: number | null;
}

export function buildCommentTree(flatComments: FlatComment[]) {
  const map = new Map<number, FlatComment & { replies: FlatComment[] }>();
  const roots: (FlatComment & { replies: FlatComment[] })[] = [];

  flatComments.forEach((c) => {
    map.set(c.id, { ...c, replies: [] });
  });

  flatComments.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId) {
      const parent = map.get(c.parentId);
      if (parent) parent.replies.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function formatVideoDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function isSameUser(
  a: number | string | null | undefined,
  b: number | string | null | undefined
): boolean {
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

/** Client-side preview of hashtag input (server validates on save). */
export function parseHashtagPreview(input: string): string[] {
  const parts = input.split(/[\s,;]+/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const name = part.trim().toLowerCase().replace(/^#+/, '');
    if (name.length < 2 || name.length > 32) continue;
    if (!/^[a-z0-9_\u0400-\u04ff]+$/i.test(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(name);
    if (result.length >= 12) break;
  }
  return result;
}

const VIEW_SESSION_KEY = 'larptubex_view_session';

export function getViewSessionId(): string {
  let id = localStorage.getItem(VIEW_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VIEW_SESSION_KEY, id);
  }
  return id;
}

export async function readVideoDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(formatVideoDuration(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve('0:00');
    };
    video.src = URL.createObjectURL(file);
  });
}
