import { useState, useRef, useCallback, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      // Apply resistance to the pull
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(distance);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-y-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex items-center justify-center transition-transform duration-200 pointer-events-none z-10"
        style={{ 
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: progress
        }}
      >
        <div className={cn(
          "w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center",
          isRefreshing && "animate-pulse"
        )}>
          <Loader2 
            className={cn(
              "w-5 h-5 text-purple-400 transition-transform",
              isRefreshing && "animate-spin"
            )}
            style={{ 
              transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)` 
            }}
          />
        </div>
      </div>

      {/* Content with transform */}
      <div 
        className="transition-transform duration-200"
        style={{ 
          transform: `translateY(${pullDistance}px)` 
        }}
      >
        {children}
      </div>
    </div>
  );
}
