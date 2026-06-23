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
