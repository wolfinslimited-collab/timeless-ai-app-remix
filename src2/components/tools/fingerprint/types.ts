export interface SocialProfile {
  platform: string;
  name: string;
  username?: string;
  url: string;
  description?: string;
  confidence?: "High" | "Medium" | "Low";
}

export interface SearchResult {
  summary: string;
  profiles: SocialProfile[];
  sources: string[];
}

export interface FingerprintSearch {
  id: string;
  user_id: string;
  search_query: string | null;
  search_mode: "text" | "image";
  image_url: string | null;
  additional_info: string | null;
  summary: string | null;
  profiles: SocialProfile[];
  sources: string[];
  credits_used: number;
  created_at: string;
}

export const PLATFORM_ICONS: Record<string, { icon: string; color: string }> = {
  instagram: { icon: "📷", color: "from-pink-500 to-purple-500" },
  linkedin: { icon: "💼", color: "from-blue-600 to-blue-700" },
  twitter: { icon: "🐦", color: "from-sky-400 to-sky-500" },
  x: { icon: "✖️", color: "from-gray-800 to-black" },
  facebook: { icon: "👤", color: "from-blue-500 to-blue-600" },
  tiktok: { icon: "🎵", color: "from-gray-900 to-pink-500" },
  youtube: { icon: "▶️", color: "from-red-500 to-red-600" },
  github: { icon: "💻", color: "from-gray-700 to-gray-800" },
  bumble: { icon: "🐝", color: "from-yellow-400 to-yellow-500" },
  tinder: { icon: "🔥", color: "from-orange-500 to-pink-500" },
  snapchat: { icon: "👻", color: "from-yellow-300 to-yellow-400" },
  pinterest: { icon: "📌", color: "from-red-500 to-red-600" },
  reddit: { icon: "🤖", color: "from-orange-500 to-orange-600" },
  default: { icon: "🔗", color: "from-gray-500 to-gray-600" },
};

export const TEXT_CREDIT_COST = 2;
export const IMAGE_CREDIT_COST = 3;

export const getConfidenceVariant = (confidence?: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (confidence) {
    case "High": return "default";
    case "Medium": return "secondary";
    case "Low": return "destructive";
    default: return "outline";
  }
};

export const getPlatformStyle = (platform: string) => {
  const key = platform.toLowerCase().replace(/\s+/g, "");
  return PLATFORM_ICONS[key] || PLATFORM_ICONS.default;
};
