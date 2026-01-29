import { cn } from "@/lib/utils";

interface ModelLogoProps {
  modelId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

// Model configurations with letter and color
const MODEL_CONFIG: Record<string, { 
  letter: string; 
  bgColor: string;
}> = {
  // Grok/xAI models
  "grok-3": { letter: "G", bgColor: "bg-secondary" },
  "grok-3-mini": { letter: "G", bgColor: "bg-secondary" },
  
  // ChatGPT/OpenAI models
  "chatgpt-5.2": { letter: "O", bgColor: "bg-green-600" },
  "chatgpt-5": { letter: "O", bgColor: "bg-green-600" },
  "chatgpt-5-mini": { letter: "O", bgColor: "bg-green-600" },
  
  // Gemini models
  "gemini-3-pro": { letter: "G", bgColor: "bg-blue-500" },
  "gemini-3-flash": { letter: "G", bgColor: "bg-blue-500" },
  "gemini-2.5-pro": { letter: "G", bgColor: "bg-blue-500" },
  
  // DeepSeek models
  "deepseek-r1": { letter: "D", bgColor: "bg-secondary" },
  "deepseek-v3": { letter: "D", bgColor: "bg-secondary" },
  
  // Llama/Meta models
  "llama-3.3": { letter: "L", bgColor: "bg-secondary" },
  "llama-3.3-large": { letter: "L", bgColor: "bg-secondary" },
};

const ModelLogo = ({ modelId, size = "md", className }: ModelLogoProps) => {
  const config = MODEL_CONFIG[modelId] || { letter: "A", bgColor: "bg-secondary" };
  const { letter, bgColor } = config;
  
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full shrink-0 font-semibold text-foreground",
        bgColor,
        sizeClasses[size],
        className
      )}
    >
      {letter}
    </div>
  );
};

export const getModelEmoji = (modelId: string): string => {
  // Keeping for backwards compatibility
  const emojiMap: Record<string, string> = {
    "grok-3": "G",
    "grok-3-mini": "G",
    "chatgpt-5.2": "O",
    "chatgpt-5": "O",
    "chatgpt-5-mini": "O",
    "gemini-3-pro": "G",
    "gemini-3-flash": "G",
    "gemini-2.5-pro": "G",
    "deepseek-r1": "D",
    "deepseek-v3": "D",
    "llama-3.3": "L",
    "llama-3.3-large": "L",
  };
  return emojiMap[modelId] || "A";
};

export default ModelLogo;
