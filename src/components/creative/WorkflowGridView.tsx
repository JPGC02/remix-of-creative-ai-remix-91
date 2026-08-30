import { Copy, Trash2, ExternalLink, Download } from "lucide-react";
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

interface WorkflowGridViewProps {
  workflows: SavedWorkflow[];
  onOpen: (workflow: SavedWorkflow) => void;
  onDuplicate: (workflow: SavedWorkflow) => void;
  onExportJSON: (workflow: SavedWorkflow) => void;
  onDelete: (workflow: SavedWorkflow) => void;
}

export function WorkflowGridView({ workflows, onOpen, onDuplicate, onExportJSON, onDelete }: WorkflowGridViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {workflows.map((workflow, index) => {
        const nodeCount = workflow.nodes?.length || 0;

        return (
          <ContextMenu key={workflow.id}>
            <ContextMenuTrigger>
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors cursor-pointer group relative"
                onClick={() => onOpen(workflow)}
              >
                {/* Preview area */}
                <div className="relative bg-zinc-950 aspect-[4/3] flex items-center justify-center">
                  <WorkflowMiniThumbnail
                    nodes={workflow.nodes}
                    edges={workflow.edges}
                    width={160}
                    height={120}
                    className="!border-0 !bg-transparent !rounded-none"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="bg-zinc-800/90 text-white text-xs rounded-lg px-3 py-1.5">Abrir</span>
                  </div>
                </div>

                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate(workflow); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Duplicar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(workflow); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-900/80 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Deletar</TooltipContent>
                  </Tooltip>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h4 className="text-sm font-medium text-zinc-200 line-clamp-1">{workflow.name}</h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    {nodeCount} nodes · {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
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
