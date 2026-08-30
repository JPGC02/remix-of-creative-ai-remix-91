import { useState } from "react";
import { Node, Edge } from "reactflow";
import { Copy, Trash2, FolderOpen, RefreshCw } from "lucide-react";
import { useWorkflowPersistence, SavedWorkflow } from "@/hooks/useWorkflowPersistence";
import { WorkflowListItem } from "./WorkflowListItem";
import { WorkflowPreview } from "./WorkflowPreview";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface SavedWorkflowsViewerProps {
  onCopyToEditor: (nodes: Node[], edges: Edge[]) => void;
}

export function SavedWorkflowsViewer({ onCopyToEditor }: SavedWorkflowsViewerProps) {
  const { workflows, loadWorkflows, deleteWorkflow, isLoading } = useWorkflowPersistence();
  const [selectedWorkflow, setSelectedWorkflow] = useState<SavedWorkflow | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // workflows load automatically via useQuery in useWorkflowPersistence

  const handleCopy = () => {
    if (!selectedWorkflow) return;
    onCopyToEditor(selectedWorkflow.nodes, selectedWorkflow.edges);
    toast.success('Fluxo copiado para o editor!');
  };

  const handleDelete = async () => {
    if (!selectedWorkflow) return;
    await deleteWorkflow(selectedWorkflow.id);
    setSelectedWorkflow(null);
    setShowDeleteDialog(false);
  };

  const handleRefresh = () => {
    loadWorkflows();
    toast.success('Lista atualizada!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Carregando workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 w-full">
      {/* LISTA ESQUERDA */}
      <div 
        className="w-[340px] rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 flex flex-col h-full">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-zinc-100 mb-1">
              Fluxos Salvos
            </h1>
            <p className="text-xs text-zinc-500">
              Visualize e gerencie seus workflows
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-500">
              {workflows.length} workflows salvos
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

        <ScrollArea className="flex-1">
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-600">
                Nenhum workflow salvo
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Crie e salve um workflow na aba "Fluxo"
              </p>
            </div>
          ) : (
            workflows.map((workflow) => (
              <WorkflowListItem
                key={workflow.id}
                workflow={workflow}
                isSelected={selectedWorkflow?.id === workflow.id}
                onClick={() => setSelectedWorkflow(workflow)}
              />
            ))
          )}
        </ScrollArea>
        </div>
      </div>

      {/* PREVIEW DIREITA */}
      <div 
        className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 flex flex-col h-full">
          {selectedWorkflow ? (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-zinc-100">{selectedWorkflow.name}</h2>
              {selectedWorkflow.description && (
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedWorkflow.description}
                </p>
              )}
            </div>

            <div className="flex-1">
              <WorkflowPreview
                nodes={selectedWorkflow.nodes}
                edges={selectedWorkflow.edges}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleCopy} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                <Copy className="w-4 h-4" />
                Copiar para Fluxo
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Deletar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600">
              ← Selecione um workflow para visualizar
            </p>
          </div>
        )}
        </div>
      </div>

      {/* DIALOG DE CONFIRMAÇÃO DE DELETE */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{selectedWorkflow?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
