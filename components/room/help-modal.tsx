'use client';

import { HelpCircle, Link2, MessageCircle, Play } from 'lucide-react';

interface Props {
  slug: string;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Link2,
    title: 'Пригласите друга',
    text: 'Откройте «Пригласить» и скопируйте ссылку. Поделитесь ею в мессенджере.',
  },
  {
    icon: Play,
    title: 'Откройте комнату',
    text: 'Друг откроет ссылку — вы попадёте в одну комнату.',
  },
  {
    icon: MessageCircle,
    title: 'Смотрите и общайтесь',
    text: 'Плеер синхронизирован: перемотки, серии и паузы видны всем. Чат — ник, время, реакции.',
  },
];

export function HelpModal({ slug, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-3xl border border-border/60 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Как это работает</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-accent/60">
            ✕
          </button>
        </div>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">{step.title}</div>
                <div className="text-sm text-muted-foreground">{step.text}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 text-center text-[11px] text-muted-foreground">
          Комната: <code className="font-mono text-primary">/room/{slug}</code>
        </div>
      </div>
    </div>
  );
}
