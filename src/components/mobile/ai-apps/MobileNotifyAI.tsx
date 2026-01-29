import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Bell, Plus, History, Settings, Send, Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  pendingNotification?: {
    title: string;
    schedule: string;
    creditsUsed: number;
  };
}

interface MobileNotifyAIProps {
  onBack: () => void;
}

export function MobileNotifyAI({ onBack }: MobileNotifyAIProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "active" | "history" | "settings">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingNotification, setPendingNotification] = useState<Message["pendingNotification"] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I can help you set up a notification! Would you like a **daily reminder** or a **one-time alert**?",
        createdAt: new Date(),
        pendingNotification: input.toLowerCase().includes("remind") ? {
          title: `Reminder: ${input.slice(0, 30)}...`,
          schedule: "Daily at 9:00 AM",
          creditsUsed: 1,
        } : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (assistantMessage.pendingNotification) {
        setPendingNotification(assistantMessage.pendingNotification);
      }
      setIsLoading(false);
    }, 1500);
  };

  const confirmNotification = () => {
    setPendingNotification(null);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "✅ I've set up your notification. You can view and manage it in the Active tab.",
        createdAt: new Date(),
      },
    ]);
  };

  const tabs = [
    { id: "chat", icon: Sparkles, label: "Chat" },
    { id: "active", icon: Bell, label: "Active" },
    { id: "history", icon: History, label: "History" },
    { id: "settings", icon: Settings, label: "Options" },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">Notify AI</h1>
            <p className="text-xs text-muted-foreground">Smart Notifications</p>
          </div>
          <div className="px-2.5 py-1 bg-secondary rounded-full flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">50</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "chat" && (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Create Smart Notifications</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Tell me what you'd like to be reminded about and I'll set up the perfect notification.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Remind me to drink water", "Daily standup at 9 AM", "Weekly report every Friday"].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-1.5 bg-secondary rounded-full text-xs text-muted-foreground"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] px-3 py-2 rounded-2xl text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-secondary text-foreground rounded-bl-md"
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-secondary px-4 py-2 rounded-2xl rounded-bl-md">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pending Notification */}
            {pendingNotification && (
              <div className="mx-4 mb-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Pending Notification</p>
                    <p className="text-sm font-medium text-foreground truncate">{pendingNotification.title}</p>
                    <p className="text-xs text-muted-foreground">{pendingNotification.schedule}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setPendingNotification(null)}
                      className="p-1.5 rounded-lg bg-secondary"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={confirmNotification}
                      className="p-1.5 rounded-lg bg-primary"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Describe your notification..."
                  className="flex-1 bg-secondary px-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-primary rounded-xl disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === "active" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Active Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Create your first notification using the Chat tab.
            </p>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No History Yet</h3>
            <p className="text-sm text-muted-foreground">
              Your notification history will appear here.
            </p>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <div className="p-4 bg-secondary rounded-xl">
                <h4 className="text-sm font-medium text-foreground mb-3">Notification Channels</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Push Notifications</span>
                    <div className="w-10 h-6 bg-primary rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-primary-foreground rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email Notifications</span>
                    <div className="w-10 h-6 bg-muted rounded-full relative">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-muted-foreground rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
