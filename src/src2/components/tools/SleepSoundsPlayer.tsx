import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Timer,
  CloudRain,
  Waves,
  TreePine,
  Flame,
  Wind,
  Snowflake,
  Bird,
  Moon,
  Coffee,
  Loader2,
} from "lucide-react";

interface SoundCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  sounds: Sound[];
}

interface Sound {
  id: string;
  name: string;
  description: string;
  url: string;
  duration?: string;
}

// Reliable ambient sounds for sleep and relaxation
const SOUND_CATEGORIES: SoundCategory[] = [
  {
    id: "rain",
    name: "Rain",
    icon: <CloudRain className="h-5 w-5" />,
    sounds: [
      {
        id: "rain-gentle",
        name: "Gentle Rain",
        description: "Soft, steady rainfall for deep relaxation",
        url: "https://cdn.pixabay.com/audio/2022/05/16/audio_58e2fb8c85.mp3",
      },
      {
        id: "rain-thunder",
        name: "Rain & Thunder",
        description: "Rain with soft rumbling thunder",
        url: "https://cdn.pixabay.com/audio/2022/02/14/audio_c9e5c9e5a5.mp3",
      },
      {
        id: "rain-window",
        name: "Rain on Window",
        description: "Cozy rain tapping on glass",
        url: "https://cdn.pixabay.com/audio/2021/09/06/audio_4c14ed59fa.mp3",
      },
    ],
  },
  {
    id: "ocean",
    name: "Ocean",
    icon: <Waves className="h-5 w-5" />,
    sounds: [
      {
        id: "ocean-waves",
        name: "Ocean Waves",
        description: "Gentle waves rolling onto shore",
        url: "https://cdn.pixabay.com/audio/2022/04/27/audio_67bcfc198a.mp3",
      },
      {
        id: "ocean-calm",
        name: "Calm Sea",
        description: "Peaceful ocean ambience",
        url: "https://cdn.pixabay.com/audio/2024/02/14/audio_8e65a0c4af.mp3",
      },
      {
        id: "ocean-beach",
        name: "Beach Ambience",
        description: "Relaxing beach sounds",
        url: "https://cdn.pixabay.com/audio/2022/01/20/audio_86b55e8a3c.mp3",
      },
    ],
  },
  {
    id: "forest",
    name: "Forest",
    icon: <TreePine className="h-5 w-5" />,
    sounds: [
      {
        id: "forest-birds",
        name: "Forest Birds",
        description: "Morning bird songs",
        url: "https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3",
      },
      {
        id: "forest-night",
        name: "Night Forest",
        description: "Crickets and peaceful night sounds",
        url: "https://cdn.pixabay.com/audio/2022/03/23/audio_2e6d56d7a8.mp3",
      },
      {
        id: "forest-stream",
        name: "Forest Stream",
        description: "Babbling brook through trees",
        url: "https://cdn.pixabay.com/audio/2022/03/10/audio_c5e3fae1c7.mp3",
      },
    ],
  },
  {
    id: "fireplace",
    name: "Fireplace",
    icon: <Flame className="h-5 w-5" />,
    sounds: [
      {
        id: "fire-crackling",
        name: "Crackling Fire",
        description: "Warm, cozy fireplace sounds",
        url: "https://cdn.pixabay.com/audio/2022/01/18/audio_3bb4f88ff0.mp3",
      },
      {
        id: "fire-campfire",
        name: "Campfire",
        description: "Outdoor campfire ambience",
        url: "https://cdn.pixabay.com/audio/2021/08/04/audio_8ba3b95c21.mp3",
      },
    ],
  },
  {
    id: "nature",
    name: "Nature",
    icon: <Bird className="h-5 w-5" />,
    sounds: [
      {
        id: "nature-wind",
        name: "Wind",
        description: "Gentle breeze through meadows",
        url: "https://cdn.pixabay.com/audio/2022/02/07/audio_d0c6ff1bab.mp3",
      },
      {
        id: "nature-waterfall",
        name: "Waterfall",
        description: "Peaceful waterfall sounds",
        url: "https://cdn.pixabay.com/audio/2022/01/20/audio_1ff6e87d75.mp3",
      },
      {
        id: "nature-thunder",
        name: "Thunderstorm",
        description: "Distant thunder and rain",
        url: "https://cdn.pixabay.com/audio/2022/06/07/audio_c5d7e8b9e7.mp3",
      },
    ],
  },
  {
    id: "ambient",
    name: "Ambient",
    icon: <Wind className="h-5 w-5" />,
    sounds: [
      {
        id: "ambient-white",
        name: "White Noise",
        description: "Steady white noise for focus",
        url: "https://cdn.pixabay.com/audio/2022/10/30/audio_bb4b5e6d1d.mp3",
      },
      {
        id: "ambient-space",
        name: "Space Ambience",
        description: "Deep space atmosphere",
        url: "https://cdn.pixabay.com/audio/2023/10/21/audio_b3ea4a3dc7.mp3",
      },
      {
        id: "ambient-meditation",
        name: "Meditation",
        description: "Calming meditation tones",
        url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      },
    ],
  },
];

const SLEEP_TIMERS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "∞", minutes: null },
];

const SleepSoundsPlayer = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("rain");
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get sounds for selected category
  const currentCategory = SOUND_CATEGORIES.find(c => c.id === selectedCategory);
  const sounds = currentCategory?.sounds || [];

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => setIsLoading(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleEnded = () => {
      // Loop the audio
      audio.currentTime = 0;
      audio.play().catch(console.error);
    };
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [currentSound]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Handle sleep timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (sleepTimer && isPlaying) {
      setTimeRemaining(sleepTimer * 60);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            // Timer finished - stop playback
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
            clearInterval(timerRef.current!);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeRemaining(null);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sleepTimer, isPlaying]);

  // Play a sound
  const playSound = useCallback(async (sound: Sound) => {
    // If same sound, toggle play/pause
    if (currentSound?.id === sound.id && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // New sound
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(sound.url);
    audio.volume = isMuted ? 0 : volume / 100;
    audio.loop = true;
    audioRef.current = audio;
    
    setCurrentSound(sound);
    setIsLoading(true);

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  }, [currentSound, isPlaying, volume, isMuted]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentSound(null);
    setIsPlaying(false);
    setTimeRemaining(null);
  }, []);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Now Playing Card */}
      {currentSound && (
        <Card className={cn(
          "border overflow-hidden",
          isPlaying 
            ? "border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" 
            : "border-muted"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <Button
                variant="default"
                size="icon"
                className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 flex-shrink-0"
                onClick={() => playSound(currentSound)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6 text-white" />
                ) : (
                  <Play className="h-6 w-6 text-white ml-0.5" />
                )}
              </Button>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{currentSound.name}</h3>
                  {isPlaying && (
                    <Badge variant="outline" className="text-xs bg-indigo-500/20 border-indigo-500/30 text-indigo-400">
                      Playing
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{currentSound.description}</p>
                
                {/* Timer display */}
                {timeRemaining !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    <Timer className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-500">{formatTimeRemaining(timeRemaining)} remaining</span>
                  </div>
                )}
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-2 w-32 hidden sm:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  className="flex-1"
                  onValueChange={([val]) => {
                    setVolume(val);
                    if (val > 0) setIsMuted(false);
                  }}
                />
              </div>

              {/* Stop Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={stopPlayback}
                className="text-muted-foreground hover:text-foreground"
              >
                Stop
              </Button>
            </div>

            {/* Mobile Volume Control */}
            <div className="flex items-center gap-2 mt-4 sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                className="flex-1"
                onValueChange={([val]) => {
                  setVolume(val);
                  if (val > 0) setIsMuted(false);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sleep Timer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-amber-500" />
            Sleep Timer
          </CardTitle>
          <CardDescription>Auto-stop playback after</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SLEEP_TIMERS.map((timer) => (
              <Button
                key={timer.label}
                variant={sleepTimer === timer.minutes ? "default" : "outline"}
                size="sm"
                onClick={() => setSleepTimer(timer.minutes)}
                className={cn(
                  sleepTimer === timer.minutes && "bg-gradient-to-r from-indigo-500 to-purple-500"
                )}
              >
                {timer.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {SOUND_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            className={cn(
              "gap-2 whitespace-nowrap flex-shrink-0",
              selectedCategory === category.id && "bg-gradient-to-r from-indigo-500 to-purple-500"
            )}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.icon}
            {category.name}
          </Button>
        ))}
      </div>

      {/* Sound Grid */}
      <div className="grid gap-3">
        {sounds.map((sound) => {
          const isActive = currentSound?.id === sound.id;
          const isCurrentlyPlaying = isActive && isPlaying;

          return (
            <Card
              key={sound.id}
              className={cn(
                "cursor-pointer transition-all hover:border-indigo-500/50",
                isActive 
                  ? "border-indigo-500/50 bg-indigo-500/5" 
                  : "border-border/50"
              )}
              onClick={() => playSound(sound)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Play Button */}
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                  isCurrentlyPlaying 
                    ? "bg-gradient-to-br from-indigo-500 to-purple-500" 
                    : "bg-muted hover:bg-indigo-500/20"
                )}>
                  {isActive && isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : isCurrentlyPlaying ? (
                    <Pause className="h-4 w-4 text-white" />
                  ) : (
                    <Play className="h-4 w-4 text-indigo-400 ml-0.5" />
                  )}
                </div>

                {/* Sound Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium">{sound.name}</h4>
                  <p className="text-sm text-muted-foreground">{sound.description}</p>
                </div>

                {/* Playing Indicator */}
                {isCurrentlyPlaying && (
                  <div className="flex gap-0.5 items-end h-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-indigo-500 rounded-full animate-pulse"
                        style={{
                          height: `${8 + Math.random() * 8}px`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Moon className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">Sleep Better with Ambient Sounds</p>
              <p className="text-xs text-muted-foreground">
                Research shows that ambient sounds can help mask disruptive noises, 
                reduce anxiety, and create a calming environment that promotes better sleep. 
                Try combining with your bedtime routine for best results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SleepSoundsPlayer;
