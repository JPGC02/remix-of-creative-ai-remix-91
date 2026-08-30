import { useState, useMemo } from 'react';
import { Search, Download, Copy, Heart, Trash2, X, FolderPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StudioLightbox } from './StudioLightbox';
import { AddToCollectionDialog } from './AddToCollectionDialog';
import type { StudioResult } from './StudioPromptBar';

type FilterType = 'all' | 'image' | 'video' | 'favorites';

interface StudioMasonryGalleryProps {
  results: StudioResult[];
  loading: boolean;
  loadingAspectRatio?: string;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFav: boolean) => void;
  favoriteIds: Set<string>;
  onUseAsReference?: (url: string) => void;
}

export const StudioMasonryGallery = ({
  results, loading, loadingAspectRatio, onDelete, onToggleFavorite, favoriteIds, onUseAsReference,
}: StudioMasonryGalleryProps) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let items = results;
    if (filter === 'image') items = items.filter((r) => r.type === 'image');
    else if (filter === 'video') items = items.filter((r) => r.type === 'video');
    else if (filter === 'favorites') items = items.filter((r) => favoriteIds.has(r.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((r) => r.prompt.toLowerCase().includes(q));
    }
    return items;
  }, [results, filter, searchQuery, favoriteIds]);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'image', label: 'Imagens' },
    { id: 'video', label: 'Vídeos' },
    { id: 'favorites', label: 'Favoritos' },
  ];

  const handleDownload = async (result: StudioResult) => {
    try {
      const response = await fetch(result.result);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-${result.id}.${result.type === 'video' ? 'mp4' : 'png'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(result.result, '_blank');
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({ title: 'Prompt copiado!' });
  };

  // Aspect ratio for loading skeleton
  const getSkeletonPadding = () => {
    const map: Record<string, string> = {
      '1:1': '100%', '3:2': '66.67%', '2:3': '150%', '16:9': '56.25%', '9:16': '177.78%',
    };
    return map[loadingAspectRatio || '1:1'] || '100%';
  };

  return (
    <div>
      {/* Filters bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2 mb-6">
        <div className="flex gap-6">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-sm pb-2 transition-colors relative ${
                filter === f.id
                  ? 'text-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label}
              {filter === f.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          {searchOpen && (
            <div className="flex items-center gap-1.5 animate-in slide-in-from-right-4 duration-200">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por prompt..."
                className="text-sm bg-transparent border-none text-zinc-300 placeholder:text-zinc-600 outline-none w-48"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mb-3 break-inside-avoid">
          <div className="relative rounded-xl overflow-hidden bg-zinc-900" style={{ paddingBottom: getSkeletonPadding() }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm text-zinc-500">Criando...</span>
            </div>
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800 overflow-hidden">
              <div className="h-full bg-emerald-500 animate-[shimmer_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
            </div>
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* Masonry grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
        {loading && (
          <div className="break-inside-avoid mb-3">
            <div className="relative rounded-xl overflow-hidden bg-zinc-900" style={{ paddingBottom: getSkeletonPadding() }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-zinc-500">Criando...</span>
              </div>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800 overflow-hidden">
                <div className="h-full bg-emerald-500 w-2/5 animate-pulse" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent animate-pulse" />
            </div>
          </div>
        )}

        {filtered.map((result, index) => (
          <GalleryItem
            key={result.id}
            result={result}
            index={index}
            isFavorite={favoriteIds.has(result.id)}
            onOpen={() => setLightboxIndex(index)}
            onDownload={() => handleDownload(result)}
            onCopyPrompt={() => handleCopyPrompt(result.prompt)}
            onToggleFavorite={() => onToggleFavorite(result.id, !favoriteIds.has(result.id))}
            onDelete={() => onDelete(result.id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-zinc-600 text-sm">
            {results.length === 0 ? 'Nenhuma criação ainda. Comece escrevendo um prompt acima.' : 'Nenhum resultado encontrado.'}
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <StudioLightbox
          results={filtered}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          isFavorite={lightboxIndex !== null && filtered[lightboxIndex] ? favoriteIds.has(filtered[lightboxIndex].id) : false}
          onUseAsReference={onUseAsReference}
        />
      )}
    </div>
  );
};

function GalleryItem({ result, index, isFavorite, onOpen, onDownload, onCopyPrompt, onToggleFavorite, onDelete }: {
  result: StudioResult; index: number; isFavorite: boolean;
  onOpen: () => void; onDownload: () => void; onCopyPrompt: () => void;
  onToggleFavorite: () => void; onDelete: () => void;
}) {
  const isVideo = result.type === 'video';
  const [collectionOpen, setCollectionOpen] = useState(false);

  return (
    <div
      className="break-inside-avoid mb-3 group relative rounded-xl overflow-hidden cursor-pointer animate-in fade-in zoom-in-[0.97] duration-500"
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      onClick={onOpen}
    >
      {isVideo ? (
        <video src={result.result} className="w-full rounded-xl" muted preload="metadata" />
      ) : (
        <img src={result.result} alt={result.prompt} className="w-full rounded-xl" loading="lazy" />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 rounded-xl">
        {/* Prompt */}
        <p className="text-sm text-white line-clamp-2">{result.prompt}</p>

        {/* Bottom bar */}
        <div className="flex items-end justify-between">
          {/* Metadata */}
          <span className="text-xs text-white/60 bg-black/40 rounded-full px-2 py-0.5">
            {result.provider}{isVideo ? ' · vídeo' : ''}
          </span>

          {/* Actions */}
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <OverlayAction icon={Download} onClick={onDownload} />
            <OverlayAction icon={Copy} onClick={onCopyPrompt} />
            <OverlayAction icon={FolderPlus} onClick={() => setCollectionOpen(true)} />
            <OverlayAction icon={Heart} onClick={onToggleFavorite} active={isFavorite} />
            <OverlayAction icon={Trash2} onClick={onDelete} />
          </div>
        </div>
      </div>

      <AddToCollectionDialog
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
        generationId={result.id}
      />
    </div>
  );
}

function OverlayAction({ icon: Icon, onClick, active }: { icon: React.ElementType; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`p-1 rounded-md transition-colors ${active ? 'text-emerald-400' : 'text-white/80 hover:text-white'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
