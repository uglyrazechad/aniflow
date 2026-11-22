'use client';

import { useEffect, useRef, useState } from 'react';

import { ShieldCheck } from 'lucide-react';

import type { RoomMember, RoomMessage } from '@/lib/room-types';

interface Props {
  messages: RoomMessage[];
  members: RoomMember[];
  ownId: string;
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  onTyping: (typing: boolean) => void;
  typingUsers: string[];
  rateLimited: boolean;
  maxLength?: number;
}

const EMOJI_ROW = ['👍', '❤️', '😂', '😮', '😢', '😡'];

function formatTime(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initials(name: string) {
  return (
    name
      .replace(/\s+/g, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export function Chat({
  messages,
  members,
  ownId,
  input,
  setInput,
  onSend,
  onTyping,
  typingUsers,
  rateLimited,
  maxLength = 500,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [newMessages, setNewMessages] = useState(0);
  const prevLenRef = useRef(messages.length);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) {
      atBottomRef.current = true;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    setNewMessages(0);
  };

  const onScroll = () => {
    const el = listRef.current;
    if (!el) {
      atBottomRef.current = true;
      return;
    }
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 60;
  };

  useEffect(() => {
    if (atBottomRef.current) {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } else {
      const added = messages.length - prevLenRef.current;
      if (added > 0) setNewMessages((n) => n + added);
    }
    prevLenRef.current = messages.length;
  }, [messages]);

  const sendEmoji = (emoji: string) => {
    onTyping(false);
    onSend(emoji);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || rateLimited) return;
    onTyping(false);
    onSend(text);
  };

  const handleInput = (value: string) => {
    setInput(value.slice(0, maxLength));
    onTyping(value.length > 0);
  };

  const memberOf = (userId: string) => members.find((m) => m.userId === userId);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2">
        <span className="text-sm font-semibold text-foreground">Чат</span>
        <span className="text-xs text-muted-foreground">{messages.length}</span>
      </div>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      >
        <ul className="flex flex-col gap-2.5">
          {messages.map((m) => {
            const isMine = m.userId === ownId;
            const member = memberOf(m.userId);
            return (
              <li key={m.id} className={`flex gap-2 ${m.system ? 'items-center justify-center' : isMine ? 'justify-end' : ''}`}>
                {!m.system && !isMine ? (
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full border border-border/60 bg-primary/20 text-xs font-semibold text-primary"
                    title={m.nick}
                  >
                    {initials(member?.nick ?? m.nick)}
                  </span>
                ) : null}
                {m.system ? (
                  <span className="text-center text-xs italic text-muted-foreground">{m.text}</span>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                      isMine
                        ? 'bg-primary/20 text-foreground'
                        : 'border border-border/40 bg-background text-foreground/85'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {!isMine && <span className="truncate font-semibold text-primary">{m.nick}</span>}
                      {member?.isHost && <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />}
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(m.time)}
                        {m.emoji ? ` ${m.emoji}` : ''}
                      </span>
                    </div>
                    <div className="mt-0.5 break-words whitespace-pre-wrap">{m.text}</div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {newMessages > 0 ? (
        <button
          type="button"
          onClick={scrollToBottom}
          className="mx-2 mb-1 rounded-full border border-border/60 bg-primary/15 px-3 py-1 text-[11px] font-medium text-primary"
        >
          Новые сообщения ({newMessages})
        </button>
      ) : null}

      {typingUsers.length > 0 ? (
        <p className="shrink-0 border-t border-border/40 px-3 py-1 text-[10px] text-muted-foreground">
          {typingUsers.join(', ')} печатает…
        </p>
      ) : null}

      <div className="flex shrink-0 flex-col gap-2 border-t border-border/50 p-3">
        <textarea
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={rateLimited ? 'Слишком много сообщений — пауза' : 'Написать сообщение… (Enter — отправить, Shift+Enter — перенос)'}
          disabled={rateLimited}
          rows={2}
          className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Поле ввода чата"
        />
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1">
            {EMOJI_ROW.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => sendEmoji(e)}
                disabled={rateLimited}
                className="rounded-full border border-border/60 bg-background px-2 py-1 text-sm transition-colors hover:bg-primary/15 hover:text-primary"
              >
                {e}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {input.length}/{maxLength}
          </span>
          <button
            type="button"
            onClick={sendMessage}
            disabled={rateLimited || !input.trim()}
            className="rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Отправить
          </button>
        </div>
      </div>
    </section>
  );
}
