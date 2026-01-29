import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface Conversation {
  id: string;
  title: string | null;
  model: string;
  pinned: boolean;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatFolder {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string | object;
  images: string[] | null;
  created_at: string;
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

function getTimeGroup(date: Date): TimeGroup {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= today) return "today";
  if (date >= yesterday) return "yesterday";
  if (date >= thisWeekStart) return "thisWeek";
  if (date >= lastWeekStart) return "lastWeek";
  if (date >= thisMonthStart) return "thisMonth";
  return "older";
}

export function useConversations(currentModel: string) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setFolders([]);
      setIsLoading(false);
      return;
    }

    try {
      const [convsResult, foldersResult] = await Promise.all([
        supabase
          .from("conversations")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("chat_folders")
          .select("*")
          .eq("user_id", user.id)
          .order("name"),
      ]);

      if (convsResult.data) {
        setConversations(convsResult.data);
      }
      if (foldersResult.data) {
        setFolders(foldersResult.data);
      }
    } catch (e) {
      console.error("Error loading conversations:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show ALL conversations (no model filter - users expect to see all history)
  const modelConversations = conversations;

  // Filter by search query
  const filteredConversations = searchQuery
    ? modelConversations.filter((c) =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : modelConversations;

  // Pinned conversations (not in folder)
  const pinnedConversations = filteredConversations.filter(
    (c) => c.pinned && !c.folder_id
  );

  // Group by time
  const groupedConversations = filteredConversations
    .filter((c) => !c.pinned && !c.folder_id)
    .reduce((groups, conv) => {
      const group = getTimeGroup(new Date(conv.updated_at));
      if (!groups[group]) groups[group] = [];
      groups[group].push(conv);
      return groups;
    }, {} as Record<TimeGroup, Conversation[]>);

  // Get conversations in a folder
  const getConversationsInFolder = (folderId: string) =>
    filteredConversations.filter((c) => c.folder_id === folderId);

  // Create conversation
  const createConversation = async (model: string, title?: string) => {
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        model,
        title: title || null,
      })
      .select()
      .single();

    if (error) throw error;
    await loadData();
    return data as Conversation;
  };

  // Get messages for a conversation
  const getMessages = async (conversationId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  };

  // Save a message
  const saveMessage = async (
    conversationId: string,
    role: "user" | "assistant",
    content: string | object,
    images?: string[]
  ) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        images: images || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChatMessage;
  };

  // Update conversation title
  const updateTitle = async (id: string, title: string) => {
    await supabase
      .from("conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", id);
    await loadData();
  };

  // Toggle pin
  const togglePin = async (id: string, pinned: boolean) => {
    await supabase.from("conversations").update({ pinned }).eq("id", id);
    await loadData();
  };

  // Move to folder
  const moveToFolder = async (id: string, folderId: string | null) => {
    await supabase.from("conversations").update({ folder_id: folderId }).eq("id", id);
    await loadData();
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    await loadData();
  };

  // Create folder
  const createFolder = async (name: string, color = "#6366f1") => {
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("chat_folders")
      .insert({
        user_id: user.id,
        name,
        color,
      })
      .select()
      .single();

    if (error) throw error;
    await loadData();
    return data as ChatFolder;
  };

  // Delete folder
  const deleteFolder = async (id: string) => {
    // Move conversations out of folder first
    await supabase
      .from("conversations")
      .update({ folder_id: null })
      .eq("folder_id", id);
    await supabase.from("chat_folders").delete().eq("id", id);
    await loadData();
  };

  return {
    conversations: filteredConversations,
    folders,
    isLoading,
    searchQuery,
    setSearchQuery,
    pinnedConversations,
    groupedConversations,
    getConversationsInFolder,
    createConversation,
    getMessages,
    saveMessage,
    updateTitle,
    togglePin,
    moveToFolder,
    deleteConversation,
    createFolder,
    deleteFolder,
    refresh: loadData,
    TIME_GROUP_LABELS,
    TIME_GROUPS: ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "older"] as TimeGroup[],
  };
}
