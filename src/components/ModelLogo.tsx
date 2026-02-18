import { cn } from "@/lib/utils";

// Import actual logo files
import openaiLogo from "@/assets/logos/openai.svg";
import geminiLogo from "@/assets/logos/gemini.svg";
import xLogo from "@/assets/logos/x-logo.svg";
import metaLlamaLogo from "@/assets/logos/meta-llama.svg";
import deepseekLogo from "@/assets/logos/deepseek.png";
import anthropicLogo from "@/assets/logos/anthropic.svg";

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
  "grok-3": { logo: xLogo, bgColor: "bg-secondary", invert: true },
  "grok-3-mini": { logo: xLogo, bgColor: "bg-secondary", invert: true },
  
  // ChatGPT/OpenAI models - OpenAI logo
  "chatgpt-5.2": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  "chatgpt-5": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  "chatgpt-5-mini": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  
  // Gemini models - Google Gemini logo (has its own colors)
  "gemini-3-pro": { logo: geminiLogo, bgColor: "bg-secondary", invert: false },
  "gemini-3-flash": { logo: geminiLogo, bgColor: "bg-secondary", invert: false },
  "gemini-2.5-pro": { logo: geminiLogo, bgColor: "bg-secondary", invert: false },
  
  // DeepSeek models
  "deepseek-r1": { logo: deepseekLogo, bgColor: "bg-secondary", invert: false },
  "deepseek-v3": { logo: deepseekLogo, bgColor: "bg-secondary", invert: false },
  
  // Anthropic/Claude models
  "claude-opus-4": { logo: anthropicLogo, bgColor: "bg-secondary", invert: true },
  "claude-sonnet-4": { logo: anthropicLogo, bgColor: "bg-secondary", invert: true },
  "claude-haiku-4": { logo: anthropicLogo, bgColor: "bg-secondary", invert: true },

  // Llama/Meta models
  "llama-3.3": { logo: metaLlamaLogo, bgColor: "bg-secondary", invert: true },
  "llama-3.3-large": { logo: metaLlamaLogo, bgColor: "bg-secondary", invert: true },
};

const ModelLogo = ({ modelId, size = "md", className }: ModelLogoProps) => {
  const config = MODEL_CONFIG[modelId] || { logo: openaiLogo, bgColor: "bg-secondary", invert: true };
  const { logo, bgColor, invert } = config;
  
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
          invert && "brightness-0 invert opacity-80",
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
    "claude-opus-4": "◆",
    "claude-sonnet-4": "◆",
    "claude-haiku-4": "◆",
    "llama-3.3": "🦙",
    "llama-3.3-large": "🦙",
  };
  return emojiMap[modelId] || "◯";
};

export default ModelLogo;
