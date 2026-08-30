import { Check } from "lucide-react";
import { SavedWorkflow } from "@/hooks/useWorkflowPersistence";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WorkflowListItemProps {
  workflow: SavedWorkflow;
  isSelected: boolean;
  onClick: () => void;
}

export function WorkflowListItem({ workflow, isSelected, onClick }: WorkflowListItemProps) {
  const nodeCount = workflow.nodes?.length || 0;
  const edgeCount = workflow.edges?.length || 0;

  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer border transition-all mb-2",
        isSelected 
          ? "border-emerald-500/50 bg-emerald-500/10" 
          : "border-zinc-800 hover:bg-zinc-800"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{workflow.name}</h4>
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
            {workflow.description || "Sem descrição"}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
            <span>{nodeCount} nodes</span>
            <span>•</span>
            <span>{edgeCount} conexões</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {formatDistanceToNow(new Date(workflow.created_at), { 
              addSuffix: true,
              locale: ptBR 
            })}
          </p>
        </div>
        {isSelected && (
          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-2" />
        )}
      </div>
    </div>
  );
}
