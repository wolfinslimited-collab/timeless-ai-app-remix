import { useState } from "react";
import {
  ChevronLeft,
  Type,
  Palette,
  Circle,
  Sparkles,
  Square,
  Droplets,
  ArrowUpDown,
  AlignCenter,
  Check,
  Space,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

// Text style preset interface
interface TextStylePreset {
  id: string;
  name: string;
  fontFamily: string;
  fontWeight: string;
  color: string;
  hasStroke: boolean;
  strokeColor?: string;
  hasGlow: boolean;
  glowColor?: string;
  hasShadow: boolean;
  shadowColor?: string;
}

// Default style presets
const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  { id: 'default', name: 'Default', fontFamily: 'Inter', fontWeight: '600', color: '#ffffff', hasStroke: false, hasGlow: false, hasShadow: false },
  { id: 'bold-white', name: 'Bold', fontFamily: 'Inter', fontWeight: '900', color: '#ffffff', hasStroke: true, strokeColor: '#000000', hasGlow: false, hasShadow: false },
  { id: 'neon', name: 'Neon', fontFamily: 'Inter', fontWeight: '700', color: '#ff00ff', hasStroke: false, hasGlow: true, glowColor: '#ff00ff', hasShadow: false },
  { id: 'shadow', name: 'Shadow', fontFamily: 'Inter', fontWeight: '700', color: '#ffffff', hasStroke: false, hasGlow: false, hasShadow: true, shadowColor: '#000000' },
  { id: 'outline', name: 'Outline', fontFamily: 'Inter', fontWeight: '700', color: 'transparent', hasStroke: true, strokeColor: '#ffffff', hasGlow: false, hasShadow: false },
  { id: 'gradient', name: 'Gradient', fontFamily: 'Inter', fontWeight: '800', color: '#ff6b6b', hasStroke: false, hasGlow: true, glowColor: '#4ecdc4', hasShadow: false },
  { id: 'retro', name: 'Retro', fontFamily: 'Georgia', fontWeight: '700', color: '#ffd700', hasStroke: true, strokeColor: '#8b4513', hasGlow: false, hasShadow: true, shadowColor: '#000000' },
  { id: 'minimal', name: 'Minimal', fontFamily: 'Inter', fontWeight: '300', color: '#ffffff', hasStroke: false, hasGlow: false, hasShadow: false },
];

// Font options
const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', family: 'Inter' },
  { id: 'roboto', name: 'Roboto', family: 'Roboto' },
  { id: 'arial', name: 'Arial', family: 'Arial' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia' },
  { id: 'times', name: 'Times', family: 'Times New Roman' },
  { id: 'courier', name: 'Courier', family: 'Courier New' },
  { id: 'impact', name: 'Impact', family: 'Impact' },
  { id: 'comic', name: 'Comic Sans', family: 'Comic Sans MS' },
];

// Color presets for text
const COLOR_PRESETS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff6b6b', '#4ecdc4',
  '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#f39c12',
];

// Animation presets
const ANIMATION_PRESETS = [
  { id: 'none', name: 'None', icon: '—' },
  { id: 'fade', name: 'Fade', icon: '◐' },
  { id: 'slide-up', name: 'Slide Up', icon: '↑' },
  { id: 'slide-down', name: 'Slide Down', icon: '↓' },
  { id: 'scale', name: 'Scale', icon: '⊕' },
  { id: 'bounce', name: 'Bounce', icon: '⌒' },
  { id: 'typewriter', name: 'Typewriter', icon: '▯' },
  { id: 'wave', name: 'Wave', icon: '∿' },
];

// Bubble/shape presets
const BUBBLE_PRESETS = [
  { id: 'none', name: 'None', shape: 'none' },
  { id: 'rect', name: 'Rectangle', shape: 'rect' },
  { id: 'rounded', name: 'Rounded', shape: 'rounded' },
  { id: 'pill', name: 'Pill', shape: 'pill' },
  { id: 'speech', name: 'Speech', shape: 'speech' },
  { id: 'thought', name: 'Thought', shape: 'thought' },
];

interface TextEditPanelProps {
  onBack: () => void;
  text: string;
  onTextChange: (text: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  // Extended properties
  strokeEnabled?: boolean;
  onStrokeEnabledChange?: (enabled: boolean) => void;
  strokeColor?: string;
  onStrokeColorChange?: (color: string) => void;
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
  glowEnabled?: boolean;
  onGlowEnabledChange?: (enabled: boolean) => void;
  glowColor?: string;
  onGlowColorChange?: (color: string) => void;
  glowIntensity?: number;
  onGlowIntensityChange?: (intensity: number) => void;
  shadowEnabled?: boolean;
  onShadowEnabledChange?: (enabled: boolean) => void;
  shadowColor?: string;
  onShadowColorChange?: (color: string) => void;
  letterSpacing?: number;
  onLetterSpacingChange?: (spacing: number) => void;
  curveAmount?: number;
  onCurveAmountChange?: (curve: number) => void;
  animation?: string;
  onAnimationChange?: (animation: string) => void;
  bubbleStyle?: string;
  onBubbleStyleChange?: (style: string) => void;
}

type TabId = 'templates' | 'fonts' | 'styles' | 'effects' | 'animations' | 'bubbles';

const TABS: { id: TabId; name: string }[] = [
  { id: 'templates', name: 'Templates' },
  { id: 'fonts', name: 'Fonts' },
  { id: 'styles', name: 'Styles' },
  { id: 'effects', name: 'Effects' },
  { id: 'animations', name: 'Animations' },
  { id: 'bubbles', name: 'Bubbles' },
];

export function TextEditPanel({
  onBack,
  text,
  onTextChange,
  fontSize,
  onFontSizeChange,
  textColor,
  onTextColorChange,
  fontFamily,
  onFontFamilyChange,
  opacity,
  onOpacityChange,
  strokeEnabled = false,
  onStrokeEnabledChange,
  strokeColor = '#000000',
  onStrokeColorChange,
  strokeWidth = 2,
  onStrokeWidthChange,
  glowEnabled = false,
  onGlowEnabledChange,
  glowColor = '#ffffff',
  onGlowColorChange,
  glowIntensity = 10,
  onGlowIntensityChange,
  shadowEnabled = false,
  onShadowEnabledChange,
  shadowColor = '#000000',
  onShadowColorChange,
  letterSpacing = 0,
  onLetterSpacingChange,
  curveAmount = 0,
  onCurveAmountChange,
  animation = 'none',
  onAnimationChange,
  bubbleStyle = 'none',
  onBubbleStyleChange,
}: TextEditPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('styles');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'stroke' | 'glow' | 'shadow' | 'bg' | null>(null);

  const applyPreset = (preset: TextStylePreset) => {
    setSelectedPreset(preset.id);
    onFontFamilyChange(preset.fontFamily);
    onTextColorChange(preset.color);
    onStrokeEnabledChange?.(preset.hasStroke);
    if (preset.strokeColor) onStrokeColorChange?.(preset.strokeColor);
    onGlowEnabledChange?.(preset.hasGlow);
    if (preset.glowColor) onGlowColorChange?.(preset.glowColor);
    onShadowEnabledChange?.(preset.hasShadow);
    if (preset.shadowColor) onShadowColorChange?.(preset.shadowColor);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'templates':
        return (
          <div className="px-3 py-3">
            <div className="text-xs text-muted-foreground mb-3">Text Templates</div>
            <div className="grid grid-cols-2 gap-2">
              {['Title', 'Subtitle', 'Caption', 'Quote', 'Heading', 'Label'].map((template) => (
                <button
                  key={template}
                  onClick={() => onTextChange(template)}
                  className="h-16 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/30 flex items-center justify-center text-sm font-medium transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        );

      case 'fonts':
        return (
          <div className="px-3 py-3">
            <div className="text-xs text-muted-foreground mb-3">Select Font</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => onFontFamilyChange(font.family)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg text-left transition-colors flex items-center justify-between",
                    fontFamily === font.family
                      ? "bg-primary/20 border border-primary/50"
                      : "bg-secondary/30 hover:bg-secondary/50 border border-transparent"
                  )}
                  style={{ fontFamily: font.family }}
                >
                  <span className="text-sm">{font.name}</span>
                  {fontFamily === font.family && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'styles':
        return (
          <div className="px-3 py-3 space-y-4">
            {/* Style Presets Row */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Style Presets</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {TEXT_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "shrink-0 w-14 h-14 rounded-lg flex items-center justify-center border transition-all",
                      selectedPreset === preset.id
                        ? "border-primary bg-primary/20"
                        : "border-border/30 bg-secondary/30 hover:bg-secondary/50"
                    )}
                    style={{
                      fontFamily: preset.fontFamily,
                      fontWeight: preset.fontWeight,
                      color: preset.color === 'transparent' ? '#ffffff' : preset.color,
                      textShadow: preset.hasGlow ? `0 0 10px ${preset.glowColor}` : undefined,
                      WebkitTextStroke: preset.hasStroke ? `1px ${preset.strokeColor}` : undefined,
                    }}
                  >
                    <span className="text-lg font-bold">Aa</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text Properties Row */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Properties</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {/* Text Color */}
                <button
                  onClick={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors w-14",
                    showColorPicker === 'text' ? "border-primary bg-primary/10" : "border-border/30 bg-secondary/30"
                  )}
                >
                  <div 
                    className="w-6 h-6 rounded-full border border-white/30"
                    style={{ backgroundColor: textColor }}
                  />
                  <span className="text-[9px] text-muted-foreground">Color</span>
                </button>

                {/* Stroke */}
                <button
                  onClick={() => {
                    onStrokeEnabledChange?.(!strokeEnabled);
                    if (!strokeEnabled) setShowColorPicker('stroke');
                  }}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors w-14",
                    strokeEnabled ? "border-primary bg-primary/10" : "border-border/30 bg-secondary/30"
                  )}
                >
                  <Circle className="w-6 h-6" />
                  <span className="text-[9px] text-muted-foreground">Stroke</span>
                </button>

                {/* Glow */}
                <button
                  onClick={() => {
                    onGlowEnabledChange?.(!glowEnabled);
                    if (!glowEnabled) setShowColorPicker('glow');
                  }}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors w-14",
                    glowEnabled ? "border-primary bg-primary/10" : "border-border/30 bg-secondary/30"
                  )}
                >
                  <Sparkles className="w-6 h-6" />
                  <span className="text-[9px] text-muted-foreground">Glow</span>
                </button>

                {/* Background */}
                <button
                  onClick={() => setShowColorPicker(showColorPicker === 'bg' ? null : 'bg')}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors w-14",
                    showColorPicker === 'bg' ? "border-primary bg-primary/10" : "border-border/30 bg-secondary/30"
                  )}
                >
                  <Square className="w-6 h-6" />
                  <span className="text-[9px] text-muted-foreground">BG</span>
                </button>

                {/* Shadow */}
                <button
                  onClick={() => {
                    onShadowEnabledChange?.(!shadowEnabled);
                    if (!shadowEnabled) setShowColorPicker('shadow');
                  }}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors w-14",
                    shadowEnabled ? "border-primary bg-primary/10" : "border-border/30 bg-secondary/30"
                  )}
                >
                  <Droplets className="w-6 h-6" />
                  <span className="text-[9px] text-muted-foreground">Shadow</span>
                </button>

                {/* Curve */}
                <button
                  onClick={() => onCurveAmountChange?.(curveAmount === 0 ? 20 : 0)}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors w-14",
                    curveAmount !== 0 ? "border-primary bg-primary/10" : "border-border/30 bg-secondary/30"
                  )}
                >
                  <ArrowUpDown className="w-6 h-6" />
                  <span className="text-[9px] text-muted-foreground">Curve</span>
                </button>

                {/* Spacing */}
                <button
                  onClick={() => onLetterSpacingChange?.(letterSpacing === 0 ? 2 : 0)}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors w-14",
                    letterSpacing !== 0 ? "border-primary bg-primary/10" : "border-border/30 bg-secondary/30"
                  )}
                >
                  <AlignCenter className="w-6 h-6" />
                  <span className="text-[9px] text-muted-foreground">Spacing</span>
                </button>
              </div>
            </div>

            {/* Color Picker Modal */}
            {showColorPicker && (
              <div className="p-3 bg-secondary/50 rounded-lg border border-border/30">
                <div className="text-xs text-muted-foreground mb-2 capitalize">{showColorPicker} Color</div>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        if (showColorPicker === 'text') onTextColorChange(color);
                        else if (showColorPicker === 'stroke') onStrokeColorChange?.(color);
                        else if (showColorPicker === 'glow') onGlowColorChange?.(color);
                        else if (showColorPicker === 'shadow') onShadowColorChange?.(color);
                        setShowColorPicker(null);
                      }}
                      className="w-8 h-8 rounded-full border-2 border-white/20 hover:border-white/50 transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'effects':
        return (
          <div className="px-3 py-3 space-y-4">
            {/* Stroke Width */}
            {strokeEnabled && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Stroke Width</span>
                  <span className="text-xs text-foreground">{strokeWidth}px</span>
                </div>
                <Slider
                  value={[strokeWidth]}
                  onValueChange={([v]) => onStrokeWidthChange?.(v)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            {/* Glow Intensity */}
            {glowEnabled && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Glow Intensity</span>
                  <span className="text-xs text-foreground">{glowIntensity}px</span>
                </div>
                <Slider
                  value={[glowIntensity]}
                  onValueChange={([v]) => onGlowIntensityChange?.(v)}
                  min={5}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>
            )}

            {/* Letter Spacing */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Letter Spacing</span>
                <span className="text-xs text-foreground">{letterSpacing}px</span>
              </div>
              <Slider
                value={[letterSpacing]}
                onValueChange={([v]) => onLetterSpacingChange?.(v)}
                min={-5}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Curve Amount */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Curve</span>
                <span className="text-xs text-foreground">{curveAmount}°</span>
              </div>
              <Slider
                value={[curveAmount]}
                onValueChange={([v]) => onCurveAmountChange?.(v)}
                min={-45}
                max={45}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        );

      case 'animations':
        return (
          <div className="px-3 py-3">
            <div className="text-xs text-muted-foreground mb-3">Animation Style</div>
            <div className="grid grid-cols-4 gap-2">
              {ANIMATION_PRESETS.map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => onAnimationChange?.(anim.id)}
                  className={cn(
                    "h-16 rounded-lg flex flex-col items-center justify-center gap-1 border transition-colors",
                    animation === anim.id
                      ? "border-primary bg-primary/20"
                      : "border-border/30 bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <span className="text-xl">{anim.icon}</span>
                  <span className="text-[9px] text-muted-foreground">{anim.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'bubbles':
        return (
          <div className="px-3 py-3">
            <div className="text-xs text-muted-foreground mb-3">Text Bubble Style</div>
            <div className="grid grid-cols-3 gap-2">
              {BUBBLE_PRESETS.map((bubble) => (
                <button
                  key={bubble.id}
                  onClick={() => onBubbleStyleChange?.(bubble.id)}
                  className={cn(
                    "h-20 rounded-lg flex flex-col items-center justify-center gap-2 border transition-colors",
                    bubbleStyle === bubble.id
                      ? "border-primary bg-primary/20"
                      : "border-border/30 bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-8 flex items-center justify-center text-xs",
                    bubble.shape === 'none' ? '' :
                    bubble.shape === 'rect' ? 'bg-white/10 border border-white/30' :
                    bubble.shape === 'rounded' ? 'bg-white/10 border border-white/30 rounded' :
                    bubble.shape === 'pill' ? 'bg-white/10 border border-white/30 rounded-full' :
                    bubble.shape === 'speech' ? 'bg-white/10 border border-white/30 rounded relative' :
                    'bg-white/10 border border-white/30 rounded-full'
                  )}>
                    Aa
                  </div>
                  <span className="text-[9px] text-muted-foreground">{bubble.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in flex flex-col bg-background">
      {/* Header with back button and title */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="shrink-0 flex items-center justify-center w-8 h-9 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
          <span className="ml-3 text-sm font-medium text-foreground">Edit Text</span>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary hover:bg-primary/90 transition-colors"
        >
          <Check className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>

      {/* Text Input Field */}
      <div className="px-3 py-3 border-b border-border/20">
        <input
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Enter text..."
          className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm"
        />
      </div>

      {/* Tab Bar */}
      <div className="flex overflow-x-auto border-b border-border/20 bg-secondary/20">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 px-4 py-2.5 text-xs font-medium transition-colors border-b-2",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="max-h-60 overflow-y-auto">
        {renderTabContent()}
      </div>

      {/* Size and Opacity Sliders */}
      <div className="px-3 py-3 border-t border-border/20 space-y-3">
        {/* Size Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Size</span>
            <span className="text-xs text-foreground">{fontSize}px</span>
          </div>
          <Slider
            value={[fontSize]}
            onValueChange={([v]) => onFontSizeChange(v)}
            min={12}
            max={120}
            step={2}
            className="w-full"
          />
        </div>

        {/* Opacity Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Opacity</span>
            <span className="text-xs text-foreground">{Math.round(opacity * 100)}%</span>
          </div>
          <Slider
            value={[opacity * 100]}
            onValueChange={([v]) => onOpacityChange(v / 100)}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
