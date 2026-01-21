import { cn } from "@/lib/utils";

// Import actual logo files
import openaiLogo from "@/assets/logos/openai.svg";
import geminiLogo from "@/assets/logos/gemini.svg";
import xLogo from "@/assets/logos/x-logo.svg";
import metaLlamaLogo from "@/assets/logos/meta-llama.svg";
import deepseekLogo from "@/assets/logos/deepseek.png";

interface ModelLogoProps {
  modelId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const iconSizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

// Model configurations with actual logos
const MODEL_CONFIG: Record<string, { 
  logo: string; 
  bgColor: string;
  invert?: boolean;
}> = {
  // Grok/xAI models - X logo
  "grok-3": { logo: xLogo, bgColor: "bg-white dark:bg-white", invert: false },
  "grok-3-mini": { logo: xLogo, bgColor: "bg-white dark:bg-white", invert: false },
  
  // ChatGPT/OpenAI models - OpenAI logo
  "chatgpt-5.2": { logo: openaiLogo, bgColor: "bg-black dark:bg-white" },
  "chatgpt-5": { logo: openaiLogo, bgColor: "bg-black dark:bg-white" },
  "chatgpt-5-mini": { logo: openaiLogo, bgColor: "bg-black dark:bg-white" },
  
  // Gemini models - Google Gemini logo
  "gemini-3-pro": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-800" },
  "gemini-3-flash": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-800" },
  "gemini-2.5-pro": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-800" },
  
  // DeepSeek models
  "deepseek-r1": { logo: deepseekLogo, bgColor: "bg-white dark:bg-slate-800" },
  "deepseek-v3": { logo: deepseekLogo, bgColor: "bg-white dark:bg-slate-800" },
  
  // Llama/Meta models
  "llama-3.3": { logo: metaLlamaLogo, bgColor: "bg-gradient-to-r from-blue-500 to-purple-600" },
  "llama-3.3-large": { logo: metaLlamaLogo, bgColor: "bg-gradient-to-r from-blue-500 to-purple-600" },
};

const ModelLogo = ({ modelId, size = "md", className }: ModelLogoProps) => {
  const config = MODEL_CONFIG[modelId] || { logo: openaiLogo, bgColor: "bg-primary/10" };
  const { logo, bgColor } = config;
  
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl shrink-0 p-1.5",
        bgColor,
        sizeClasses[size],
        className
      )}
    >
      <img 
        src={logo} 
        alt={`${modelId} logo`}
        className={cn(
          "object-contain",
          iconSizeClasses[size]
        )}
      />
    </div>
  );
};

export const getModelEmoji = (modelId: string): string => {
  // Keeping for backwards compatibility
  const emojiMap: Record<string, string> = {
    "grok-3": "𝕏",
    "grok-3-mini": "𝕏",
    "chatgpt-5.2": "◯",
    "chatgpt-5": "◯",
    "chatgpt-5-mini": "◯",
    "gemini-3-pro": "✦",
    "gemini-3-flash": "✦",
    "gemini-2.5-pro": "✦",
    "deepseek-r1": "🔍",
    "deepseek-v3": "🔍",
    "llama-3.3": "🦙",
    "llama-3.3-large": "🦙",
  };
  return emojiMap[modelId] || "◯";
};

export default ModelLogo;
