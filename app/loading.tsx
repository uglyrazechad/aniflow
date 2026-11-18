import { HeroSkeleton, SectionSkeleton } from '@/components/skeletons';

export default function HomeLoading() {
  return (
    <div className="container space-y-10 py-6 lg:space-y-12 lg:py-8">
      <HeroSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );
}
