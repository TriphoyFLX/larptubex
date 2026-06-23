# LarpTubeX

YouTube-style video platform: React + Express + PostgreSQL (Prisma).

## Stack

- **Frontend:** React 19, React Router, Zustand, Tailwind CSS
- **Backend:** Express, JWT auth, local file uploads (`uploads/`)
- **Database:** PostgreSQL via Prisma

## Run locally

**Requirements:** Node.js 20+, PostgreSQL

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env and configure:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL` (or `SQL_*` vars) and `JWT_SECRET`.
3. Push schema:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
   App: http://localhost:3000

## Брендинг

Статические файлы бренда лежат в `public/brand/`:

- `logo.png` — основной логотип (navbar, favicon, OG)
- `logo.svg` — векторная версия

Favicon: `public/favicon.png`, манифест: `public/site.webmanifest`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (API + Vite HMR) |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | TypeScript check |

## Для команды (клон и запуск)

```bash
git clone https://github.com/TriphoyFLX/larptubex.git
cd larptubex
npm install
cp .env.example .env
# отредактируйте .env: DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma db push
npx prisma generate
npm run dev
```

Файл `.env` не в git — каждый разработчик создаёт свой локально.
