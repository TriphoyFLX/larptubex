export interface User {
  id: number;
  uid: string | null;
  email: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Video {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  duration: string;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  categoryId: number | null;
  createdAt: string;
  likesCount?: number;
  dislikesCount?: number;
  subscribersCount?: number;
  viewerRating?: 'like' | 'dislike' | null;
  isSubscribed?: boolean;
}

export interface Short {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  views: number;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  likesCount?: number;
  dislikesCount?: number;
  viewerRating?: 'like' | 'dislike' | null;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  parentId: number | null;
  replies: Comment[];
}

export interface CommunityPost {
  id: number;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  likesCount: number;
  commentsCount: number;
}

export interface Notification {
  id: number;
  type: 'subscriber' | 'like' | 'comment' | 'reply' | 'video';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  triggerUserId: number | null;
  triggerUserAvatar: string | null;
  videoId: number | null;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  authorId: number;
  isPrivate: boolean;
  createdAt: string;
  videos?: Video[];
}
