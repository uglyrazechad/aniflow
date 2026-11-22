'use client';

import { useEffect } from 'react';

/** Регистрирует service worker после загрузки — сайт становится нативным-приложением (PWA). */
export function PwaRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* не важно для работы сайта */
      });
    }
  }, []);
  return null;
}
