import { useEffect, useCallback, useState } from 'react';
import { X, Download, Copy, Heart, Trash2, ChevronLeft, ChevronRight, ImageIcon, FolderPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AddToCollectionDialog } from './AddToCollectionDialog';
import type { StudioResult } from './StudioPromptBar';

interface StudioLightboxProps {
  results: StudioResult[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string, isFav: boolean) => void;
  isFavorite?: boolean;
  onUseAsReference?: (url: string) => void;
}

export const StudioLightbox = ({
  results, currentIndex, onClose, onNavigate, onDelete, onToggleFavorite, isFavorite, onUseAsReference,
}: StudioLightboxProps) => {
  const current = results[currentIndex];
  const isVideo = current?.type === 'video';
  const [collectionOpen, setCollectionOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
    if (e.key === 'ArrowRight' && currentIndex < results.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, results.length, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!current) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(current.result);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-${current.id}.${isVideo ? 'mp4' : 'png'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(current.result, '_blank');
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(current.prompt);
    toast({ title: 'Prompt copiado!' });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10">
        <X className="w-6 h-6" />
      </button>

      {/* Nav arrows */}
      {currentIndex > 0 && (
        <button onClick={() => onNavigate(currentIndex - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors z-10">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {currentIndex < results.length - 1 && (
        <button onClick={() => onNavigate(currentIndex + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors z-10">
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Content */}
      <div className="flex flex-col items-center gap-4 max-w-[90vw] animate-in zoom-in-95 duration-300">
        {isVideo ? (
          <video src={current.result} controls autoPlay className="max-w-[90vw] max-h-[75vh] rounded-xl" />
        ) : (
          <img src={current.result} alt={current.prompt} className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl" />
        )}

        {/* Prompt */}
        <p className="text-sm text-zinc-300 text-center max-w-[600px] line-clamp-3">{current.prompt}</p>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap justify-center">
          <ActionButton icon={Download} label="Download" onClick={handleDownload} />
          <ActionButton icon={Copy} label="Copiar prompt" onClick={handleCopyPrompt} />
          <ActionButton icon={FolderPlus} label="Salvar em coleção" onClick={() => setCollectionOpen(true)} />
          {onUseAsReference && !isVideo && (
            <ActionButton icon={ImageIcon} label="Usar como referência" onClick={() => { onUseAsReference(current.result); onClose(); }} />
          )}
          {onToggleFavorite && (
            <ActionButton
              icon={Heart}
              label={isFavorite ? 'Remover favorito' : 'Favoritar'}
              onClick={() => onToggleFavorite(current.id, !isFavorite)}
              active={isFavorite}
            />
          )}
          {onDelete && (
            <ActionButton icon={Trash2} label="Deletar" onClick={() => { onDelete(current.id); onClose(); }} destructive />
          )}
        </div>

        <AddToCollectionDialog
          open={collectionOpen}
          onOpenChange={setCollectionOpen}
          generationId={current.id}
        />
      </div>
    </div>
  );
};

function ActionButton({ icon: Icon, label, onClick, active, destructive }: {
  icon: React.ElementType; label: string; onClick: () => void; active?: boolean; destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
        destructive
          ? 'bg-zinc-800/80 hover:bg-red-500/20 text-zinc-300 hover:text-red-400'
          : active
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
