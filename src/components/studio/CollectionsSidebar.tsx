import { useState } from 'react';
import { FolderPlus, Folder, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { StudioCollection } from '@/hooks/useStudioCollections';

const colorOptions = [
  { value: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { value: 'green', label: 'Verde', class: 'bg-emerald-500' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
];

const folderColorMap: Record<string, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  green: 'text-emerald-400',
  orange: 'text-orange-400',
  pink: 'text-pink-400',
};

interface CollectionsSidebarProps {
  collections: StudioCollection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const CollectionsSidebar = ({ collections, selectedId, onSelect, onCreate, onDelete }: CollectionsSidebarProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onCreate(name.trim(), color);
    setName('');
    setColor('blue');
    setOpen(false);
  };

  return (
    <div className="w-[340px] shrink-0 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
      <div className="p-5 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-100">Biblioteca</h2>
        <p className="text-xs text-zinc-500 mt-1">Organize seus conteúdos em pastas</p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mt-4 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl" size="sm">
              <FolderPlus className="w-4 h-4" /> Nova Pasta
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Criar Nova Pasta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Nome da pasta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="bg-zinc-950 border-zinc-800 text-zinc-300"
              />
              <div>
                <p className="text-sm text-zinc-500 mb-2">Cor</p>
                <div className="flex gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full ${c.class} transition-all ${color === c.value ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={!name.trim()}>
                Criar Pasta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              selectedId === null ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span className="flex-1 text-left">Todas as Pastas</span>
            <span className="text-xs opacity-60">{collections.length}</span>
          </button>

          {collections.map((col) => (
            <div
              key={col.id}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                selectedId === col.id ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
              onClick={() => onSelect(col.id)}
            >
              <Folder className="w-4 h-4 text-blue-400" />
              <span className="flex-1 text-left truncate">{col.name}</span>
              <span className="text-xs opacity-60">{col.item_count}</span>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-500 p-0.5"
                onClick={(e) => { e.stopPropagation(); onDelete(col.id); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
