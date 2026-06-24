import bcrypt from 'bcrypt';
import { createTransport } from 'nodemailer';
import { prisma } from '../db/prisma.ts';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }
  const port = Number(process.env.SMTP_PORT) || 587;
  return createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isEmailAuthConfigured(): boolean {
  return isSmtpConfigured();
}

export async function sendEmailLoginCode(email: string) {
  const trimmedEmail = email.trim().toLowerCase();
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.emailVerificationCode.deleteMany({ where: { email: trimmedEmail } });
  await prisma.emailVerificationCode.create({
    data: { email: trimmedEmail, codeHash, expiresAt },
  });

  const from = process.env.SMTP_FROM || `LarpTubeX <${process.env.SMTP_USER}>`;
  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to: trimmedEmail,
    subject: 'Код входа в LarpTubeX',
    text: `Ваш код для входа в LarpTubeX: ${code}\n\nКод действует 10 минут. Если вы не запрашивали вход — просто проигнорируйте письмо.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px;color:#0f0f0f">LarpTubeX</h2>
        <p style="color:#606060;margin:0 0 16px">Ваш код для входа:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 16px;color:#cc0000">${code}</p>
        <p style="color:#909090;font-size:13px;margin:0">Код действует 10 минут. Если вы не запрашивали вход — проигнорируйте это письмо.</p>
      </div>
    `,
  });
}

export async function verifyEmailLoginCode(email: string, code: string) {
  const trimmedEmail = email.trim().toLowerCase();
  const normalizedCode = String(code).trim();

  const record = await prisma.emailVerificationCode.findFirst({
    where: { email: trimmedEmail },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new Error('CODE_NOT_FOUND');
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationCode.delete({ where: { id: record.id } });
    throw new Error('CODE_EXPIRED');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.emailVerificationCode.delete({ where: { id: record.id } });
    throw new Error('CODE_MAX_ATTEMPTS');
  }

  const valid = await bcrypt.compare(normalizedCode, record.codeHash);
  if (!valid) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });
    throw new Error('CODE_INVALID');
  }

  await prisma.emailVerificationCode.delete({ where: { id: record.id } });
  return trimmedEmail;
}
