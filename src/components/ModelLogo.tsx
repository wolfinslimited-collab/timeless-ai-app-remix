import { cn } from "@/lib/utils";

interface ModelLogoProps {
  modelId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Model logo configurations with distinct visual styles
const MODEL_LOGOS: Record<string, { emoji: string; bgColor: string; textColor?: string }> = {
  // Grok models - Blue robot theme
  "grok-3": { emoji: "🤖", bgColor: "bg-blue-500/20" },
  "grok-3-mini": { emoji: "⚡", bgColor: "bg-amber-500/20" },
  
  // ChatGPT/OpenAI models - Green/Teal theme
  "chatgpt-5.2": { emoji: "💬", bgColor: "bg-emerald-500/20" },
  "chatgpt-5": { emoji: "🧠", bgColor: "bg-pink-500/20" },
  "chatgpt-5-mini": { emoji: "🚀", bgColor: "bg-orange-500/20" },
  
  // Gemini models - Blue/Purple theme
  "gemini-3-pro": { emoji: "✨", bgColor: "bg-indigo-500/20" },
  "gemini-3-flash": { emoji: "⚡", bgColor: "bg-yellow-500/20" },
  "gemini-2.5-pro": { emoji: "🌟", bgColor: "bg-amber-500/20" },
  
  // DeepSeek models - Tech blue theme
  "deepseek-r1": { emoji: "🔬", bgColor: "bg-cyan-500/20" },
  "deepseek-v3": { emoji: "🎯", bgColor: "bg-red-500/20" },
  
  // Llama models - Orange/Brown theme
  "llama-3.3": { emoji: "🦙", bgColor: "bg-amber-600/20" },
  "llama-3.3-large": { emoji: "🦙", bgColor: "bg-amber-600/20" },
};

const sizeClasses = {
  sm: "h-6 w-6 text-sm",
  md: "h-8 w-8 text-lg",
  lg: "h-10 w-10 text-xl",
};

const ModelLogo = ({ modelId, size = "md", className }: ModelLogoProps) => {
  const config = MODEL_LOGOS[modelId] || { emoji: "🤖", bgColor: "bg-primary/10" };
  
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl shrink-0",
        config.bgColor,
        sizeClasses[size],
        className
      )}
    >
      {config.emoji}
    </div>
  );
};

export const getModelEmoji = (modelId: string): string => {
  return MODEL_LOGOS[modelId]?.emoji || "🤖";
};

export default ModelLogo;
