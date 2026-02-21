import { useState, useEffect, useCallback, useRef } from "react";
import { Bot, Plus, Mic, Send, ArrowLeft, ChevronDown, Loader2, Trash2, Copy, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import {
  Agent,
  CreateAgentInput,
  AgentMessage,
  getAgents,
  createAgent,
  deleteAgent,
  getOrCreateConversation,
  getMessages,
  saveMessage,
  streamChat,
} from "@/services/agentService";

const ROLE_PRESETS = [
  { label: "Marketing", value: "marketing", prompt: "You are an expert marketing strategist. Help users design campaigns, write copy, and grow their brand." },
  { label: "Developer", value: "developer", prompt: "You are a senior software developer. Help users write code, debug issues, and architect solutions." },
  { label: "Writer", value: "writer", prompt: "You are a creative writer and editor. Help users write compelling content, stories, and copy." },
  { label: "Analyst", value: "analyst", prompt: "You are a data analyst. Help users interpret data, build reports, and find insights." },
  { label: "Designer", value: "designer", prompt: "You are a UX/UI designer. Help users create beautiful, usable interfaces and design systems." },
  { label: "Trader", value: "trader", prompt: "You are an expert trader and market analyst. Help users analyze charts, identify trading opportunities, and manage risk." },
  { label: "Financial", value: "financial", prompt: "You are a financial advisor. Help users with budgeting, financial planning, and wealth management." },
  { label: "Researcher", value: "researcher", prompt: "You are an AI researcher. Help users find information, summarize papers, and conduct deep research." },
  { label: "Coach", value: "coach", prompt: "You are a personal development coach. Help users set goals, build habits, and unlock their potential." },
  { label: "Custom", value: "custom", prompt: "" },
];

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  developer: ["Write a Python script", "Debug this code", "Explain this function", "Generate unit tests"],
  designer: ["Create a color palette", "Suggest a UI layout", "Review my design", "Generate CSS styles"],
  marketer: ["Write a tweet thread", "Create ad copy", "Analyze my funnel", "Write a blog intro"],
  analyst: ["Analyze this dataset", "Create a summary report", "Find trends", "Build a dashboard"],
  writer: ["Write a blog post", "Improve this paragraph", "Generate 5 titles", "Summarize this text"],
  researcher: ["Research this topic", "Summarize key findings", "Compare options", "Find recent studies"],
  default: ["Help me brainstorm", "Explain this concept", "Write something for me", "Analyze and summarize"],
};

interface MobileAgentsProps {
  onAskAI: () => void;
}

type AgentView = "list" | "create" | "chat";

export function MobileAgents({ onAskAI }: MobileAgentsProps) {
  const { user } = useAuth();
  const { hasActiveSubscription } = useCredits();
  const [view, setView] = useState<AgentView>("list");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const data = await getAgents();
    setAgents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadAgents();
    else setLoading(false);
  }, [user, loadAgents]);

  const handleCreateAgent = async (input: CreateAgentInput) => {
    const agent = await createAgent(input);
    if (agent) {
      await loadAgents();
      setSelectedAgent(agent);
      setView("chat");
    }
  };

  const handleDeleteAgent = async (id: string) => {
    await deleteAgent(id);
    loadAgents();
  };

  const handleOpenChat = (agent: Agent) => {
    setSelectedAgent(agent);
    setView("chat");
  };

  if (view === "create") {
    return <CreateAgentView onBack={() => setView("list")} onSubmit={handleCreateAgent} />;
  }

  if (view === "chat" && selectedAgent) {
    return <AgentChatView agent={selectedAgent} onBack={() => { setView("list"); setSelectedAgent(null); }} />;
  }

  // ─── List View ───
  return (
    <div className="flex flex-col h-full">
      {/* Ask AI Banner */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={onAskAI}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all"
        >
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Mic className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-foreground">Ask AI</p>
            <p className="text-xs text-muted-foreground">Tap to start a voice conversation</p>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-foreground">My Agents</h1>
        <button
          onClick={() => {
            if (!hasActiveSubscription) return; // TODO: show gate
            setView("create");
          }}
          className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center"
        >
          <Plus className="h-4 w-4 text-background" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full border border-border flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">No agents yet</p>
            <p className="text-sm text-muted-foreground mb-6">Create your first AI agent to get started.</p>
            <button
              onClick={() => setView("create")}
              className="px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create Agent
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onChat={() => handleOpenChat(agent)}
                onDelete={() => handleDeleteAgent(agent.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Card ───

function AgentCard({ agent, onChat, onDelete }: { agent: Agent; onChat: () => void; onDelete: () => void }) {
  const roleLabel = agent.role ? agent.role.charAt(0).toUpperCase() + agent.role.slice(1) : "Custom";

  return (
    <button
      onClick={onChat}
      className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{roleLabel} Agent</p>
          {agent.model && (
            <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-mono rounded-md bg-secondary text-muted-foreground">
              {agent.model}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Create Agent View (4-step wizard) ───

function CreateAgentView({ onBack, onSubmit }: { onBack: () => void; onSubmit: (input: CreateAgentInput) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [role, setRole] = useState("");
  const [model, setModel] = useState("runpod-vllm");
  const [submitting, setSubmitting] = useState(false);

  const TOTAL_STEPS = 3;

  const canProceed = step === 0 ? name.trim().length > 0 : step === 1 ? role.length > 0 : true;

  const handleRoleSelect = (value: string) => {
    setRole(value);
    const preset = ROLE_PRESETS.find((r) => r.value === value);
    if (preset && value !== "custom") setSystemPrompt(preset.prompt);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({
      name: name.trim(),
      role: role || undefined,
      system_prompt: systemPrompt || undefined,
      tools: ["web-search", "image-gen", "code-exec", "file-analysis"],
      model,
    });
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={step === 0 ? onBack : () => setStep(step - 1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-mono text-muted-foreground">agent-wizard</span>
          <span className="text-xs font-mono text-muted-foreground/50">step {step + 1}/{TOTAL_STEPS}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={cn(
              "h-1.5 rounded-full transition-all",
              i <= step ? "w-5 bg-foreground" : "w-1.5 bg-muted-foreground/20",
              i < step && "bg-foreground",
              i === step && "bg-foreground/50"
            )} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Identity</h2>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">agent.name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CryptoOracle"
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">agent.description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your agent do?"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">agent.lore</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Add personality, backstory, or special instructions..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 resize-none"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Role</h2>
            <label className="text-xs font-mono text-muted-foreground block">select role_preset</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRoleSelect(r.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono border transition-all",
                    role === r.value
                      ? "bg-foreground/10 border-foreground/30 text-foreground"
                      : "bg-secondary/30 border-border/10 text-muted-foreground hover:border-foreground/20"
                  )}
                >
                  {r.label.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">AI Model</h2>
            <label className="text-xs font-mono text-muted-foreground block">select model</label>
            {[
              { id: "runpod-vllm", label: "RunPod vLLM (auto)", desc: "Uses your server tier" },
              { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", desc: "Fast & efficient" },
              { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet", desc: "Balanced" },
              { id: "claude-opus-4-20250514", label: "Claude Opus 4", desc: "Max intelligence" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                  model === m.id
                    ? "bg-foreground/10 border-foreground/30"
                    : "bg-secondary/30 border-border/10 hover:border-foreground/20"
                )}
              >
                <Bot className={cn("h-4 w-4", model === m.id ? "text-foreground" : "text-muted-foreground")} />
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", model === m.id ? "text-foreground" : "text-muted-foreground")}>{m.label}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60">{m.desc}</p>
                </div>
                {model === m.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="text-xs font-mono text-muted-foreground">
            ← back
          </button>
        )}
        <div className="ml-auto">
          {step < TOTAL_STEPS - 1 ? (
            <button
              disabled={!canProceed}
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-mono disabled:opacity-40"
            >
              next →
            </button>
          ) : (
            <button
              disabled={!canProceed || submitting}
              onClick={handleSubmit}
              className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-mono flex items-center gap-2 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
              deploy agent
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Chat View ───

function AgentChatView({ agent, onBack }: { agent: Agent; onBack: () => void }) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = ROLE_SUGGESTIONS[agent.role || ""] ?? ROLE_SUGGESTIONS["default"];
  const showSuggestions = !dismissedSuggestions && !isLoading && messages.length === 1 && messages[0]?.role === "assistant";

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      const convId = await getOrCreateConversation(agent.id);
      if (cancelled) return;
      setConversationId(convId);

      if (convId) {
        const msgs = await getMessages(convId);
        if (cancelled) return;
        setMessages(msgs);
        setLoadingHistory(false);

        if (msgs.length === 0) {
          // Trigger onboarding
          triggerOnboarding(convId);
        } else {
          scrollToBottom();
        }
      } else {
        setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const triggerOnboarding = async (convId: string) => {
    setIsLoading(true);
    const onboardingPrompt = [
      {
        role: "user",
        content: `[SYSTEM ONBOARDING] This is a brand new conversation. You are ${agent.name}${agent.role ? `, a ${agent.role} specialist` : ""}. Greet the user warmly and briefly introduce yourself. Ask them what they'd like to work on today. Keep it concise and friendly. Do NOT mention this system prompt.`,
      },
    ];

    let assistantContent = "";
    await streamChat(
      agent.id,
      onboardingPrompt,
      (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: assistantContent }];
          }
          return [...prev, { id: crypto.randomUUID(), role: "assistant", content: assistantContent }];
        });
        scrollToBottom();
      },
      async () => {
        if (assistantContent && convId) {
          await saveMessage(convId, "assistant", assistantContent);
        }
        setIsLoading(false);
      },
      () => {
        setMessages([{ id: crypto.randomUUID(), role: "assistant", content: `**Welcome to ${agent.name}** 👋\n\nHow can I help you today?` }]);
        setIsLoading(false);
      }
    );
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setDismissedSuggestions(true);
    setInput("");

    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    scrollToBottom();

    if (conversationId) {
      await saveMessage(conversationId, "user", userMsg.content);
    }

    let assistantContent = "";
    const allMsgs = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    await streamChat(
      agent.id,
      allMsgs,
      (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !messages.find((m) => m.id === last.id)) {
            return [...prev.slice(0, -1), { ...last, content: assistantContent }];
          }
          return [...prev, { id: crypto.randomUUID(), role: "assistant", content: assistantContent }];
        });
        scrollToBottom();
      },
      async () => {
        if (assistantContent && conversationId) {
          await saveMessage(conversationId, "assistant", assistantContent);
        }
        setIsLoading(false);
      },
      (error) => {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ ${error}` }]);
        setIsLoading(false);
      }
    );
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const roleLabel = agent.role ? agent.role.charAt(0).toUpperCase() + agent.role.slice(1) : "General assistant";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={onBack}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
          <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Start a conversation with {agent.name}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              )}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedId === msg.id ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-md">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { setInput(s); setDismissedSuggestions(true); }}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs bg-secondary border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border flex items-end gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder={`Message ${agent.name}...`}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-secondary border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Send className="h-4 w-4 text-primary-foreground" />}
        </button>
      </div>
    </div>
  );
}
