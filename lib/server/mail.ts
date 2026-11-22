import { randomInt } from 'node:crypto';

import nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailResult {
  ok: boolean;
  error?: string;
}

/**
 * Отправка письма через SMTP (nodemailer).
 * Настройки — переменные окружения SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM
 * (см. .env.example). Если SMTP не настроен — письмо не отправляется и возвращается ошибка.
 */
export async function sendMail(options: MailOptions): Promise<MailResult> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    console.warn('[mail] SMTP не настроен — письмо не отправлено:', options.to);
    return { ok: false, error: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
        : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@animehub.local',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { ok: true };
  } catch (error) {
    console.error('[mail] ошибка отправки на', options.to, error);
    return { ok: false, error: 'SEND_FAILED' };
  }
}

/** 6-значный код подтверждения/сброса. */
export function generateCode(length = 6): string {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += String(randomInt(0, 10));
  }
  return code;
}

/** Базовый URL публичного сайта для ссылок в письмах (SITE_URL или пусто). */
export function mailLinkBase(): string {
  return process.env.SITE_URL?.replace(/\/+$/, '') ?? '';
}
