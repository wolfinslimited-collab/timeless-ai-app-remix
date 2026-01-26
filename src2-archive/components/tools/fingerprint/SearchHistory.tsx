import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Camera, Trash2, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { FingerprintSearch, SearchResult } from "./types";

interface SearchHistoryProps {
  onLoadSearch: (search: FingerprintSearch) => void;
}

export const SearchHistory = ({ onLoadSearch }: SearchHistoryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searches, setSearches] = useState<FingerprintSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("fingerprint_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching search history:", error);
    } else {
      // Type cast to handle JSONB
      setSearches((data || []).map(item => ({
        ...item,
        search_mode: item.search_mode as "text" | "image",
        profiles: (item.profiles as any[]) || [],
        sources: (item.sources as any[]) || [],
      })));
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("fingerprint_searches")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Could not delete search history.",
      });
    } else {
      setSearches(prev => prev.filter(s => s.id !== id));
      toast({
        title: "Deleted",
        description: "Search removed from history.",
      });
    }
    setDeletingId(null);
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (searches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No search history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <History className="h-4 w-4" />
          Recent Searches
        </h3>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {searches.map((search) => (
              <div
                key={search.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  {search.search_mode === "image" ? (
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {search.search_query || "Image search"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(search.created_at), "MMM d, h:mm a")}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {(search.profiles || []).length} profiles
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(search.id)}
                    disabled={deletingId === search.id}
                  >
                    {deletingId === search.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onLoadSearch(search)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
