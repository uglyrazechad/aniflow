'use client';

import { useState } from 'react';
import { Check, Globe2, Loader2, Lock, ShieldCheck, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { RoomMember } from '@/lib/room-types';
import { cn } from '@/lib/utils';

interface RoomData {
  name: string;
  isPublic: boolean;
  maxMembers: number;
}

interface Props {
  room: RoomData;
  members: RoomMember[];
  isHost: boolean;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  onTransfer: (userId: string) => void;
  onClose: () => void;
}

export function SettingsModal({ room, members, isHost, onSave, onTransfer, onClose }: Props) {
  const [name, setName] = useState(room.name);
  const [isPublic, setIsPublic] = useState(room.isPublic);
  const [password, setPassword] = useState('');
  const [maxMembers, setMaxMembers] = useState(room.maxMembers);
  const [saving, setSaving] = useState(false);

  if (!isHost) return null;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim() || 'Смотрим вместе',
      isPublic,
      maxMembers: Math.min(50, Math.max(2, Number(maxMembers) || room.maxMembers)),
      // Пароль не показываем и не перезаписываем пустым значением.
      password: isPublic ? null : password.trim() || undefined,
    });
    setSaving(false);
    if (ok) onClose();
  };

  const others = members.filter((m) => !m.isHost);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-border/50 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/25 to-orange-500/10 text-amber-400 ring-1 ring-amber-400/25">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">Настройки комнаты</h2>
            <p className="text-xs text-muted-foreground">Доступно только хозяину комнаты</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label htmlFor="room-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Название
            </label>
            <input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              maxLength={60}
              className="h-10 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm outline-none transition-colors focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => setIsPublic((v) => !v)}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors',
              isPublic
                ? 'border-amber-400/30 bg-amber-400/[0.07]'
                : 'border-border/60 bg-background/40 hover:border-border',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                isPublic ? 'bg-amber-400/15 text-amber-400' : 'bg-muted text-muted-foreground',
              )}
            >
              {isPublic ? <Globe2 className="h-[18px] w-[18px]" /> : <Lock className="h-[18px] w-[18px]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">Публичная комната</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {isPublic
                  ? 'Любой сможет зайти по ссылке — пароль не нужен'
                  : 'Только по паролю, который вы зададите ниже'}
              </span>
            </span>
            <span
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                isPublic ? 'bg-amber-400' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  isPublic ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>

          {!isPublic ? (
            <div>
              <label htmlFor="room-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Пароль
              </label>
              <input
                id="room-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value.slice(0, 16))}
                placeholder="Новый пароль (пусто — не менять)"
                autoComplete="new-password"
                className="h-10 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm outline-none transition-colors focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Для приватной комнаты пароль обязателен. Пустое поле сохраняет текущий.
              </p>
            </div>
          ) : null}

          <div>
            <label htmlFor="room-max" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Максимум участников
            </label>
            <input
              id="room-max"
              type="number"
              min={2}
              max={50}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="h-10 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm outline-none transition-colors focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">От 2 до 50 человек.</p>
          </div>

          {others.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Передать хоста</h3>
              <ul className="flex flex-col gap-1.5">
                {others.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-2.5 py-2"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                      {m.nick.replace(/\s+/g, '').slice(0, 2).toUpperCase() || '?'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.nick}</span>
                    <Button size="sm" variant="outline" onClick={() => onTransfer(m.userId)}>
                      Передать
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border/50 bg-background/30 px-5 py-3.5">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="min-w-[120px] gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
