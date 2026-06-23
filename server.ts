import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createServer as createViteServer } from 'vite';
import { createUploader, ensureUploadDirs, publicUrl, UPLOADS_ROOT, UploadType } from './src/server/upload.ts';

// Construct DATABASE_URL dynamically if not set
if (!process.env.DATABASE_URL) {
  const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres';
  const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || 'postgres';
  const host = process.env.SQL_HOST || 'localhost';
  const dbName = process.env.SQL_DB_NAME || 'larptubex';

  if (host.startsWith('/') || host.includes('/cloudsql/')) {
    process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost/${dbName}?host=${encodeURIComponent(host)}`;
  } else {
    process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${dbName}`;
  }
}

import { prisma } from './src/db/prisma.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'larptubex_secret_jwt_key_2026';

app.use(express.json({ limit: '2mb' }));

ensureUploadDirs();
app.use('/uploads', express.static(UPLOADS_ROOT));

// Enable basic CORS/Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const DEFAULT_AVATAR = '/uploads/default-avatar.svg';

function ensureDefaultAvatar() {
  const avatarPath = path.join(UPLOADS_ROOT, 'default-avatar.svg');
  if (!fs.existsSync(avatarPath)) {
    fs.writeFileSync(avatarPath, `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="#e5e7eb" width="120" height="120"/><circle cx="60" cy="45" r="22" fill="#9ca3af"/><ellipse cx="60" cy="95" rx="35" ry="25" fill="#9ca3af"/></svg>`);
  }
}

async function getLikeCounts(videoId?: number, shortId?: number) {
  const where = videoId ? { videoId } : { shortId };
  const likesCount = await prisma.like.count({ where: { ...where, isDislike: false } });
  const dislikesCount = await prisma.like.count({ where: { ...where, isDislike: true } });
  return { likesCount, dislikesCount };
}

async function toggleEntityLike(
  userId: number,
  target: { videoId?: number; shortId?: number },
  wantDislike: boolean
) {
  const where = target.videoId ? { userId, videoId: target.videoId } : { userId, shortId: target.shortId! };
  const existing = await prisma.like.findFirst({ where });

  let status: 'like' | 'dislike' | 'removed';
  if (existing) {
    if (wantDislike) {
      if (existing.isDislike) {
        await prisma.like.delete({ where: { id: existing.id } });
        status = 'removed';
      } else {
        await prisma.like.update({ where: { id: existing.id }, data: { isDislike: true } });
        status = 'dislike';
      }
    } else if (!existing.isDislike) {
      await prisma.like.delete({ where: { id: existing.id } });
      status = 'removed';
    } else {
      await prisma.like.update({ where: { id: existing.id }, data: { isDislike: false } });
      status = 'like';
    }
  } else {
    await prisma.like.create({ data: { userId, ...target, isDislike: wantDislike } });
    status = wantDislike ? 'dislike' : 'like';
  }

  const counts = await getLikeCounts(target.videoId, target.shortId);
  return {
    success: true,
    status,
    ...counts,
    isLiked: status === 'like',
    isDisliked: status === 'dislike',
  };
}

// Helper function to generate tokens
function generateTokens(user: any) {
  const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// --------------------------------------------------------------------------------
// DATABASE SEEDING ENGINE (Runs on startup with Prisma)
// --------------------------------------------------------------------------------
async function seedDatabase() {
  try {
    console.log('Checking database seed state with Prisma...');
    ensureDefaultAvatar();

    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
      console.log('Seeding categories...');
      await prisma.category.createMany({
        data: [
          { name: 'Игры (Gaming)', slug: 'gaming' },
          { name: 'Музыка (Music)', slug: 'music' },
          { name: 'Влоги (Vlogs)', slug: 'vlogs' },
          { name: 'Технологии (Tech)', slug: 'tech' },
          { name: 'Образование (Education)', slug: 'education' },
          { name: 'Комедия (Comedy)', slug: 'comedy' },
          { name: 'Короткие (Shorts)', slug: 'shorts' },
        ],
      });
    }

    console.log('Prisma Database verification successfully done!');
  } catch (error) {
    console.error('Database Seeding Failed:', error);
  }
}

// Seeding standard categories on bootup
seedDatabase();

// --------------------------------------------------------------------------------
// API ROUTES
// --------------------------------------------------------------------------------

const uploaders = {
  videos: createUploader('videos'),
  thumbnails: createUploader('thumbnails'),
  images: createUploader('images'),
  avatars: createUploader('avatars'),
};

app.post('/api/upload/:type', requireAuth, (req: AuthRequest, res) => {
  const type = req.params.type as UploadType;
  if (!Object.keys(uploaders).includes(type)) {
    return res.status(400).json({ error: 'Недопустимый тип загрузки' });
  }

  uploaders[type].single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
    }
    const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ error: 'Файл не передан' });
    }
    res.json({ url: publicUrl(type, file.filename) });
  });
});

// --- 1. Authenticaton API ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, avatar, bio } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Пожалуйста, введите email, пароль и имя' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Check existing User
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail }
    });
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }

    // Force roomop86@gmail.com to be Admin
    const shouldBeAdmin = trimmedEmail === 'roomop86@gmail.com';

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: trimmedEmail,
        password: hashedPassword,
        displayName: displayName.trim(),
        avatar: avatar || DEFAULT_AVATAR,
        bio: bio || 'Любитель качественного видео и ламповой атмосферы',
        isAdmin: shouldBeAdmin,
      }
    });

    const { accessToken, refreshToken } = generateTokens(newUser);

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        avatar: newUser.avatar,
        bio: newUser.bio,
        isAdmin: newUser.isAdmin,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Произошла непредвиденная ошибка на сервере при регистрации' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Введите email и пароль' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const matchUser = await prisma.user.findUnique({
      where: { email: trimmedEmail }
    });
    if (!matchUser) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (!matchUser.password) {
      return res.status(401).json({ error: 'Данный аккаунт не имеет заданного локального пароля.' });
    }

    const isMatch = await bcrypt.compare(password, matchUser.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    // Double check roomop86@gmail.com is set as Admin
    if (trimmedEmail === 'roomop86@gmail.com' && !matchUser.isAdmin) {
      const updatedUser = await prisma.user.update({
        where: { id: matchUser.id },
        data: { isAdmin: true }
      });
      Object.assign(matchUser, updatedUser);
    }

    const { accessToken, refreshToken } = generateTokens(matchUser);

    res.json({
      user: {
        id: matchUser.id,
        email: matchUser.email,
        displayName: matchUser.displayName,
        avatar: matchUser.avatar,
        bio: matchUser.bio,
        isAdmin: matchUser.isAdmin,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Ошибка сервера при авторизации' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: number };
    const userResult = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    if (!userResult) {
      return res.status(401).json({ error: 'User not found' });
    }
    const newTokens = generateTokens(userResult);
    res.json(newTokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// --- 2. Categories API ---
app.get('/api/categories', async (req, res) => {
  try {
    const allCats = await prisma.category.findMany();
    res.json(allCats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении категорий' });
  }
});

// --- 3. Videos API ---
app.get('/api/videos', async (req, res) => {
  try {
    const { category, query, sortBy } = req.query;
    
    const where: any = {};
    if (category) {
      where.categoryId = Number(category);
    }

    if (query) {
      where.OR = [
        { title: { contains: String(query), mode: 'insensitive' } },
        { description: { contains: String(query), mode: 'insensitive' } },
        { author: { displayName: { contains: String(query), mode: 'insensitive' } } }
      ];
    }

    const videoLists = await prisma.video.findMany({
      where,
      include: {
        author: true
      },
      orderBy: sortBy === 'popular' ? { views: 'desc' } : { createdAt: 'desc' }
    });

    // Flatten representation so it is compatible with UI expects
    const flattened = videoLists.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      views: v.views,
      duration: v.duration,
      createdAt: v.createdAt,
      authorId: v.authorId,
      authorName: v.author.displayName,
      authorAvatar: v.author.avatar,
      categoryId: v.categoryId
    }));

    res.json(flattened);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Ошибка при получении списка видео' });
  }
});

app.get('/api/videos/:id', async (req, res) => {
  try {
    const videoId = Number(req.params.id);
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { author: true }
    });

    if (!video) {
      return res.status(404).json({ error: 'Видео не найдено' });
    }

    // Under-the-hood views counter update
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: { views: { increment: 1 } },
      include: { author: true }
    });

    const currentVideo = {
      id: updatedVideo.id,
      title: updatedVideo.title,
      description: updatedVideo.description,
      videoUrl: updatedVideo.videoUrl,
      thumbnailUrl: updatedVideo.thumbnailUrl,
      views: updatedVideo.views,
      duration: updatedVideo.duration,
      createdAt: updatedVideo.createdAt,
      authorId: updatedVideo.authorId,
      authorName: updatedVideo.author.displayName,
      authorAvatar: updatedVideo.author.avatar,
      categoryId: updatedVideo.categoryId,
    };

    // Calculate metadata for video
    const likesCount = await prisma.like.count({ where: { videoId, isDislike: false } });
    const dislikesCount = await prisma.like.count({ where: { videoId, isDislike: true } });
    const commentsCount = await prisma.comment.count({ where: { videoId } });
    const authorSubsCount = await prisma.subscription.count({ where: { channelId: currentVideo.authorId } });

    let isLikedFlag = false;
    let isDislikedFlag = false;
    let isSubscribedFlag = false;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const authUserId = decoded.userId;

        const checkLike = await prisma.like.findFirst({
          where: { userId: authUserId, videoId }
        });
        if (checkLike) {
          isLikedFlag = !checkLike.isDislike;
          isDislikedFlag = checkLike.isDislike;
        }

        const checkSub = await prisma.subscription.findFirst({
          where: { subscriberId: authUserId, channelId: currentVideo.authorId }
        });
        isSubscribedFlag = !!checkSub;

        // Log view history (avoid duplicates within 30 min)
        const recentView = await prisma.viewHistory.findFirst({
          where: {
            userId: authUserId,
            videoId,
            viewedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          },
        });
        if (!recentView) {
          await prisma.viewHistory.create({
            data: { userId: authUserId, videoId },
          });
        }
      } catch {}
    }

    res.json({
      video: currentVideo,
      likesCount,
      dislikesCount,
      commentsCount,
      subscribersCount: authorSubsCount,
      isLiked: isLikedFlag,
      isDisliked: isDislikedFlag,
      isSubscribed: isSubscribedFlag,
    });
  } catch (error) {
    console.error('Error fetching video details:', error);
    res.status(500).json({ error: 'Ошибка получения детализированной информации о видео' });
  }
});

// Create video
app.post('/api/videos', requireAuth, async (req: AuthRequest, res) => {
  const { title, description, videoUrl, thumbnailUrl, categoryId, duration } = req.body;
  if (!title || !videoUrl) {
    return res.status(400).json({ error: 'Введите название и видеофайл' });
  }

  try {
    const inserted = await prisma.video.create({
      data: {
        title,
        description,
        videoUrl,
        thumbnailUrl: thumbnailUrl || DEFAULT_AVATAR,
        duration: duration || '0:00',
        categoryId: categoryId ? Number(categoryId) : null,
        authorId: req.user!.id,
      }
    });

    // Notify all subscribers of the uploader
    const subs = await prisma.subscription.findMany({
      where: { channelId: req.user!.id }
    });

    for (const sub of subs) {
      await prisma.recipientNotifications.create({
        data: {
          userId: sub.subscriberId,
          type: 'video',
          title: 'Новое видео!',
          body: `${req.user!.displayName} загрузил ролик: "${title}"`,
          triggerUserId: req.user!.id,
          videoId: inserted.id
        }
      });
    }

    res.status(201).json(inserted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка загрузки видео' });
  }
});

app.put('/api/videos/:id', requireAuth, async (req: AuthRequest, res) => {
  const videoId = Number(req.params.id);
  const { title, description, categoryId } = req.body;

  try {
    const existing = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!existing) return res.status(404).json({ error: 'Видео не найдено' });
    if (existing.authorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Нет прав на редактирование' });
    }

    const updated = await prisma.video.update({
      where: { id: videoId },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        categoryId: categoryId ? Number(categoryId) : existing.categoryId,
      }
    });

    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка обновления метаданных видео' });
  }
});

app.delete('/api/videos/:id', requireAuth, async (req: AuthRequest, res) => {
  const videoId = Number(req.params.id);
  try {
    const existing = await prisma.video.findUnique({
      where: { id: videoId }
    });
    if (!existing) return res.status(404).json({ error: 'Видео не найдено' });
    if (existing.authorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await prisma.video.delete({ where: { id: videoId } });
    res.json({ success: true, message: 'Видео удалено' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка удаления видеоролика' });
  }
});

// Like/Dislike Video routes
app.post('/api/videos/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const videoId = Number(req.params.id);
  const userId = req.user!.id;

  try {
    const result = await toggleEntityLike(userId, { videoId }, false);

    if (result.status === 'like') {
      const videoRecord = await prisma.video.findUnique({ where: { id: videoId } });
      if (videoRecord && videoRecord.authorId !== userId) {
        await prisma.recipientNotifications.create({
          data: {
            userId: videoRecord.authorId,
            type: 'like',
            title: 'Понравилось ваше видео',
            body: `${req.user!.displayName} оценил ваше видео "${videoRecord.title}" как понравилось.`,
            triggerUserId: userId,
            videoId,
          },
        });
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Database transaction error on like' });
  }
});

app.post('/api/videos/:id/dislike', requireAuth, async (req: AuthRequest, res) => {
  const videoId = Number(req.params.id);
  const userId = req.user!.id;

  try {
    const result = await toggleEntityLike(userId, { videoId }, true);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Database transaction error on dislike' });
  }
});

// --- 4. Shorts API ---
app.get('/api/shorts', async (req, res) => {
  try {
    const list = await prisma.short.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = list.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      videoUrl: s.videoUrl,
      views: s.views,
      createdAt: s.createdAt,
      authorId: s.authorId,
      authorName: s.author.displayName,
      authorAvatar: s.author.avatar,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed getting shorts' });
  }
});

app.get('/api/shorts/:id', async (req, res) => {
  const shortId = Number(req.params.id);
  try {
    const currentShort = await prisma.short.findUnique({
      where: { id: shortId },
      include: { author: true }
    });

    if (!currentShort) return res.status(404).json({ error: 'Short not found' });

    await prisma.short.update({
      where: { id: shortId },
      data: { views: { increment: 1 } }
    });

    const likesCount = await prisma.like.count({ where: { shortId, isDislike: false } });
    const dislikesCount = await prisma.like.count({ where: { shortId, isDislike: true } });
    const commentsCount = await prisma.comment.count({ where: { shortId } });

    let isLiked = false;
    let isDisliked = false;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const authUserId = decoded.userId;

        const rating = await prisma.like.findFirst({
          where: { userId: authUserId, shortId }
        });
        if (rating) {
          isLiked = !rating.isDislike;
          isDisliked = rating.isDislike;
        }
      } catch {}
    }

    res.json({
      short: {
        id: currentShort.id,
        title: currentShort.title,
        description: currentShort.description,
        videoUrl: currentShort.videoUrl,
        views: currentShort.views + 1,
        createdAt: currentShort.createdAt,
        authorId: currentShort.authorId,
        authorName: currentShort.author.displayName,
        authorAvatar: currentShort.author.avatar,
      },
      likesCount,
      dislikesCount,
      commentsCount,
      isLiked,
      isDisliked
    });
  } catch {
    res.status(500).json({ error: 'Short loading failure' });
  }
});

app.post('/api/shorts', requireAuth, async (req: AuthRequest, res) => {
  const { title, description, videoUrl } = req.body;
  if (!title || !videoUrl) return res.status(400).json({ error: 'Введите название и URL Shorts' });
  try {
    const newShort = await prisma.short.create({
      data: {
        title,
        description,
        videoUrl,
        authorId: req.user!.id
      }
    });
    res.status(201).json(newShort);
  } catch {
    res.status(500).json({ error: 'Error publishing Shorts' });
  }
});

app.delete('/api/shorts/:id', requireAuth, async (req: AuthRequest, res) => {
  const shortId = Number(req.params.id);
  try {
    const record = await prisma.short.findUnique({ where: { id: shortId } });
    if (!record) return res.status(404).json({ error: 'NotFound' });
    if (record.authorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.short.delete({ where: { id: shortId } });
    res.json({ success: true, message: 'Short deleted' });
  } catch {
    res.status(500).json({ error: 'Delete short error' });
  }
});

app.post('/api/shorts/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const shortId = Number(req.params.id);
  const userId = req.user!.id;
  try {
    const result = await toggleEntityLike(userId, { shortId }, false);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Action failed' });
  }
});

app.post('/api/shorts/:id/dislike', requireAuth, async (req: AuthRequest, res) => {
  const shortId = Number(req.params.id);
  const userId = req.user!.id;
  try {
    const result = await toggleEntityLike(userId, { shortId }, true);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Action failed' });
  }
});

// --- 5. Community Posts API ---
app.get('/api/posts', async (req, res) => {
  try {
    const fetchedPosts = await prisma.post.findMany({
      include: {
        author: true,
        comments: true,
        likes: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const parsed = fetchedPosts.map(post => {
      const likesCount = post.likes.filter(l => !l.isDislike).length;
      const commentsCount = post.comments.length;
      return {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        authorId: post.authorId,
        authorName: post.author.displayName,
        authorAvatar: post.author.avatar,
        likesCount,
        commentsCount,
      };
    });

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Community posts fetch failed' });
  }
});

app.post('/api/posts', requireAuth, async (req: AuthRequest, res) => {
  const { content, imageUrl } = req.body;
  if (!content) return res.status(400).json({ error: 'Напишите текст поста' });
  try {
    const newPost = await prisma.post.create({
      data: {
        content,
        imageUrl,
        authorId: req.user!.id,
      },
      include: { author: true },
    });
    res.status(201).json({
      id: newPost.id,
      content: newPost.content,
      imageUrl: newPost.imageUrl,
      createdAt: newPost.createdAt,
      authorId: newPost.authorId,
      authorName: newPost.author.displayName,
      authorAvatar: newPost.author.avatar,
      likesCount: 0,
      commentsCount: 0,
    });
  } catch {
    res.status(500).json({ error: 'Error posting' });
  }
});

app.delete('/api/posts/:id', requireAuth, async (req: AuthRequest, res) => {
  const postId = Number(req.params.id);
  try {
    const findPost = await prisma.post.findUnique({ where: { id: postId } });
    if (!findPost) return res.status(404).json({ error: 'NotFound' });
    if (findPost.authorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.post.delete({ where: { id: postId } });
    res.json({ success: true, message: 'Post deleted' });
  } catch {
    res.status(500).json({ error: 'Post delete error' });
  }
});

app.post('/api/posts/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const postId = Number(req.params.id);
  const userId = req.user!.id;
  try {
    const check = await prisma.like.findFirst({ where: { userId, postId } });
    if (check) {
      await prisma.like.delete({ where: { id: check.id } });
    } else {
      await prisma.like.create({ data: { userId, postId, isDislike: false } });
    }
    const currentLikes = await prisma.like.count({ where: { postId, isDislike: false } });
    res.json({ success: true, likesCount: currentLikes });
  } catch {
    res.status(500).json({ error: 'Database like error' });
  }
});

// --- 6. Comments API ---
app.get('/api/videos/:id/comments', async (req, res) => {
  const videoId = Number(req.params.id);
  try {
    const allComments = await prisma.comment.findMany({
      where: { videoId },
      include: { author: true }
    });

    const parsed = allComments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      authorId: c.authorId,
      authorName: c.author.displayName,
      authorAvatar: c.author.avatar,
      videoId: c.videoId,
      shortId: c.shortId,
      postId: c.postId,
      parentId: c.parentId,
    }));

    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Problem fetch comments' });
  }
});

app.get('/api/shorts/:id/comments', async (req, res) => {
  const shortId = Number(req.params.id);
  try {
    const list = await prisma.comment.findMany({
      where: { shortId },
      include: { author: true }
    });
    const parsed = list.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      authorId: c.authorId,
      authorName: c.author.displayName,
      authorAvatar: c.author.avatar,
      parentId: c.parentId,
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Error comments' });
  }
});

app.get('/api/posts/:id/comments', async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const list = await prisma.comment.findMany({
      where: { postId },
      include: { author: true }
    });
    const parsed = list.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      authorId: c.authorId,
      authorName: c.author.displayName,
      authorAvatar: c.author.avatar,
      parentId: c.parentId,
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Error comments' });
  }
});

app.post('/api/comments', requireAuth, async (req: AuthRequest, res) => {
  const { content, videoId, shortId, postId, parentId } = req.body;
  if (!content) return res.status(400).json({ error: 'Комментарий не может быть пустым' });

  try {
    const inserted = await prisma.comment.create({
      data: {
        content,
        videoId: videoId ? Number(videoId) : null,
        shortId: shortId ? Number(shortId) : null,
        postId: postId ? Number(postId) : null,
        parentId: parentId ? Number(parentId) : null,
        authorId: req.user!.id,
      },
      include: { author: true }
    });

    const formattedComment = {
      id: inserted.id,
      content: inserted.content,
      createdAt: inserted.createdAt,
      authorId: inserted.authorId,
      authorName: inserted.author.displayName,
      authorAvatar: inserted.author.avatar,
      videoId: inserted.videoId,
      shortId: inserted.shortId,
      postId: inserted.postId,
      parentId: inserted.parentId,
    };

    // Make notification alerts
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: Number(parentId) } });
      if (parentComment && parentComment.authorId !== req.user!.id) {
        await prisma.recipientNotifications.create({
          data: {
            userId: parentComment.authorId,
            type: 'reply',
            title: 'Новый ответ на ваш комментарий',
            body: `${req.user!.displayName} ответил на комментарий: "${content.substring(0, 40)}..."`,
            triggerUserId: req.user!.id,
            videoId: videoId ? Number(videoId) : null,
            shortId: shortId ? Number(shortId) : null,
            postId: postId ? Number(postId) : null,
          }
        });
      }
    } else if (videoId) {
      const parentVideo = await prisma.video.findUnique({ where: { id: Number(videoId) } });
      if (parentVideo && parentVideo.authorId !== req.user!.id) {
        await prisma.recipientNotifications.create({
          data: {
            userId: parentVideo.authorId,
            type: 'comment',
            title: 'Новый комментарий под вашим видео',
            body: `${req.user!.displayName} прокомментировал "${parentVideo.title}"`,
            triggerUserId: req.user!.id,
            videoId: Number(videoId),
          }
        });
      }
    }

    res.status(201).json(formattedComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка комментирования' });
  }
});

app.delete('/api/comments/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const commentId = Number(req.params.id);
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    if (existing.authorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ success: true, message: 'Комментарий удален' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// --- 7. Channels / Subscriptions API ---
app.get('/api/channels/:id', async (req, res) => {
  const authorId = Number(req.params.id);
  try {
    const channel = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!channel) {
      return res.status(404).json({ error: 'Канал не существует' });
    }

    // Subscriber stats
    const subsCount = await prisma.subscription.count({ where: { channelId: authorId } });
    const videosCount = await prisma.video.count({ where: { authorId } });
    
    const viewsSumObj = await prisma.video.aggregate({
      where: { authorId },
      _sum: { views: true }
    });
    const totalViews = viewsSumObj._sum.views || 0;
    
    // Auth subscription helper
    let isSubscribed = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const authUserId = decoded.userId;

        const count = await prisma.subscription.count({
          where: { subscriberId: authUserId, channelId: authorId }
        });
        isSubscribed = count > 0;
      } catch {}
    }

    res.json({
      id: channel.id,
      displayName: channel.displayName,
      avatar: channel.avatar,
      bio: channel.bio,
      createdAt: channel.createdAt,
      subscribersCount: subsCount,
      videosCount,
      totalViews,
      isSubscribed,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error loading channel metadata' });
  }
});

app.post('/api/channels/:id/subscribe', requireAuth, async (req: AuthRequest, res) => {
  const channelId = Number(req.params.id);
  const subscriberId = req.user!.id;

  if (channelId === subscriberId) {
    return res.status(400).json({ error: 'Вы не можете подписаться на собственный канал' });
  }

  try {
    const existing = await prisma.subscription.findFirst({
      where: { subscriberId, channelId }
    });

    if (existing) {
      await prisma.subscription.delete({ where: { id: existing.id } });
      return res.json({ isSubscribed: false });
    } else {
      await prisma.subscription.create({
        data: { subscriberId, channelId }
      });

      // Trigger Notify
      await prisma.recipientNotifications.create({
        data: {
          userId: channelId,
          type: 'subscriber',
          title: 'У вас новый подписчик!',
          body: `${req.user!.displayName} подписался на ваш канал!`,
          triggerUserId: subscriberId,
        }
      });

      return res.json({ isSubscribed: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Subscription error' });
  }
});

// --- 8. Playlists API ---
app.get('/api/playlists', async (req, res) => {
  try {
    const authorId = req.query.authorId ? Number(req.query.authorId) : null;
    let queryResult;
    if (authorId) {
      queryResult = await prisma.playlist.findMany({
        where: { authorId },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      queryResult = await prisma.playlist.findMany({
        where: { isPrivate: false },
        orderBy: { createdAt: 'desc' }
      });
    }
    res.json(queryResult);
  } catch (e) {
    res.status(500).json({ error: 'Error loading lists' });
  }
});

app.get('/api/playlists/:id', async (req, res) => {
  const playlistId = Number(req.params.id);
  try {
    const record = await prisma.playlist.findUnique({
      where: { id: playlistId }
    });
    if (!record) return res.status(404).json({ error: 'Playlist not found' });

    // Fetch video entries
    const items = await prisma.playlistVideo.findMany({
      where: { playlistId },
      include: {
        video: {
          include: { author: true }
        }
      },
      orderBy: { position: 'asc' }
    });

    const parsedVideos = items.map(pVideo => ({
      id: pVideo.video.id,
      title: pVideo.video.title,
      thumbnailUrl: pVideo.video.thumbnailUrl,
      views: pVideo.video.views,
      duration: pVideo.video.duration,
      createdAt: pVideo.video.createdAt,
      authorName: pVideo.video.author.displayName,
    }));

    res.json({
      ...record,
      videos: parsedVideos,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error loading list items' });
  }
});

app.post('/api/playlists', requireAuth, async (req: AuthRequest, res) => {
  const { name, description, isPrivate } = req.body;
  if (!name) return res.status(400).json({ error: 'Введите название плейлиста' });
  try {
    const inserted = await prisma.playlist.create({
      data: {
        name,
        description: description || '',
        authorId: req.user!.id,
        isPrivate: isPrivate || false,
      }
    });
    res.status(201).json(inserted);
  } catch {
    res.status(500).json({ error: 'Error making playlist' });
  }
});

app.post('/api/playlists/:id/videos', requireAuth, async (req: AuthRequest, res) => {
  const playlistId = Number(req.params.id);
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: 'Missing video' });
  try {
    const record = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!record) return res.status(404).json({ error: 'NotFound' });
    if (record.authorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

    // Ensure not already in playlist
    const check = await prisma.playlistVideo.findFirst({
      where: { playlistId, videoId: Number(videoId) }
    });
    if (check) return res.json({ message: 'Already configured' });

    await prisma.playlistVideo.create({
      data: {
        playlistId,
        videoId: Number(videoId),
      }
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error editing list' });
  }
});

// --- 9. User Profile (Mine) API ---
app.get('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userDetail = req.user!;
    
    // Fetch user view history limits
    const historyList = await prisma.viewHistory.findMany({
      where: { userId: userDetail.id },
      include: {
        video: {
          include: { author: true }
        }
      },
      orderBy: { viewedAt: 'desc' },
      take: 10
    });

    const parsedHistory = historyList.map(h => ({
      videoId: h.videoId,
      viewedAt: h.viewedAt,
      title: h.video.title,
      thumbnailUrl: h.video.thumbnailUrl,
      authorName: h.video.author.displayName,
    }));

    // Subscribed channels
    const channelsList = await prisma.subscription.findMany({
      where: { subscriberId: userDetail.id },
      include: {
        channel: true
      }
    });

    const parsedChannels = channelsList.map(sub => ({
      id: sub.channel.id,
      displayName: sub.channel.displayName,
      avatar: sub.channel.avatar,
    }));

    res.json({
      user: userDetail,
      history: parsedHistory,
      subscriptions: parsedChannels,
    });
  } catch (error) {
    res.status(500).json({ error: 'Profile error' });
  }
});

app.put('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
  const { displayName, avatar, bio } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        displayName: displayName || req.user!.displayName,
        avatar: avatar !== undefined ? avatar : req.user!.avatar,
        bio: bio !== undefined ? bio : req.user!.bio,
      }
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Update profile error' });
  }
});

// --- 10. Notifications API ---
app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await prisma.recipientNotifications.findMany({
      where: { userId: req.user!.id },
      include: { triggerUser: true },
      orderBy: { createdAt: 'desc' }
    });

    const parsed = list.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      createdAt: n.createdAt,
      triggerUserId: n.triggerUserId,
      triggerUserAvatar: n.triggerUser?.avatar || null,
      videoId: n.videoId,
      shortId: n.shortId,
      postId: n.postId,
    }));

    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Notifications fetch error' });
  }
});

app.post('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
  const noteId = Number(req.params.id);
  try {
    await prisma.recipientNotifications.updateMany({
      where: { id: noteId, userId: req.user!.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
});

// --- 11. Search ALL Entities API ---
app.get('/api/search', async (req, res) => {
  const query = req.query.q ? String(req.query.q).trim() : '';
  if (!query) return res.json({ videos: [], channels: [], shorts: [], posts: [] });

  try {
    // 1. Search Videos
    const matchesVideos = await prisma.video.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: { author: true },
      orderBy: { views: 'desc' },
      take: 10
    });

    const parsedVideos = matchesVideos.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      views: v.views,
      duration: v.duration,
      createdAt: v.createdAt,
      authorName: v.author.displayName,
    }));

    // 2. Search Channels
    const matchesChannels = await prisma.user.findMany({
      where: {
        displayName: { contains: query, mode: 'insensitive' }
      },
      take: 5
    });

    const parsedChannels = matchesChannels.map(u => ({
      id: u.id,
      displayName: u.displayName,
      avatar: u.avatar,
      bio: u.bio,
    }));

    // 3. Search Shorts
    const matchesShorts = await prisma.short.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' }
      },
      include: { author: true },
      take: 5
    });

    const parsedShorts = matchesShorts.map(s => ({
      id: s.id,
      title: s.title,
      videoUrl: s.videoUrl,
      views: s.views,
      authorName: s.author.displayName,
    }));

    // 4. Search Posts
    const matchesPosts = await prisma.post.findMany({
      where: {
        content: { contains: query, mode: 'insensitive' }
      },
      include: { author: true },
      take: 5
    });

    const parsedPosts = matchesPosts.map(p => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      authorName: p.author.displayName,
    }));

    res.json({
      videos: parsedVideos,
      channels: parsedChannels,
      shorts: parsedShorts,
      posts: parsedPosts,
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- 12. Admin Board & Stats API ---
app.get('/api/admin/stats', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user!.isAdmin) {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
  }

  try {
    const userCount = await prisma.user.count();
    const videoCount = await prisma.video.count();
    const shortCount = await prisma.short.count();
    const commentCount = await prisma.comment.count();
    const postCount = await prisma.post.count();
    const likesCount = await prisma.like.count({});

    const viewsSum = await prisma.video.aggregate({ _sum: { views: true } });
    const shortsViewsSum = await prisma.short.aggregate({ _sum: { views: true } });
    const totalViews = (viewsSum._sum.views || 0) + (shortsViewsSum._sum.views || 0);

    res.json({
      users: userCount,
      videos: videoCount,
      shorts: shortCount,
      comments: commentCount,
      posts: postCount,
      likes: likesCount,
      totalViews,
    });
  } catch (e) {
    res.status(500).json({ error: 'Statistics load failed' });
  }
});

app.get('/api/admin/users', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user!.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const allUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(allUsers);
  } catch (e) {
    res.status(500).json({ error: 'Users loading failed' });
  }
});

app.delete('/api/admin/users/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user!.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const deleteUserId = Number(req.params.id);
  try {
    await prisma.user.delete({ where: { id: deleteUserId } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'User deletion failed' });
  }
});

app.delete('/api/admin/videos/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user!.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const deleteVideoId = Number(req.params.id);
  try {
    await prisma.video.delete({ where: { id: deleteVideoId } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Video deletion failed' });
  }
});

app.delete('/api/admin/shorts/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user!.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const deleteShortId = Number(req.params.id);
  try {
    await prisma.short.delete({ where: { id: deleteShortId } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Short deletion failed' });
  }
});

app.delete('/api/admin/posts/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user!.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const deletePostId = Number(req.params.id);
  try {
    await prisma.post.delete({ where: { id: deletePostId } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Post deletion failed' });
  }
});

// --------------------------------------------------------------------------------
// VITE DEV SERVER / PRODUCTION SERVING BOOTSTRAP
// --------------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LarpTubeX engine booted on http://0.0.0.0:${PORT}`);
  });
}

startServer();
