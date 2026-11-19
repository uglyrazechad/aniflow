'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ImagePlus, Loader2, Save, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROFILE_ACCENTS, PROFILE_THEMES, backgroundStyle } from '@/lib/profile-themes';
import { cn } from '@/lib/utils';
import type { PublicUser } from '@/types/user';

interface ProfileEditorProps {
  user: PublicUser;
}

/** Сжимаем картинку в браузере, чтобы не гонять 5 МБ через туннель. */
async function prepareImage(file: File, maxSide: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

async function uploadImage(file: File, maxSide: number): Promise<string> {
  const blob = await prepareImage(file, maxSide);
  const form = new FormData();
  form.append('file', blob, 'image.webp');

  const response = await fetch('/api/upload', { method: 'POST', body: form });
  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !data.url) throw new Error(data.error || 'Не удалось загрузить картинку');
  return data.url;
}

export function ProfileEditor({ user }: ProfileEditorProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user.profile.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.profile.bio);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.profile.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState<string | null>(user.profile.bannerUrl);
  const [background, setBackground] = useState(user.profile.background);
  const [accent, setAccent] = useState(user.profile.accent);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [uploading, setUploading] = useState<'avatar' | 'banner' | 'background' | null>(null);
  const [saving, setSaving] = useState(false);

  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);

  const pick = async (
    kind: 'avatar' | 'banner' | 'background',
    file: File | undefined,
    maxSide: number,
  ) => {
    if (!file) return;

    setUploading(kind);
    try {
      const url = await uploadImage(file, maxSide);
      if (kind === 'avatar') setAvatarUrl(url);
      else if (kind === 'banner') setBannerUrl(url);
      else setBackground(url);
      toast.success('Картинка загружена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка загрузки');
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          username,
          bio,
          avatarUrl,
          bannerUrl,
          background,
          accent,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || 'Не удалось сохранить');
        return;
      }

      toast.success('Профиль обновлён');
      setCurrentPassword('');
      setNewPassword('');
      router.refresh();
    } catch {
      toast.error('Сеть недоступна. Попробуйте ещё раз');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Предпросмотр */}
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/40">
        <div
          className="relative h-40 bg-cover bg-center sm:h-56"
          style={backgroundStyle(background)}
        >
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Баннер профиля"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        </div>

        <div className="relative -mt-12 flex flex-col gap-4 px-5 pb-5 sm:-mt-14 sm:flex-row sm:items-end sm:px-7">
          <div className="relative">
            <Avatar
              src={avatarUrl}
              name={displayName || user.profile.displayName}
              accent={accent}
              className="h-24 w-24 border-4 border-background shadow-2xl sm:h-28 sm:w-28"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1 sm:pb-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {displayName || 'Без имени'}
            </h1>
            <p className="truncate text-sm text-muted-foreground">@{username}</p>
            {bio ? (
              <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{bio}</p>
            ) : null}
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/u/${username}`}>
              <ExternalLink className="h-3.5 w-3.5" />
              Мой профиль
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Основное */}
        <section className="space-y-5 rounded-2xl border border-border/60 bg-card/50 p-5">
          <h2 className="text-sm font-semibold">Основное</h2>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Имя на сайте</span>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={40}
              placeholder="Как вас показывать"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Ник в ссылке</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/u/</span>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                maxLength={20}
                placeholder="nickname"
                className="flex-1"
              />
            </div>
            <span className="block text-[11px] text-muted-foreground/70">
              Латиница, цифры, точка, дефис или подчёркивание
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">О себе</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Любимые жанры, тайтлы, что угодно"
              className="w-full resize-none rounded-xl border border-input bg-background/60 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            <span className="block text-right text-[11px] text-muted-foreground/70">
              {bio.length}/300
            </span>
          </label>

          <div className="space-y-3 border-t border-border/60 pt-4">
            <h3 className="text-sm font-semibold">Смена пароля</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Текущий пароль"
                autoComplete="current-password"
              />
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Новый пароль"
                autoComplete="new-password"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Оставьте поля пустыми, если не хотите менять пароль. Почта для входа: {user.email}
            </p>
          </div>
        </section>

        {/* Оформление */}
        <section className="space-y-5 rounded-2xl border border-border/60 bg-card/50 p-5">
          <h2 className="text-sm font-semibold">Оформление</h2>

          <div className="flex flex-wrap gap-2">
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void pick('avatar', event.target.files?.[0], 512)}
            />
            <input
              ref={bannerInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void pick('banner', event.target.files?.[0], 1600)}
            />
            <input
              ref={backgroundInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void pick('background', event.target.files?.[0], 1600)}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading !== null}
              onClick={() => avatarInput.current?.click()}
            >
              {uploading === 'avatar' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              Аватар
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading !== null}
              onClick={() => bannerInput.current?.click()}
            >
              {uploading === 'banner' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              Баннер
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading !== null}
              onClick={() => backgroundInput.current?.click()}
            >
              {uploading === 'background' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              Фон
            </Button>

            {avatarUrl ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl(null)}>
                <Trash2 className="h-3.5 w-3.5" />
                Без аватара
              </Button>
            ) : null}
            {bannerUrl ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setBannerUrl(null)}>
                <Trash2 className="h-3.5 w-3.5" />
                Без баннера
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Фон профиля</span>
            <div className="grid grid-cols-3 gap-2">
              {PROFILE_THEMES.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => setBackground(theme.key)}
                  className={cn(
                    'relative h-16 overflow-hidden rounded-xl border transition-all',
                    background === theme.key
                      ? 'border-primary ring-2 ring-primary/40'
                      : 'border-border/60 hover:border-primary/40',
                  )}
                  style={backgroundStyle(theme.key)}
                  aria-label={theme.name}
                >
                  {background === theme.key ? (
                    <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-[10px] text-white/90">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Фон виден за баннером. Можно загрузить свою картинку кнопкой «Фон».
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Акцент</span>
            <div className="flex flex-wrap gap-2">
              {PROFILE_ACCENTS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccent(color)}
                  aria-label={`Акцент ${color}`}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                    accent === color ? 'border-white ring-2 ring-primary' : 'border-transparent',
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/85 px-4 py-3 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <p className="hidden text-xs text-muted-foreground sm:block">
          Изменения сразу появятся в вашем профиле
        </p>
        <Button
          variant="gradient"
          onClick={() => void save()}
          disabled={saving}
          size="lg"
          className="ml-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить профиль
        </Button>
      </div>
    </div>
  );
}
