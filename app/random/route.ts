import { redirect } from 'next/navigation';

import { loadHome } from '@/lib/animego/api';

export const dynamic = 'force-dynamic';

/** «Мне повезёт»: выбирает случайный тайтл из подборок главной. */
export async function GET() {
  let target: string | null = null;

  try {
    const home = await loadHome();
    const unique = [
      ...new Map(
        home.sections.flatMap((section) => section.items).map((item) => [item.id, item]),
      ).values(),
    ];

    if (unique.length) {
      target = `/anime/${unique[Math.floor(Math.random() * unique.length)].id}`;
    }
  } catch {
    // Каталог недоступен — вернём на главную.
  }

  redirect(target ?? '/');
}
