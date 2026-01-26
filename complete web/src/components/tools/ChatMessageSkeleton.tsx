import { Skeleton } from "@/components/ui/skeleton";
import ModelLogo from "@/components/ModelLogo";

interface ChatMessageSkeletonProps {
  modelId: string;
}

const ChatMessageSkeleton = ({ modelId }: ChatMessageSkeletonProps) => {
  return (
    <div className="flex gap-3 justify-start">
      <ModelLogo modelId={modelId} size="md" />
      <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-secondary/50">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[180px]" />
        </div>
      </div>
    </div>
  );
};

export default ChatMessageSkeleton;
