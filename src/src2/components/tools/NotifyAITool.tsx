import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  Mic,
  MicOff,
  Bell,
  Clock,
  Bitcoin,
  Cloud,
  Sparkles,
  Loader2,
  Trash2,
  Pause,
  Play,
  History,
  Plus,
  Volume2,
  VolumeX,
  CheckCircle,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Trophy,
  Newspaper,
  Twitter,
  Timer,
  TrendingUp,
  MapPin,
  Plane,
  Circle,
  Settings,
  Smartphone,
  Mail,
  ShieldCheck,
  ShieldX,
  Coins,
  Crown,
  RefreshCw,
  Pencil,
  MoreHorizontal,
  Monitor,
} from "lucide-react";
import VoiceInputWaveform from "./VoiceInputWaveform";

// Speech recognition types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface CustomSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

const getWindowSpeech = () => {
  const w = window as { SpeechRecognition?: new () => CustomSpeechRecognition; webkitSpeechRecognition?: new () => CustomSpeechRecognition };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
};


interface QuestionOption {
  label: string;
  value: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  question?: {
    text: string;
    options: QuestionOption[];
  };
}

interface Notification {
  id: string;
  type: "time_reminder" | "crypto_price" | "stock_price" | "weather" | "sports_match" | "news_monitoring" | "social_media" | "screen_time" | "location_based" | "flight_status" | "custom";
  title: string;
  description: string;
  status: "active" | "paused" | "triggered" | "expired" | "cancelled";
  channel: "push" | "email" | "both";
  condition_config: Record<string, unknown>;
  trigger_count: number;
  created_at: string;
  triggered_at: string | null;
}

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  channel: "push" | "email" | "both";
  sent_via: string[];
  read_at: string | null;
  created_at: string;
}

const QUICK_SUGGESTIONS = [
  { icon: Plane, text: "Track flight AA123 and notify me of any delays", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: MapPin, text: "Remind me to buy groceries when I leave work", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: Timer, text: "Set a 30-minute focus timer for Instagram", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: Clock, text: "Remind me in 30 minutes to take a break", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: Bitcoin, text: "Notify me when Bitcoin changes by 2%", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: TrendingUp, text: "Alert me when AAPL drops 5%", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: Cloud, text: "Tell me if it's going to rain tomorrow", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: Trophy, text: "Alert me when Manchester United has a match", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: Newspaper, text: "Monitor news about artificial intelligence", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
  { icon: Twitter, text: "Track @elonmusk tweets about Tesla", color: "text-muted-foreground", bgColor: "bg-secondary/50" },
];

// Note: Quick reply buttons removed - users type their responses directly

const removeQuickReplyMarkers = (content: string): string => {
  // No need to remove anything, we just display the content as-is
  return content;
};

// Parse AI response to detect question patterns with options
const parseQuestionFromContent = (content: string): { text: string; options: QuestionOption[] } | null => {
  // Pattern: Look for questions with **bold** options like "Would you like this to be a **one-time notification** or should it **repeat**?"
  const questionPatterns = [
    // Pattern for "A or B" questions with bold options
    /Would you like.*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*/i,
    // Pattern for "Should this be A or B"
    /[Ss]hould.*?(?:be|this).*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*/i,
    // Pattern for choice between options
    /(?:choose|prefer|want).*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*/i,
  ];

  for (const pattern of questionPatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[2]) {
      // Extract the question text (everything before the options or the full sentence)
      const questionEndIndex = content.indexOf("?");
      const questionText = questionEndIndex !== -1 
        ? content.substring(0, questionEndIndex + 1) 
        : content.split('\n')[0];
      
      return {
        text: questionText,
        options: [
          { label: match[1].trim(), value: match[1].trim().toLowerCase() },
          { label: match[2].trim(), value: match[2].trim().toLowerCase() },
        ],
      };
    }
  }

  return null;
};

// Parse markdown text and return React elements
const parseMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  
  // Split by **bold** pattern
  const boldPattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  
  while ((match = boldPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the bold text
    parts.push(
      <strong key={key++} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
};

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  desktopEnabled: boolean;
  defaultChannel: "push" | "email" | "both";
}

const NotifyAITool = () => {
  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch: refetchCredits, loading: creditsLoading } = useCredits();
  const { isSupported: isPushSupported, isRegistered: isPushRegistered, requestPermission } = usePushNotifications();
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [pendingNotification, setPendingNotification] = useState<Record<string, unknown> | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTime, setEditTime] = useState("09:00");
  const [editFrequency, setEditFrequency] = useState<"once" | "daily" | "weekly">("once");
  const [isUpdating, setIsUpdating] = useState(false);
  const [countdownTick, setCountdownTick] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem("notify-ai-settings");
    return saved ? JSON.parse(saved) : {
      pushEnabled: false,
      emailEnabled: true,
      desktopEnabled: false,
      defaultChannel: "both" as const, // Default to both for reliable delivery
    };
  });
  const [desktopPermissionStatus, setDesktopPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);
  const [isRequestingDesktopPermission, setIsRequestingDesktopPermission] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check push notification permission status
  useEffect(() => {
    if (!isPushSupported) {
      setPushPermissionStatus('unsupported');
    } else if ('Notification' in window) {
      setPushPermissionStatus(Notification.permission);
    }
  }, [isPushSupported]);

  // Check desktop notification permission status (for web)
  useEffect(() => {
    if ('Notification' in window) {
      setDesktopPermissionStatus(Notification.permission);
      // Show prompt if permission is default and user hasn't dismissed it
      const dismissed = localStorage.getItem("desktop-notification-prompt-dismissed");
      if (Notification.permission === 'default' && !dismissed) {
        setShowDesktopPrompt(true);
      }
    } else {
      setDesktopPermissionStatus('unsupported');
    }
  }, []);

  // Countdown timer tick - updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = getWindowSpeech();
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart if still supposed to be listening
          try {
            recognitionRef.current?.start();
          } catch (e) {
            setIsListening(false);
          }
        }
      };
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [isListening]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: "list" }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }, [user]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: "history" }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadHistory();
    }
  }, [user, loadNotifications, loadHistory]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting speech recognition:", e);
      }
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech is not supported");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading || !user) return;

    // Check credits before sending (1 credit per message)
    if (!hasActiveSubscription && (credits ?? 0) < 1) {
      toast.error("Insufficient credits. Please purchase more credits to continue.");
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 402) {
          toast.error("Insufficient credits. Please purchase more credits to continue.");
          refetchCredits();
          return;
        }
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
          return;
        }
        throw new Error(`Request failed: ${response.status}`);
      }

      // Refetch credits after successful request
      refetchCredits();

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";
      let toolCallData: { name: string; arguments: string } | null = null;
      let buffer = ""; // Buffer for incomplete lines

      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Split by newlines but keep the last incomplete line in buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last potentially incomplete line

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;
          const jsonStr = trimmedLine.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              assistantContent += delta.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }

            // Handle tool calls
            if (delta?.tool_calls?.[0]) {
              const toolCall = delta.tool_calls[0];
              if (toolCall.function?.name) {
                toolCallData = { name: toolCall.function.name, arguments: "" };
              }
              if (toolCall.function?.arguments) {
                toolCallData!.arguments += toolCall.function.arguments;
              }
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
            console.debug("Stream parse error (expected for incomplete chunks):", e);
          }
        }
      }
      
      // Process any remaining buffered content
      if (buffer.trim().startsWith("data: ")) {
        const jsonStr = buffer.trim().slice(6).trim();
        if (jsonStr && jsonStr !== "[DONE]") {
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              assistantContent += delta.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }
          } catch (e) {
            // Final chunk might be incomplete, that's ok
          }
        }
      }

      // Handle tool call completion
      if (toolCallData?.name === "create_notification") {
        try {
          const notificationArgs = JSON.parse(toolCallData.arguments);
          setPendingNotification(notificationArgs);
          
          // Add confirmation message
          const confirmContent = assistantContent || 
            `I'll set up a notification for you: "${notificationArgs.title}". Would you like me to create this notification?`;
          
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { 
              ...m, 
              content: confirmContent,
              toolCall: { name: "create_notification", arguments: notificationArgs }
            } : m
          ));
        } catch (e) {
          console.error("Error parsing tool call arguments:", e);
        }
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmNotification = async () => {
    if (!pendingNotification || !user) return;
    
    // Prevent double-clicks
    if (isConfirming) return;
    setIsConfirming(true);

    // Check credits before creating notification (1 credit per notification)
    if (!hasActiveSubscription && (credits ?? 0) < 1) {
      toast.error("Insufficient credits. You need 1 credit to create a notification.");
      setIsConfirming(false);
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-ai-save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            notification: {
              ...pendingNotification,
              // Override the AI's channel choice with the user's default preference
              channel: settings.defaultChannel,
            },
            originalRequest: messages.find(m => m.role === "user")?.content || "",
          }),
        }
      );

      if (response.ok) {
        toast.success("Notification created! (2 credits used)");
        setPendingNotification(null);
        loadNotifications();
        refetchCredits();
        
        // Add confirmation to chat
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "✅ I've set up your notification. You can view and manage it in the Notifications tab.",
          createdAt: new Date(),
        }]);
      } else if (response.status === 402) {
        toast.error("Insufficient credits. Please purchase more credits to create notifications.");
        refetchCredits();
      } else {
        throw new Error("Failed to save notification");
      }
    } catch (error) {
      console.error("Error saving notification:", error);
      toast.error("Failed to create notification");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleNotificationAction = async (action: "pause" | "resume" | "delete", notificationId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action, notificationId }),
        }
      );

      if (response.ok) {
        toast.success(`Notification ${action}d`);
        loadNotifications();
      }
    } catch (error) {
      console.error(`Error ${action}ing notification:`, error);
      toast.error(`Failed to ${action} notification`);
    }
  };

  const openEditDialog = (notification: Notification) => {
    const config = notification.condition_config as Record<string, unknown>;
    const triggerTime = (config?.trigger_time || config?.trigger_at) as string;
    const repeat = (config?.repeat || "once") as "once" | "daily" | "weekly";
    
    // Set name and description
    setEditName(notification.title);
    setEditDescription(notification.description || "");
    
    // Extract time from trigger
    if (triggerTime) {
      const date = new Date(triggerTime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setEditTime(`${hours}:${minutes}`);
    } else {
      setEditTime("09:00");
    }
    
    setEditFrequency(repeat);
    setEditingNotification(notification);
  };

  const handleUpdateNotification = async () => {
    if (!editingNotification) return;
    
    setIsUpdating(true);
    try {
      const config = editingNotification.condition_config as Record<string, unknown>;
      
      // Calculate new trigger time
      const [hours, minutes] = editTime.split(':').map(Number);
      const newTriggerDate = new Date();
      newTriggerDate.setHours(hours, minutes, 0, 0);
      
      // If the time has passed today and it's a one-time notification, set for tomorrow
      if (editFrequency === 'once' && newTriggerDate <= new Date()) {
        newTriggerDate.setDate(newTriggerDate.getDate() + 1);
      }
      
      const updatedConfig = {
        ...config,
        repeat: editFrequency,
        trigger_time: newTriggerDate.toISOString(),
        trigger_at: newTriggerDate.toISOString(),
      };
      
      const { error } = await supabase
        .from('notifications')
        .update({ 
          title: editName.trim() || editingNotification.title,
          description: editDescription.trim() || editingNotification.description,
          condition_config: updatedConfig,
          status: 'active', // Reactivate if it was triggered
          updated_at: new Date().toISOString()
        })
        .eq('id', editingNotification.id);
      
      if (error) throw error;
      
      toast.success("Notification updated");
      setEditingNotification(null);
      loadNotifications();
    } catch (error) {
      console.error("Error updating notification:", error);
      toast.error("Failed to update notification");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkAsRead = async (historyId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: "mark_read", notificationId: historyId }),
        }
      );

      if (response.ok) {
        setHistory(prev => prev.map(h => 
          h.id === historyId ? { ...h, read_at: new Date().toISOString() } : h
        ));
        toast.success("Marked as read");
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: "mark_all_read" }),
        }
      );

      if (response.ok) {
        setHistory(prev => prev.map(h => ({ ...h, read_at: h.read_at || new Date().toISOString() })));
        toast.success("All marked as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "time_reminder": return <Clock className="h-4 w-4" />;
      case "crypto_price": return <Bitcoin className="h-4 w-4" />;
      case "stock_price": return <TrendingUp className="h-4 w-4" />;
      case "weather": return <Cloud className="h-4 w-4" />;
      case "sports_match": return <Trophy className="h-4 w-4" />;
      case "news_monitoring": return <Newspaper className="h-4 w-4" />;
      case "social_media": return <Twitter className="h-4 w-4" />;
      case "screen_time": return <Timer className="h-4 w-4" />;
      case "location_based": return <MapPin className="h-4 w-4" />;
      case "flight_status": return <Plane className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400";
      case "paused": return "bg-yellow-500/20 text-yellow-400";
      case "triggered": return "bg-blue-500/20 text-blue-400";
      case "expired": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Calculate countdown time remaining
  const getCountdown = (notification: Notification): { text: string; isUrgent: boolean } | null => {
    const config = notification.condition_config as Record<string, unknown>;
    const triggerTime = (config?.trigger_time || config?.trigger_at) as string;
    const repeat = config?.repeat as string;
    
    if (!triggerTime || notification.status !== 'active') return null;
    
    let targetDate = new Date(triggerTime);
    const now = new Date();
    
    // For recurring notifications, calculate next occurrence
    if (repeat === 'daily' || repeat === 'weekly') {
      while (targetDate <= now) {
        if (repeat === 'daily') {
          targetDate.setDate(targetDate.getDate() + 1);
        } else {
          targetDate.setDate(targetDate.getDate() + 7);
        }
      }
    }
    
    const diffMs = targetDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return null;
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const isUrgent = diffMins < 60;
    
    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return { text: `${diffDays}d ${remainingHours}h`, isUrgent: false };
    } else if (diffHours > 0) {
      const remainingMins = diffMins % 60;
      return { text: `${diffHours}h ${remainingMins}m`, isUrgent };
    } else if (diffMins > 0) {
      const remainingSecs = diffSecs % 60;
      return { text: `${diffMins}m ${remainingSecs}s`, isUrgent: true };
    } else {
      return { text: `${diffSecs}s`, isUrgent: true };
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Sign in to use Notify AI</CardTitle>
            <CardDescription>
              Create smart notifications and reminders with AI
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleEnablePushNotifications = async () => {
    if (!isPushSupported) {
      toast.error("Push notifications are not supported on this device");
      return;
    }

    setIsRequestingPermission(true);
    
    try {
      const success = await requestPermission();
      
      if (success) {
        setPushPermissionStatus('granted');
        updateSettings({ pushEnabled: true });
        toast.success("Push notifications enabled!");
      } else {
        // Check the actual permission status
        const status = 'Notification' in window ? Notification.permission : 'denied';
        setPushPermissionStatus(status);
        
        if (status === 'denied') {
          toast.error("Push notifications were blocked. Please enable them in your browser settings.");
        } else {
          toast.error("Could not enable push notifications");
        }
      }
    } catch (error) {
      console.error("Error requesting push permission:", error);
      toast.error("Failed to request notification permission");
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Handle desktop notification permission request
  const handleEnableDesktopNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error("Desktop notifications are not supported in this browser");
      return;
    }

    setIsRequestingDesktopPermission(true);
    
    try {
      const permission = await Notification.requestPermission();
      setDesktopPermissionStatus(permission);
      
      if (permission === 'granted') {
        updateSettings({ desktopEnabled: true });
        setShowDesktopPrompt(false);
        toast.success("Desktop notifications enabled!");
        
        // Show a test notification
        new Notification("Notify AI", {
          body: "Desktop notifications are now enabled!",
          icon: "/favicon.png",
        });
      } else if (permission === 'denied') {
        toast.error("Desktop notifications were blocked. Please enable them in your browser settings.");
      }
    } catch (error) {
      console.error("Error requesting desktop permission:", error);
      toast.error("Failed to request notification permission");
    } finally {
      setIsRequestingDesktopPermission(false);
    }
  };

  const handleDismissDesktopPrompt = () => {
    setShowDesktopPrompt(false);
    localStorage.setItem("desktop-notification-prompt-dismissed", "true");
  };

  const getDesktopPermissionBadge = () => {
    if (desktopPermissionStatus === 'unsupported') {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Not Supported
        </Badge>
      );
    }
    if (desktopPermissionStatus === 'granted') {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-500">
          <ShieldCheck className="h-3 w-3" />
          Enabled
        </Badge>
      );
    }
    if (desktopPermissionStatus === 'denied') {
      return (
        <Badge variant="secondary" className="gap-1 bg-destructive/20 text-destructive">
          <ShieldX className="h-3 w-3" />
          Blocked
        </Badge>
      );
    }
    return null;
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    
    // If trying to enable push, request permission first
    if (newSettings.pushEnabled === true && pushPermissionStatus !== 'granted') {
      handleEnablePushNotifications();
      return; // Don't update settings yet, wait for permission
    }
    
    // If trying to enable desktop, request permission first
    if (newSettings.desktopEnabled === true && desktopPermissionStatus !== 'granted') {
      handleEnableDesktopNotifications();
      return; // Don't update settings yet, wait for permission
    }
    
    // Auto-update defaultChannel based on enabled channels
    if (!updated.pushEnabled && updated.emailEnabled) {
      updated.defaultChannel = "email";
    } else if (updated.pushEnabled && !updated.emailEnabled) {
      updated.defaultChannel = "push";
    } else if (updated.pushEnabled && updated.emailEnabled) {
      updated.defaultChannel = "both";
    }
    setSettings(updated);
    localStorage.setItem("notify-ai-settings", JSON.stringify(updated));
  };

  const getPushPermissionBadge = () => {
    if (pushPermissionStatus === 'unsupported') {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Not Supported
        </Badge>
      );
    }
    if (pushPermissionStatus === 'granted') {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-500">
          <ShieldCheck className="h-3 w-3" />
          Enabled
        </Badge>
      );
    }
    if (pushPermissionStatus === 'denied') {
      return (
        <Badge variant="secondary" className="gap-1 bg-red-500/20 text-red-500">
          <ShieldX className="h-3 w-3" />
          Blocked
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Not Set
      </Badge>
    );
  };

  const getChannelIcon = (channel: "push" | "email" | "both") => {
    switch (channel) {
      case "push": return <Smartphone className="h-3.5 w-3.5" />;
      case "email": return <Mail className="h-3.5 w-3.5" />;
      case "both": return (
        <div className="flex items-center gap-0.5">
          <Smartphone className="h-3 w-3" />
          <Mail className="h-3 w-3" />
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Notify AI</h1>
                  <p className="text-xs text-muted-foreground">Smart notifications powered by AI</p>
                </div>
              </div>
              {/* Credit Display */}
              <div className="flex items-center gap-2">
                {hasActiveSubscription ? (
                  <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-primary/20">
                    <Crown className="h-3.5 w-3.5" />
                    Pro
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5">
                    <Coins className="h-3.5 w-3.5" />
                    {creditsLoading ? "..." : credits ?? 0} credits
                  </Badge>
                )}
              </div>
            </div>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chat" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Active</span>
                <span className="sm:hidden">({notifications.filter(n => n.status === "active").length})</span>
                <span className="hidden sm:inline">({notifications.filter(n => n.status === "active").length})</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Options</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Bell className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Notify AI</h2>
                    <p className="text-muted-foreground max-w-md">
                      Tell me what you want to be notified about. I can set up reminders, 
                      crypto alerts, weather notifications, and more.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
                    {QUICK_SUGGESTIONS.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(suggestion.text)}
                        className="flex items-start gap-4 p-5 rounded-2xl bg-card/50 border border-border/50 hover:border-border hover:bg-card transition-all text-left group"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          suggestion.bgColor
                        )}>
                          <suggestion.icon className={cn("h-5 w-5", suggestion.color)} />
                        </div>
                        <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors leading-relaxed pt-2">
                          {suggestion.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message, index) => {
                    const hasToolCall = !!message.toolCall;
                    const displayContent = message.role === "assistant" && message.content
                      ? removeQuickReplyMarkers(message.content)
                      : message.content;
                    
                    // Check if this is a question message (last assistant message with question pattern)
                    const isLastAssistantMessage = message.role === "assistant" && 
                      index === messages.length - 1;
                    const parsedQuestion = isLastAssistantMessage && displayContent && !hasToolCall
                      ? parseQuestionFromContent(displayContent)
                      : null;
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex w-full",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "user" ? (
                          /* User message - right aligned bubble */
                          <div className="max-w-[80%]">
                            <div className="bg-primary/90 text-primary-foreground rounded-3xl rounded-br-lg px-5 py-3">
                              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                                {displayContent}
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Assistant message - ChatGPT style full width */
                          <div className="w-full max-w-none">
                            <div className="flex flex-col gap-3">
                              {/* Message content - show question card if detected */}
                              {displayContent && parsedQuestion ? (
                                <div className="rounded-xl border border-border bg-background p-5 space-y-4 max-w-xl">
                                  <p className="text-[15px] leading-7 text-foreground">
                                    {parseMarkdown(parsedQuestion.text)}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {parsedQuestion.options.map((option, optIdx) => (
                                      <Button
                                        key={optIdx}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                        onClick={() => handleSend(option.label)}
                                        disabled={isLoading}
                                      >
                                        {option.label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              ) : displayContent && (
                                <div className="text-[15px] leading-7 text-foreground">
                                  {displayContent.split('\n').map((line, lineIdx) => (
                                    <p key={lineIdx} className={lineIdx > 0 ? "mt-3" : ""}>
                                      {parseMarkdown(line)}
                                    </p>
                                  ))}
                                </div>
                              )}
                              
                              {/* Tool call notification card - ChatGPT style */}
                              {message.toolCall && pendingNotification && (
                                <div className="mt-3 inline-flex flex-col rounded-2xl border border-border bg-background min-w-[280px] max-w-md overflow-hidden">
                                  <div className="flex items-center justify-between p-4">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground truncate">
                                        {message.toolCall.arguments.title as string}
                                      </p>
                                      <p className="text-sm text-muted-foreground mt-0.5">
                                        {(() => {
                                          const config = message.toolCall.arguments.condition_config as Record<string, unknown>;
                                          const repeat = config?.repeat as string;
                                          const triggerTime = (config?.trigger_time || config?.trigger_at) as string;
                                          
                                          if (repeat === 'daily' && triggerTime) {
                                            const timeStr = new Date(triggerTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                            return `Daily at ${timeStr}`;
                                          } else if (repeat === 'weekly' && triggerTime) {
                                            const date = new Date(triggerTime);
                                            const dayStr = date.toLocaleDateString([], { weekday: 'long' });
                                            const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                            return `Weekly on ${dayStr} at ${timeStr}`;
                                          } else if (triggerTime) {
                                            const date = new Date(triggerTime);
                                            return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                                          }
                                          return "Ready to create";
                                        })()}
                                      </p>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-background border">
                                        <DropdownMenuItem onClick={confirmNotification} disabled={isConfirming}>
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          {isConfirming ? "Creating..." : "Create"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setPendingNotification(null)}>
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Cancel
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  <div className="flex items-center gap-2 px-4 pb-3">
                                    <Button
                                      size="sm"
                                      onClick={confirmNotification}
                                      disabled={isConfirming}
                                      className="rounded-full"
                                    >
                                      {isConfirming ? "Creating..." : "Create"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setPendingNotification(null)}
                                      className="rounded-full"
                                    >
                                      Cancel
                                    </Button>
                                    {!hasActiveSubscription && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-1">
                                        <Coins className="h-3 w-3" />
                                        1 credit
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              
                              {/* Actions row */}
                              {!message.toolCall && displayContent && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity -ml-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-muted-foreground hover:text-foreground rounded-lg"
                                    onClick={() => speakText(message.content)}
                                  >
                                    {isSpeaking ? (
                                      <VolumeX className="h-3.5 w-3.5" />
                                    ) : (
                                      <Volume2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {isLoading && (
                    <div className="flex w-full justify-start">
                      <div className="flex items-center gap-1.5 py-2">
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t border-border bg-background px-4 md:px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 items-center relative">
                {isListening && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-xl z-10">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full animate-pulse"
                          style={{
                            height: `${12 + Math.random() * 16}px`,
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">Listening...</span>
                    </div>
                  </div>
                )}
                
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleVoiceInput}
                  className="shrink-0"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Tell me what to notify you about..."
                  disabled={isLoading}
                  className="flex-1"
                />

                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
              {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                <Bell className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No notifications yet</p>
                <Button variant="outline" onClick={() => setActiveTab("chat")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create your first notification
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const config = notification.condition_config as Record<string, unknown>;
                  const repeat = config?.repeat as string;
                  const triggerTime = (config?.trigger_time || config?.trigger_at) as string;
                  
                  // Format schedule text like ChatGPT
                  const getScheduleText = () => {
                    if (repeat === 'daily' && triggerTime) {
                      const timeStr = new Date(triggerTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                      return `Daily at ${timeStr}`;
                    } else if (repeat === 'weekly' && triggerTime) {
                      const date = new Date(triggerTime);
                      const dayStr = date.toLocaleDateString([], { weekday: 'long' });
                      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                      return `Weekly on ${dayStr} at ${timeStr}`;
                    } else if (triggerTime) {
                      const date = new Date(triggerTime);
                      return `Next run ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    }
                    return null;
                  };
                  
                  const countdown = getCountdown(notification);
                  
                  return (
                    <div 
                      key={notification.id}
                      className="rounded-2xl border border-border bg-background overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-medium truncate">{notification.title}</h4>
                            {notification.status !== 'active' && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs capitalize",
                                  notification.status === 'paused' && "text-amber-500 border-amber-500/50",
                                  notification.status === 'triggered' && "text-blue-400 border-blue-400/50"
                                )}
                              >
                                {notification.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getScheduleText()}
                            {countdown && (
                              <span className={cn(
                                "ml-2 font-mono",
                                countdown.isUrgent ? "text-amber-500" : ""
                              )}>
                                ({countdown.text})
                              </span>
                            )}
                          </p>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border">
                            <DropdownMenuItem onClick={() => openEditDialog(notification)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {notification.status === 'active' ? (
                              <DropdownMenuItem onClick={() => handleNotificationAction("pause", notification.id)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            ) : notification.status === 'paused' ? (
                              <DropdownMenuItem onClick={() => handleNotificationAction("resume", notification.id)}>
                                <Play className="h-4 w-4 mr-2" />
                                Resume
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem 
                              onClick={() => handleNotificationAction("delete", notification.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
              {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                <History className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No notification history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.some(h => !h.read_at) && (
                  <div className="flex justify-end mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="text-xs"
                    >
                      <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                      Mark all as read
                    </Button>
                  </div>
                )}
                {history.map((item) => (
                  <Card 
                    key={item.id} 
                    className={cn(
                      "transition-colors",
                      !item.read_at && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          item.read_at ? "bg-muted" : "bg-primary/20"
                        )}>
                          {item.read_at ? (
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Circle className="h-4 w-4 text-primary fill-primary" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={cn("font-medium", !item.read_at && "text-primary")}>
                              {item.title}
                            </h4>
                            {!item.read_at && (
                              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.body}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Sent via: {item.sent_via?.join(", ") || "N/A"}</span>
                            <span>{new Date(item.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {!item.read_at && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleMarkAsRead(item.id)}
                            title="Mark as read"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
              <div className="max-w-md mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Channels
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Push Notifications */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          settings.pushEnabled && pushPermissionStatus === 'granted' 
                            ? "bg-green-500/10" 
                            : "bg-primary/10"
                        )}>
                          <Smartphone className={cn(
                            "h-5 w-5",
                            settings.pushEnabled && pushPermissionStatus === 'granted' 
                              ? "text-green-500" 
                              : "text-primary"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="push-toggle" className="font-medium">
                              Mobile Push Notifications
                            </Label>
                            {getPushPermissionBadge()}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Get instant alerts on your device
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="push-toggle"
                        checked={settings.pushEnabled && pushPermissionStatus === 'granted'}
                        onCheckedChange={(checked) => updateSettings({ pushEnabled: checked })}
                        disabled={isRequestingPermission || pushPermissionStatus === 'unsupported'}
                      />
                    </div>
                    
                    {/* Permission request button when not granted */}
                    {pushPermissionStatus === 'default' && !settings.pushEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleEnablePushNotifications}
                        disabled={isRequestingPermission}
                      >
                        {isRequestingPermission ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Requesting Permission...
                          </>
                        ) : (
                          <>
                            <Bell className="h-4 w-4 mr-2" />
                            Enable Push Notifications
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Blocked state help */}
                    {pushPermissionStatus === 'denied' && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-sm">
                        <p className="text-destructive font-medium mb-1">Notifications Blocked</p>
                        <p className="text-muted-foreground text-xs">
                          Push notifications have been blocked. To enable them:
                        </p>
                        <ol className="text-muted-foreground text-xs mt-1 list-decimal list-inside space-y-0.5">
                          <li>Click the lock icon in your browser's address bar</li>
                          <li>Find "Notifications" in the permissions</li>
                          <li>Change it from "Block" to "Allow"</li>
                          <li>Refresh this page</li>
                        </ol>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Desktop Notifications (Web) */}
                  <div className="space-y-3">
                    {/* Desktop notification prompt banner - Lovable question style */}
                    {showDesktopPrompt && desktopPermissionStatus === 'default' && (
                      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
                        <div className="space-y-2">
                          <p className="text-base">
                            Would you like to enable <strong className="font-semibold">desktop notifications</strong> for this browser?
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Get instant alerts on your computer when your notifications trigger.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleEnableDesktopNotifications}
                            disabled={isRequestingDesktopPermission}
                          >
                            {isRequestingDesktopPermission ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enabling...
                              </>
                            ) : (
                              "Enable notifications"
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismissDesktopPrompt}
                          >
                            Maybe later
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          settings.desktopEnabled && desktopPermissionStatus === 'granted' 
                            ? "bg-green-500/10" 
                            : "bg-primary/10"
                        )}>
                          <Monitor className={cn(
                            "h-5 w-5",
                            settings.desktopEnabled && desktopPermissionStatus === 'granted' 
                              ? "text-green-500" 
                              : "text-primary"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="desktop-toggle" className="font-medium">
                              Desktop Notifications
                            </Label>
                            {getDesktopPermissionBadge()}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Get browser notifications on your computer
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="desktop-toggle"
                        checked={settings.desktopEnabled && desktopPermissionStatus === 'granted'}
                        onCheckedChange={(checked) => updateSettings({ desktopEnabled: checked })}
                        disabled={isRequestingDesktopPermission || desktopPermissionStatus === 'unsupported'}
                      />
                    </div>
                    
                    {/* Permission request button when not granted */}
                    {desktopPermissionStatus === 'default' && !settings.desktopEnabled && !showDesktopPrompt && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleEnableDesktopNotifications}
                        disabled={isRequestingDesktopPermission}
                      >
                        {isRequestingDesktopPermission ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Requesting Permission...
                          </>
                        ) : (
                          <>
                            <Monitor className="h-4 w-4 mr-2" />
                            Enable Desktop Notifications
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Blocked state help */}
                    {desktopPermissionStatus === 'denied' && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-sm">
                        <p className="text-destructive font-medium mb-1">Notifications Blocked</p>
                        <p className="text-muted-foreground text-xs">
                          Desktop notifications have been blocked. To enable them:
                        </p>
                        <ol className="text-muted-foreground text-xs mt-1 list-decimal list-inside space-y-0.5">
                          <li>Click the lock icon in your browser's address bar</li>
                          <li>Find "Notifications" in the permissions</li>
                          <li>Change it from "Block" to "Allow"</li>
                          <li>Refresh this page</li>
                        </ol>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Email Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        settings.emailEnabled ? "bg-green-500/10" : "bg-primary/10"
                      )}>
                        <Mail className={cn(
                          "h-5 w-5",
                          settings.emailEnabled ? "text-green-500" : "text-primary"
                        )} />
                      </div>
                      <div>
                        <Label htmlFor="email-toggle" className="font-medium">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications in your inbox
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="email-toggle"
                      checked={settings.emailEnabled}
                      onCheckedChange={(checked) => updateSettings({ emailEnabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Default Channel
                  </CardTitle>
                  <CardDescription>
                    Select your preferred notification method for new alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={settings.defaultChannel === "push" ? "default" : "outline"}
                      className="flex-col gap-1 h-auto py-3"
                      onClick={() => updateSettings({ defaultChannel: "push" })}
                      disabled={!settings.pushEnabled}
                    >
                      <Smartphone className="h-5 w-5" />
                      <span className="text-xs">Push Only</span>
                    </Button>
                    <Button
                      variant={settings.defaultChannel === "email" ? "default" : "outline"}
                      className="flex-col gap-1 h-auto py-3"
                      onClick={() => updateSettings({ defaultChannel: "email" })}
                      disabled={!settings.emailEnabled}
                    >
                      <Mail className="h-5 w-5" />
                      <span className="text-xs">Email Only</span>
                    </Button>
                    <Button
                      variant={settings.defaultChannel === "both" ? "default" : "outline"}
                      className="flex-col gap-1 h-auto py-3"
                      onClick={() => updateSettings({ defaultChannel: "both" })}
                      disabled={!settings.pushEnabled || !settings.emailEnabled}
                    >
                      <div className="flex gap-1">
                        <Smartphone className="h-4 w-4" />
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="text-xs">Both</span>
                    </Button>
                  </div>
                  
                  <div className="mt-4 p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      <strong>Current:</strong> New notifications will be sent via{" "}
                      <span className="text-foreground font-medium">
                        {settings.defaultChannel === "both" 
                          ? "Push & Email" 
                          : settings.defaultChannel === "push" 
                            ? "Push only" 
                            : "Email only"}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• <strong>Push notifications</strong> require the app to be installed on your device</p>
                  <p>• <strong>Desktop notifications</strong> appear in your browser when the tab is open</p>
                  <p>• <strong>Email notifications</strong> are sent to your registered email address</p>
                  <p>• You can override the default channel when creating individual notifications</p>
                </CardContent>
              </Card>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Edit Notification Dialog - ChatGPT style */}
      <Dialog open={!!editingNotification} onOpenChange={(open) => !open && setEditingNotification(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit schedule</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-2">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Notification name"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            
            {/* Instructions field */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">Instructions</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What should this notification do?"
                className="bg-secondary/50 border-border/50 min-h-[80px] resize-none"
              />
            </div>
            
            {/* When section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">When</Label>
              <div className="flex gap-3">
                <Select value={editFrequency} onValueChange={(value: "once" | "daily" | "weekly") => setEditFrequency(value)}>
                  <SelectTrigger className="flex-1 bg-secondary/50 border-border/50">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={editTime}
                  onValueChange={(value) => setEditTime(value)}
                >
                  <SelectTrigger className="flex-1 bg-secondary/50 border-border/50">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-[200px]">
                    {[...Array(24)].map((_, hour) => (
                      ["00", "30"].map(min => {
                        const timeValue = `${hour.toString().padStart(2, '0')}:${min}`;
                        const displayTime = new Date(`2000-01-01T${timeValue}`).toLocaleTimeString([], { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        });
                        return (
                          <SelectItem key={timeValue} value={timeValue}>
                            {displayTime}
                          </SelectItem>
                        );
                      })
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Footer with action buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (editingNotification?.status === 'active') {
                    handleNotificationAction("pause", editingNotification.id);
                  } else if (editingNotification?.status === 'paused') {
                    handleNotificationAction("resume", editingNotification.id);
                  }
                  setEditingNotification(null);
                }}
                className="rounded-full"
              >
                {editingNotification?.status === 'active' ? 'Pause' : 'Resume'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (editingNotification) {
                    handleNotificationAction("delete", editingNotification.id);
                    setEditingNotification(null);
                  }
                }}
                className="rounded-full text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditingNotification(null)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleUpdateNotification} 
                disabled={isUpdating}
                className="rounded-full"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotifyAITool;
