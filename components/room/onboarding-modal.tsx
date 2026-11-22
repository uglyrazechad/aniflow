'use client';

import { useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  onClose: () => void;
  isHost: boolean;
}

export function OnboardingModal({ onClose, isHost }: Props) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      icon: <Play className="h-6 w-6 text-primary" />,
      title: isHost ? 'Вы создали комнату!' : 'Добро пожаловать в комнату!',
      text: isHost
        ? 'Откройте видео — оно начнётся автоматически для всех.'
        : 'Откройте видео — оно будет идти всей комнатой.',
    },
    {
      icon: <span className="text-lg font-semibold text-primary">✈</span>,
      title: 'Отправьте ссылку',
      text: 'Нажмите «Пригласить» — ссылка скопируется. Пришлите её другу.',
    },
    {
      icon: <span className="text-lg font-semibold text-primary">💬</span>,
      title: 'Общайтесь и смотрите',
      text: 'Перемотки и паузы синхронизированы. Пишите в чат — эмодзи и реакции на видео.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
            Новая комната
          </span>
        </div>
        <div className="mb-6 flex gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i <= step ? 'w-6 bg-primary' : 'w-1.5 bg-border/80'}`}
            />
          ))}
        </div>
        <div className="mb-4 flex h-16 items-center justify-center">{steps[step].icon}</div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{steps[step].title}</h2>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{steps[step].text}</p>
        <div className="flex justify-between gap-2">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              ← Назад
            </Button>
          ) : null}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Далее <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onClose}>Открыть комнату</Button>
          )}
        </div>
      </div>
    </div>
  );
}
