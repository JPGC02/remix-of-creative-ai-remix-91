import { useState, useMemo } from 'react';
import { Sparkles, Search, ImageIcon, Type, Video, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StudioFeedItem } from './StudioFeedItem';
import { StudioFeedGroup } from './StudioFeedGroup';
import type { StudioResult } from './StudioSidebar';

type FilterType = 'all' | 'image' | 'text' | 'video' | 'favorites';

interface StudioFeedProps {
  results: StudioResult[];
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  favoriteIds?: Set<string>;
}

const filterChips: { key: FilterType; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Todos', icon: null },
  { key: 'image', label: 'Imagem', icon: <ImageIcon className="w-3 h-3" /> },
  { key: 'text', label: 'Texto', icon: <Type className="w-3 h-3" /> },
  { key: 'video', label: 'Vídeo', icon: <Video className="w-3 h-3" /> },
  { key: 'favorites', label: 'Favoritos', icon: <Heart className="w-3 h-3" /> },
];

type GroupedEntry =
  | { type: 'single'; item: StudioResult; key: string }
  | { type: 'batch'; items: StudioResult[]; key: string };

export const StudioFeed = ({ results, onDelete, onToggleFavorite, favoriteIds = new Set() }: StudioFeedProps) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filtered = results.filter((item) => {
    if (activeFilter === 'favorites' && !favoriteIds.has(item.id)) return false;
    if (activeFilter !== 'all' && activeFilter !== 'favorites' && item.type !== activeFilter) return false;
    if (search && !item.prompt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedItems = useMemo<GroupedEntry[]>(() => {
    const batchMap = new Map<string, StudioResult[]>();
    const order: string[] = [];

    for (const item of filtered) {
      if (item.batchId) {
        if (!batchMap.has(item.batchId)) {
          batchMap.set(item.batchId, []);
          order.push(`batch:${item.batchId}`);
        }
        batchMap.get(item.batchId)!.push(item);
      } else {
        order.push(`single:${item.id}`);
      }
    }

    return order.map((key): GroupedEntry => {
      if (key.startsWith('batch:')) {
        const batchId = key.slice(6);
        const items = batchMap.get(batchId)!;
        if (items.length === 1) {
          return { type: 'single', item: items[0], key: items[0].id };
        }
        return { type: 'batch', items, key: batchId };
      }
      const item = filtered.find((i) => i.id === key.slice(7))!;
      return { type: 'single', item, key: item.id };
    });
  }, [filtered]);

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="p-4 rounded-2xl bg-zinc-800/30 mb-4">
          <Sparkles className="w-10 h-10 text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-zinc-500">Nenhuma criação ainda</h3>
        <p className="text-sm text-zinc-600 mt-1 max-w-xs">
          Use os controles ao lado para gerar imagens, textos ou vídeos
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search & Filters */}
      <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            placeholder="Buscar por prompt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeFilter === chip.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
              }`}
            >
              {chip.icon}
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="p-4">
        {groupedItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">
            Nenhum resultado encontrado
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {groupedItems.map((entry, index) =>
              entry.type === 'single' ? (
                <StudioFeedItem
                  key={entry.key}
                  item={entry.item}
                  index={index}
                  onDelete={onDelete}
                  isFavorite={favoriteIds.has(entry.item.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ) : (
                <StudioFeedGroup
                  key={entry.key}
                  items={entry.items}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                  favoriteIds={favoriteIds}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};
