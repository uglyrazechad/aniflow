'use client';

import { ContinueWatching } from '@/components/continue-watching';

export default function HistoryPage() {
  return (
    <div className="container max-w-6xl space-y-6 py-6 lg:py-8">
      <h1 className="sr-only">История просмотра</h1>
      <ContinueWatching
        title="История просмотра"
        subtitle="Последние серии и минуты, на которых вы остановились"
        emptyText="Здесь появятся серии, которые вы начали смотреть."
      />
    </div>
  );
}
