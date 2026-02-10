import { useState } from "react";
import {
  ChevronLeft,
  Type,
  Check,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

// Font options with preview support
const FONT_OPTIONS = [
  { id: 'roboto', name: 'Roboto', family: 'Roboto' },
  { id: 'inter', name: 'Inter', family: 'Inter' },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat' },
  { id: 'lalezar', name: 'Lalezar', family: 'Lalezar' },
  { id: 'arial', name: 'Arial', family: 'Arial' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia' },
  { id: 'times', name: 'Times New Roman', family: 'Times New Roman' },
  { id: 'courier', name: 'Courier New', family: 'Courier New' },
  { id: 'impact', name: 'Impact', family: 'Impact' },
  { id: 'comic', name: 'Comic Sans', family: 'Comic Sans MS' },
  { id: 'trebuchet', name: 'Trebuchet', family: 'Trebuchet MS' },
  { id: 'verdana', name: 'Verdana', family: 'Verdana' },
];

// Color presets
const COLOR_PRESETS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff6b6b', '#4ecdc4',
  '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#f39c12',
  '#e74c3c', '#8e44ad', '#2ecc71', '#3498db', '#1abc9c',
];

// Background color presets
const BG_COLOR_PRESETS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff6b6b', '#4ecdc4', '#333333', '#666666',
  '#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483',
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
  // Stroke
  strokeEnabled?: boolean;
  onStrokeEnabledChange?: (enabled: boolean) => void;
  strokeColor?: string;
  onStrokeColorChange?: (color: string) => void;
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
  // Glow
  glowEnabled?: boolean;
  onGlowEnabledChange?: (enabled: boolean) => void;
  glowColor?: string;
  onGlowColorChange?: (color: string) => void;
  glowIntensity?: number;
  onGlowIntensityChange?: (intensity: number) => void;
  // Shadow
  shadowEnabled?: boolean;
  onShadowEnabledChange?: (enabled: boolean) => void;
  shadowColor?: string;
  onShadowColorChange?: (color: string) => void;
  shadowBlur?: number;
  onShadowBlurChange?: (blur: number) => void;
  shadowOffsetX?: number;
  onShadowOffsetXChange?: (x: number) => void;
  shadowOffsetY?: number;
  onShadowOffsetYChange?: (y: number) => void;
  shadowOpacity?: number;
  onShadowOpacityChange?: (opacity: number) => void;
  // Spacing & curve
  letterSpacing?: number;
  onLetterSpacingChange?: (spacing: number) => void;
  curveAmount?: number;
  onCurveAmountChange?: (curve: number) => void;
  // Animation & bubble
  animation?: string;
  onAnimationChange?: (animation: string) => void;
  bubbleStyle?: string;
  onBubbleStyleChange?: (style: string) => void;
  // Background
  hasBackground?: boolean;
  onHasBackgroundChange?: (has: boolean) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  backgroundOpacity?: number;
  onBackgroundOpacityChange?: (opacity: number) => void;
  backgroundPadding?: number;
  onBackgroundPaddingChange?: (padding: number) => void;
  backgroundRadius?: number;
  onBackgroundRadiusChange?: (radius: number) => void;
  // Reset
  onReset?: () => void;
}

type TabId = 'font' | 'style' | 'stroke-shadow' | 'background';

const TABS: { id: TabId; name: string }[] = [
  { id: 'font', name: 'Font' },
  { id: 'style', name: 'Style' },
  { id: 'stroke-shadow', name: 'Stroke & Shadow' },
  { id: 'background', name: 'Background' },
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
  shadowBlur = 4,
  onShadowBlurChange,
  shadowOffsetX = 2,
  onShadowOffsetXChange,
  shadowOffsetY = 2,
  onShadowOffsetYChange,
  shadowOpacity = 0.5,
  onShadowOpacityChange,
  letterSpacing = 0,
  onLetterSpacingChange,
  curveAmount = 0,
  onCurveAmountChange,
  animation = 'none',
  onAnimationChange,
  bubbleStyle = 'none',
  onBubbleStyleChange,
  hasBackground = false,
  onHasBackgroundChange,
  backgroundColor = '#000000',
  onBackgroundColorChange,
  backgroundOpacity = 0.5,
  onBackgroundOpacityChange,
  backgroundPadding = 8,
  onBackgroundPaddingChange,
  backgroundRadius = 4,
  onBackgroundRadiusChange,
  onReset,
}: TextEditPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('font');
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'stroke' | 'glow' | 'shadow' | 'bg' | null>(null);

  const renderColorCircles = (
    colors: string[],
    selected: string,
    onSelect: (c: string) => void,
  ) => (
    <div className="flex gap-2 flex-wrap">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={cn(
            "w-7 h-7 rounded-full border-2 transition-all shrink-0",
            selected === color ? "border-primary scale-110" : "border-white/20 hover:border-white/40"
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      // ---- FONT TAB ----
      case 'font':
        return (
          <div className="px-3 py-3">
            <div className="text-xs text-muted-foreground mb-3">Select Font</div>
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => onFontFamilyChange(font.family)}
                  className={cn(
                    "shrink-0 px-4 py-3 rounded-lg border transition-all min-w-[90px] flex flex-col items-center gap-1",
                    fontFamily === font.family
                      ? "border-primary bg-primary/15"
                      : "border-border/30 bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <span
                    className="text-lg text-foreground"
                    style={{ fontFamily: font.family }}
                  >
                    Aa
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">{font.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      // ---- STYLE TAB ----
      case 'style':
        return (
          <div className="px-3 py-3 space-y-4">
            {/* Font Size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Font Size</span>
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

            {/* Character Spacing */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Character Spacing</span>
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

            {/* Opacity */}
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

            {/* Text Color */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Text Fill Color</div>
              {renderColorCircles(COLOR_PRESETS, textColor, onTextColorChange)}
            </div>
          </div>
        );

      // ---- STROKE & SHADOW TAB ----
      case 'stroke-shadow':
        return (
          <div className="px-3 py-3 space-y-5">
            {/* Stroke Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Stroke</span>
                <Switch
                  checked={strokeEnabled}
                  onCheckedChange={(checked) => onStrokeEnabledChange?.(checked)}
                />
              </div>

              {strokeEnabled && (
                <div className="space-y-3 pl-1">
                  {/* Stroke Color */}
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1.5">Color</div>
                    {renderColorCircles(COLOR_PRESETS.slice(0, 10), strokeColor, (c) => onStrokeColorChange?.(c))}
                  </div>

                  {/* Stroke Thickness */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-muted-foreground">Thickness</span>
                      <span className="text-[10px] text-foreground">{strokeWidth}px</span>
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
                </div>
              )}
            </div>

            <div className="border-t border-border/20" />

            {/* Shadow Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Shadow</span>
                <Switch
                  checked={shadowEnabled}
                  onCheckedChange={(checked) => onShadowEnabledChange?.(checked)}
                />
              </div>

              {shadowEnabled && (
                <div className="space-y-3 pl-1">
                  {/* Shadow Color */}
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1.5">Color</div>
                    {renderColorCircles(COLOR_PRESETS.slice(0, 10), shadowColor, (c) => onShadowColorChange?.(c))}
                  </div>

                  {/* Blur */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-muted-foreground">Blur</span>
                      <span className="text-[10px] text-foreground">{shadowBlur}px</span>
                    </div>
                    <Slider
                      value={[shadowBlur]}
                      onValueChange={([v]) => onShadowBlurChange?.(v)}
                      min={0}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Opacity */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-muted-foreground">Opacity</span>
                      <span className="text-[10px] text-foreground">{Math.round(shadowOpacity * 100)}%</span>
                    </div>
                    <Slider
                      value={[shadowOpacity * 100]}
                      onValueChange={([v]) => onShadowOpacityChange?.(v / 100)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Offset X */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-muted-foreground">Offset X</span>
                      <span className="text-[10px] text-foreground">{shadowOffsetX}px</span>
                    </div>
                    <Slider
                      value={[shadowOffsetX]}
                      onValueChange={([v]) => onShadowOffsetXChange?.(v)}
                      min={-20}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Offset Y */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-muted-foreground">Offset Y</span>
                      <span className="text-[10px] text-foreground">{shadowOffsetY}px</span>
                    </div>
                    <Slider
                      value={[shadowOffsetY]}
                      onValueChange={([v]) => onShadowOffsetYChange?.(v)}
                      min={-20}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      // ---- BACKGROUND TAB ----
      case 'background':
        return (
          <div className="px-3 py-3 space-y-4">
            {/* Enable background */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Text Label Background</span>
              <Switch
                checked={hasBackground}
                onCheckedChange={(checked) => onHasBackgroundChange?.(checked)}
              />
            </div>

            {hasBackground && (
              <div className="space-y-4 pl-1">
                {/* Background Color */}
                <div>
                  <div className="text-[10px] text-muted-foreground mb-2">Color</div>
                  {renderColorCircles(BG_COLOR_PRESETS, backgroundColor, (c) => onBackgroundColorChange?.(c))}
                </div>

                {/* Transparency */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] text-muted-foreground">Transparency</span>
                    <span className="text-[10px] text-foreground">{Math.round(backgroundOpacity * 100)}%</span>
                  </div>
                  <Slider
                    value={[backgroundOpacity * 100]}
                    onValueChange={([v]) => onBackgroundOpacityChange?.(v / 100)}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Padding */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] text-muted-foreground">Padding</span>
                    <span className="text-[10px] text-foreground">{backgroundPadding}px</span>
                  </div>
                  <Slider
                    value={[backgroundPadding]}
                    onValueChange={([v]) => onBackgroundPaddingChange?.(v)}
                    min={0}
                    max={32}
                    step={2}
                    className="w-full"
                  />
                </div>

                {/* Corner Radius */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] text-muted-foreground">Corner Radius</span>
                    <span className="text-[10px] text-foreground">{backgroundRadius}px</span>
                  </div>
                  <Slider
                    value={[backgroundRadius]}
                    onValueChange={([v]) => onBackgroundRadiusChange?.(v)}
                    min={0}
                    max={24}
                    step={2}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in flex flex-col bg-background h-full">
      {/* Header */}
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
        <div className="flex items-center gap-2">
          {/* Reset Button */}
          {onReset && (
            <button
              onClick={onReset}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors border border-destructive/20"
            >
              <RotateCcw className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] font-medium text-destructive">Reset</span>
            </button>
          )}
          <button
            onClick={onBack}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary hover:bg-primary/90 transition-colors"
          >
            <Check className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Text Input */}
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
      <div className="flex overflow-x-auto border-b border-border/20 bg-secondary/20 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap",
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
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}
