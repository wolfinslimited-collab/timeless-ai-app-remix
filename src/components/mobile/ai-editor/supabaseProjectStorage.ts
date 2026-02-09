// AI Editor Supabase Project Storage
import { supabase } from '@/integrations/supabase/client';
import { supabase as primarySupabase } from '@/lib/supabase';
import type { EditorProject } from './types';

export interface SupabaseEditorProject {
  id: string;
  user_id: string;
  title: string;
  thumbnail: string | null;
  editor_state: EditorProject;
  created_at: string;
  updated_at: string;
}

// Save status tracking
let lastSaveTime = 0;
let saveInProgress = false;
let pendingSave: EditorProject | null = null;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Get current user ID from primary auth project
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await primarySupabase.auth.getUser();
  return user?.id || null;
}

// Fetch all projects for the current user
export async function getAllProjectsFromSupabase(): Promise<EditorProject[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('ai_editor_projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  // Map to EditorProject format
  return (data || []).map((project: any) => {
    const editorState = project.editor_state as Record<string, any> || {};
    return {
      ...editorState,
      id: project.id,
      title: project.title,
      thumbnail: project.thumbnail,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    } as EditorProject;
  });
}

// Get a single project
export async function getProjectFromSupabase(id: string): Promise<EditorProject | null> {
  const { data, error } = await supabase
    .from('ai_editor_projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching project:', error);
    return null;
  }

  const editorState = data.editor_state as Record<string, any> || {};
  return {
    ...editorState,
    id: data.id,
    title: data.title,
    thumbnail: data.thumbnail,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as EditorProject;
}

// Save project to Supabase
export async function saveProjectToSupabase(
  project: EditorProject,
  onStatusChange?: (status: SaveStatus) => void
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.error('No user logged in');
    onStatusChange?.('error');
    return false;
  }

  // If save in progress, queue this save
  if (saveInProgress) {
    pendingSave = project;
    return true;
  }

  saveInProgress = true;
  onStatusChange?.('saving');

  try {
    // Create editor state without id, title, thumbnail, createdAt, updatedAt
    // as those are stored in separate columns
    const editorState = {
      videoUrl: project.videoUrl,
      videoDuration: project.videoDuration,
      videoDimensions: project.videoDimensions,
      videoClips: project.videoClips,
      textOverlays: project.textOverlays,
      audioLayers: project.audioLayers,
      effectLayers: project.effectLayers,
      captionLayers: project.captionLayers,
      drawingLayers: project.drawingLayers,
      videoOverlays: project.videoOverlays,
      adjustments: project.adjustments,
      selectedAspectRatio: project.selectedAspectRatio,
      backgroundColor: project.backgroundColor,
      backgroundBlur: project.backgroundBlur,
      backgroundImage: project.backgroundImage,
      videoPosition: project.videoPosition,
    };

    const { error } = await supabase
      .from('ai_editor_projects')
      .upsert({
        id: project.id,
        user_id: userId,
        title: project.title,
        thumbnail: project.thumbnail,
        editor_state: editorState as any,
      });

    if (error) {
      console.error('Error saving project:', error);
      onStatusChange?.('error');
      return false;
    }

    lastSaveTime = Date.now();
    onStatusChange?.('saved');
    
    // Process any pending save
    if (pendingSave) {
      const nextSave = pendingSave;
      pendingSave = null;
      saveInProgress = false;
      return saveProjectToSupabase(nextSave, onStatusChange);
    }

    return true;
  } catch (error) {
    console.error('Error saving project:', error);
    onStatusChange?.('error');
    return false;
  } finally {
    saveInProgress = false;
  }
}

// Delete project
export async function deleteProjectFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_editor_projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }

  return true;
}

// Duplicate project
export async function duplicateProjectFromSupabase(id: string): Promise<EditorProject | null> {
  const original = await getProjectFromSupabase(id);
  if (!original) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const duplicate: EditorProject = {
    ...original,
    id: newId,
    title: `${original.title} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };

  const editorState = {
    videoUrl: duplicate.videoUrl,
    videoDuration: duplicate.videoDuration,
    videoDimensions: duplicate.videoDimensions,
    videoClips: duplicate.videoClips,
    textOverlays: duplicate.textOverlays,
    audioLayers: duplicate.audioLayers,
    effectLayers: duplicate.effectLayers,
    captionLayers: duplicate.captionLayers,
    drawingLayers: duplicate.drawingLayers,
    videoOverlays: duplicate.videoOverlays,
    adjustments: duplicate.adjustments,
    selectedAspectRatio: duplicate.selectedAspectRatio,
    backgroundColor: duplicate.backgroundColor,
    backgroundBlur: duplicate.backgroundBlur,
    backgroundImage: duplicate.backgroundImage,
    videoPosition: duplicate.videoPosition,
  };

  const { error } = await supabase
    .from('ai_editor_projects')
    .insert({
      id: newId,
      user_id: userId,
      title: duplicate.title,
      thumbnail: duplicate.thumbnail,
      editor_state: editorState as any,
    });

  if (error) {
    console.error('Error duplicating project:', error);
    return null;
  }

  return duplicate;
}

// Rename project
export async function renameProjectInSupabase(id: string, newTitle: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_editor_projects')
    .update({ title: newTitle })
    .eq('id', id);

  if (error) {
    console.error('Error renaming project:', error);
    return false;
  }

  return true;
}

// Create new project in Supabase
export async function createNewProjectInSupabase(): Promise<EditorProject | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  const newId = crypto.randomUUID();
  const nowIso = now.toISOString();

  const project: EditorProject = {
    id: newId,
    title: `Project ${dateStr}`,
    createdAt: nowIso,
    updatedAt: nowIso,
    thumbnail: null,
    videoUrl: null,
    videoDuration: 0,
    videoDimensions: null,
    videoClips: [],
    textOverlays: [],
    audioLayers: [],
    effectLayers: [],
    captionLayers: [],
    drawingLayers: [],
    videoOverlays: [],
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      sharpen: 0,
      highlight: 0,
      shadow: 0,
      temp: 0,
      hue: 0,
    },
    selectedAspectRatio: 'original',
    backgroundColor: '#000000',
    backgroundBlur: 0,
    backgroundImage: null,
    videoPosition: { x: 0, y: 0 },
  };

  const editorState = {
    videoUrl: project.videoUrl,
    videoDuration: project.videoDuration,
    videoDimensions: project.videoDimensions,
    videoClips: project.videoClips,
    textOverlays: project.textOverlays,
    audioLayers: project.audioLayers,
    effectLayers: project.effectLayers,
    captionLayers: project.captionLayers,
    drawingLayers: project.drawingLayers,
    videoOverlays: project.videoOverlays,
    adjustments: project.adjustments,
    selectedAspectRatio: project.selectedAspectRatio,
    backgroundColor: project.backgroundColor,
    backgroundBlur: project.backgroundBlur,
    backgroundImage: project.backgroundImage,
    videoPosition: project.videoPosition,
  };

  const { error } = await supabase
    .from('ai_editor_projects')
    .insert({
      id: newId,
      user_id: userId,
      title: project.title,
      thumbnail: null,
      editor_state: editorState as any,
    });

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  return project;
}

// Generate thumbnail from video
export async function generateThumbnail(videoUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      
      video.addEventListener('loadeddata', () => {
        video.currentTime = 0.5;
      });
      
      video.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
      
      video.addEventListener('error', () => resolve(null));
      video.load();
    } catch {
      resolve(null);
    }
  });
}

// Check if user is authenticated
export async function isUserAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return userId !== null;
}
