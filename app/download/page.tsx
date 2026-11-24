import type { Metadata } from 'next';
import Link from 'next/link';
import { Chrome, Download, Github, ShieldCheck, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Скачать приложение',
  description:
    'AniHub для Android: каталог, плеер и комнаты совместного просмотра. Скачайте APK или установите сайт как приложение.',
};

const APK_URL =
  'https://github.com/uglyrazechad/aniflow/releases/latest/download/anihub.apk';
const EXE_URL =
  'https://github.com/uglyrazechad/aniflow/releases/latest/download/anihub-windows.exe';
const SETUP_URL =
  'https://github.com/uglyrazechad/aniflow/releases/latest/download/anihub-setup.exe';
const RELEASES_URL = 'https://github.com/uglyrazechad/aniflow/releases/latest';

export default function DownloadPage() {
  return (
    <div className="container max-w-5xl space-y-8 py-8 lg:space-y-10 lg:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-brand-500/20 via-card/40 to-primary/10 p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative grid gap-8 md:grid-cols-[1.4fr,1fr] md:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-1 text-xs font-medium text-brand-300">
              <Smartphone className="h-3.5 w-3.5" />
              Android · версия 0.1.2
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                AniHub{' '}
                <span className="bg-gradient-to-r from-brand-300 via-primary to-brand-500 bg-clip-text text-transparent">
                  в кармане
                </span>
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Отдельные приложения AniHub для Android и Windows: каталог, плеер и
                комнаты прямо в программе, без браузера и без сайта. У приложений свой
                аккаунт — он синхронизирует избранное, историю и комнаты между
                телефоном и компьютером.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="gradient">
                <a href={APK_URL}>
                  <Download className="h-5 w-5" />
                  Скачать APK
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={EXE_URL}>
                  <Download className="h-5 w-5" />
                  Скачать для Windows
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                  <Github className="h-5 w-5" />
                  Все версии
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Без рекламы и трекеров
              </span>
              <span>Android 7.0+ и Windows 10/11</span>
              <span>APK ~48 МБ</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-border/60 bg-background/50 p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/download-qr.png"
              alt="QR-код на скачивание AniHub для Android"
              width={240}
              height={240}
              className="mx-auto h-auto w-full rounded-xl bg-white p-2"
            />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Наведите камеру телефона — APK скачается сразу.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Step
          number="1"
          title="Скачайте APK"
          text="Нажмите «Скачать APK» на этой странице. Браузер сохранит файл в «Загрузки»."
        />
        <Step
          number="2"
          title="Разрешите установку"
          text="Откройте файл и разрешите установку из неизвестных источников для браузера или проводника."
        />
        <Step
          number="3"
          title="Войдите в аккаунт приложения"
          text="Аккаунт приложений отдельный от сайта: он синхронизирует избранное, историю и комнаты между .apk и .exe."
        />
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/40 p-6">
        <h2 className="text-lg font-semibold">Если Android не даёт установить</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground">«Файл может быть опасен» / Play Protect.</span>{' '}
            Нажмите «Всё равно установить» (или ⋮ → «Установить без проверки»). APK
            собран из исходников проекта, без рекламы и трекеров.
          </li>
          <li>
            <span className="text-foreground">«Приложения из этого источника запрещены».</span>{' '}
            Настройки → Приложения → Специальный доступ → Установка неизвестных
            приложений → выберите браузер (Chrome) → «Разрешить».
          </li>
          <li>
            <span className="text-foreground">Скачивать на телефоне проще всего по QR-коду</span>{' '}
            вверху страницы: откройте ссылку на сайте и нажмите «Скачать APK». Файл
            появится в «Загрузках» (Chrome → ⋮ → Загрузки).
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/40 p-6">
        <h2 className="text-lg font-semibold">Если Windows ругается на .exe</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground">«Windows защитила ваш компьютер» / SmartScreen.</span>{' '}
            Нажмите «Подробнее» → «Выполнить в любом случае». Это предупреждение о
            неподписанном файле, а не о вирусе.
          </li>
          <li>
            <span className="text-foreground">Портативная версия.</span> Файл
            anihub-windows.exe запускается сразу, без установки; ярлык можно вынести на
            рабочий стол вручную.
          </li>
          <li>
            <span className="text-foreground">Нужен Windows 10 или 11, 64 бита.</span> На
            старых версиях используйте сайт в браузере.
          </li>
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border/60 bg-card/40 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <Smartphone className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Android</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            APK подписан и обновляется через GitHub Releases. При обновлении просто
            установите новую версию поверх старой — аккаунт и данные сохранятся.
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <a href={APK_URL}>
              <Download className="h-4 w-4" />
              Скачать anihub.apk
            </a>
          </Button>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/40 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
              <Download className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Windows</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Портативный .exe — просто запустите, ничего устанавливать не нужно. Или
            установщик, если хотите ярлык в меню «Пуск». Windows 10/11.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <a href={EXE_URL}>
                <Download className="h-4 w-4" />
                anihub-windows.exe
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={SETUP_URL}>Установщик</a>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/40 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <Chrome className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Сайт и iPhone</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Сайт работает сам по себе, со своим аккаунтом в браузере. На iPhone откройте
            его в Safari → «Поделиться» → «На экран Домой».
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/">Открыть сайт</Link>
          </Button>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Все видео предоставляются сервисом AnimeGO. Приложение не хранит видеоматериалы.
      </p>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
        {number}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}