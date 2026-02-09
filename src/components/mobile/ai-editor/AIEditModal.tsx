import { useState } from 'react';
import { X, Wand2, Loader2, Sparkles, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AIEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (prompt: string) => void;
  isProcessing: boolean;
  clipInfo?: {
    duration: number;
    startTime: number;
  } | null;
}

const EXAMPLE_PROMPTS = [
  "Change the sky to a sunset",
  "Make the person glow green",
  "Add a futuristic city in the background",
  "Apply a cinematic color grade",
  "Add floating particles around the subject",
  "Make it look like it's raining",
  "Add neon lighting effects",
  "Transform the scene to night time",
];

export function AIEditModal({
  open,
  onOpenChange,
  onSubmit,
  isProcessing,
  clipInfo,
}: AIEditModalProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (!prompt.trim() || isProcessing) return;
    onSubmit(prompt.trim());
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-background border-border">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-lg font-semibold">AI Magic Edit</DialogTitle>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Processing State */}
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground mt-4">Generating AI Edit...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
              <div className="mt-4 px-4 py-2 bg-muted/20 rounded-lg">
                <p className="text-xs text-muted-foreground italic">"{prompt}"</p>
              </div>
            </div>
          ) : (
            <>
              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Enter your prompt for AI video editing
                </label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how you want to edit this video..."
                    className="w-full min-h-[100px] p-3 pr-12 rounded-xl bg-muted/20 border border-border/30 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!prompt.trim() || isProcessing}
                    className={cn(
                      "absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      prompt.trim()
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Clip Info */}
              {clipInfo && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/10 px-3 py-2 rounded-lg">
                  <span>Selected clip:</span>
                  <span className="font-medium text-foreground">
                    {clipInfo.duration.toFixed(1)}s at {clipInfo.startTime.toFixed(1)}s
                  </span>
                </div>
              )}

              {/* Example Prompts */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Try these examples
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full border transition-all",
                        prompt === example
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-muted/10 border-border/30 text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                      )}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 rounded-xl p-4 border border-violet-500/20">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">AI-Powered Editing</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Describe your desired changes in natural language. The AI will interpret your prompt
                      and apply visual effects to your video clip.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isProcessing && (
          <div className="px-4 py-3 border-t border-border/30 flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Apply AI Edit
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
