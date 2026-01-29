import { useState, useRef, useEffect } from "react";
import { 
  Menu, Plus, ChevronDown, Send, Loader2, Globe, ImageIcon, 
  Sparkles, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import { TIMELESS_SUPABASE_URL, TIMELESS_ANON_KEY } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ModelLogo from "@/components/ModelLogo";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface ChatModel {
  id: string;
  name: string;
  credits: number;
  icon: string;
  description: string;
  badge?: string;
  supportsImages?: boolean;
}

const chatModels: ChatModel[] = [
  { id: "grok-3", name: "Grok 3", credits: 3, icon: "grok", description: "xAI's most capable model", badge: "TOP", supportsImages: true },
  { id: "grok-3-mini", name: "Grok 3 Mini", credits: 2, icon: "grok", description: "Fast and efficient Grok", badge: "NEW", supportsImages: false },
  { id: "chatgpt-5.2", name: "ChatGPT 5.2", credits: 4, icon: "openai", description: "OpenAI's latest reasoning", badge: "TOP", supportsImages: true },
  { id: "chatgpt-5", name: "ChatGPT 5", credits: 3, icon: "openai", description: "Powerful all-rounder", supportsImages: true },
  { id: "chatgpt-5-mini", name: "GPT-5 Mini", credits: 2, icon: "openai", description: "Fast and cost-effective", supportsImages: false },
  { id: "gemini-3-pro", name: "Gemini 3 Pro", credits: 3, icon: "gemini", description: "Google's next-gen AI", badge: "NEW", supportsImages: true },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", credits: 1, icon: "gemini", description: "Fast multimodal AI", supportsImages: true },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", credits: 2, icon: "gemini", description: "Top-tier reasoning", supportsImages: true },
  { id: "deepseek-r1", name: "DeepSeek R1", credits: 3, icon: "deepseek", description: "Deep reasoning model", badge: "AI", supportsImages: false },
  { id: "deepseek-v3", name: "DeepSeek V3", credits: 2, icon: "deepseek", description: "Powerful open model", supportsImages: false },
  { id: "llama-3.3", name: "Llama 3.3", credits: 1, icon: "meta", description: "Meta's open AI model", supportsImages: false },
  { id: "llama-3.3-large", name: "Llama 3.3 Large", credits: 2, icon: "meta", description: "Extended capabilities", supportsImages: false },
];

const CHAT_URL = `${TIMELESS_SUPABASE_URL}/functions/v1/chat`;

export function MobileChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("grok-3");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { credits, hasActiveSubscription } = useCredits();
  const { toast } = useToast();

  const currentModel = chatModels.find(m => m.id === selectedModel) || chatModels[0];
  const supportsVision = currentModel.supportsImages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in to use chat",
      });
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TIMELESS_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel,
          webSearch: webSearchEnabled,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error("Insufficient credits. Please add more credits.");
        }
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw new Error("Failed to get response");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
      if (!assistantContent) {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case "TOP": return "bg-primary";
      case "NEW": return "bg-green-500";
      case "AI": return "bg-purple-500";
      default: return "bg-muted";
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - Matching Flutter AppBar */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-border">
        <button 
          onClick={() => setShowDrawer(true)}
          className="w-10 h-10 flex items-center justify-center"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        
        {/* Model Selector Button */}
        <button 
          onClick={() => setShowModelSelector(true)}
          className="flex items-center gap-2.5 flex-1 mx-2"
        >
          <ModelLogo modelId={selectedModel} size="md" />
          <div className="flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground text-sm font-semibold truncate max-w-[120px]">
                {currentModel.name}
              </span>
              {currentModel.badge && (
                <span className={cn(
                  "px-1.5 py-0.5 text-[8px] font-bold text-white rounded",
                  getBadgeColor(currentModel.badge)
                )}>
                  {currentModel.badge}
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1">
              {supportsVision && (
                <>
                  <ImageIcon className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="w-0.5" />
                </>
              )}
              <span className="text-[10px] text-primary">●</span>
              <span className="text-[10px] text-muted-foreground">
                {hasActiveSubscription ? "Unlimited" : `${currentModel.credits}/msg`}
              </span>
            </div>
          </div>
        </button>

        <button 
          onClick={handleNewChat}
          className="w-10 h-10 flex items-center justify-center"
        >
          <Plus className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          /* Empty State - Matching Flutter */
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <ModelLogo modelId={selectedModel} size="lg" />
            <h3 className="text-foreground text-xl font-semibold mt-4 mb-2">
              Chat with {currentModel.name}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {supportsVision 
                ? "Start a conversation. You can also share images for visual analysis."
                : "Start a conversation with one of the most advanced AI models."}
            </p>
            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                supportsVision ? "Analyze this image" : "Explain a concept",
                "Help me brainstorm",
                "Write something creative",
                "Answer a question"
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-secondary rounded-full border border-border"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-foreground">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="mr-2 flex-shrink-0">
                    <ModelLogo modelId={selectedModel} size="sm" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 max-w-[80%]",
                    message.role === "user"
                      ? "bg-primary rounded-tr-sm"
                      : "bg-secondary rounded-tl-sm"
                  )}
                >
                  {message.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap text-primary-foreground">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-sm text-foreground prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                      {message.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        isLoading && index === messages.length - 1 ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        ) : ""
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Matching Flutter */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          {/* Image Button (Vision Models) */}
          {supportsVision && (
            <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          
          {/* Web Search Toggle */}
          <button 
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-all",
              webSearchEnabled 
                ? "bg-primary/20 border-primary" 
                : "bg-secondary border-transparent"
            )}
          >
            <Globe className={cn(
              "w-4 h-4",
              webSearchEnabled ? "text-primary" : "text-muted-foreground"
            )} />
          </button>

          {/* Text Input */}
          <div className="flex-1 bg-secondary rounded-2xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={webSearchEnabled 
                ? `Search the web...` 
                : `Write something creative...`}
              className="w-full px-4 py-2.5 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
              disabled={isLoading}
            />
          </div>

          {/* Send Button */}
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
              isLoading || !input.trim() ? "bg-muted" : "bg-primary"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white -rotate-45" />
            )}
          </button>
        </div>
        
        {/* Footer Info */}
        <div className="flex items-center justify-center gap-1 mt-2">
          {webSearchEnabled && (
            <>
              <Globe className="w-2.5 h-2.5 text-primary" />
              <span className="text-[10px] text-primary">Web search enabled</span>
              <span className="text-[10px] text-muted-foreground mx-1">•</span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground/70">AI can make mistakes</span>
        </div>
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div className="absolute inset-0 z-50 bg-black/50" onClick={() => setShowModelSelector(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[70%] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            
            {/* Title */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold text-foreground">Select AI Model</span>
              </div>
              <button onClick={() => setShowModelSelector(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="border-t border-border" />
            
            {/* Models List */}
            <div className="overflow-y-auto max-h-[50vh] p-3 space-y-2">
              {chatModels.map(model => {
                const isSelected = model.id === selectedModel;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setMessages([]);
                      setShowModelSelector(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                      isSelected 
                        ? "bg-primary/10 border-primary" 
                        : "bg-secondary border-border"
                    )}
                  >
                    <ModelLogo modelId={model.id} size="lg" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-semibold",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {model.name}
                        </span>
                        {model.badge && (
                          <span className={cn(
                            "px-1.5 py-0.5 text-[9px] font-bold text-white rounded",
                            getBadgeColor(model.badge)
                          )}>
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                        {model.supportsImages && (
                          <ImageIcon className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-card rounded-lg flex items-center gap-1">
                        <span className="text-xs text-primary">●</span>
                        <span className="text-xs font-semibold text-primary">{model.credits}</span>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conversation Drawer (placeholder) */}
      {showDrawer && (
        <div className="absolute inset-0 z-50 bg-black/50" onClick={() => setShowDrawer(false)}>
          <div 
            className="absolute left-0 top-0 bottom-0 w-[280px] bg-card"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Conversations</h2>
            </div>
            <div className="p-4 flex flex-col items-center justify-center h-[calc(100%-60px)] text-center">
              <Menu className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">
                Your conversation history will appear here
              </p>
              <button 
                onClick={() => {
                  handleNewChat();
                  setShowDrawer(false);
                }}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                New Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
