import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Loader2, 
  User, 
  Copy, 
  Check,
  Trash2,
  Sparkles,
  ImagePlus,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ConversationHistory from "./ConversationHistory";
import ChatMessageSkeleton from "./ChatMessageSkeleton";

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | MessageContent[];
  model?: string;
  timestamp: Date;
  images?: string[];
}

interface ChatModel {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
}

interface ChatToolLayoutProps {
  model: ChatModel;
}

const VISION_MODELS = [
  "gemini-2.5-pro",
  "gemini-3-pro", 
  "gemini-3-flash",
  "chatgpt-5.2",
  "chatgpt-5",
  "grok-3",
];

const ChatToolLayout = ({ model }: ChatToolLayoutProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const supportsVision = VISION_MODELS.includes(model.id);

  // Reset conversation when model changes
  useEffect(() => {
    setConversationId(null);
    setMessages([]);
  }, [model.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversation = useCallback(async (id: string) => {
    if (!user) return;

    setIsLoadingConversation(true);
    try {
      const { data: messagesData, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (messagesData || []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content as string | MessageContent[],
        timestamp: new Date(m.created_at),
        images: m.images || undefined,
      }));

      setMessages(loadedMessages);
      setConversationId(id);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      toast({
        variant: "destructive",
        title: "Failed to load conversation",
        description: "Please try again.",
      });
    } finally {
      setIsLoadingConversation(false);
    }
  }, [user, toast]);

  const createConversation = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Generate title from first message (first 50 chars)
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          model: model.id,
          title,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  };

  const saveMessage = async (
    convId: string,
    role: "user" | "assistant",
    content: string | MessageContent[],
    images?: string[]
  ) => {
    try {
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role,
        content: content as any,
        images: images || [],
      });

      // Update conversation's updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const handleSelectConversation = (id: string | null) => {
    if (id) {
      loadConversation(id);
    } else {
      handleNewConversation();
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setPendingImages([]);
    setInput("");
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!user) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            variant: "destructive",
            title: "Invalid file",
            description: "Please upload image files only.",
          });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "File too large",
            description: "Please upload images under 10MB.",
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `chat/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('generation-inputs')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('generation-inputs')
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }

      setPendingImages(prev => [...prev, ...newImages]);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload image.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    await uploadFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (supportsVision && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!supportsVision || !user) {
      if (!supportsVision) {
        toast({
          variant: "destructive",
          title: "Images not supported",
          description: "This model doesn't support image analysis.",
        });
      }
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0) || isLoading) return;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to use the chat.",
      });
      return;
    }

    // Build message content
    let messageContent: string | MessageContent[];
    const displayImages = [...pendingImages];
    const textContent = input.trim();
    
    if (pendingImages.length > 0) {
      messageContent = [];
      for (const imageUrl of pendingImages) {
        messageContent.push({
          type: "image_url",
          image_url: { url: imageUrl }
        });
      }
      if (textContent) {
        messageContent.push({ type: "text", text: textContent });
      }
    } else {
      messageContent = textContent;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
      images: displayImages.length > 0 ? displayImages : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setPendingImages([]);
    setIsLoading(true);

    // Create conversation if needed
    let currentConvId = conversationId;
    if (!currentConvId) {
      const firstMessageText = textContent || "Image conversation";
      currentConvId = await createConversation(firstMessageText);
      if (currentConvId) {
        setConversationId(currentConvId);
      }
    }

    // Save user message
    if (currentConvId) {
      await saveMessage(currentConvId, "user", messageContent, displayImages);
    }

    try {
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: model.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (response.status === 402) {
          throw new Error("Credits required. Please add credits to continue.");
        }
        throw new Error(errorData?.error || `Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let assistantContent = "";
      const assistantId = crypto.randomUUID();
      
      setMessages(prev => [...prev, {
        id: assistantId,
        role: "assistant",
        content: "",
        model: model.name,
        timestamp: new Date(),
      }]);

      if (reader) {
        let buffer = "";
        
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
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantContent += content;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }
            } catch {
              // Incomplete JSON
            }
          }
        }
      }

      // Save assistant message
      if (currentConvId && assistantContent) {
        await saveMessage(currentConvId, "assistant", assistantContent);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Chat failed",
        description: error.message || "Something went wrong.",
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = async () => {
    if (conversationId) {
      try {
        await supabase.from("conversations").delete().eq("id", conversationId);
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      }
    }
    handleNewConversation();
  };

  const getDisplayContent = (message: Message): string => {
    if (typeof message.content === "string") {
      return message.content;
    }
    const textParts = message.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("\n");
    return textParts;
  };

  return (
    <div 
      className="flex h-[calc(100vh-4rem)]"
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && supportsVision && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-primary bg-primary/5">
            <ImagePlus className="h-12 w-12 text-primary" />
            <p className="text-lg font-medium">Drop images here</p>
            <p className="text-sm text-muted-foreground">Release to upload</p>
          </div>
        </div>
      )}

      {/* Conversation History Sidebar */}
      <ConversationHistory
        currentConversationId={conversationId}
        currentModel={model.id}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-2xl">
              {model.icon}
            </div>
            <div>
              <h1 className="font-semibold text-lg flex items-center gap-2">
                {model.name}
                {model.badge && (
                  <Badge variant="secondary" className="text-xs">{model.badge}</Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {model.description}
                {supportsVision && (
                  <span className="ml-2 text-primary">• Supports images</span>
                )}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">{model.icon}</div>
              <h2 className="text-xl font-semibold mb-2">Chat with {model.name}</h2>
              <p className="text-muted-foreground max-w-md">
                Start a conversation with one of the most advanced AI models. 
                {supportsVision && " You can also share images for visual analysis."}
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-lg">
                {(supportsVision ? [
                  "Analyze this image",
                  "Describe what you see",
                  "Help me brainstorm ideas",
                  "Explain a concept",
                ] : [
                  "Explain quantum computing",
                  "Write a poem about space",
                  "Help me brainstorm ideas",
                  "Summarize a complex topic",
                ]).map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setInput(suggestion)}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isStreamingEmpty = message.role === "assistant" && !getDisplayContent(message);
                
                // Show skeleton for streaming empty assistant message
                if (isStreamingEmpty && isLastMessage && isLoading) {
                  return <ChatMessageSkeleton key={message.id} modelIcon={model.icon} />;
                }
                
                return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-lg">
                        {model.icon}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50"
                    )}
                  >
                    {message.images && message.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Uploaded ${idx + 1}`}
                            className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <div className="text-sm">
                      {message.role === "assistant" ? (
                        getDisplayContent(message) ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              pre: ({ children }) => (
                                <pre className="bg-background/50 rounded-lg p-3 my-2 overflow-x-auto text-xs">
                                  {children}
                                </pre>
                              ),
                              code: ({ className, children, ...props }) => {
                                const isInline = !className;
                                return isInline ? (
                                  <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                    {children}
                                  </code>
                                ) : (
                                  <code className={cn("font-mono", className)} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
                              ),
                              li: ({ children }) => <li className="ml-2">{children}</li>,
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic">
                                  {children}
                                </blockquote>
                              ),
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                                  {children}
                                </a>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-2">
                                  <table className="min-w-full border border-border/50 text-xs">{children}</table>
                                </div>
                              ),
                              th: ({ children }) => (
                                <th className="border border-border/50 px-2 py-1 bg-secondary/30 font-medium">{children}</th>
                              ),
                              td: ({ children }) => (
                                <td className="border border-border/50 px-2 py-1">{children}</td>
                              ),
                            }}
                          >
                            {getDisplayContent(message)}
                          </ReactMarkdown>
                        ) : null
                      ) : (
                        <span className="whitespace-pre-wrap break-words">
                          {getDisplayContent(message) || <Loader2 className="h-4 w-4 animate-spin" />}
                        </span>
                      )}
                    </div>
                    {message.role === "assistant" && getDisplayContent(message) && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => copyToClipboard(getDisplayContent(message), message.id)}
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        {message.model && (
                          <span className="text-xs text-muted-foreground">
                            {message.model}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Pending Images Preview */}
        {pendingImages.length > 0 && (
          <div className="px-4 py-2 border-t border-border/50 bg-secondary/30">
            <div className="flex flex-wrap gap-2">
              {pendingImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`Pending ${idx + 1}`}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => removePendingImage(idx)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            {supportsVision && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </Button>
              </>
            )}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={supportsVision 
                ? `Message ${model.name} or share an image...` 
                : `Message ${model.name}...`
              }
              className="min-h-[48px] max-h-[200px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
              size="icon"
              className="h-12 w-12 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatToolLayout;
