import { useState } from "react";
import { 
  Home, 
  Sparkles, 
  MessageSquare, 
  Library, 
  User,
  Image,
  Video,
  Music,
  Clapperboard,
  ChevronRight,
  Zap,
  Crown,
  Settings,
  Bell,
  Search,
  Plus,
  Send,
  Mic,
  Camera,
  X,
  ArrowLeft,
  Heart,
  Download,
  Share2,
  MoreVertical,
  Play,
  Grid3X3
} from "lucide-react";
import { cn } from "@/lib/utils";

type Screen = "home" | "create" | "chat" | "library" | "profile" | "image" | "video";

export default function MobilePreview() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [credits] = useState(525);

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen onNavigate={setCurrentScreen} credits={credits} />;
      case "create":
        return <CreateScreen onNavigate={setCurrentScreen} />;
      case "image":
        return <ImageCreateScreen onBack={() => setCurrentScreen("create")} />;
      case "video":
        return <VideoCreateScreen onBack={() => setCurrentScreen("create")} />;
      case "chat":
        return <ChatScreen />;
      case "library":
        return <LibraryScreen />;
      case "profile":
        return <ProfileScreen credits={credits} />;
      default:
        return <HomeScreen onNavigate={setCurrentScreen} credits={credits} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center mb-4 absolute top-4 left-1/2 -translate-x-1/2">
        <h1 className="text-2xl font-bold text-foreground">Flutter App Preview</h1>
        <p className="text-muted-foreground text-sm">This is how your mobile app will look</p>
      </div>
      
      {/* Phone Frame */}
      <div className="relative">
        {/* Phone Bezel */}
        <div className="w-[375px] h-[812px] bg-black rounded-[50px] p-3 shadow-2xl">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-50" />
          
          {/* Screen */}
          <div className="w-full h-full bg-[#0a0a0f] rounded-[40px] overflow-hidden relative">
            {/* Status Bar */}
            <div className="h-12 px-6 flex items-center justify-between text-white text-xs pt-2">
              <span className="font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 border border-white rounded-sm">
                  <div className="w-3/4 h-full bg-white rounded-sm" />
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="h-[calc(100%-48px-80px)] overflow-y-auto">
              {renderScreen()}
            </div>
            
            {/* Bottom Navigation */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#111118] border-t border-white/10">
              <div className="flex items-center justify-around h-full px-2 pb-4">
                <NavItem 
                  icon={Home} 
                  label="Home" 
                  active={currentScreen === "home"}
                  onClick={() => setCurrentScreen("home")}
                />
                <NavItem 
                  icon={Sparkles} 
                  label="Create" 
                  active={currentScreen === "create" || currentScreen === "image" || currentScreen === "video"}
                  onClick={() => setCurrentScreen("create")}
                />
                <NavItem 
                  icon={MessageSquare} 
                  label="Chat" 
                  active={currentScreen === "chat"}
                  onClick={() => setCurrentScreen("chat")}
                />
                <NavItem 
                  icon={Library} 
                  label="Library" 
                  active={currentScreen === "library"}
                  onClick={() => setCurrentScreen("library")}
                />
                <NavItem 
                  icon={User} 
                  label="Profile" 
                  active={currentScreen === "profile"}
                  onClick={() => setCurrentScreen("profile")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
        active ? "text-purple-400" : "text-gray-500"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function HomeScreen({ onNavigate, credits }: { onNavigate: (screen: Screen) => void; credits: number }) {
  return (
    <div className="px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-bold">Timeless AI</h1>
          <p className="text-gray-400 text-xs">Create anything with AI</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-purple-500/20 px-3 py-1.5 rounded-full">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-300 text-xs font-semibold">{credits}</span>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-white text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon={Image} label="Image" color="bg-blue-500" onClick={() => onNavigate("image")} />
          <QuickAction icon={Video} label="Video" color="bg-purple-500" onClick={() => onNavigate("video")} />
          <QuickAction icon={Music} label="Music" color="bg-pink-500" />
          <QuickAction icon={Clapperboard} label="Cinema" color="bg-orange-500" />
        </div>
      </div>

      {/* Pro Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">Upgrade to Pro</h3>
            <p className="text-white/70 text-xs">Unlimited generations & more</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-sm font-semibold">Recent Creations</h2>
          <button className="text-purple-400 text-xs">See all</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="aspect-square rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/50 text-xs">Sample Image</span>
            </div>
          </div>
          <div className="aspect-square rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-white/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ 
  icon: Icon, 
  label, 
  color,
  onClick 
}: { 
  icon: any; 
  label: string; 
  color: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-gray-300 text-xs">{label}</span>
    </button>
  );
}

function CreateScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="px-4 py-2">
      <h1 className="text-white text-xl font-bold mb-2">Create</h1>
      <p className="text-gray-400 text-sm mb-6">What would you like to create?</p>

      <div className="space-y-3">
        <CreateOption 
          icon={Image} 
          title="Image" 
          description="Generate stunning images with AI"
          color="bg-blue-500"
          onClick={() => onNavigate("image")}
        />
        <CreateOption 
          icon={Video} 
          title="Video" 
          description="Create cinematic videos"
          color="bg-purple-500"
          onClick={() => onNavigate("video")}
        />
        <CreateOption 
          icon={Music} 
          title="Music" 
          description="Compose music and audio"
          color="bg-pink-500"
        />
        <CreateOption 
          icon={Clapperboard} 
          title="Cinema Studio" 
          description="Professional video editing"
          color="bg-orange-500"
        />
        <CreateOption 
          icon={Grid3X3} 
          title="AI Apps" 
          description="Specialized AI tools"
          color="bg-green-500"
        />
      </div>
    </div>
  );
}

function CreateOption({ 
  icon: Icon, 
  title, 
  description, 
  color,
  onClick 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  color: string;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 text-left">
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-gray-400 text-xs">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}

function ImageCreateScreen({ onBack }: { onBack: () => void }) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white text-lg font-semibold">Create Image</h1>
      </div>

      {/* Preview Area */}
      <div className="flex-1 px-4 py-4">
        <div className="aspect-square bg-white/5 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center">
          <Image className="w-12 h-12 text-gray-500 mb-3" />
          <p className="text-gray-400 text-sm">Your image will appear here</p>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4">
        {/* Model Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button className="px-3 py-1.5 bg-purple-500 rounded-full text-white text-xs whitespace-nowrap">
            Nano Banana
          </button>
          <button className="px-3 py-1.5 bg-white/10 rounded-full text-gray-300 text-xs whitespace-nowrap">
            FLUX Pro
          </button>
          <button className="px-3 py-1.5 bg-white/10 rounded-full text-gray-300 text-xs whitespace-nowrap">
            Ideogram
          </button>
        </div>

        {/* Aspect Ratio */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">Ratio:</span>
          <button className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs">1:1</button>
          <button className="px-2 py-1 bg-white/10 rounded text-gray-400 text-xs">16:9</button>
          <button className="px-2 py-1 bg-white/10 rounded text-gray-400 text-xs">9:16</button>
        </div>

        {/* Prompt Input */}
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your image..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 outline-none"
          />
          <button className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoCreateScreen({ onBack }: { onBack: () => void }) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white text-lg font-semibold">Create Video</h1>
      </div>

      {/* Preview Area */}
      <div className="flex-1 px-4 py-4">
        <div className="aspect-video bg-white/5 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center">
          <Video className="w-12 h-12 text-gray-500 mb-3" />
          <p className="text-gray-400 text-sm">Your video will appear here</p>
          <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
            <Camera className="w-4 h-4 text-gray-300" />
            <span className="text-gray-300 text-xs">Add reference</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4">
        {/* Model Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button className="px-3 py-1.5 bg-purple-500 rounded-full text-white text-xs whitespace-nowrap">
            Kling 2.1
          </button>
          <button className="px-3 py-1.5 bg-white/10 rounded-full text-gray-300 text-xs whitespace-nowrap">
            Wan 2.1
          </button>
          <button className="px-3 py-1.5 bg-white/10 rounded-full text-gray-300 text-xs whitespace-nowrap">
            Sora
          </button>
        </div>

        {/* Settings Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">Ratio:</span>
            <button className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs">16:9</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">Quality:</span>
            <button className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs">1080p</button>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 outline-none"
          />
          <button className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatScreen() {
  const [message, setMessage] = useState("");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-white/10">
        <div>
          <h1 className="text-white text-lg font-semibold">AI Chat</h1>
          <p className="text-gray-400 text-xs">GPT-4o</p>
        </div>
        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="flex justify-end">
          <div className="bg-purple-500 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
            <p className="text-white text-sm">Hello! Can you help me write a poem?</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
            <p className="text-gray-200 text-sm">Of course! I'd love to help you write a poem. What theme or subject would you like to explore?</p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="p-4">
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-3">
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Mic className="w-4 h-4 text-gray-400" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 outline-none"
          />
          <button className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LibraryScreen() {
  return (
    <div className="px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-xl font-bold">Library</h1>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Search className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button className="px-4 py-2 bg-purple-500 rounded-full text-white text-sm">All</button>
        <button className="px-4 py-2 bg-white/10 rounded-full text-gray-300 text-sm">Images</button>
        <button className="px-4 py-2 bg-white/10 rounded-full text-gray-300 text-sm">Videos</button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-purple-500/50 to-blue-500/50 overflow-hidden relative">
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                  {i % 2 === 0 ? "Video" : "Image"}
                </span>
                <button className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                  <Heart className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen({ credits }: { credits: number }) {
  return (
    <div className="px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-xl font-bold">Profile</h1>
        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Settings className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* User Card */}
      <div className="bg-white/5 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-xl font-bold">T</span>
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold">Timelessthirteen</h2>
            <p className="text-gray-400 text-sm">timelessthirteen@gmail.com</p>
            <div className="flex items-center gap-2 mt-1">
              <Crown className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-medium">Pro Member</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="bg-gradient-to-r from-purple-600/50 to-pink-600/50 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-xs">Available Credits</p>
            <p className="text-white text-2xl font-bold">{credits}</p>
          </div>
          <button className="px-4 py-2 bg-white rounded-full">
            <span className="text-purple-600 text-sm font-semibold">Add Credits</span>
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        <ProfileMenuItem icon={Crown} label="Subscription" />
        <ProfileMenuItem icon={Download} label="Downloads" />
        <ProfileMenuItem icon={Heart} label="Favorites" />
        <ProfileMenuItem icon={Share2} label="Share App" />
        <ProfileMenuItem icon={Settings} label="Settings" />
      </div>
    </div>
  );
}

function ProfileMenuItem({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
      <Icon className="w-5 h-5 text-gray-400" />
      <span className="text-white flex-1 text-left">{label}</span>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}
