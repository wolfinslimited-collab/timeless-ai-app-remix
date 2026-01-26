import { Skeleton } from "@/components/ui/skeleton";

const GenerationCardSkeleton = () => {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Thumbnail skeleton */}
      <Skeleton className="aspect-video w-full" />
      
      {/* Info skeleton */}
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
};

export default GenerationCardSkeleton;
