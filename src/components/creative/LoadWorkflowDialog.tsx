import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, LayoutGrid, List, RefreshCw, GitBranch, ChevronDown } from 'lucide-react';
import { SavedWorkflow } from '@/hooks/useWorkflowPersistence';
import { WorkflowListView } from './WorkflowListView';
import { WorkflowGridView } from './WorkflowGridView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

type ViewMode = 'list' | 'grid';
type SortBy = 'recent' | 'oldest' | 'name' | 'nodes';

const SORT_LABELS: Record<SortBy, string> = {
  recent: 'Recentes',
  oldest: 'Mais antigos',
  name: 'Nome A-Z',
  nodes: 'Maior',
};

interface LoadWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflows: SavedWorkflow[];
  isLoading: boolean;
  onLoad: (workflow: SavedWorkflow) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function LoadWorkflowDialog({
  open,
  onOpenChange,
  workflows,
  isLoading,
  onLoad,
  onDelete,
  onRefresh,
}: LoadWorkflowDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [workflowToDelete, setWorkflowToDelete] = useState<SavedWorkflow | null>(null);

  useEffect(() => {
    if (open) {
      onRefresh();
      setSearchQuery('');
    }
  }, [open, onRefresh]);

  const filtered = useMemo(() => {
    let result = [...workflows];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w =>
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
      );
    }
    switch (sortBy) {
      case 'recent': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'nodes': result.sort((a, b) => (b.nodes?.length || 0) - (a.nodes?.length || 0)); break;
    }
    return result;
  }, [workflows, searchQuery, sortBy]);

  const handleOpen = (workflow: SavedWorkflow) => {
    onLoad(workflow);
    onOpenChange(false);
  };

  const handleDuplicate = async () => {
    // not available in this context
  };

  const handleExportJSON = (workflow: SavedWorkflow) => {
    const data = JSON.stringify({ name: workflow.name, nodes: workflow.nodes, edges: workflow.edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado!');
  };

  const handleConfirmDelete = async () => {
    if (!workflowToDelete) return;
    await onDelete(workflowToDelete.id);
    setWorkflowToDelete(null);
  };

  const sharedProps = {
    workflows: filtered,
    onOpen: handleOpen,
    onDuplicate: handleDuplicate as any,
    onExportJSON: handleExportJSON,
    onDelete: setWorkflowToDelete,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] bg-zinc-950 border-zinc-800 p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-xl font-bold text-zinc-100">Abrir Fluxo</h2>
            <span className="text-sm text-zinc-500">{workflows.length} fluxos salvos</span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 pb-4 gap-3">
            <div className="relative w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Buscar fluxos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-700"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex bg-zinc-900 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Sort dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors">
                    {SORT_LABELS[sortBy]} <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-50">
                  {(Object.keys(SORT_LABELS) as SortBy[]).map(key => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => setSortBy(key)}
                      className={`px-3 py-2 rounded-lg text-sm cursor-pointer ${sortBy === key ? 'text-white bg-zinc-800' : 'text-zinc-400'}`}
                    >
                      {SORT_LABELS[key]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 overflow-auto max-h-[calc(85vh-160px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : filtered.length === 0 && workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <GitBranch className="w-10 h-10 text-zinc-700 mb-4" />
                <p className="text-lg text-zinc-400">Nenhum fluxo salvo</p>
                <p className="text-sm text-zinc-600 mt-1">Crie e salve um fluxo no editor</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="w-8 h-8 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">Nenhum resultado para "{searchQuery}"</p>
              </div>
            ) : viewMode === 'list' ? (
              <WorkflowListView {...sharedProps} />
            ) : (
              <WorkflowGridView {...sharedProps} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!workflowToDelete} onOpenChange={(open) => !open && setWorkflowToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-[400px] shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-medium text-zinc-100">Deletar fluxo?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-400 mt-2">
              O fluxo "{workflowToDelete?.name}" será deletado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end gap-3 mt-6">
            <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-0 hover:bg-zinc-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-500 text-white border-0">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
