import { GridSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchLoading() {
  return (
    <div className="container space-y-8 py-8 lg:py-12">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-6 w-64 rounded-lg" />
        <GridSkeleton count={10} />
      </div>
    </div>
  );
}
