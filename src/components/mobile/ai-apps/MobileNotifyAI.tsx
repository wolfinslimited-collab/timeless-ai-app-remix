import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Bell, History, Settings, Send, Sparkles, Check, X, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ParsedQuestion {
  text: string;
  options: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  parsedQuestion?: ParsedQuestion;
  pendingNotification?: {
    title: string;
    schedule: string;
    channel: string;
    creditsUsed: number;
  };
}

interface MobileNotifyAIProps {
  onBack: () => void;
}

// Parse AI response to detect question patterns with **bold** options
function parseQuestionFromContent(content: string): ParsedQuestion | null {
  const patterns = [
    /Would you like.*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*/i,
    /[Ss]hould.*?(?:be|this).*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*/i,
    /(?:choose|prefer|want).*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*/i,
    /\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*\?/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[2]) {
      const questionEndIndex = content.indexOf("?");
      const questionText = questionEndIndex !== -1
        ? content.substring(0, questionEndIndex + 1)
        : content.split("\n")[0];

      return {
        text: questionText,
        options: [match[1].trim(), match[2].trim()],
      };
    }
  }

  return null;
}

const quickSuggestions = [
  { icon: "💧", text: "Remind me to drink water every 2 hours" },
  { icon: "📊", text: "Daily standup reminder at 9 AM" },
  { icon: "📝", text: "Weekly report every Friday at 4 PM" },
  { icon: "💊", text: "Take vitamins every morning" },
];

export function MobileNotifyAI({ onBack }: MobileNotifyAIProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "active" | "history" | "settings">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = text ?? input.trim();
    if (!message || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const isReminder = message.toLowerCase().includes("remind");
      const isSchedule = message.toLowerCase().includes("daily") || message.toLowerCase().includes("weekly");
      
      let responseContent = "";
      let parsedQuestion: ParsedQuestion | undefined;
      let pendingNotification: Message["pendingNotification"] | undefined;

      if (!isReminder && !isSchedule) {
        responseContent = "I'd love to help you set up a notification! Would you like a **daily reminder** or a **one-time alert**?";
        parsedQuestion = parseQuestionFromContent(responseContent) ?? undefined;
      } else if (message.toLowerCase().includes("daily reminder") || message.toLowerCase().includes("one-time")) {
        responseContent = "Perfect! Should this be delivered via **push notification** or **email**?";
        parsedQuestion = parseQuestionFromContent(responseContent) ?? undefined;
      } else {
        responseContent = "Great! Here's what I've prepared for you:";
        pendingNotification = {
          title: message.length > 40 ? message.slice(0, 40) + "..." : message,
          schedule: isSchedule ? "Daily at 9:00 AM" : "One-time",
          channel: "Push Notification",
          creditsUsed: 1,
        };
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        createdAt: new Date(),
        parsedQuestion,
        pendingNotification,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const confirmNotification = (messageId: string) => {
    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === messageId ? { ...m, pendingNotification: undefined } : m
      );
      return [
        ...updated,
        {
          id: Date.now().toString(),
          role: "assistant" as const,
          content: "✅ I've set up your notification. You can view and manage it in the Active tab.",
          createdAt: new Date(),
        },
      ];
    });
  };

  const cancelNotification = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, pendingNotification: undefined, content: m.content + "\n\n*Notification cancelled.*" } : m
      )
    );
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">Notify AI</h1>
            <p className="text-xs text-muted-foreground">Smart Notifications</p>
          </div>
          <div className="px-2.5 py-1 bg-secondary rounded-full">
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
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4">
                    <Bell className="w-10 h-10 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Welcome to Notify AI</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                    Create smart, AI-powered notifications that adapt to your needs.
                  </p>
                  <div className="w-full space-y-2">
                    {quickSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.text}
                        onClick={() => handleSend(suggestion.text)}
                        className="w-full flex items-center gap-3 p-3 bg-secondary rounded-xl text-left hover:bg-secondary/80 transition-colors"
                      >
                        <span className="text-lg">{suggestion.icon}</span>
                        <span className="text-sm text-foreground">{suggestion.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isLast = index === messages.length - 1;
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isLast={isLast}
                        isLoading={isLoading}
                        onOptionClick={handleSend}
                        onConfirm={() => confirmNotification(message.id)}
                        onCancel={() => cancelNotification(message.id)}
                      />
                    );
                  })}
                  {isLoading && (
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="bg-secondary px-4 py-2 rounded-2xl rounded-bl-md">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:100ms]" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:200ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                  onClick={() => handleSend()}
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

// Separate component for message bubbles
function MessageBubble({
  message,
  isLast,
  isLoading,
  onOptionClick,
  onConfirm,
  onCancel,
}: {
  message: Message;
  isLast: boolean;
  isLoading: boolean;
  onOptionClick: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end items-start gap-2">
        <div className="max-w-[85%] px-3 py-2 bg-primary text-primary-foreground rounded-2xl rounded-br-md text-sm">
          {message.content}
        </div>
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const showOptions = isLast && !isLoading && message.parsedQuestion;
  const showNotification = message.pendingNotification;

  return (
    <div className="flex items-start gap-2">
      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-amber-500" />
      </div>
      <div className="flex-1 space-y-2">
        {/* Question with inline options */}
        {showOptions ? (
          <div className="p-4 bg-card rounded-2xl border border-border">
            <div className="text-sm text-foreground mb-3">
              <ReactMarkdown>{message.parsedQuestion!.text}</ReactMarkdown>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.parsedQuestion!.options.map((option) => (
                <button
                  key={option}
                  onClick={() => onOptionClick(option)}
                  disabled={isLoading}
                  className="px-4 py-2 border border-border rounded-full text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : message.content ? (
          <div className="max-w-[90%] px-3 py-2 bg-secondary rounded-2xl rounded-bl-md text-sm text-foreground prose prose-sm prose-invert">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : null}

        {/* Inline notification confirmation card */}
        {showNotification && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Pending Notification</p>
                <p className="text-sm font-medium text-foreground truncate">{showNotification.title}</p>
                <p className="text-xs text-muted-foreground">{showNotification.schedule} • {showNotification.channel}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2 rounded-xl border border-border flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2 rounded-xl bg-primary flex items-center justify-center gap-2 text-sm text-primary-foreground"
              >
                <Check className="w-4 h-4" />
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
