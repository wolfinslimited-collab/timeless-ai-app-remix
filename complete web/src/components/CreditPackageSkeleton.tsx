import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const CreditPackageSkeleton = () => {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="text-center pb-2">
        <Skeleton className="mx-auto mb-3 h-12 w-12 sm:h-14 sm:w-14 rounded-xl" />
        <Skeleton className="h-6 w-24 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto mt-2" />
        <Skeleton className="h-8 w-20 mx-auto mt-3" />
        <Skeleton className="h-5 w-28 mx-auto mt-1" />
        <Skeleton className="h-3 w-24 mx-auto mt-1" />
      </CardHeader>
      <CardContent className="pt-2">
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
};

export default CreditPackageSkeleton;
