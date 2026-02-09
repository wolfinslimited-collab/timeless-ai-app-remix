import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveStatus } from './supabaseProjectStorage';

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function SaveIndicator({ status, className }: SaveIndicatorProps) {
  const getStatusContent = () => {
    switch (status) {
      case 'saving':
        return (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-muted-foreground">Saving...</span>
          </>
        );
      case 'saved':
        return (
          <>
            <Cloud className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Saved</span>
          </>
        );
      case 'error':
        return (
          <>
            <CloudOff className="w-3 h-3 text-destructive" />
            <span className="text-destructive">Save failed</span>
          </>
        );
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content) return null;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 text-xs",
      className
    )}>
      {content}
    </div>
  );
}
