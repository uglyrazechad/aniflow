'use client';

import { Ban, ShieldCheck, UserX } from 'lucide-react';

import type { RoomMember } from '@/lib/room-types';

interface Props {
  members: RoomMember[];
  hostId: string | null;
  isHost: boolean;
  onKick: (userId: string) => void;
  onBan: (userId: string) => void;
  onMute: (userId: string) => void;
}

function initials(name: string) {
  return (
    name
      .replace(/\s+/g, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export function Participants({ members, hostId, isHost, onKick, onBan, onMute }: Props) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-3">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15">
          <span className="h-2 w-2 rounded-full bg-primary" />
        </span>
        Участники — {members.length}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {initials(m.nick)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className="text-foreground">{m.nick}</span>
              {hostId === m.userId || m.isHost ? <ShieldCheck className="ml-1 inline h-3.5 w-3.5 text-primary" /> : null}
              {m.muted ? <span className="ml-1 text-[10px] text-muted-foreground">мьют</span> : null}
            </span>
            {isHost && m.userId !== hostId ? (
              <>
                <button type="button" onClick={() => onMute(m.userId)} title="Мьют" className="rounded-full p-1 text-muted-foreground hover:bg-primary/15 hover:text-primary">
                  {m.muted ? '🔊' : '🔇'}
                </button>
                <button type="button" onClick={() => onKick(m.userId)} title="Выгнать" className="rounded-full p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                  <UserX className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => onBan(m.userId)} title="Забанить" className="rounded-full p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                  <Ban className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
