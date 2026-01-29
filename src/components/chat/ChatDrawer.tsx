import { useState } from "react";
import {
  X, Search, Plus, FolderPlus, Pin, Trash2, FolderOpen,
  ChevronDown, ChevronRight, MoreHorizontal, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ModelLogo from "@/components/ModelLogo";
import type { Conversation, ChatFolder } from "@/hooks/useConversations";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  currentConversationId?: string;
  conversations: Conversation[];
  folders: ChatFolder[];
  pinnedConversations: Conversation[];
  groupedConversations: Record<string, Conversation[]>;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onDeleteConversation: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  getConversationsInFolder: (folderId: string) => Conversation[];
  timeGroupLabels: Record<string, string>;
  timeGroups: string[];
}

export function ChatDrawer({
  isOpen,
  onClose,
  currentModel,
  currentConversationId,
  conversations,
  folders,
  pinnedConversations,
  groupedConversations,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onNewConversation,
  onTogglePin,
  onMoveToFolder,
  onDeleteConversation,
  onCreateFolder,
  onDeleteFolder,
  getConversationsInFolder,
  timeGroupLabels,
  timeGroups,
}: ChatDrawerProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["today", "yesterday", "thisWeek"])
  );
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowCreateFolder(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="absolute inset-0 z-50 bg-black/50" onClick={onClose}>
        <div
          className="absolute left-0 top-0 bottom-0 w-[300px] bg-card flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b border-border">
            <ModelLogo modelId={currentModel} size="md" />
            <span className="flex-1 font-bold text-foreground">History</span>
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) onSearchChange("");
              }}
              className="p-2 hover:bg-secondary rounded-lg"
            >
              {isSearchOpen ? (
                <X className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Search className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="p-2 hover:bg-secondary rounded-lg"
            >
              <FolderPlus className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Search */}
          {isSearchOpen && (
            <div className="p-2 border-b border-border">
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search conversations..."
                autoFocus
                className="h-9"
              />
            </div>
          )}

          {/* New Chat Button */}
          <div className="p-3 border-b border-border">
            <Button
              onClick={() => {
                onNewConversation();
                onClose();
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Start a new chat to begin
                </p>
              </div>
            ) : (
              <>
                {/* Folders */}
                {folders.map((folder) => {
                  const folderConvs = getConversationsInFolder(folder.id);
                  if (folderConvs.length === 0 && searchQuery) return null;
                  
                  return (
                    <div key={folder.id} className="mb-1">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/50"
                      >
                        {expandedFolders.has(folder.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <FolderOpen
                          className="w-4 h-4"
                          style={{ color: folder.color }}
                        />
                        <span className="flex-1 text-left text-sm text-foreground truncate">
                          {folder.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {folderConvs.length}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-secondary rounded"
                            >
                              <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onDeleteFolder(folder.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Folder
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </button>
                      {expandedFolders.has(folder.id) && (
                        <div className="ml-6">
                          {folderConvs.map((conv) => (
                            <ConversationItem
                              key={conv.id}
                              conversation={conv}
                              isSelected={conv.id === currentConversationId}
                              onSelect={() => {
                                onSelectConversation(conv.id);
                                onClose();
                              }}
                              onTogglePin={() => onTogglePin(conv.id, !conv.pinned)}
                              onMoveToFolder={(folderId) =>
                                onMoveToFolder(conv.id, folderId)
                              }
                              onDelete={() => onDeleteConversation(conv.id)}
                              folders={folders}
                              currentFolderId={conv.folder_id}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pinned */}
                {pinnedConversations.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <Pin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Pinned
                      </span>
                    </div>
                    {pinnedConversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isSelected={conv.id === currentConversationId}
                        onSelect={() => {
                          onSelectConversation(conv.id);
                          onClose();
                        }}
                        onTogglePin={() => onTogglePin(conv.id, !conv.pinned)}
                        onMoveToFolder={(folderId) =>
                          onMoveToFolder(conv.id, folderId)
                        }
                        onDelete={() => onDeleteConversation(conv.id)}
                        folders={folders}
                        currentFolderId={conv.folder_id}
                      />
                    ))}
                  </div>
                )}

                {/* Time Groups */}
                {timeGroups.map((group) => {
                  const groupConvs = groupedConversations[group] || [];
                  if (groupConvs.length === 0) return null;

                  return (
                    <div key={group} className="mb-2">
                      <button
                        onClick={() => toggleGroup(group)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/30"
                      >
                        {expandedGroups.has(group) ? (
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          {timeGroupLabels[group]}
                        </span>
                        <span className="text-xs text-muted-foreground/70">
                          ({groupConvs.length})
                        </span>
                      </button>
                      {expandedGroups.has(group) &&
                        groupConvs.map((conv) => (
                          <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isSelected={conv.id === currentConversationId}
                            onSelect={() => {
                              onSelectConversation(conv.id);
                              onClose();
                            }}
                            onTogglePin={() => onTogglePin(conv.id, !conv.pinned)}
                            onMoveToFolder={(folderId) =>
                              onMoveToFolder(conv.id, folderId)
                            }
                            onDelete={() => onDeleteConversation(conv.id)}
                            folders={folders}
                            currentFolderId={conv.folder_id}
                          />
                        ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onDelete: () => void;
  folders: ChatFolder[];
  currentFolderId: string | null;
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onTogglePin,
  onMoveToFolder,
  onDelete,
  folders,
  currentFolderId,
}: ConversationItemProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/50",
        isSelected && "bg-primary/10 border-l-2 border-primary"
      )}
    >
      <button onClick={onSelect} className="flex-1 text-left truncate">
        <span
          className={cn(
            "text-sm",
            isSelected ? "text-primary font-medium" : "text-foreground"
          )}
        >
          {conversation.title || "New Chat"}
        </span>
      </button>
      {conversation.pinned && (
        <Pin className="w-3 h-3 text-primary flex-shrink-0" />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded transition-opacity">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onTogglePin}>
            <Pin className="w-4 h-4 mr-2" />
            {conversation.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {currentFolderId && (
            <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Remove from Folder
            </DropdownMenuItem>
          )}
          {folders.length > 0 && (
            <>
              {folders
                .filter((f) => f.id !== currentFolderId)
                .map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => onMoveToFolder(folder.id)}
                  >
                    <FolderOpen
                      className="w-4 h-4 mr-2"
                      style={{ color: folder.color }}
                    />
                    Move to {folder.name}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
