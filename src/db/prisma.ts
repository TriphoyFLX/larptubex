import { PrismaClient } from '@prisma/client';

// Generate standard PostgreSQL connection string from Cloud SQL configuration if not set
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

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
