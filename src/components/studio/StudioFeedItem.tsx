import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Copy, Check, ChevronDown, ChevronUp, ImageIcon, Type, Video, Trash2, Heart, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { downloadImage } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { AddToCollectionDialog } from './AddToCollectionDialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { StudioResult } from './StudioSidebar';

interface StudioFeedItemProps {
  item: StudioResult;
  index: number;
  onDelete?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
}

export const StudioFeedItem = ({ item, index, onDelete, isFavorite = false, onToggleFavorite }: StudioFeedItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadVideo = async () => {
    try {
      const res = await fetch(item.result);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Erro ao baixar vídeo', variant: 'destructive' });
    }
  };

  const typeConfig = {
    image: { icon: ImageIcon, label: 'Imagem', color: 'text-accent' },
    text: { icon: Type, label: 'Texto', color: 'text-primary' },
    video: { icon: Video, label: 'Vídeo', color: 'text-chart-2' },
  };

  const config = typeConfig[item.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all"
    >
      {/* Image with prompt header + overlay */}
      {item.type === 'image' && (
        <>
          <div className="px-3 py-2 border-b border-zinc-800/50 h-[4rem] overflow-hidden">
            <p className="text-xs text-zinc-500 line-clamp-2">{item.prompt}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-500">{item.provider}</Badge>
              {imgDims && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-500">{imgDims.w} × {imgDims.h}</Badge>}
            </div>
          </div>
          <div className="relative cursor-pointer" onClick={() => setLightboxOpen(true)}>
            <img
              src={item.result}
              alt={item.prompt}
              className="w-full aspect-square object-cover"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3 pointer-events-none">
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
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id, !isFavorite); }}
                  >
                    <Heart className={`w-3 h-3 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                  onClick={(e) => { e.stopPropagation(); setCollectionDialogOpen(true); }}
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
          </div>
        </>
      )}

      {/* Video */}
      {item.type === 'video' && (
        <div className="relative">
          <video src={item.result} controls className="w-full h-auto" />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
            <Button size="sm" variant="secondary" className="h-7 text-xs bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800" onClick={handleDownloadVideo}>
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0 bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              onClick={() => setCollectionDialogOpen(true)}
            >
              <FolderPlus className="w-3 h-3" />
            </Button>
            {onToggleFavorite && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 w-7 p-0 bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                onClick={() => onToggleFavorite(item.id, !isFavorite)}
              >
                <Heart className={`w-3 h-3 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 w-7 p-0 bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Text */}
      {item.type === 'text' && (
        <div className="p-4">
          <div className={`text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap ${expanded ? '' : 'line-clamp-4'}`}>
            {item.result}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {expanded ? 'Menos' : 'Mais'}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        </div>
      )}

      {/* Footer - only for non-image (images show info in overlay) */}
      {item.type !== 'image' && (
        <div className="px-3 py-2 border-t border-zinc-800/50 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-500">
            <Icon className={`w-2.5 h-2.5 ${config.color}`} />
            {config.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-500">{item.provider}</Badge>
          <p className="text-[10px] text-zinc-500 truncate flex-1 ml-1">{item.prompt}</p>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
            onClick={() => setCollectionDialogOpen(true)}
          >
            <FolderPlus className="w-3 h-3" />
          </Button>

          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 transition-colors ${isFavorite ? 'text-red-500' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500'}`}
              onClick={() => onToggleFavorite(item.id, !isFavorite)}
            >
              <Heart className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      <AddToCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        generationId={item.id}
      />

      {item.type === 'image' && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 bg-black/95 border-none overflow-hidden flex flex-col items-center justify-center">
            <DialogTitle className="sr-only">Visualizar imagem</DialogTitle>
            <img
              src={item.result}
              alt={item.prompt}
              className="max-w-[90vw] max-h-[80vh] object-contain"
            />
            <div className="w-full px-4 py-3 flex items-center gap-3">
              <p className="text-white/70 text-xs line-clamp-2 flex-1">{item.prompt}</p>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs shrink-0"
                onClick={() => downloadImage(item.result, `studio-image-${Date.now()}.png`)}
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
