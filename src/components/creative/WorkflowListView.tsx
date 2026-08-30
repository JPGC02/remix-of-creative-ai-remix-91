import { ExternalLink, Copy, Trash2 } from "lucide-react";
import { SavedWorkflow } from "@/hooks/useWorkflowPersistence";
import { WorkflowMiniThumbnail } from "./WorkflowMiniThumbnail";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Pencil } from "lucide-react";

interface WorkflowListViewProps {
  workflows: SavedWorkflow[];
  onOpen: (workflow: SavedWorkflow) => void;
  onDuplicate: (workflow: SavedWorkflow) => void;
  onExportJSON: (workflow: SavedWorkflow) => void;
  onDelete: (workflow: SavedWorkflow) => void;
}

export function WorkflowListView({ workflows, onOpen, onDuplicate, onExportJSON, onDelete }: WorkflowListViewProps) {
  return (
    <div>
      {workflows.map((workflow, index) => {
        const nodeCount = workflow.nodes?.length || 0;
        const edgeCount = workflow.edges?.length || 0;

        return (
          <ContextMenu key={workflow.id}>
            <ContextMenuTrigger>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className={`flex items-center py-4 px-4 rounded-xl hover:bg-zinc-900/50 transition-colors cursor-pointer group ${
                  index < workflows.length - 1 ? 'border-b border-zinc-800/30' : ''
                }`}
                onClick={() => onOpen(workflow)}
              >
                {/* Thumbnail */}
                <WorkflowMiniThumbnail nodes={workflow.nodes} edges={workflow.edges} />

                {/* Info */}
                <div className="ml-3 flex-1 min-w-0">
                  <h4 className="text-base font-medium text-zinc-100 truncate">{workflow.name}</h4>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                    <span>{nodeCount} nodes</span>
                    <span>·</span>
                    <span>{edgeCount} conexões</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  {workflow.description && (
                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{workflow.description}</p>
                  )}
                </div>

                {/* Hover actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpen(workflow); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Abrir</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate(workflow); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Duplicar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(workflow); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Deletar</TooltipContent>
                  </Tooltip>
                </div>
              </motion.div>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 min-w-[180px]">
              <ContextMenuItem onClick={() => onOpen(workflow)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-200 cursor-pointer">
                <ExternalLink className="w-4 h-4" /> Abrir
              </ContextMenuItem>
              <ContextMenuSeparator className="h-px bg-zinc-800 my-1" />
              <ContextMenuItem onClick={() => onDuplicate(workflow)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-300 cursor-pointer">
                <Copy className="w-4 h-4" /> Duplicar
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onExportJSON(workflow)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-300 cursor-pointer">
                <Download className="w-4 h-4" /> Exportar JSON
              </ContextMenuItem>
              <ContextMenuSeparator className="h-px bg-zinc-800 my-1" />
              <ContextMenuItem onClick={() => onDelete(workflow)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 cursor-pointer">
                <Trash2 className="w-4 h-4" /> Deletar
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
