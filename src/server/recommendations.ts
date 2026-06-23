import type { PrismaClient } from '@prisma/client';
import type { SafeUser } from './security.ts';

type ViewerContext = {
  user?: SafeUser;
  sessionId?: string;
};

type VideoWithAuthor = Awaited<ReturnType<PrismaClient['video']['findMany']>>[number] & {
  author: {
    displayName: string;
    avatar: string | null;
  };
};

type RecommendationOptions = {
  limit?: number;
  categoryId?: number | null;
};

const MAX_LIMIT = 50;

function getLimit(limit?: number) {
  if (!Number.isFinite(limit)) return 24;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit || 24)));
}

function flattenVideo(video: VideoWithAuthor) {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    views: video.views,
    duration: video.duration,
    createdAt: video.createdAt,
    authorId: video.authorId,
    authorName: video.author.displayName,
    authorAvatar: video.author.avatar,
    categoryId: video.categoryId,
  };
}

function addWeight(map: Map<number, number>, key: number | null | undefined, value: number) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + value);
}

function trendingScore(video: { views: number; createdAt: Date }) {
  const ageHours = Math.max(1, (Date.now() - video.createdAt.getTime()) / 36e5);
  const viewBoost = Math.log10(video.views + 1) * 8;
  const freshnessBoost = 28 / (1 + ageHours / 48);
  return viewBoost + freshnessBoost;
}

function diversify(videos: VideoWithAuthor[], limit: number) {
  const picked: VideoWithAuthor[] = [];
  const authorCounts = new Map<number, number>();

  for (const video of videos) {
    const count = authorCounts.get(video.authorId) || 0;
    if (count >= 3 && picked.length < Math.ceil(limit * 0.7)) continue;
    picked.push(video);
    authorCounts.set(video.authorId, count + 1);
    if (picked.length >= limit) break;
  }

  return picked;
}

async function getViewerHistory(prisma: PrismaClient, viewer: ViewerContext, take = 40) {
  if (viewer.user) {
    return prisma.viewHistory.findMany({
      where: { userId: viewer.user.id },
      include: { video: { select: { id: true, authorId: true, categoryId: true } } },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  if (viewer.sessionId) {
    return prisma.viewHistory.findMany({
      where: { sessionId: viewer.sessionId },
      include: { video: { select: { id: true, authorId: true, categoryId: true } } },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  return [];
}

async function fillWithPopular(
  prisma: PrismaClient,
  picked: VideoWithAuthor[],
  limit: number,
  excludeIds: Set<number>,
  categoryId?: number | null
) {
  if (picked.length >= limit) return picked;

  const more = await prisma.video.findMany({
    where: {
      id: { notIn: [...excludeIds, ...picked.map((video) => video.id)] },
      ...(categoryId ? { categoryId } : {}),
    },
    include: { author: { select: { displayName: true, avatar: true } } },
    orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    take: limit - picked.length,
  });

  return [...picked, ...more];
}

export async function getHomeRecommendations(
  prisma: PrismaClient,
  viewer: ViewerContext,
  options: RecommendationOptions = {}
) {
  const limit = getLimit(options.limit);
  const history = await getViewerHistory(prisma, viewer, 50);
  const categoryWeights = new Map<number, number>();
  const authorWeights = new Map<number, number>();
  const excludeIds = new Set<number>();

  history.forEach((entry, index) => {
    const recency = Math.max(1, 22 - index);
    if (entry.completed || entry.progressSeconds > entry.durationSeconds * 0.75) {
      excludeIds.add(entry.videoId);
    }
    addWeight(categoryWeights, entry.video.categoryId, recency);
    addWeight(authorWeights, entry.video.authorId, recency * 0.4);
  });

  if (viewer.user) {
    const [subscriptions, likedVideos] = await Promise.all([
      prisma.subscription.findMany({
        where: { subscriberId: viewer.user.id },
        select: { channelId: true },
      }),
      prisma.like.findMany({
        where: { userId: viewer.user.id, videoId: { not: null }, isDislike: false },
        include: { video: { select: { authorId: true, categoryId: true } } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    ]);

    subscriptions.forEach((sub) => addWeight(authorWeights, sub.channelId, 30));
    likedVideos.forEach((like) => {
      addWeight(categoryWeights, like.video?.categoryId, 16);
      addWeight(authorWeights, like.video?.authorId, 10);
    });
  }

  const candidates = await prisma.video.findMany({
    where: {
      ...(excludeIds.size ? { id: { notIn: [...excludeIds] } } : {}),
      ...(options.categoryId ? { categoryId: options.categoryId } : {}),
    },
    include: { author: { select: { displayName: true, avatar: true } } },
    orderBy: [{ createdAt: 'desc' }],
    take: 250,
  });

  const scored = candidates
    .map((video) => ({
      video,
      score:
        trendingScore(video) +
        (categoryWeights.get(video.categoryId || 0) || 0) +
        (authorWeights.get(video.authorId) || 0) +
        ((video.id * 13) % 17) / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.video);

  const diversified = diversify(scored, limit);
  const complete = await fillWithPopular(prisma, diversified, limit, excludeIds, options.categoryId);
  return complete.map(flattenVideo);
}

export async function getRelatedVideos(
  prisma: PrismaClient,
  viewer: ViewerContext,
  videoId: number,
  options: RecommendationOptions = {}
) {
  const limit = getLimit(options.limit || 16);
  const current = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, authorId: true, categoryId: true, title: true },
  });

  if (!current) return null;

  const [history, completedThisVideo] = await Promise.all([
    getViewerHistory(prisma, viewer, 30),
    prisma.viewHistory.findMany({
      where: { videoId, userId: { not: null }, OR: [{ completed: true }, { viewCounted: true }] },
      select: { userId: true },
      take: 80,
    }),
  ]);

  const excludeIds = new Set<number>([videoId]);
  history.forEach((entry) => {
    if (entry.completed) excludeIds.add(entry.videoId);
  });

  const coViewerIds = [...new Set(completedThisVideo.map((entry) => entry.userId).filter(Boolean) as number[])];
  const coWatchWeights = new Map<number, number>();

  if (coViewerIds.length > 0) {
    const coWatched = await prisma.viewHistory.findMany({
      where: {
        userId: { in: coViewerIds },
        videoId: { notIn: [...excludeIds] },
        OR: [{ completed: true }, { viewCounted: true }],
      },
      select: { videoId: true },
      take: 600,
    });

    coWatched.forEach((entry) => {
      coWatchWeights.set(entry.videoId, (coWatchWeights.get(entry.videoId) || 0) + 1);
    });
  }

  const coWatchIds = [...coWatchWeights.keys()].slice(0, 80);
  const relatedOr = [
    current.categoryId ? { categoryId: current.categoryId } : null,
    { authorId: current.authorId },
    coWatchIds.length ? { id: { in: coWatchIds } } : null,
  ].filter(Boolean);

  const candidates = await prisma.video.findMany({
    where: {
      id: { notIn: [...excludeIds] },
      ...(relatedOr.length ? { OR: relatedOr } : {}),
    },
    include: { author: { select: { displayName: true, avatar: true } } },
    orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    take: 180,
  });

  const scored = candidates
    .map((video) => ({
      video,
      score:
        trendingScore(video) +
        (video.categoryId && video.categoryId === current.categoryId ? 38 : 0) +
        (video.authorId === current.authorId ? 26 : 0) +
        (coWatchWeights.get(video.id) || 0) * 18 +
        ((video.id * 7) % 13) / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.video);

  const diversified = diversify(scored, limit);
  const complete = await fillWithPopular(prisma, diversified, limit, excludeIds, current.categoryId);
  return complete.map(flattenVideo);
}
