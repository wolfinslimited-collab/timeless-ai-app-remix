import { cn } from "@/lib/utils";

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

// OpenAI Logo SVG
const OpenAILogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

// Google Gemini Logo SVG
const GeminiLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 24C12 24 12 12 24 12C12 12 12 0 12 0C12 0 12 12 0 12C12 12 12 24 12 24Z" fill="url(#gemini-gradient)" />
    <defs>
      <linearGradient id="gemini-gradient" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4" />
        <stop offset="0.5" stopColor="#9B72CB" />
        <stop offset="1" stopColor="#D96570" />
      </linearGradient>
    </defs>
  </svg>
);

// xAI/Grok Logo SVG
const GrokLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M2.04 5.02L10.32 12L2.04 18.98L3.96 21.02L12 14L20.04 21.02L21.96 18.98L13.68 12L21.96 5.02L20.04 2.98L12 10L3.96 2.98L2.04 5.02Z" />
  </svg>
);

// Meta/Llama Logo SVG
const MetaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a4.892 4.892 0 0 0 1.12 2.068c.541.563 1.208.862 1.965.862 1.116 0 2.09-.453 2.996-1.238.898-.777 1.74-1.833 2.543-3.116.695-1.11 1.326-2.376 1.91-3.793l.158-.393.163.395c.585 1.418 1.217 2.685 1.913 3.796.803 1.282 1.646 2.337 2.546 3.114.907.784 1.882 1.236 2.998 1.236.757 0 1.424-.299 1.965-.862.547-.57.9-1.29 1.12-2.069a8.794 8.794 0 0 0 .21-1.972c0-2.567-.706-5.24-2.048-7.305C18.768 5.31 17.052 4.03 15.085 4.03c-1.163 0-2.153.461-3.058 1.257-.886.78-1.71 1.842-2.49 3.115a33.75 33.75 0 0 0-.539.908 33.99 33.99 0 0 0-.538-.907c-.78-1.273-1.604-2.335-2.49-3.115-.905-.796-1.895-1.257-3.058-1.257h.003zm0 1.975c.658 0 1.295.298 1.972.934.684.642 1.354 1.586 2.018 2.73.706 1.216 1.31 2.53 1.84 3.882.329.842.623 1.682.892 2.512-.292.32-.59.608-.893.86-.863.723-1.71 1.08-2.534 1.08-.417 0-.766-.133-1.052-.398a3.073 3.073 0 0 1-.737-1.28 7.2 7.2 0 0 1-.15-1.478c0-2.166.583-4.492 1.676-6.27.267-.434.549-.823.848-1.163.163-.185.332-.354.507-.505.092-.08.187-.154.284-.221a1.613 1.613 0 0 1-.67-.683zm8.166 0c-.229.052-.447.137-.664.248-.094.048-.187.1-.28.156-.175.103-.348.224-.518.363-.3.245-.596.538-.887.877-.573.669-1.116 1.512-1.612 2.49-.952 1.874-1.5 4.138-1.5 6.23 0 .53.043 1.024.128 1.477a3.07 3.07 0 0 1-.154-.477 5.029 5.029 0 0 1-.108-.637c-.038-.348-.055-.714-.055-1.093 0-2.086.551-4.33 1.514-6.197.498-.966 1.045-1.8 1.622-2.463.292-.336.59-.625.892-.864a5.07 5.07 0 0 1 .518-.363c.093-.056.187-.108.281-.156.217-.111.435-.196.664-.248l.159-.031z" />
  </svg>
);

// DeepSeek Logo SVG
const DeepSeekLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm6 8h-2v-4h-2v4h-2v-6h6v6z" />
  </svg>
);

// Model configurations
const MODEL_CONFIG: Record<string, { 
  Logo: React.FC<{ className?: string }>; 
  bgColor: string;
  iconColor: string;
}> = {
  // Grok/xAI models
  "grok-3": { Logo: GrokLogo, bgColor: "bg-white", iconColor: "text-black" },
  "grok-3-mini": { Logo: GrokLogo, bgColor: "bg-white", iconColor: "text-black" },
  
  // ChatGPT/OpenAI models
  "chatgpt-5.2": { Logo: OpenAILogo, bgColor: "bg-[#10a37f]/10", iconColor: "text-[#10a37f]" },
  "chatgpt-5": { Logo: OpenAILogo, bgColor: "bg-[#10a37f]/10", iconColor: "text-[#10a37f]" },
  "chatgpt-5-mini": { Logo: OpenAILogo, bgColor: "bg-[#10a37f]/10", iconColor: "text-[#10a37f]" },
  
  // Gemini models
  "gemini-3-pro": { Logo: GeminiLogo, bgColor: "bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10", iconColor: "" },
  "gemini-3-flash": { Logo: GeminiLogo, bgColor: "bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10", iconColor: "" },
  "gemini-2.5-pro": { Logo: GeminiLogo, bgColor: "bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10", iconColor: "" },
  
  // DeepSeek models
  "deepseek-r1": { Logo: DeepSeekLogo, bgColor: "bg-blue-500/10", iconColor: "text-blue-500" },
  "deepseek-v3": { Logo: DeepSeekLogo, bgColor: "bg-blue-500/10", iconColor: "text-blue-500" },
  
  // Llama/Meta models
  "llama-3.3": { Logo: MetaLogo, bgColor: "bg-blue-600/10", iconColor: "text-blue-600" },
  "llama-3.3-large": { Logo: MetaLogo, bgColor: "bg-blue-600/10", iconColor: "text-blue-600" },
};

const ModelLogo = ({ modelId, size = "md", className }: ModelLogoProps) => {
  const config = MODEL_CONFIG[modelId] || { Logo: OpenAILogo, bgColor: "bg-primary/10", iconColor: "text-primary" };
  const { Logo, bgColor, iconColor } = config;
  
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl shrink-0",
        bgColor,
        sizeClasses[size],
        className
      )}
    >
      <Logo className={cn(iconSizeClasses[size], iconColor)} />
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
