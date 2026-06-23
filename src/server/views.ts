import { prisma } from '../db/prisma.ts';

export const VIEW_THRESHOLD_SECONDS = 30;
export const VIEW_THRESHOLD_PERCENT = 0.1;
export const COMPLETED_PERCENT = 0.9;

export function shouldCountView(progressSeconds: number, durationSeconds: number): boolean {
  if (progressSeconds >= VIEW_THRESHOLD_SECONDS) return true;
  if (durationSeconds > 0 && progressSeconds / durationSeconds >= VIEW_THRESHOLD_PERCENT) return true;
  return false;
}

export function isWatchCompleted(progressSeconds: number, durationSeconds: number): boolean {
  if (durationSeconds > 0) return progressSeconds / durationSeconds >= COMPLETED_PERCENT;
  return progressSeconds >= VIEW_THRESHOLD_SECONDS;
}

export function getProgressPercent(progressSeconds: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return Math.min(100, Math.round((progressSeconds / durationSeconds) * 100));
}

type WatchIdentity = { userId: number } | { sessionId: string };

function identityWhere(identity: WatchIdentity, videoId: number) {
  if ('userId' in identity) return { userId: identity.userId, videoId };
  return { sessionId: identity.sessionId, videoId };
}

function shortIdentityWhere(identity: WatchIdentity, shortId: number) {
  if ('userId' in identity) return { userId: identity.userId, shortId };
  return { sessionId: identity.sessionId, shortId };
}

export async function upsertVideoProgress(
  identity: WatchIdentity,
  videoId: number,
  progressSeconds: number,
  durationSeconds: number
) {
  const completed = isWatchCompleted(progressSeconds, durationSeconds);
  const where = identityWhere(identity, videoId);
  const data = {
    progressSeconds,
    durationSeconds,
    completed,
    viewedAt: new Date(),
  };

  const existing = await prisma.viewHistory.findFirst({ where });

  if (existing) {
    const shouldCount = shouldCountView(progressSeconds, durationSeconds) && !existing.viewCounted;
    if (shouldCount) {
      await prisma.$transaction([
        prisma.viewHistory.update({
          where: { id: existing.id },
          data: { ...data, viewCounted: true },
        }),
        prisma.video.update({
          where: { id: videoId },
          data: { views: { increment: 1 } },
        }),
      ]);
    } else {
      await prisma.viewHistory.update({
        where: { id: existing.id },
        data,
      });
    }
    return prisma.viewHistory.findUnique({ where: { id: existing.id } });
  }

  const countView = shouldCountView(progressSeconds, durationSeconds);
  const created = await prisma.viewHistory.create({
    data: {
      ...('userId' in identity ? { userId: identity.userId } : { sessionId: identity.sessionId }),
      videoId,
      ...data,
      viewCounted: countView,
    },
  });

  if (countView) {
    await prisma.video.update({
      where: { id: videoId },
      data: { views: { increment: 1 } },
    });
  }

  return created;
}

export async function upsertShortProgress(
  identity: WatchIdentity,
  shortId: number,
  progressSeconds: number,
  durationSeconds: number
) {
  const completed = isWatchCompleted(progressSeconds, durationSeconds);
  const where = shortIdentityWhere(identity, shortId);
  const data = {
    progressSeconds,
    durationSeconds,
    completed,
    viewedAt: new Date(),
  };

  const existing = await prisma.shortViewHistory.findFirst({ where });

  if (existing) {
    const shouldCount = shouldCountView(progressSeconds, durationSeconds) && !existing.viewCounted;
    if (shouldCount) {
      await prisma.$transaction([
        prisma.shortViewHistory.update({
          where: { id: existing.id },
          data: { ...data, viewCounted: true },
        }),
        prisma.short.update({
          where: { id: shortId },
          data: { views: { increment: 1 } },
        }),
      ]);
    } else {
      await prisma.shortViewHistory.update({
        where: { id: existing.id },
        data,
      });
    }
    return prisma.shortViewHistory.findUnique({ where: { id: existing.id } });
  }

  const countView = shouldCountView(progressSeconds, durationSeconds);
  const created = await prisma.shortViewHistory.create({
    data: {
      ...('userId' in identity ? { userId: identity.userId } : { sessionId: identity.sessionId }),
      shortId,
      ...data,
      viewCounted: countView,
    },
  });

  if (countView) {
    await prisma.short.update({
      where: { id: shortId },
      data: { views: { increment: 1 } },
    });
  }

  return created;
}

export async function getVideoProgress(identity: WatchIdentity, videoId: number) {
  const where = identityWhere(identity, videoId);
  return prisma.viewHistory.findFirst({ where });
}

export async function getShortProgress(identity: WatchIdentity, shortId: number) {
  const where = shortIdentityWhere(identity, shortId);
  return prisma.shortViewHistory.findFirst({ where });
}

export async function getUserWatchHistory(userId: number, filter: 'all' | 'continue' | 'completed' = 'all', limit = 50) {
  const where: { userId: number; completed?: boolean } = { userId };
  if (filter === 'continue') where.completed = false;
  if (filter === 'completed') where.completed = true;

  const entries = await prisma.viewHistory.findMany({
    where,
    include: {
      video: { include: { author: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return entries
    .filter((e) => e.video)
    .map((e) => ({
      id: e.id,
      type: 'video' as const,
      videoId: e.videoId,
      progressSeconds: e.progressSeconds,
      durationSeconds: e.durationSeconds,
      progressPercent: getProgressPercent(e.progressSeconds, e.durationSeconds),
      completed: e.completed,
      viewedAt: e.viewedAt,
      updatedAt: e.updatedAt,
      title: e.video.title,
      thumbnailUrl: e.video.thumbnailUrl,
      duration: e.video.duration,
      views: e.video.views,
      authorId: e.video.authorId,
      authorName: e.video.author.displayName,
      authorAvatar: e.video.author.avatar,
    }));
}

export async function getUserShortHistory(userId: number, limit = 30) {
  const entries = await prisma.shortViewHistory.findMany({
    where: { userId },
    include: { short: { include: { author: true } } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return entries
    .filter((e) => e.short)
    .map((e) => ({
      id: e.id,
      type: 'short' as const,
      shortId: e.shortId,
      progressSeconds: e.progressSeconds,
      durationSeconds: e.durationSeconds,
      progressPercent: getProgressPercent(e.progressSeconds, e.durationSeconds),
      completed: e.completed,
      viewedAt: e.viewedAt,
      updatedAt: e.updatedAt,
      title: e.short.title,
      videoUrl: e.short.videoUrl,
      views: e.short.views,
      authorId: e.short.authorId,
      authorName: e.short.author.displayName,
      authorAvatar: e.short.author.avatar,
    }));
}

export async function getContinueWatching(userId: number, limit = 12) {
  return getUserWatchHistory(userId, 'continue', limit);
}
