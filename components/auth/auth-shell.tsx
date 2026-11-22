import { Sparkles } from 'lucide-react';

import { Logo } from '@/components/logo';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden flex-col justify-between gap-8 p-10 lg:flex">
          <div
            aria-hidden
            className="absolute inset-0 opacity-90"
            style={{
              backgroundImage:
                'radial-gradient(120% 120% at 10% 0%, #6d28d9 0%, transparent 55%), radial-gradient(110% 110% at 90% 20%, #0ea5e9 0%, transparent 50%), linear-gradient(135deg, #140b2b 0%, #07111f 100%)',
            }}
          />
          <div className="relative space-y-6 text-white">
            <Logo />
            <h2 className="text-2xl font-bold leading-tight">
              Свой профиль,
              <br />
              своя история просмотра
            </h2>
            <ul className="space-y-3 text-sm text-white/75">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                Аватар, баннер и фон профиля — на свой вкус
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                Продолжайте с той же минуты на любом устройстве
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                Список избранного всегда под рукой
              </li>
            </ul>
          </div>
          <p className="relative text-xs text-white/45">
            Видео предоставляется AnimeGO. AniHub не хранит видеоматериалы.
          </p>
        </div>

        <div className="p-7 sm:p-10">
          <div className="mb-6 space-y-2">
            <Logo className="lg:hidden" />
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground/70">
            Регистрируясь, вы соглашаетесь не загружать чужие изображения и не нарушать работу
            сайта. Почта нужна только для входа и никому не передаётся.
          </p>
        </div>
      </div>
    </div>
  );
}
