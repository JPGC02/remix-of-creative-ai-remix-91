import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ImagePlus, MoreHorizontal, Pencil, Trash2, Download, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { downloadImage } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { StudioCollection } from '@/hooks/useStudioCollections';

interface StudioResult {
  id: string;
  type: 'image' | 'text' | 'video';
  prompt: string;
  result: string;
  provider: string;
  createdAt: Date;
}

interface CollectionDetailViewProps {
  collection: StudioCollection;
  onBack: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  loadItems: (collectionId: string) => Promise<any[]>;
  onRemoveItem?: (collectionId: string, generationId: string) => void;
  onNavigateToCreate?: () => void;
}

export const CollectionDetailView = ({
  collection,
  onBack,
  onRename,
  onDelete,
  loadItems,
  onRemoveItem,
  onNavigateToCreate,
}: CollectionDetailViewProps) => {
  const [items, setItems] = useState<StudioResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<StudioResult | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const data = await loadItems(collection.id);
    setItems(
      data.map((g: any) => ({
        id: g.id,
        type: g.type as 'image' | 'text' | 'video',
        prompt: g.prompt,
        result: g.result,
        provider: g.provider,
        createdAt: new Date(g.created_at),
      }))
    );
    setLoading(false);
  }, [collection.id, loadItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRemove = async (generationId: string) => {
    if (onRemoveItem) {
      onRemoveItem(collection.id, generationId);
      setItems((prev) => prev.filter((i) => i.id !== generationId));
      toast({ title: 'Removido da coleção' });
    }
  };

  const handleDownloadItem = async (item: StudioResult) => {
    try {
      const res = await fetch(item.result);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collection-${Date.now()}.${item.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.result, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white ml-3">{collection.name}</h2>
          <span className="text-sm text-zinc-500 ml-2">{items.length} itens</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-zinc-900 border-zinc-800 rounded-xl shadow-2xl p-1 min-w-[160px]"
          >
            <DropdownMenuItem
              className="px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer gap-2"
              onClick={() => {
                const newName = prompt('Novo nome:', collection.name);
                if (newName?.trim()) onRename(collection.id, newName.trim());
              }}
            >
              <Pencil className="w-3.5 h-3.5" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              className="px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 cursor-pointer gap-2"
              onClick={() => {
                onDelete(collection.id);
                onBack();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Deletar coleção
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <ImagePlus className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-400 mt-3">Nenhum item nesta coleção</p>
          <p className="text-zinc-600 text-sm mt-1">Adicione itens a partir das suas criações</p>
          {onNavigateToCreate && (
            <Button
              className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-sm"
              onClick={onNavigateToCreate}
            >
              Ir para Criar
            </Button>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="break-inside-avoid group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/50"
            >
              {item.type === 'image' && (
                <img
                  src={item.result}
                  alt={item.prompt}
                  className="w-full object-cover cursor-pointer"
                  onClick={() => setLightboxItem(item)}
                />
              )}
              {item.type === 'video' && (
                <div className="relative cursor-pointer" onClick={() => setLightboxItem(item)}>
                  <video src={item.result} className="w-full" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                <div className="flex gap-1 pointer-events-auto">
                  <button
                    className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm text-white/80 hover:bg-black/80 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadItem(item);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {onRemoveItem && (
                    <button
                      className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm text-white/80 hover:bg-red-500/80 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item.id);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Prompt tooltip on hover */}
              {item.prompt && (
                <div className="absolute top-2 left-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-[10px] text-white/70 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 line-clamp-2">
                    {item.prompt}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem && (
        <Dialog open={!!lightboxItem} onOpenChange={() => setLightboxItem(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 bg-black/95 border-none overflow-hidden flex flex-col items-center justify-center">
            <DialogTitle className="sr-only">Visualizar {lightboxItem.type === 'video' ? 'vídeo' : 'imagem'}</DialogTitle>
            {lightboxItem.type === 'video' ? (
              <video
                src={lightboxItem.result}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[80vh] rounded-xl"
              />
            ) : (
              <img
                src={lightboxItem.result}
                alt={lightboxItem.prompt}
                className="max-w-[90vw] max-h-[80vh] object-contain"
              />
            )}
            <div className="w-full px-4 py-3 flex items-center gap-3">
              <p className="text-white/70 text-xs line-clamp-2 flex-1">{lightboxItem.prompt}</p>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs shrink-0"
                onClick={() => handleDownloadItem(lightboxItem)}
              >
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
};
