import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Heart, Trash2, FolderPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AddToCollectionDialog } from './AddToCollectionDialog';
import { downloadImage } from '@/lib/utils';
import type { StudioResult } from './StudioSidebar';

interface StudioFeedGroupProps {
  items: StudioResult[];
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  favoriteIds?: Set<string>;
}

export const StudioFeedGroup = ({ items, onDelete, onToggleFavorite, favoriteIds = new Set() }: StudioFeedGroupProps) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [collectionItemId, setCollectionItemId] = useState<string | null>(null);

  const cols = items.length <= 2 ? items.length : 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all"
    >
      {/* Prompt Header */}
      <div className="px-3 py-2 border-b border-zinc-800/50 h-[4rem] overflow-hidden">
        <p className="text-xs text-zinc-500 line-clamp-2">{items[0].prompt}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-500">{items[0].provider}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-500">{items.length} imagens</Badge>
        </div>
      </div>

      {/* Image Grid */}
      <div className={`grid gap-0.5 aspect-square ${cols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {items.map((item, i) => (
          <div
            key={item.id}
            className="relative overflow-hidden cursor-pointer"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => setLightboxIdx(i)}
          >
            <img src={item.result} alt={item.prompt} className="w-full h-full object-cover" />
            {hoveredIdx === i && (
              <div className="absolute inset-0 bg-black/50 flex items-end justify-center p-2 transition-opacity pointer-events-none">
                <div className="flex gap-1.5 pointer-events-auto">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    onClick={(e) => { e.stopPropagation(); downloadImage(item.result, `studio-image-${Date.now()}.png`); }}
                  >
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                  {onToggleFavorite && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id, !favoriteIds.has(item.id)); }}
                    >
                      <Heart className={`w-3 h-3 ${favoriteIds.has(item.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    onClick={(e) => { e.stopPropagation(); setCollectionItemId(item.id); }}
                  >
                    <FolderPlus className="w-3 h-3" />
                  </Button>
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIdx !== null} onOpenChange={(open) => { if (!open) setLightboxIdx(null); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 bg-black/95 border-none overflow-hidden flex flex-col items-center justify-center">
          <DialogTitle className="sr-only">Visualizar imagem</DialogTitle>
          {lightboxIdx !== null && (
            <>
              <div className="relative flex items-center justify-center w-full">
                {items.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute left-2 z-10 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => setLightboxIdx((lightboxIdx - 1 + items.length) % items.length)}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <img
                  src={items[lightboxIdx].result}
                  alt={items[lightboxIdx].prompt}
                  className="max-w-[90vw] max-h-[80vh] object-contain"
                />
                {items.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 z-10 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => setLightboxIdx((lightboxIdx + 1) % items.length)}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                )}
              </div>
              <div className="w-full px-4 py-3 flex items-center gap-3">
                <p className="text-white/70 text-xs line-clamp-2 flex-1">{items[lightboxIdx].prompt}</p>
                <span className="text-white/40 text-xs shrink-0">{lightboxIdx + 1}/{items.length}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs shrink-0"
                  onClick={() => downloadImage(items[lightboxIdx!].result, `studio-image-${Date.now()}.png`)}
                >
                  <Download className="w-3 h-3 mr-1" /> Download
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Collection Dialog */}
      <AddToCollectionDialog
        open={collectionItemId !== null}
        onOpenChange={(open) => { if (!open) setCollectionItemId(null); }}
        generationId={collectionItemId ?? ''}
      />
    </motion.div>
  );
};
