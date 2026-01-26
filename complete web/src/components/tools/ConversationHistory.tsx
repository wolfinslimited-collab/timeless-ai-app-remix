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
  FolderInput,
  GripVertical,
  Pin,
  PinOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { isToday, isYesterday, isThisWeek, subWeeks, isAfter, startOfWeek } from "date-fns";
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
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Conversation {
  id: string;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
  pinned: boolean;
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

// Draggable conversation item component
interface DraggableConversationProps {
  conv: Conversation;
  currentConversationId: string | null;
  searchQuery: string;
  folders: ChatFolder[];
  deletingId: string | null;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveToFolder: (folderId: string | null) => void;
  onTogglePin: () => void;
  highlightMatch: (title: string) => React.ReactNode;
}

const DraggableConversation = ({
  conv,
  currentConversationId,
  searchQuery,
  folders,
  deletingId,
  onSelect,
  onDelete,
  onMoveToFolder,
  onTogglePin,
  highlightMatch,
}: DraggableConversationProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: conv.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50 z-50"
      )}
    >
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
          currentConversationId === conv.id
            ? "bg-primary/10 text-primary"
            : "hover:bg-secondary/50"
        )}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        {conv.pinned ? (
          <Pin className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <MessageSquare className="h-4 w-4 shrink-0" />
        )}
        <div className="flex-1 min-w-0 pr-6">
          <p className="truncate font-medium">
            {highlightMatch(conv.title || "New conversation")}
          </p>
        </div>
      </button>
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
          <DropdownMenuItem onClick={onTogglePin}>
            {conv.pinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Pin to top
              </>
            )}
          </DropdownMenuItem>
          {folders.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="h-4 w-4 mr-2" />
                  Move to folder
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {conv.folder_id && (
                    <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
                      <X className="h-4 w-4 mr-2" />
                      Remove from folder
                    </DropdownMenuItem>
                  )}
                  {conv.folder_id && folders.length > 0 && <DropdownMenuSeparator />}
                  {folders.map(folder => (
                    <DropdownMenuItem 
                      key={folder.id} 
                      onClick={() => onMoveToFolder(folder.id)}
                      disabled={conv.folder_id === folder.id}
                    >
                      <Folder className="h-4 w-4 mr-2" style={{ color: folder.color }} />
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e as unknown as React.MouseEvent);
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
    </div>
  );
};

// Droppable folder component
interface DroppableFolderProps {
  folder: ChatFolder;
  isExpanded: boolean;
  conversationCount: number;
  children: React.ReactNode;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOver: boolean;
}

const DroppableFolder = ({
  folder,
  isExpanded,
  conversationCount,
  children,
  onToggle,
  onEdit,
  onDelete,
  isOver,
}: DroppableFolderProps) => {
  const { setNodeRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folderId: folder.id },
  });

  return (
    <div ref={setNodeRef}>
      <div className={cn(
        "flex items-center group rounded-lg transition-colors",
        isOver && "bg-primary/20 ring-2 ring-primary/50"
      )}>
        <button
          onClick={onToggle}
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
            {conversationCount}
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
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded && conversationCount > 0 && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-2">
          {children}
        </div>
      )}
    </div>
  );
};

// Droppable area for removing from folder
const UnfiledDropZone = ({ isOver, children }: { isOver: boolean; children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({
    id: "unfiled",
    data: { type: "unfiled" },
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "transition-colors rounded-lg",
        isOver && "bg-secondary/50 ring-2 ring-primary/30"
      )}
    >
      {children}
    </div>
  );
};

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
  
  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  // Folder dialog state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ChatFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeId);
  }, [conversations, activeId]);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.title?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Get pinned conversations (unfiled only, sorted by updated_at)
  const pinnedConversations = useMemo(() => {
    return filteredConversations
      .filter(c => c.pinned && !c.folder_id)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [filteredConversations]);

  // Group conversations by time period (only unfiled + not pinned)
  const groupedConversations = useMemo(() => {
    const unfiledConvs = filteredConversations.filter(c => !c.folder_id && !c.pinned);
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

  const togglePin = async (convId: string) => {
    try {
      const conv = conversations.find(c => c.id === convId);
      if (!conv) return;

      const newPinned = !conv.pinned;
      const { error } = await supabase
        .from("conversations")
        .update({ pinned: newPinned })
        .eq("id", convId);

      if (error) throw error;

      setConversations(prev => 
        prev.map(c => c.id === convId ? { ...c, pinned: newPinned } : c)
      );
    } catch (error) {
      console.error("Failed to toggle pin:", error);
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

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    setOverId(overId || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const convId = active.id as string;
    const overId = over.id as string;
    const overData = over.data.current;

    // If dropped on a folder
    if (overData?.type === "folder") {
      const folderId = overData.folderId as string;
      const conv = conversations.find(c => c.id === convId);
      if (conv && conv.folder_id !== folderId) {
        await moveToFolder(convId, folderId);
        // Auto-expand the folder
        setExpandedFolders(prev => new Set(prev).add(folderId));
      }
    }
    // If dropped on unfiled area
    else if (overData?.type === "unfiled") {
      const conv = conversations.find(c => c.id === convId);
      if (conv && conv.folder_id) {
        await moveToFolder(convId, null);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

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

  const allConversationIds = filteredConversations.map(c => c.id);

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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={allConversationIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="p-2 space-y-1">
                  {/* Folders Section */}
                  {folders.map(folder => {
                    const folderConvs = getConversationsInFolder(folder.id);
                    const isExpanded = expandedFolders.has(folder.id);
                    const isOver = overId === `folder-${folder.id}`;
                    
                    return (
                      <DroppableFolder
                        key={folder.id}
                        folder={folder}
                        isExpanded={isExpanded}
                        conversationCount={folderConvs.length}
                        onToggle={() => toggleFolder(folder.id)}
                        onEdit={() => openFolderDialog(folder)}
                        onDelete={() => deleteFolder(folder.id)}
                        isOver={isOver}
                      >
                        {folderConvs.map(conv => (
                          <DraggableConversation
                            key={conv.id}
                            conv={conv}
                            currentConversationId={currentConversationId}
                            searchQuery={searchQuery}
                            folders={folders}
                            deletingId={deletingId}
                            onSelect={() => onSelectConversation(conv.id)}
                            onDelete={(e) => deleteConversation(conv.id, e)}
                            onMoveToFolder={(folderId) => moveToFolder(conv.id, folderId)}
                            onTogglePin={() => togglePin(conv.id)}
                            highlightMatch={highlightMatch}
                          />
                        ))}
                      </DroppableFolder>
                    );
                  })}

                  {/* Pinned conversations section */}
                  {pinnedConversations.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                        <Pin className="h-3 w-3 text-primary" />
                        <span className="font-medium uppercase tracking-wider">Pinned</span>
                        <span className="ml-auto">{pinnedConversations.length}</span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {pinnedConversations.map(conv => (
                          <DraggableConversation
                            key={conv.id}
                            conv={conv}
                            currentConversationId={currentConversationId}
                            searchQuery={searchQuery}
                            folders={folders}
                            deletingId={deletingId}
                            onSelect={() => onSelectConversation(conv.id)}
                            onDelete={(e) => deleteConversation(conv.id, e)}
                            onMoveToFolder={(folderId) => moveToFolder(conv.id, folderId)}
                            onTogglePin={() => togglePin(conv.id)}
                            highlightMatch={highlightMatch}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Time-grouped conversations */}
                  <UnfiledDropZone isOver={overId === "unfiled"}>
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
                              {groupConvs.map(conv => (
                                <DraggableConversation
                                  key={conv.id}
                                  conv={conv}
                                  currentConversationId={currentConversationId}
                                  searchQuery={searchQuery}
                                  folders={folders}
                                  deletingId={deletingId}
                                  onSelect={() => onSelectConversation(conv.id)}
                                  onDelete={(e) => deleteConversation(conv.id, e)}
                                  onMoveToFolder={(folderId) => moveToFolder(conv.id, folderId)}
                                  onTogglePin={() => togglePin(conv.id)}
                                  highlightMatch={highlightMatch}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </UnfiledDropZone>
                </div>
              </SortableContext>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeConversation && (
                  <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm flex items-center gap-2 opacity-90">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate font-medium max-w-[150px]">
                      {activeConversation.title || "New conversation"}
                    </span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
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