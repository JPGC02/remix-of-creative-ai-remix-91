import { useState, useEffect } from 'react';
import { Folder, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioFeedItem } from './StudioFeedItem';
import type { StudioCollection } from '@/hooks/useStudioCollections';
import type { StudioResult } from './StudioSidebar';

const gradientMap: Record<string, string> = {
  red: 'from-red-500 to-rose-600',
  blue: 'from-blue-500 to-cyan-600',
  purple: 'from-purple-500 to-violet-600',
  green: 'from-emerald-500 to-teal-600',
  orange: 'from-orange-500 to-amber-600',
  pink: 'from-pink-500 to-fuchsia-600',
};

interface CollectionGridProps {
  collections: StudioCollection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loadItems: (collectionId: string) => Promise<any[]>;
}

export const CollectionGrid = ({ collections, selectedId, onSelect, loadItems }: CollectionGridProps) => {
  const [items, setItems] = useState<StudioResult[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const selectedCollection = collections.find(c => c.id === selectedId);

  useEffect(() => {
    if (!selectedId) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    loadItems(selectedId).then((data) => {
      setItems(data.map((g: any) => ({
        id: g.id,
        type: g.type as 'image' | 'text' | 'video',
        prompt: g.prompt,
        result: g.result,
        provider: g.provider,
        createdAt: new Date(g.created_at),
      })));
    }).finally(() => setLoadingItems(false));
  }, [selectedId, loadItems]);

  // Grid view - show all folders
  if (!selectedId) {
    return (
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 overflow-auto">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Suas Pastas</h2>
        <p className="text-xs text-zinc-500 mb-6">Clique em uma pasta para ver o conteúdo</p>

        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60%] text-zinc-600">
            <Folder className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm">Nenhuma pasta criada ainda</p>
            <p className="text-xs mt-1">Crie uma pasta na sidebar ao lado</p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => onSelect(col.id)}
                className="group relative aspect-square rounded-2xl overflow-hidden transition-transform hover:scale-105"
              >
                {/* Stacked card effect */}
                <div className={`absolute inset-2 rounded-xl bg-gradient-to-br ${gradientMap.blue} opacity-40 rotate-3`} />
                <div className={`absolute inset-1 rounded-xl bg-gradient-to-br ${gradientMap.blue} opacity-60 -rotate-2`} />
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradientMap.blue} flex flex-col items-center justify-center gap-2`}>
                  <Folder className="w-10 h-10 text-white/90" />
                  <span className="text-white font-medium text-sm px-2 text-center line-clamp-2">{col.name}</span>
                  <span className="text-white/60 text-xs">{col.item_count} itens</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Collection detail view
  return (
    <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-zinc-800">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800" onClick={() => onSelect(null)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold text-zinc-100">{selectedCollection?.name}</h2>
        <span className="text-xs text-zinc-500">{items.length} itens</span>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {loadingItems ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Folder className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Pasta vazia</p>
            <p className="text-xs mt-1">Adicione itens pelo Studio</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {items.map((item, i) => (
              <div key={item.id} className="break-inside-avoid">
                <StudioFeedItem item={item} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
