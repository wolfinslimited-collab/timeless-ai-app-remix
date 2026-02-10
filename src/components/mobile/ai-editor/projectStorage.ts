// AI Editor Project Storage - IndexedDB/LocalStorage hybrid
import type { EditorProject } from './types';

const STORAGE_KEY = 'ai_editor_projects';
const DB_NAME = 'AIEditorDB';
const DB_VERSION = 2;
const STORE_NAME = 'projects';
const VIDEO_STORE_NAME = 'video_files';

// IndexedDB helpers
let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        database.createObjectStore(VIDEO_STORE_NAME, { keyPath: 'projectId' });
      }
    };
  });
}

// Video file storage
export async function saveVideoFile(projectId: string, file: File): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([VIDEO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const request = store.put({ projectId, file, name: file.name, type: file.type });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save video file to IndexedDB:', e);
  }
}

export async function getVideoFile(projectId: string): Promise<File | null> {
  if (!isIndexedDBAvailable()) return null;
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([VIDEO_STORE_NAME], 'readonly');
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const request = store.get(projectId);
      request.onsuccess = () => {
        const result = request.result;
        if (result?.file) {
          resolve(result.file instanceof File ? result.file : new File([result.file], result.name || 'video.mp4', { type: result.type || 'video/mp4' }));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function deleteVideoFile(projectId: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([VIDEO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const request = store.delete(projectId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch { /* ignore */ }
}

// Check if IndexedDB is available
function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

// Fallback to localStorage
function getProjectsFromLocalStorage(): EditorProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveProjectsToLocalStorage(projects: EditorProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Failed to save projects to localStorage:', error);
  }
}

// Main API
export async function getAllProjects(): Promise<EditorProject[]> {
  if (!isIndexedDBAvailable()) {
    return getProjectsFromLocalStorage();
  }
  
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const projects = request.result || [];
        // Sort by updatedAt descending
        projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(projects);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return getProjectsFromLocalStorage();
  }
}

export async function getProject(id: string): Promise<EditorProject | null> {
  if (!isIndexedDBAvailable()) {
    const projects = getProjectsFromLocalStorage();
    return projects.find(p => p.id === id) || null;
  }
  
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    const projects = getProjectsFromLocalStorage();
    return projects.find(p => p.id === id) || null;
  }
}

export async function saveProject(project: EditorProject): Promise<void> {
  project.updatedAt = new Date().toISOString();
  
  if (!isIndexedDBAvailable()) {
    const projects = getProjectsFromLocalStorage();
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    saveProjectsToLocalStorage(projects);
    return;
  }
  
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(project);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback to localStorage
    const projects = getProjectsFromLocalStorage();
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    saveProjectsToLocalStorage(projects);
  }
}

export async function deleteProject(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    const projects = getProjectsFromLocalStorage();
    saveProjectsToLocalStorage(projects.filter(p => p.id !== id));
    return;
  }
  
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    const projects = getProjectsFromLocalStorage();
    saveProjectsToLocalStorage(projects.filter(p => p.id !== id));
  }
}

export async function duplicateProject(id: string): Promise<EditorProject | null> {
  const original = await getProject(id);
  if (!original) return null;
  
  const duplicate: EditorProject = {
    ...original,
    id: Date.now().toString(),
    title: `${original.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await saveProject(duplicate);
  return duplicate;
}

export async function renameProject(id: string, newTitle: string): Promise<void> {
  const project = await getProject(id);
  if (project) {
    project.title = newTitle;
    await saveProject(project);
  }
}

export function createNewProject(): EditorProject {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  return {
    id: Date.now().toString(),
    title: `Project ${dateStr}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
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
        video.currentTime = 0.5; // Capture frame at 0.5s
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
