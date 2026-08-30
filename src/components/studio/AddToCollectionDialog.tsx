import { useState, useEffect, useMemo } from 'react';
import { FolderPlus, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioCollections } from '@/hooks/useStudioCollections';

interface AddToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationId: string;
}

const colorOptions = [
  { value: 'red', class: 'bg-red-500' },
  { value: 'blue', class: 'bg-blue-500' },
  { value: 'purple', class: 'bg-purple-500' },
  { value: 'green', class: 'bg-emerald-500' },
  { value: 'orange', class: 'bg-orange-500' },
  { value: 'pink', class: 'bg-pink-500' },
];

export const AddToCollectionDialog = ({ open, onOpenChange, generationId }: AddToCollectionDialogProps) => {
  const { collections, loadCollections, createCollection, addToCollection } = useStudioCollections();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      loadCollections();
      setSelectedId(null);
      setShowCreate(false);
      setSearch('');
      setSaving(false);
    }
  }, [open, loadCollections]);

  const filtered = useMemo(() => {
    if (!search.trim()) return collections;
    const q = search.toLowerCase();
    return collections.filter(c => c.name.toLowerCase().includes(q));
  }, [collections, search]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    await addToCollection(selectedId, generationId);
    setSaving(false);
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCollection(newName.trim(), newColor);
    setNewName('');
    setShowCreate(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" /> Salvar em Coleção
          </DialogTitle>
        </DialogHeader>

        {collections.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              placeholder="Buscar coleção..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-950 border-zinc-800 h-9 text-sm"
            />
          </div>
        )}

        <ScrollArea className="max-h-60">
          <div className="space-y-1 pr-2">
            {filtered.map((col) => (
              <button
                key={col.id}
                onClick={() => setSelectedId(col.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${selectedId === col.id ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-zinc-800 border border-transparent'}`}
              >
                <Checkbox checked={selectedId === col.id} />
                <span className="flex-1 text-left truncate">{col.name}</span>
                <span className="text-xs text-muted-foreground">{col.item_count}</span>
              </button>
            ))}

            {filtered.length === 0 && search && (
              <p className="text-sm text-zinc-600 text-center py-4">Nenhuma coleção encontrada</p>
            )}

            {collections.length === 0 && !showCreate && (
              <p className="text-sm text-zinc-600 text-center py-4">Nenhuma coleção ainda</p>
            )}
          </div>
        </ScrollArea>

        <Button onClick={handleSave} disabled={!selectedId || saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
          {saving ? 'Salvando...' : 'Salvar na coleção'}
        </Button>

        {showCreate ? (
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <Input
              placeholder="Nome da pasta"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              className="bg-zinc-950 border-zinc-800"
            />
            <div className="flex gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`w-6 h-6 rounded-full ${c.class} transition-all ${newColor === c.value ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-zinc-900' : 'opacity-50 hover:opacity-100'}`}
                />
              ))}
            </div>
            <Button onClick={handleCreate} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={!newName.trim()}>
              Criar e Adicionar
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> Criar nova pasta
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};