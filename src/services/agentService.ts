import { supabase, TIMELESS_SUPABASE_URL, TIMELESS_ANON_KEY } from "@/lib/supabase";

export interface Agent {
  id: string;
  name: string;
  role: string | null;
  system_prompt: string | null;
  tools: string[];
  model: string | null;
  avatar_url: string | null;
  paused: boolean;
  runpod_endpoint_id: string | null;
  runpod_model: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  role?: string;
  system_prompt?: string;
  tools?: string[];
  model?: string;
}

export interface AgentMessage {
  id: string;
  role: string;
  content: string;
  created_at?: string;
}

// ─── CRUD ───

export async function getAgents(): Promise<Agent[]> {
  const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return [];

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAgents error:", error);
    return [];
  }
  return (data ?? []) as Agent[];
}

export async function createAgent(input: CreateAgentInput): Promise<Agent | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("agents")
    .insert({
      ...input,
      tools: input.tools ?? [],
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("createAgent error:", error);
    return null;
  }
  return data as Agent;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<boolean> {
  const { error } = await supabase.from("agents").update(updates).eq("id", id);
  return !error;
}

export async function deleteAgent(id: string): Promise<boolean> {
  try {
    // Delete conversations and messages first
    const { data: convs } = await supabase
      .from("agent_conversations")
      .select("id")
      .eq("agent_id", id);

    if (convs) {
      for (const conv of convs) {
        await supabase.from("agent_messages").delete().eq("conversation_id", conv.id);
      }
    }
    await supabase.from("agent_conversations").delete().eq("agent_id", id);
    await supabase.from("agents").delete().eq("id", id);
    return true;
  } catch (e) {
    console.error("deleteAgent error:", e);
    return false;
  }
}

// ─── Conversations ───

export async function getOrCreateConversation(agentId: string): Promise<string | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data: convs } = await supabase
    .from("agent_conversations")
    .select("id")
    .eq("agent_id", agentId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (convs && convs.length > 0) return convs[0].id;

  const { data, error } = await supabase
    .from("agent_conversations")
    .insert({ agent_id: agentId, user_id: user.id, title: "Chat" })
    .select()
    .single();

  if (error) return null;
  return data.id;
}

export async function getMessages(conversationId: string): Promise<AgentMessage[]> {
  const { data } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (data ?? []) as AgentMessage[];
}

export async function saveMessage(conversationId: string, role: string, content: string) {
  await supabase.from("agent_messages").insert({
    conversation_id: conversationId,
    role,
    content,
  });
}

// ─── Chat streaming via SSE ───

export async function streamChat(
  agentId: string,
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void
) {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    onError("Not authenticated");
    return;
  }

  try {
    const response = await fetch(`${TIMELESS_SUPABASE_URL}/functions/v1/agent-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: TIMELESS_ANON_KEY,
      },
      body: JSON.stringify({ agentId, messages }),
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const err = JSON.parse(text);
        onError(err.error || "Chat failed");
      } catch {
        onError(`Chat failed (${response.status})`);
      }
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response stream");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        if (!trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.substring(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed?.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {}
      }
    }

    onDone();
  } catch (e: any) {
    onError(e.message || "Stream error");
  }
}
