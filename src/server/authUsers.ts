import { prisma } from '../db/prisma.ts';
import { isReservedAdminEmail } from './security.ts';

const DEFAULT_AVATAR = '/uploads/default-avatar.svg';
const DEFAULT_BIO = 'Любитель качественного видео и ламповой атмосферы';

function slugifyHandle(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return slug.slice(0, 30) || 'channel';
}

async function generateUniqueHandle(base: string): Promise<string> {
  const normalized = slugifyHandle(base);
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = attempt === 0 ? normalized : `${normalized.slice(0, 24)}${attempt}`;
    const existing = await prisma.user.findUnique({ where: { handle: candidate } });
    if (!existing) return candidate;
  }
  return `channel${Date.now()}`;
}

export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'user';
  return local.replace(/[._-]+/g, ' ').trim().slice(0, 50) || 'Пользователь';
}

export async function findOrCreateUserForAuth(params: {
  email: string;
  displayName?: string;
  avatar?: string;
  googleSub?: string;
}) {
  const trimmedEmail = params.email.trim().toLowerCase();
  if (isReservedAdminEmail(trimmedEmail)) {
    throw new Error('RESERVED_EMAIL');
  }

  let user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user) {
    const displayName = (params.displayName?.trim() || displayNameFromEmail(trimmedEmail)).slice(0, 50);
    const handle = await generateUniqueHandle(displayName);
    user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        displayName,
        handle,
        avatar: params.avatar || DEFAULT_AVATAR,
        bio: DEFAULT_BIO,
        uid: params.googleSub || null,
      },
    });
    return user;
  }

  const updates: { uid?: string; avatar?: string; displayName?: string } = {};
  if (params.googleSub && !user.uid) updates.uid = params.googleSub;
  if (params.avatar && (!user.avatar || user.avatar === DEFAULT_AVATAR)) updates.avatar = params.avatar;

  if (Object.keys(updates).length > 0) {
    user = await prisma.user.update({ where: { id: user.id }, data: updates });
  }

  return user;
}
