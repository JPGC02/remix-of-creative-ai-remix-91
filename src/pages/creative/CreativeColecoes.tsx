import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderPlus } from 'lucide-react';
import { useStudioCollections } from '@/hooks/useStudioCollections';
import { CollectionCard } from '@/components/studio/CollectionCard';
import { CollectionDetailView } from '@/components/studio/CollectionDetailView';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const colorOptions = [
  { value: 'red', class: 'bg-red-500' },
  { value: 'blue', class: 'bg-blue-500' },
  { value: 'purple', class: 'bg-purple-500' },
  { value: 'green', class: 'bg-emerald-500' },
  { value: 'orange', class: 'bg-orange-500' },
  { value: 'pink', class: 'bg-pink-500' },
];

const CreativeColecoes = () => {
  const {
    collections,
    loading,
    createCollection,
    deleteCollection,
    renameCollection,
    removeFromCollection,
    loadCollectionItems,
  } = useStudioCollections();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const navigate = useNavigate();

  const selectedCollection = collections.find(c => c.id === selectedId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCollection(newName.trim(), newColor);
    setNewName('');
    setNewColor('blue');
    setCreateOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deletar esta coleção?')) {
      await deleteCollection(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const createModal = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="max-w-sm bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <FolderPlus className="w-5 h-5" /> Nova Coleção
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            placeholder="Nome da coleção"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
            className="bg-zinc-950 border-zinc-800"
          />
          <div>
            <p className="text-sm text-zinc-500 mb-2">Cor</p>
            <div className="flex gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`w-8 h-8 rounded-full ${c.class} transition-all ${newColor === c.value ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-50 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={!newName.trim()}>
            Criar Coleção
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Empty state
  if (!loading && collections.length === 0) {
    return (
      <div className="fixed inset-0 top-[72px] bg-zinc-950 flex items-center justify-center">
        {createModal}
        <div className="flex flex-col items-center text-center">
          <FolderPlus className="w-12 h-12 text-zinc-700" />
          <h2 className="text-xl text-zinc-300 font-medium mt-4">Organize suas criações</h2>
          <p className="text-sm text-zinc-500 mt-2">Crie coleções para agrupar suas imagens e vídeos</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
          >
            + Criar primeira coleção
          </button>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedId && selectedCollection) {
    return (
      <div className="fixed inset-0 top-[72px] bg-zinc-950 overflow-auto">
        {createModal}
        <div className="max-w-[960px] mx-auto px-4 py-6">
          <CollectionDetailView
            collection={selectedCollection}
            onBack={() => setSelectedId(null)}
            onRename={renameCollection}
            onDelete={handleDelete}
            loadItems={loadCollectionItems}
            onRemoveItem={removeFromCollection}
            onNavigateToCreate={() => navigate('/creative/studio')}
          />
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="fixed inset-0 top-[72px] bg-zinc-950 overflow-auto">
      {createModal}
      <div className="max-w-[960px] mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Biblioteca</h1>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-xl px-4 py-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova coleção
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {collections.map((col, i) => (
            <CollectionCard
              key={col.id}
              collection={col}
              index={i}
              onClick={() => setSelectedId(col.id)}
              onRename={renameCollection}
              onDelete={handleDelete}
            />
          ))}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: collections.length * 0.05 }}
            onClick={() => setCreateOpen(true)}
            className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 aspect-[4/3] cursor-pointer"
          >
            <Plus className="w-6 h-6 text-zinc-600" />
            <span className="text-sm text-zinc-600">Nova coleção</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CreativeColecoes;
