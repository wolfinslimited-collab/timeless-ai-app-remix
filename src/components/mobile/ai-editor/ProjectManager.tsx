import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  MoreVertical, 
  Video, 
  Calendar,
  Pencil,
  Copy,
  Trash2,
  FolderOpen,
  Clock,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EditorProject } from './types';
import { 
  getAllProjects, 
  deleteProject, 
  duplicateProject, 
  renameProject, 
  createNewProject,
  saveProject,
  generateThumbnail,
  saveVideoFile,
  getVideoFile,
  deleteVideoFile,
} from './projectStorage';

interface ProjectManagerProps {
  onBack: () => void;
  onOpenProject: (project: EditorProject) => void;
  onNewProject: (project: EditorProject, file: File) => void;
}

export function ProjectManager({ onBack, onOpenProject, onNewProject }: ProjectManagerProps) {
  const [projects, setProjects] = useState<EditorProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const allProjects = await getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast({ title: 'Failed to load projects', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const newProject = createNewProject();
        const localUrl = URL.createObjectURL(file);
        newProject.videoUrl = localUrl;
        
        // Generate thumbnail
        const thumbnail = await generateThumbnail(localUrl);
        if (thumbnail) {
          newProject.thumbnail = thumbnail;
        }
        
        await saveProject(newProject);
        // Cache the video file in IndexedDB for future sessions
        await saveVideoFile(newProject.id, file);
        onNewProject(newProject, file);
      }
    };
    input.click();
  };

  const handleOpenProject = async (project: EditorProject) => {
    // Always use onOpenProject for existing projects so full state is restored
    onOpenProject(project);
  };

  const handleRename = async () => {
    if (!renameProjectId || !renameValue.trim()) return;
    
    try {
      await renameProject(renameProjectId, renameValue.trim());
      await loadProjects();
      toast({ title: 'Project renamed' });
    } catch (error) {
      toast({ title: 'Failed to rename project', variant: 'destructive' });
    }
    
    setRenameDialogOpen(false);
    setRenameProjectId(null);
    setRenameValue('');
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateProject(id);
      await loadProjects();
      toast({ title: 'Project duplicated' });
    } catch (error) {
      toast({ title: 'Failed to duplicate project', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteProjectId) return;
    
    try {
      await deleteVideoFile(deleteProjectId);
      await deleteProject(deleteProjectId);
      await loadProjects();
      toast({ title: 'Project deleted' });
    } catch (error) {
      toast({ title: 'Failed to delete project', variant: 'destructive' });
    }
    
    setDeleteDialogOpen(false);
    setDeleteProjectId(null);
  };

  const openRenameDialog = (project: EditorProject) => {
    setRenameProjectId(project.id);
    setRenameValue(project.title);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeleteProjectId(id);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-foreground font-semibold text-lg">AI Editor</h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* New Project Button */}
        <button
          onClick={handleNewProject}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 mb-6 bg-gradient-to-r from-primary via-primary/90 to-primary rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-left">
            <p className="text-primary-foreground font-semibold text-base">New Project</p>
            <p className="text-primary-foreground/70 text-sm">Select a video to start editing</p>
          </div>
          <Sparkles className="w-5 h-5 text-primary-foreground/60 ml-auto" />
        </button>

        {/* Recent Projects Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-foreground font-medium text-sm">Recent Projects</h2>
            <span className="text-muted-foreground text-xs">({projects.length})</span>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">No projects yet</p>
              <p className="text-muted-foreground text-sm">Create a new project to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-card/50 rounded-xl border border-border/30 overflow-hidden group hover:border-primary/30 transition-colors"
                >
                  {/* Thumbnail */}
                  <button
                    onClick={() => handleOpenProject(project)}
                    className="w-full aspect-video bg-muted/50 relative overflow-hidden"
                  >
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    )}
                    {/* AI badge - show if project has AI-generated layers */}
                    {(project.effectLayers?.some(e => e.effectId === 'ai-generated') || project.videoClips?.some(c => c.aiEnhanced)) && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span className="text-[9px] font-semibold text-amber-400">AI</span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Video className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </button>
                  
                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium text-sm truncate">{project.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <p className="text-muted-foreground text-xs truncate">
                            {formatDate(project.updatedAt)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => openRenameDialog(project)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(project.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(project.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Project name"
            className="mt-2"
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This action cannot be undone. The project and all its edits will be permanently deleted.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
