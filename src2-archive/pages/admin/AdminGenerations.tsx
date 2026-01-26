import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, Image, Video, Music, Film, RefreshCw, ExternalLink, X, Download, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Generation {
  id: string;
  user_id: string;
  prompt: string;
  type: string;
  model: string;
  status: string;
  output_url: string | null;
  thumbnail_url: string | null;
  credits_used: number;
  created_at: string;
}

export default function AdminGenerations() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [copied, setCopied] = useState(false);
  const limit = 50;

  const fetchGenerations = async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      // Cast to any since these are new DB functions not in generated types yet
      const { data, error } = await (supabase.rpc as any)("admin_get_all_generations", {
        p_limit: limit,
        p_offset: currentOffset,
      });

      if (error) {
        console.error("Error fetching generations:", error);
      } else {
        const newData = (data as Generation[]) || [];
        if (reset) {
          setGenerations(newData);
        } else {
          setGenerations((prev) => [...prev, ...newData]);
        }
        setHasMore(newData.length === limit);
        if (!reset) setOffset(currentOffset + limit);
      }
    } catch (err) {
      console.error("Error fetching generations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenerations(true);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setOffset(0);
    fetchGenerations(true);
  };

  const typeIcons: Record<string, any> = {
    image: Image,
    video: Video,
    music: Music,
    cinema: Film,
  };

  const filteredGenerations = generations.filter((gen) => {
    const matchesSearch = gen.prompt.toLowerCase().includes(search.toLowerCase()) ||
      gen.model.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || gen.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <AdminLayout title="Generations" description="View all platform generations">
      <Card className="border-0 shadow-sm bg-card/80">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>All Generations</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="cinema">Cinema</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="max-w-[300px]">Prompt</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-12 w-12 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredGenerations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No generations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGenerations.map((gen) => {
                    const TypeIcon = typeIcons[gen.type] || Image;
                    return (
                      <TableRow key={gen.id}>
                        <TableCell>
                          {gen.thumbnail_url || gen.output_url ? (
                            <button
                              onClick={() => setSelectedGeneration(gen)}
                              className="block relative group cursor-pointer"
                            >
                              {(gen.type === "video" || gen.type === "cinema") && gen.output_url ? (
                                <video
                                  src={gen.output_url}
                                  className="h-12 w-12 object-cover rounded"
                                  muted
                                  playsInline
                                  preload="metadata"
                                  onMouseEnter={(e) => e.currentTarget.play()}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.pause();
                                    e.currentTarget.currentTime = 0;
                                  }}
                                />
                              ) : (
                                <img
                                  src={gen.thumbnail_url || gen.output_url || ""}
                                  alt="Preview"
                                  className="h-12 w-12 object-cover rounded"
                                />
                              )}
                              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                <ExternalLink className="h-4 w-4" />
                              </div>
                            </button>
                          ) : (
                            <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                              <TypeIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {gen.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate text-sm">{gen.prompt}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {gen.model}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{gen.credits_used}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={gen.status === "completed" ? "default" : "secondary"}
                            className={gen.status === "completed" ? "bg-green-500" : ""}
                          >
                            {gen.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(gen.created_at), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {hasMore && !loading && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={() => fetchGenerations()}>
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!selectedGeneration} onOpenChange={() => setSelectedGeneration(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              {selectedGeneration && (
                <>
                  {(() => {
                    const TypeIcon = typeIcons[selectedGeneration.type] || Image;
                    return <TypeIcon className="h-5 w-5" />;
                  })()}
                  <span className="capitalize">{selectedGeneration?.type} Generation</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedGeneration && (
            <div className="flex flex-col md:flex-row gap-4 p-4">
              {/* Media Preview */}
              <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden min-h-[300px] max-h-[60vh]">
                {selectedGeneration.type === "video" || selectedGeneration.type === "cinema" ? (
                  <video
                    src={selectedGeneration.output_url || ""}
                    controls
                    autoPlay
                    className="max-w-full max-h-[60vh] rounded-lg"
                  />
                ) : selectedGeneration.type === "music" ? (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <Music className="h-24 w-24 text-muted-foreground" />
                    <audio
                      src={selectedGeneration.output_url || ""}
                      controls
                      autoPlay
                      className="w-full max-w-md"
                    />
                  </div>
                ) : (
                  <img
                    src={selectedGeneration.output_url || selectedGeneration.thumbnail_url || ""}
                    alt="Preview"
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                )}
              </div>

              {/* Metadata Sidebar */}
              <div className="w-full md:w-72 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Prompt</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    {selectedGeneration.prompt}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Model</h4>
                    <p className="text-sm font-mono truncate">{selectedGeneration.model}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Credits</h4>
                    <p className="text-sm font-mono">{selectedGeneration.credits_used}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Status</h4>
                    <Badge
                      variant={selectedGeneration.status === "completed" ? "default" : "secondary"}
                      className={selectedGeneration.status === "completed" ? "bg-green-500" : ""}
                    >
                      {selectedGeneration.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Created</h4>
                    <p className="text-sm">{format(new Date(selectedGeneration.created_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-medium text-muted-foreground">User ID</h4>
                  <p className="text-xs font-mono bg-muted/50 p-2 rounded truncate">
                    {selectedGeneration.user_id}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (selectedGeneration.output_url) {
                        navigator.clipboard.writeText(selectedGeneration.output_url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        toast({ title: "URL copied to clipboard" });
                      }
                    }}
                  >
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? "Copied" : "Copy URL"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a
                      href={selectedGeneration.output_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
