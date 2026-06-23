import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'postgres';
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || 'postgres';
  const host = process.env.SQL_HOST || 'localhost';
  const dbName = process.env.SQL_DB_NAME || 'larptubex';

  if (host.startsWith('/') || host.includes('/cloudsql/')) {
    databaseUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost/${dbName}?host=${encodeURIComponent(host)}`;
  } else {
    databaseUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${dbName}`;
  }
}

console.log('Pushing Prisma schema to database...');
try {
  execSync('npx prisma db push', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit'
  });
  console.log('Database schema pushed successfully!');
} catch (error) {
  console.error('Failed to push database schema:', error);
  process.exit(1);
}
