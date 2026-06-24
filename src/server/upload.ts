import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

const SUBDIRS = ['videos', 'thumbnails', 'images', 'avatars', 'banners'] as const;
export type UploadType = (typeof SUBDIRS)[number];

export function ensureUploadDirs() {
  for (const dir of SUBDIRS) {
    fs.mkdirSync(path.join(UPLOADS_ROOT, dir), { recursive: true });
  }
}

const MIME_MAP: Record<UploadType, string[]> = {
  videos: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  thumbnails: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  avatars: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  banners: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif', 'image/heic', 'image/heif', 'image/tiff', 'image/svg+xml'],
};

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|svg|tiff?)$/i;

function isAllowedImage(file: Express.Multer.File, allowedMimes: string[]): boolean {
  if (allowedMimes.includes(file.mimetype)) return true;
  if (file.mimetype.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.test(path.extname(file.originalname).toLowerCase());
}

const MAX_SIZE: Record<UploadType, number> = {
  videos: 500 * 1024 * 1024,
  thumbnails: 10 * 1024 * 1024,
  images: 10 * 1024 * 1024,
  avatars: 5 * 1024 * 1024,
  banners: 15 * 1024 * 1024,
};

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return map[mime] || '';
}

export function createUploader(type: UploadType) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOADS_ROOT, type));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || extFromMime(file.mimetype);
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
      cb(null, unique);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_SIZE[type] },
    fileFilter: (_req, file, cb) => {
      if (type === 'banners') {
        if (isAllowedImage(file, MIME_MAP.banners)) {
          cb(null, true);
          return;
        }
      }
      if (MIME_MAP[type].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Недопустимый тип файла: ${file.mimetype}`));
      }
    },
  });
}

export function publicUrl(type: UploadType, filename: string): string {
  return `/uploads/${type}/${filename}`;
}
