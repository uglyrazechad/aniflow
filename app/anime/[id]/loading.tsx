import { PlayerSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnimeLoading() {
  return (
    <div className="container space-y-8 py-6 lg:py-8">
      <Skeleton className="h-4 w-56 rounded-md" />
      <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full max-w-2xl rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
      <PlayerSkeleton />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
