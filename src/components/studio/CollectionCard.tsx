import { useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, MoreHorizontal, Pencil, Trash2, Video } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StudioCollection } from '@/hooks/useStudioCollections';

interface CollectionCardProps {
  collection: StudioCollection & { preview_urls?: string[] };
  index: number;
  onClick: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

const PreviewItem = ({ url }: { url: string }) => {
  if (isVideoUrl(url)) {
    return (
      <div className="relative w-full h-full bg-zinc-900">
        <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="w-4 h-4 text-white/60" />
        </div>
      </div>
    );
  }
  return <img src={url} alt="" className="w-full h-full object-cover" />;
};

const PreviewMosaic = ({ urls }: { urls: string[] }) => {
  const previews = urls.slice(0, 4);

  if (previews.length === 0) {
    return (
      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
        <ImagePlus className="w-8 h-8 text-zinc-700" />
      </div>
    );
  }

  if (previews.length === 1) {
    return <PreviewItem url={previews[0]} />;
  }

  if (previews.length === 2) {
    return (
      <div className="w-full h-full flex gap-0.5">
        {previews.map((url, i) => (
          <div key={i} className="w-1/2 h-full"><PreviewItem url={url} /></div>
        ))}
      </div>
    );
  }

  if (previews.length === 3) {
    return (
      <div className="w-full h-full flex gap-0.5">
        <div className="w-[60%] h-full"><PreviewItem url={previews[0]} /></div>
        <div className="w-[40%] flex flex-col gap-0.5">
          <div className="w-full h-1/2"><PreviewItem url={previews[1]} /></div>
          <div className="w-full h-1/2"><PreviewItem url={previews[2]} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
      {previews.map((url, i) => (
        <div key={i} className="w-full h-full"><PreviewItem url={url} /></div>
      ))}
    </div>
  );
};

export const CollectionCard = ({ collection, index, onClick, onRename, onDelete }: CollectionCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const previewUrls = (collection as any).preview_urls || [];
  const count = collection.item_count;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl overflow-hidden cursor-pointer group border border-zinc-800/50 bg-zinc-950 hover:border-zinc-700 transition-all duration-200 hover:scale-[1.02]"
      onClick={() => !menuOpen && onClick()}
    >
      {/* Preview area */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <PreviewMosaic urls={previewUrls} />

        {/* Menu button on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm text-white/80 hover:bg-black/70 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-zinc-900 border-zinc-800 rounded-xl shadow-2xl p-1 min-w-[160px]"
            >
              <DropdownMenuItem
                className="px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  const newName = prompt('Novo nome:', collection.name);
                  if (newName && newName.trim()) onRename(collection.id, newName.trim());
                }}
              >
                <Pencil className="w-3.5 h-3.5" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                className="px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 cursor-pointer gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(collection.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-zinc-100 line-clamp-1">{collection.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {count === 1 ? '1 item' : `${count} itens`}
        </p>
      </div>
    </motion.div>
  );
};
