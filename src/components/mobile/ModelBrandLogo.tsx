import { cn } from "@/lib/utils";

// Import actual logo files
import openaiLogo from "@/assets/logos/openai.svg";
import geminiLogo from "@/assets/logos/gemini.svg";
import googleGeminiLogo from "@/assets/logos/google-gemini.svg";
import xLogo from "@/assets/logos/x-logo.svg";
import metaLlamaLogo from "@/assets/logos/meta-llama.svg";
import deepseekLogo from "@/assets/logos/deepseek.png";
import anthropicLogo from "@/assets/logos/anthropic.svg";
import klingLogo from "@/assets/logos/kling.png";
import wanLogo from "@/assets/logos/wan.png";
import lumaLogo from "@/assets/logos/luma.png";
import hailuoLogo from "@/assets/logos/hailuo.png";
import seedanceLogo from "@/assets/logos/seedance.webp";
import hunyuanLogo from "@/assets/logos/hunyuan.png";
import runwayLogo from "@/assets/logos/runway.png";

interface ModelBrandLogoProps {
  modelId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

// Model configurations with actual logos
type LogoConfig = {
  logo?: string;
  bgColor: string;
  invert?: boolean;
  textLogo?: string;
  gradient?: string;
};

const MODEL_CONFIG: Record<string, LogoConfig> = {
  // === IMAGE MODELS ===
  // Nano Banana (Lovable AI)
  "nano-banana": { textLogo: "🍌", bgColor: "bg-amber-500/20", gradient: "from-amber-500 to-yellow-500" },
  "nano-banana-pro": { textLogo: "🍌", bgColor: "bg-amber-500/20", gradient: "from-amber-500 to-yellow-500" },
  
  // FLUX models (Black Forest Labs)
  "flux-1.1-pro": { textLogo: "F", bgColor: "bg-violet-500/20", gradient: "from-violet-600 to-purple-500" },
  "flux-pro": { textLogo: "F", bgColor: "bg-violet-500/20", gradient: "from-violet-600 to-purple-500" },
  "flux-schnell": { textLogo: "F", bgColor: "bg-violet-500/20", gradient: "from-violet-600 to-purple-500" },
  "flux-realism": { textLogo: "F", bgColor: "bg-violet-500/20", gradient: "from-violet-600 to-purple-500" },
  
  // Ideogram
  "ideogram-v2": { textLogo: "I", bgColor: "bg-pink-500/20", gradient: "from-pink-500 to-rose-500" },
  "ideogram-v3": { textLogo: "I", bgColor: "bg-pink-500/20", gradient: "from-pink-500 to-rose-500" },
  
  // Midjourney
  "midjourney-v6": { textLogo: "Mj", bgColor: "bg-blue-500/20", gradient: "from-blue-500 to-cyan-500" },
  "midjourney": { textLogo: "Mj", bgColor: "bg-blue-500/20", gradient: "from-blue-500 to-cyan-500" },
  
  // Recraft
  "recraft-v3": { textLogo: "R", bgColor: "bg-emerald-500/20", gradient: "from-emerald-500 to-teal-500" },
  
  // Stable Diffusion
  "sd-ultra": { textLogo: "SD", bgColor: "bg-orange-500/20", gradient: "from-orange-500 to-amber-500" },
  "sd-3.5": { textLogo: "SD", bgColor: "bg-orange-500/20", gradient: "from-orange-500 to-amber-500" },
  
  // Imagen (Google)
  "imagen-4": { logo: googleGeminiLogo, bgColor: "bg-blue-500/20", invert: false },

  // === VIDEO MODELS ===
  // Kling (Kuaishou)
  "kling-2.6": { logo: klingLogo, bgColor: "bg-secondary" },
  "kling-3.0": { logo: klingLogo, bgColor: "bg-secondary" },
  "kling-2.1": { logo: klingLogo, bgColor: "bg-secondary" },
  "kie-kling": { logo: klingLogo, bgColor: "bg-secondary" },
  
  // Wan (Alibaba)
  "wan-2.6": { logo: wanLogo, bgColor: "bg-secondary" },
  "wan-2.1": { logo: wanLogo, bgColor: "bg-secondary" },
  "kie-wan": { logo: wanLogo, bgColor: "bg-secondary" },
  
  // Veo (Google)
  "veo-3": { logo: googleGeminiLogo, bgColor: "bg-blue-500/20", invert: false },
  "veo-3-fast": { logo: googleGeminiLogo, bgColor: "bg-blue-500/20", invert: false },
  "kie-veo31": { logo: googleGeminiLogo, bgColor: "bg-blue-500/20", invert: false },
  "kie-veo31-fast": { logo: googleGeminiLogo, bgColor: "bg-blue-500/20", invert: false },
  
  // Sora (OpenAI)
  "sora": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  "sora-2": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  "kie-sora2": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  "kie-sora2-pro": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  
  // Luma
  "luma": { logo: lumaLogo, bgColor: "bg-secondary" },
  "kie-luma": { logo: lumaLogo, bgColor: "bg-secondary" },
  
  // Hailuo (MiniMax)
  "hailuo-02": { logo: hailuoLogo, bgColor: "bg-secondary" },
  "kie-hailuo": { logo: hailuoLogo, bgColor: "bg-secondary" },
  "kie-hailuo-2.3": { logo: hailuoLogo, bgColor: "bg-secondary" },
  
  // Seedance (ByteDance)
  "seedance-1.5": { logo: seedanceLogo, bgColor: "bg-secondary" },
  "seedance-pro": { logo: seedanceLogo, bgColor: "bg-secondary" },
  "kie-seedance": { logo: seedanceLogo, bgColor: "bg-secondary" },
  
  // Hunyuan (Tencent)
  "hunyuan-1.5": { logo: hunyuanLogo, bgColor: "bg-secondary" },
  "kie-hunyuan": { logo: hunyuanLogo, bgColor: "bg-secondary" },
  
  // Runway
  "runway": { logo: runwayLogo, bgColor: "bg-secondary" },
  "kie-runway": { logo: runwayLogo, bgColor: "bg-secondary" },
  "kie-runway-i2v": { logo: runwayLogo, bgColor: "bg-secondary" },

  // Grok Imagine (xAI)
  "kie-grok": { logo: xLogo, bgColor: "bg-secondary", invert: true },
  "grok-image": { logo: xLogo, bgColor: "bg-secondary", invert: true },

  // === CHAT MODELS ===
  // Grok/xAI
  "grok-3": { logo: xLogo, bgColor: "bg-secondary", invert: true },
  "grok-3-mini": { logo: xLogo, bgColor: "bg-secondary", invert: true },
  
  // ChatGPT/OpenAI
  "chatgpt-5.2": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  "chatgpt-5": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  "chatgpt-5-mini": { logo: openaiLogo, bgColor: "bg-secondary", invert: true },
  
  // Gemini (Google)
  "gemini-3-pro": { logo: geminiLogo, bgColor: "bg-secondary", invert: false },
  "gemini-3-flash": { logo: geminiLogo, bgColor: "bg-secondary", invert: false },
  "gemini-2.5-pro": { logo: geminiLogo, bgColor: "bg-secondary", invert: false },
  
  // DeepSeek
  "deepseek-r1": { logo: deepseekLogo, bgColor: "bg-blue-500/20", invert: false },
  "deepseek-v3": { logo: deepseekLogo, bgColor: "bg-blue-500/20", invert: false },
  
  // Llama (Meta)
  "llama-3.3": { logo: metaLlamaLogo, bgColor: "bg-secondary", invert: true },
  "llama-3.3-large": { logo: metaLlamaLogo, bgColor: "bg-secondary", invert: true },

  // Claude (Anthropic)
  "claude-opus-4": { logo: anthropicLogo, bgColor: "bg-secondary", invert: true },
  "claude-sonnet-4": { logo: anthropicLogo, bgColor: "bg-secondary", invert: true },
  "claude-haiku-4": { logo: anthropicLogo, bgColor: "bg-secondary", invert: true },
};

// Fallback config
const DEFAULT_CONFIG: LogoConfig = { 
  textLogo: "AI", 
  bgColor: "bg-secondary", 
  gradient: "from-primary to-primary/80" 
};

export function ModelBrandLogo({ modelId, size = "md", className }: ModelBrandLogoProps) {
  const config = MODEL_CONFIG[modelId] || DEFAULT_CONFIG;
  const { logo, bgColor, invert, textLogo, gradient } = config;
  
  // If we have an actual logo file
  if (logo) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl shrink-0",
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
  }
  
  // Text-based logo with gradient
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl shrink-0",
        gradient ? `bg-gradient-to-br ${gradient}` : bgColor,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn(
        "font-bold text-white",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-base"
      )}>
        {textLogo}
      </span>
    </div>
  );
}

export default ModelBrandLogo;
