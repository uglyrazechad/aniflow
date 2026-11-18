import { Skeleton } from '@/components/ui/skeleton';

export function CardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
      <Skeleton className="h-4 w-4/5 rounded-md" />
      <Skeleton className="h-3 w-1/2 rounded-md" />
    </div>
  );
}

export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="rounded-[2rem] border border-border/60 bg-card/40 p-6 sm:p-10 lg:p-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-12 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <div className="flex gap-3 pt-3">
            <Skeleton className="h-12 w-36 rounded-2xl" />
            <Skeleton className="h-12 w-32 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="mx-auto hidden aspect-[2/3] w-full max-w-[240px] rounded-2xl lg:block" />
      </div>
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <GridSkeleton />
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="aspect-video w-full rounded-3xl" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}
