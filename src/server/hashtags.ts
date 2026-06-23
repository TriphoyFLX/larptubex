import { prisma } from '../db/prisma.ts';

const MAX_TAGS = 12;
const MIN_LEN = 2;
const MAX_LEN = 32;
const TAG_RE = /^[a-z0-9_\u0400-\u04ff]+$/;

export function normalizeHashtag(raw: string): string | null {
  const name = raw.trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, '');
  if (name.length < MIN_LEN || name.length > MAX_LEN) return null;
  if (!TAG_RE.test(name)) return null;
  return name;
}

export function parseHashtagInput(input: unknown): string[] {
  if (!input) return [];
  const parts = Array.isArray(input)
    ? input.flatMap((v) => String(v).split(/[\s,;]+/))
    : String(input).split(/[\s,;]+/);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const normalized = normalizeHashtag(part);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= MAX_TAGS) break;
  }
  return result;
}

async function upsertHashtagRecords(names: string[]) {
  const records: { id: number; name: string }[] = [];
  for (const name of names) {
    const tag = await prisma.hashtag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    records.push(tag);
  }
  return records;
}

export async function syncVideoHashtags(videoId: number, names: string[]) {
  const tags = await upsertHashtagRecords(names);
  await prisma.videoHashtag.deleteMany({ where: { videoId } });
  if (tags.length > 0) {
    await prisma.videoHashtag.createMany({
      data: tags.map((t) => ({ videoId, hashtagId: t.id })),
      skipDuplicates: true,
    });
  }
}

export async function syncUserHashtags(userId: number, names: string[]) {
  const tags = await upsertHashtagRecords(names);
  await prisma.userHashtag.deleteMany({ where: { userId } });
  if (tags.length > 0) {
    await prisma.userHashtag.createMany({
      data: tags.map((t) => ({ hashtagId: t.id, userId })),
      skipDuplicates: true,
    });
  }
}

export async function getVideoHashtagNames(videoId: number): Promise<string[]> {
  const rows = await prisma.videoHashtag.findMany({
    where: { videoId },
    include: { hashtag: true },
    orderBy: { hashtag: { name: 'asc' } },
  });
  return rows.map((r) => r.hashtag.name);
}

export async function getUserHashtagNames(userId: number): Promise<string[]> {
  const rows = await prisma.userHashtag.findMany({
    where: { userId },
    include: { hashtag: true },
    orderBy: { hashtag: { name: 'asc' } },
  });
  return rows.map((r) => r.hashtag.name);
}

export async function getVideoHashtagNamesMap(videoIds: number[]): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (videoIds.length === 0) return map;

  const rows = await prisma.videoHashtag.findMany({
    where: { videoId: { in: videoIds } },
    include: { hashtag: true },
  });

  for (const row of rows) {
    const list = map.get(row.videoId) || [];
    list.push(row.hashtag.name);
    map.set(row.videoId, list);
  }
  for (const [id, list] of map) {
    map.set(id, list.sort());
  }
  return map;
}
