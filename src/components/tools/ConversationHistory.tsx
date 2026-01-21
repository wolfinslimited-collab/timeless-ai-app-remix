import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  FolderInput
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isThisWeek, subWeeks, isAfter, startOfWeek } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Conversation {
  id: string;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
}

interface ChatFolder {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface ConversationHistoryProps {
  currentConversationId: string | null;
  currentModel: string;
  onSelectConversation: (id: string | null) => void;
  onNewConversation: () => void;
}

type TimeGroup = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "older";

const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This Week",
  lastWeek: "Last Week",
  thisMonth: "This Month",
  older: "Older",
};

const getTimeGroup = (dateStr: string): TimeGroup => {
  const date = new Date(dateStr);
  const now = new Date();
  
  if (isToday(date)) return "today";
  if (isYesterday(date)) return "yesterday";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "thisWeek";
  
  const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  if (isAfter(date, lastWeekStart) && !isAfter(date, thisWeekStart)) return "lastWeek";
  
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (isAfter(date, thisMonthStart)) return "thisMonth";
  
  return "older";
};

const FOLDER_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
];

const ConversationHistory = ({
  currentConversationId,
  currentModel,
  onSelectConversation,
  onNewConversation,
}: ConversationHistoryProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<TimeGroup>>(new Set(["today", "yesterday", "thisWeek"]));
  
  // Folder dialog state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ChatFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.title?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Group conversations by time period (only unfiled ones)
  const groupedConversations = useMemo(() => {
    const unfiledConvs = filteredConversations.filter(c => !c.folder_id);
    const groups: Record<TimeGroup, Conversation[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      lastWeek: [],
      thisMonth: [],
      older: [],
    };
    
    unfiledConvs.forEach(conv => {
      const group = getTimeGroup(conv.updated_at);
      groups[group].push(conv);
    });
    
    return groups;
  }, [filteredConversations]);

  // Get conversations in a specific folder
  const getConversationsInFolder = (folderId: string) => {
    return filteredConversations.filter(c => c.folder_id === folderId);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentModel]);

  const loadData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [convsResult, foldersResult] = await Promise.all([
        supabase
          .from("conversations")
          .select("*")
          .eq("user_id", user.id)
          .eq("model", currentModel)
          .order("updated_at", { ascending: false }),
        supabase
          .from("chat_folders")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
      ]);

      if (convsResult.error) throw convsResult.error;
      if (foldersResult.error) throw foldersResult.error;
      
      setConversations(convsResult.data || []);
      setFolders(foldersResult.data || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        onNewConversation();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const moveToFolder = async (convId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ folder_id: folderId })
        .eq("id", convId);

      if (error) throw error;

      setConversations(prev => 
        prev.map(c => c.id === convId ? { ...c, folder_id: folderId } : c)
      );
    } catch (error) {
      console.error("Failed to move conversation:", error);
    }
  };

  const createOrUpdateFolder = async () => {
    if (!user || !folderName.trim()) return;

    try {
      if (editingFolder) {
        const { error } = await supabase
          .from("chat_folders")
          .update({ name: folderName.trim(), color: folderColor })
          .eq("id", editingFolder.id);

        if (error) throw error;

        setFolders(prev => 
          prev.map(f => f.id === editingFolder.id 
            ? { ...f, name: folderName.trim(), color: folderColor } 
            : f
          )
        );
      } else {
        const { data, error } = await supabase
          .from("chat_folders")
          .insert({ user_id: user.id, name: folderName.trim(), color: folderColor })
          .select()
          .single();

        if (error) throw error;
        if (data) setFolders(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      
      closeFolderDialog();
    } catch (error) {
      console.error("Failed to save folder:", error);
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from("chat_folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;

      setFolders(prev => prev.filter(f => f.id !== folderId));
      // Conversations will have folder_id set to null automatically via ON DELETE SET NULL
      setConversations(prev => 
        prev.map(c => c.folder_id === folderId ? { ...c, folder_id: null } : c)
      );
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const openFolderDialog = (folder?: ChatFolder) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderName(folder.name);
      setFolderColor(folder.color);
    } else {
      setEditingFolder(null);
      setFolderName("");
      setFolderColor(FOLDER_COLORS[0]);
    }
    setFolderDialogOpen(true);
  };

  const closeFolderDialog = () => {
    setFolderDialogOpen(false);
    setEditingFolder(null);
    setFolderName("");
    setFolderColor(FOLDER_COLORS[0]);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const toggleGroup = (group: TimeGroup) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Highlight matching text in title
  const highlightMatch = (title: string) => {
    if (!searchQuery.trim()) return title;
    
    const query = searchQuery.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const matchIndex = lowerTitle.indexOf(query);
    
    if (matchIndex === -1) return title;
    
    return (
      <>
        {title.slice(0, matchIndex)}
        <span className="bg-primary/30 rounded px-0.5">
          {title.slice(matchIndex, matchIndex + searchQuery.length)}
        </span>
        {title.slice(matchIndex + searchQuery.length)}
      </>
    );
  };

  const renderConversationItem = (conv: Conversation) => (
    <button
      key={conv.id}
      onClick={() => onSelectConversation(conv.id)}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group relative",
        currentConversationId === conv.id
          ? "bg-primary/10 text-primary"
          : "hover:bg-secondary/50"
      )}
    >
      <div className="flex items-start gap-2 pr-6">
        <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium">
            {highlightMatch(conv.title || "New conversation")}
          </p>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {folders.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {conv.folder_id && (
                  <DropdownMenuItem onClick={() => moveToFolder(conv.id, null)}>
                    <X className="h-4 w-4 mr-2" />
                    Remove from folder
                  </DropdownMenuItem>
                )}
                {conv.folder_id && folders.length > 0 && <DropdownMenuSeparator />}
                {folders.map(folder => (
                  <DropdownMenuItem 
                    key={folder.id} 
                    onClick={() => moveToFolder(conv.id, folder.id)}
                    disabled={conv.folder_id === folder.id}
                  >
                    <Folder className="h-4 w-4 mr-2" style={{ color: folder.color }} />
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              deleteConversation(conv.id, e as unknown as React.MouseEvent);
            }}
            className="text-destructive focus:text-destructive"
            disabled={deletingId === conv.id}
          >
            {deletingId === conv.id ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  );

  if (!user) return null;

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-border/50 flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 border-r border-border/50 flex flex-col bg-secondary/20">
        {/* Header */}
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <span className="text-sm font-medium">History</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", isSearchOpen && "bg-secondary")}
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchQuery("");
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openFolderDialog()}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onNewConversation}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Input */}
        {isSearchOpen && (
          <div className="p-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-8 text-sm"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 && folders.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {searchQuery ? (
                <>
                  <p>No matches found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </>
              ) : (
                <>
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Start chatting to save history</p>
                </>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Folders Section */}
              {folders.map(folder => {
                const folderConvs = getConversationsInFolder(folder.id);
                const isExpanded = expandedFolders.has(folder.id);
                
                return (
                  <div key={folder.id}>
                    <div className="flex items-center group">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
                      >
                        <ChevronDown className={cn(
                          "h-3 w-3 transition-transform",
                          !isExpanded && "-rotate-90"
                        )} />
                        {isExpanded ? (
                          <FolderOpen className="h-4 w-4" style={{ color: folder.color }} />
                        ) : (
                          <Folder className="h-4 w-4" style={{ color: folder.color }} />
                        )}
                        <span className="font-medium truncate">{folder.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {folderConvs.length}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openFolderDialog(folder)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteFolder(folder.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {isExpanded && folderConvs.length > 0 && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-2">
                        {folderConvs.map(renderConversationItem)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Time-grouped conversations */}
              {(Object.keys(TIME_GROUP_LABELS) as TimeGroup[]).map(group => {
                const groupConvs = groupedConversations[group];
                if (groupConvs.length === 0) return null;
                
                const isExpanded = expandedGroups.has(group);
                
                return (
                  <div key={group}>
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <ChevronDown className={cn(
                        "h-3 w-3 transition-transform",
                        !isExpanded && "-rotate-90"
                      )} />
                      <span className="font-medium uppercase tracking-wider">
                        {TIME_GROUP_LABELS[group]}
                      </span>
                      <span className="ml-auto">{groupConvs.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="mt-1 space-y-0.5">
                        {groupConvs.map(renderConversationItem)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? "Edit Folder" : "New Folder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Folder name..."
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setFolderColor(color)}
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      folderColor === color && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeFolderDialog}>
              Cancel
            </Button>
            <Button onClick={createOrUpdateFolder} disabled={!folderName.trim()}>
              {editingFolder ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConversationHistory;