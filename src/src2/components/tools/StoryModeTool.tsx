import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Sparkles,
  X,
  Wand2,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Coins,
  Download,
  Loader2,
  RotateCcw,
  Film,
  Play,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { AddCreditsDialog } from "@/components/AddCreditsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface StoryModeToolProps {
  onBack: () => void;
}

interface SceneInput {
  id: string;
  order: number;
  description: string;
}

// Sortable scene thumbnail for filmstrip
interface SortableSceneThumbnailProps {
  id: string;
  scene: string;
  index: number;
  isSelected: boolean;
  isRegenerating: boolean;
  onSelect: () => void;
  onRegenerate: () => void;
}

const SortableSceneThumbnail: React.FC<SortableSceneThumbnailProps> = ({
  id,
  scene,
  index,
  isSelected,
  isRegenerating,
  onSelect,
  onRegenerate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRegenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerate();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-16 h-12 rounded overflow-hidden border-2 transition-colors relative group",
        isSelected ? "border-primary" : "border-transparent hover:border-primary/50",
        isDragging && "opacity-50 z-50"
      )}
    >
      {isRegenerating ? (
        <div className="w-full h-full bg-secondary/80 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <button
            onClick={onSelect}
            className="w-full h-full"
            {...attributes}
            {...listeners}
          >
            <img src={scene} alt={`Thumb ${index + 1}`} className="w-full h-full object-cover" />
          </button>
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <button
              onClick={handleRegenerateClick}
              className="p-1 rounded bg-background/80 hover:bg-primary/20 transition-colors"
              title="Regenerate this scene"
            >
              <RefreshCw className="h-3 w-3 text-foreground" />
            </button>
            <GripVertical className="h-3 w-3 text-foreground" />
          </div>
        </>
      )}
      <span className="absolute bottom-0.5 right-0.5 text-[10px] bg-background/80 px-1 rounded text-foreground">
        {index + 1}
      </span>
    </div>
  );
};

// Sortable scene input for manual mode
interface SortableSceneInputProps {
  scene: SceneInput;
  onUpdate: (description: string) => void;
}

const SortableSceneInput: React.FC<SortableSceneInputProps> = ({ scene, onUpdate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3",
        isDragging && "opacity-50"
      )}
    >
      <button
        className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0 text-sm font-medium cursor-grab active:cursor-grabbing hover:bg-secondary transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={scene.description}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder={`Write what happens in Scene ${scene.order}`}
        className="flex-1 bg-transparent border-border/50"
      />
    </div>
  );
};

const aspectRatios = [
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
];

const resultCounts = [
  { value: "2", label: "2 results" },
  { value: "4", label: "4 results" },
  { value: "6", label: "6 results" },
];

const CREDIT_COST_PER_SCENE = 8;
const ANIMATE_CREDIT_COST_PER_SCENE = 15;
const StoryModeTool: React.FC<StoryModeToolProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { credits, refetch } = useCredits();
  const { toast } = useToast();
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [autoPrompt, setAutoPrompt] = useState("");
  const [scenes, setScenes] = useState<SceneInput[]>([
    { id: "scene-1", order: 1, description: "" },
    { id: "scene-2", order: 2, description: "" },
    { id: "scene-3", order: 3, description: "" },
    { id: "scene-4", order: 4, description: "" },
  ]);
  const [resultCount, setResultCount] = useState("4");
  const [aspectRatio, setAspectRatio] = useState("3:4");
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [generatedScenes, setGeneratedScenes] = useState<string[]>([]);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate total cost based on mode
  const getTotalCreditCost = () => {
    if (mode === "auto") {
      return CREDIT_COST_PER_SCENE * parseInt(resultCount);
    } else {
      const filledScenes = scenes.filter(s => s.description.trim().length > 0);
      return CREDIT_COST_PER_SCENE * Math.max(filledScenes.length, 1);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const remainingSlots = 4 - referenceImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setReferenceImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateScene = (id: string, description: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === id ? { ...scene, description } : scene
    ));
  };

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for generated scenes filmstrip
  const handleFilmstripDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setGeneratedScenes((items) => {
        const oldIndex = items.findIndex((_, i) => `scene-thumb-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `scene-thumb-${i}` === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update selected index if needed
        if (selectedSceneIndex === oldIndex) {
          setSelectedSceneIndex(newIndex);
        } else if (selectedSceneIndex !== null) {
          if (oldIndex < selectedSceneIndex && newIndex >= selectedSceneIndex) {
            setSelectedSceneIndex(selectedSceneIndex - 1);
          } else if (oldIndex > selectedSceneIndex && newIndex <= selectedSceneIndex) {
            setSelectedSceneIndex(selectedSceneIndex + 1);
          }
        }
        
        return newItems;
      });
    }
  };

  // Handle drag end for manual scene inputs
  const handleScenesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setScenes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order numbers
        return newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
      });
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate storyboards",
        variant: "destructive",
      });
      return;
    }
    
    const totalCost = getTotalCreditCost();
    
    if (credits !== null && credits < totalCost) {
      setShowCreditsDialog(true);
      return;
    }
    
    setIsGenerating(true);
    setGeneratedScenes([]);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No session found");
      }
      
      // Prepare scene prompts based on mode
      let scenePrompts: string[] = [];
      
      if (mode === "auto") {
        // Auto mode: generate variations from a single prompt
        const count = parseInt(resultCount);
        const basePrompt = autoPrompt.trim();
        
        // Create variations of the prompt for each scene
        const variations = [
          "opening establishing shot",
          "key dramatic moment",
          "emotional close-up",
          "action sequence",
          "climactic scene",
          "resolution moment",
        ];
        
        for (let i = 0; i < count; i++) {
          const variation = variations[i % variations.length];
          scenePrompts.push(`${basePrompt} - ${variation}`);
        }
      } else {
        // Manual mode: use user-defined scene descriptions
        scenePrompts = scenes
          .filter(s => s.description.trim().length > 0)
          .map(s => s.description.trim());
      }
      
      if (scenePrompts.length === 0) {
        throw new Error("Please provide at least one scene description");
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-tools`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            tool: "story-mode",
            scenePrompts,
            referenceImages,
            aspectRatio,
            prompt: autoPrompt,
          }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }
      
      if (data.scenes && data.scenes.length > 0) {
        setGeneratedScenes(data.scenes);
        setSelectedSceneIndex(0);
        refetch();
        
        toast({
          title: "Storyboard generated!",
          description: `Created ${data.scenes.length} scenes`,
        });
      } else {
        throw new Error("No scenes generated");
      }
      
    } catch (error) {
      console.error("Story generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateScene = async (sceneIndex: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to regenerate scenes",
        variant: "destructive",
      });
      return;
    }
    
    if (credits !== null && credits < CREDIT_COST_PER_SCENE) {
      setShowCreditsDialog(true);
      return;
    }
    
    setRegeneratingIndex(sceneIndex);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No session found");
      }
      
      // Get the prompt for this scene
      let scenePrompt: string;
      
      if (mode === "auto") {
        const variations = [
          "opening establishing shot",
          "key dramatic moment",
          "emotional close-up",
          "action sequence",
          "climactic scene",
          "resolution moment",
        ];
        const variation = variations[sceneIndex % variations.length];
        scenePrompt = `${autoPrompt.trim()} - ${variation} (alternative take)`;
      } else {
        const filledScenes = scenes.filter(s => s.description.trim().length > 0);
        scenePrompt = filledScenes[sceneIndex]?.description.trim() || `Scene ${sceneIndex + 1}`;
        scenePrompt = `${scenePrompt} (alternative take)`;
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-tools`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            tool: "story-mode",
            scenePrompts: [scenePrompt],
            referenceImages,
            aspectRatio,
            prompt: autoPrompt,
          }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Regeneration failed");
      }
      
      if (data.scenes && data.scenes.length > 0) {
        // Replace just this scene
        setGeneratedScenes(prev => {
          const updated = [...prev];
          updated[sceneIndex] = data.scenes[0];
          return updated;
        });
        refetch();
        
        toast({
          title: "Scene regenerated!",
          description: `Scene ${sceneIndex + 1} has been updated`,
        });
      } else {
        throw new Error("No scene generated");
      }
      
    } catch (error) {
      console.error("Regeneration error:", error);
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `storyboard-scene-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the image",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setGeneratedScenes([]);
    setSelectedSceneIndex(null);
    setAutoPrompt("");
    setScenes([
      { id: "scene-1", order: 1, description: "" },
      { id: "scene-2", order: 2, description: "" },
      { id: "scene-3", order: 3, description: "" },
      { id: "scene-4", order: 4, description: "" },
    ]);
    setReferenceImages([]);
  };

  const handleAnimateToVideo = async () => {
    if (!user || generatedScenes.length === 0) {
      toast({
        title: "No scenes to animate",
        description: "Generate storyboard scenes first",
        variant: "destructive",
      });
      return;
    }
    
    const animateCost = ANIMATE_CREDIT_COST_PER_SCENE * generatedScenes.length;
    
    if (credits !== null && credits < animateCost) {
      setShowCreditsDialog(true);
      return;
    }
    
    setIsAnimating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No session found");
      }
      
      // Prepare scene prompts based on mode
      let prompts: string[] = [];
      if (mode === "auto") {
        const variations = [
          "smooth cinematic motion, opening shot",
          "dynamic movement, dramatic moment",
          "subtle motion, emotional close-up",
          "action sequence with camera movement",
          "climactic scene with dramatic effect",
          "gentle motion, resolution moment",
        ];
        prompts = generatedScenes.map((_, i) => 
          `${autoPrompt} - ${variations[i % variations.length]}`
        );
      } else {
        prompts = scenes
          .filter(s => s.description.trim().length > 0)
          .map(s => `Animate with cinematic motion: ${s.description.trim()}`);
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-tools`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            tool: "story-animate",
            imageUrls: generatedScenes,
            scenePrompts: prompts,
            duration: "5",
          }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Animation failed");
      }
      
      refetch();
      
      toast({
        title: "Animation started!",
        description: `Animating ${generatedScenes.length} scenes. Check Library for results.`,
      });
      
    } catch (error) {
      console.error("Animation error:", error);
      toast({
        title: "Animation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnimating(false);
    }
  };

  const canGenerate = mode === "auto" 
    ? autoPrompt.trim().length > 0 || referenceImages.length > 0
    : scenes.some(s => s.description.trim().length > 0);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">Story Mode</h1>
              <p className="text-[10px] text-muted-foreground">Create visual storyboards</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="h-3.5 w-3.5" />
            <span>{getTotalCreditCost()} credits</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Preview Area */}
        <Card className="border-border/50 bg-card/50 overflow-hidden shrink-0">
          <div className="aspect-video bg-secondary/30 flex items-center justify-center relative">
            {isGenerating ? (
              <div className="text-center space-y-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Generating your storyboard...</p>
              </div>
            ) : isAnimating ? (
              <div className="text-center space-y-3">
                <div className="relative">
                  <Film className="h-12 w-12 text-primary mx-auto" />
                  <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1" />
                </div>
                <p className="text-muted-foreground">Animating {generatedScenes.length} scenes to video...</p>
                <p className="text-xs text-muted-foreground/70">This may take a few minutes. Check Library for results.</p>
              </div>
            ) : generatedScenes.length > 0 ? (
              <>
                {/* Main preview */}
                {selectedSceneIndex !== null && generatedScenes[selectedSceneIndex] && (
                  regeneratingIndex === selectedSceneIndex ? (
                    <div className="text-center space-y-3">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                      <p className="text-muted-foreground">Regenerating scene {selectedSceneIndex + 1}...</p>
                    </div>
                  ) : (
                    <img 
                      src={generatedScenes[selectedSceneIndex]} 
                      alt={`Scene ${selectedSceneIndex + 1}`} 
                      className="w-full h-full object-contain"
                    />
                  )
                )}
                
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 bg-background/80 backdrop-blur-sm gap-1.5"
                    onClick={() => selectedSceneIndex !== null && handleRegenerateScene(selectedSceneIndex)}
                    disabled={regeneratingIndex !== null || isAnimating}
                  >
                    {regeneratingIndex === selectedSceneIndex ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs">Regenerate</span>
                    <span className="text-xs text-muted-foreground">{CREDIT_COST_PER_SCENE}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 bg-background/80 backdrop-blur-sm gap-1.5"
                    onClick={handleAnimateToVideo}
                    disabled={isAnimating || regeneratingIndex !== null}
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span className="text-xs">Animate</span>
                    <span className="text-xs text-muted-foreground">
                      {ANIMATE_CREDIT_COST_PER_SCENE * generatedScenes.length}
                    </span>
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                    onClick={() => selectedSceneIndex !== null && handleDownload(generatedScenes[selectedSceneIndex], selectedSceneIndex)}
                    disabled={regeneratingIndex !== null}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                    onClick={handleReset}
                    disabled={regeneratingIndex !== null}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-secondary/50 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Storyboard Mode</p>
                  <p className="text-xs text-muted-foreground/70">Your generated scenes will appear here</p>
                </div>
              </div>
            )}
            
            {/* Filmstrip overlay */}
            {generatedScenes.length > 0 && !isGenerating && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFilmstripDragEnd}
                >
                  <SortableContext
                    items={generatedScenes.map((_, idx) => `scene-thumb-${idx}`)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex gap-2">
                      {generatedScenes.map((scene, idx) => (
                        <SortableSceneThumbnail
                          key={`scene-thumb-${idx}`}
                          id={`scene-thumb-${idx}`}
                          scene={scene}
                          index={idx}
                          isSelected={selectedSceneIndex === idx}
                          isRegenerating={regeneratingIndex === idx}
                          onSelect={() => setSelectedSceneIndex(idx)}
                          onRegenerate={() => handleRegenerateScene(idx)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <p className="text-[10px] text-center text-muted-foreground mt-1">Drag to reorder</p>
              </div>
            )}
          </div>
        </Card>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-lg md:text-xl font-bold">
            CREATE VISUAL STORIES
          </h2>
          <p className="text-muted-foreground text-xs">
            Plan and visualize your ideas before generation
          </p>
        </div>

        {/* Controls */}
        <Card className="border-border/50 bg-card/50">
          {/* Toggle */}
          <button
            onClick={() => setIsControlsVisible(!isControlsVisible)}
            className="w-full flex items-center justify-between p-4 md:hidden"
          >
            <span className="font-medium">Controls</span>
            {isControlsVisible ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <div className={cn(
            "transition-all duration-200",
            isControlsVisible ? "block" : "hidden md:block"
          )}>
            {/* Tabs */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as "auto" | "manual")} className="w-full">
              <div className="flex items-center justify-between px-4 pt-4 md:pt-4 border-b border-border/50">
                <TabsList className="bg-transparent h-auto p-0 gap-4">
                  <TabsTrigger 
                    value="auto" 
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0"
                  >
                    Auto
                  </TabsTrigger>
                  <TabsTrigger 
                    value="manual"
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0"
                  >
                    Manual
                    <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded">
                      {scenes.filter(s => s.description.trim()).length}
                    </span>
                  </TabsTrigger>
                </TabsList>
                
                <button 
                  onClick={() => setIsControlsVisible(false)}
                  className="hidden md:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pb-3"
                >
                  Hide <ChevronUp className="h-3 w-3" />
                </button>
              </div>

              <CardContent className="p-4 space-y-4">
                <TabsContent value="auto" className="m-0 space-y-4">
                  {/* Upload reference images */}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    {referenceImages.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {referenceImages.map((img, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                            <img src={img} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {referenceImages.length < 4 && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-16 h-16 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center hover:border-primary/50 transition-colors"
                          >
                            <Plus className="h-5 w-5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                          <Plus className="h-4 w-4" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Upload up to 4 images to guide or extend your storyboard
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Auto prompt */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5">
                      <Wand2 className="h-4 w-4" />
                    </div>
                    <Textarea
                      value={autoPrompt}
                      onChange={(e) => setAutoPrompt(e.target.value)}
                      placeholder="Describe the mood or action to create your scenes"
                      className="border-0 p-0 resize-none min-h-[60px] focus-visible:ring-0 bg-transparent"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="m-0 space-y-4">
                  {/* Upload reference images */}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Upload up to 4 refs to edit, extend, or use in storyboard
                      </span>
                    </button>
                  </div>

                  {/* Scene inputs with drag-and-drop */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleScenesDragEnd}
                  >
                    <SortableContext
                      items={scenes.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {scenes.map((scene) => (
                          <SortableSceneInput
                            key={scene.id}
                            scene={scene}
                            onUpdate={(description) => updateScene(scene.id, description)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <p className="text-xs text-muted-foreground mt-2">
                    Drag scenes to reorder your storyboard
                  </p>
                </TabsContent>

                {/* Bottom controls */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                  <Select value={resultCount} onValueChange={setResultCount}>
                    <SelectTrigger className="w-[120px] bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {resultCounts.map((count) => (
                        <SelectItem key={count.value} value={count.value}>
                          {count.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="w-[100px] bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aspectRatios.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex-1" />

                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="gradient-primary text-white font-semibold px-6"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate
                        <Sparkles className="ml-2 h-4 w-4" />
                        <span className="ml-1">{getTotalCreditCost()}</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Tabs>
          </div>
        </Card>

        {/* Collapsed state toggle */}
        {!isControlsVisible && (
          <button
            onClick={() => setIsControlsVisible(true)}
            className="hidden md:flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Show <ChevronDown className="h-3 w-3" />
          </button>
        )}
        </div>
      </div>

      <AddCreditsDialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog} />
    </div>
  );
};

export default StoryModeTool;
