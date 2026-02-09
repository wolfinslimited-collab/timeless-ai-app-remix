import { useEffect, useRef, useCallback, useState } from 'react';
import type { EditorProject } from './types';
import { saveProjectToSupabase, type SaveStatus } from './supabaseProjectStorage';

interface UseAutoSaveOptions {
  project: EditorProject | null;
  intervalMs?: number; // Auto-save interval (default 30s)
  debounceMs?: number; // Debounce for change detection (default 2s)
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  triggerSave: () => void;
  lastSaved: Date | null;
}

export function useAutoSave({
  project,
  intervalMs = 30000, // 30 seconds
  debounceMs = 2000, // 2 seconds
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const projectRef = useRef(project);
  const lastProjectHashRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update project ref
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Generate a simple hash of project state for change detection
  const getProjectHash = useCallback((p: EditorProject | null): string => {
    if (!p) return '';
    return JSON.stringify({
      videoUrl: p.videoUrl,
      videoClips: p.videoClips,
      textOverlays: p.textOverlays,
      audioLayers: p.audioLayers,
      effectLayers: p.effectLayers,
      captionLayers: p.captionLayers,
      drawingLayers: p.drawingLayers,
      videoOverlays: p.videoOverlays,
      adjustments: p.adjustments,
      selectedAspectRatio: p.selectedAspectRatio,
      backgroundColor: p.backgroundColor,
      backgroundBlur: p.backgroundBlur,
      backgroundImage: p.backgroundImage,
      videoPosition: p.videoPosition,
    });
  }, []);

  // Core save function
  const doSave = useCallback(async () => {
    const currentProject = projectRef.current;
    if (!currentProject || !enabled) return;

    const currentHash = getProjectHash(currentProject);
    
    // Skip if nothing changed
    if (currentHash === lastProjectHashRef.current) {
      return;
    }

    const success = await saveProjectToSupabase(currentProject, setSaveStatus);
    
    if (success) {
      lastProjectHashRef.current = currentHash;
      setLastSaved(new Date());
      
      // Reset to 'saved' after showing 'saving'
      setTimeout(() => {
        setSaveStatus('saved');
      }, 500);
    }
  }, [enabled, getProjectHash]);

  // Trigger save with debounce (for change-based saving)
  const triggerSave = useCallback(() => {
    if (!enabled) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      doSave();
    }, debounceMs);
  }, [doSave, debounceMs, enabled]);

  // Set up interval-based auto-save
  useEffect(() => {
    if (!enabled || !project) return;

    intervalTimerRef.current = setInterval(() => {
      doSave();
    }, intervalMs);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [enabled, project, intervalMs, doSave]);

  // Detect project changes and trigger debounced save
  useEffect(() => {
    if (!enabled || !project) return;

    const currentHash = getProjectHash(project);
    if (currentHash !== lastProjectHashRef.current && lastProjectHashRef.current !== '') {
      triggerSave();
    }
  }, [project, enabled, getProjectHash, triggerSave]);

  // Initial hash setup
  useEffect(() => {
    if (project && lastProjectHashRef.current === '') {
      lastProjectHashRef.current = getProjectHash(project);
    }
  }, [project, getProjectHash]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    triggerSave,
    lastSaved,
  };
}
