import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatMessageSkeletonProps {
  modelIcon: string;
}

const ChatMessageSkeleton = ({ modelIcon }: ChatMessageSkeletonProps) => {
  return (
    <div className="flex gap-3 justify-start">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-lg">
          {modelIcon}
        </AvatarFallback>
      </Avatar>
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
