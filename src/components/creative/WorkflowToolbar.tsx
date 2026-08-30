import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Trash2, Save, FolderOpen, Pause, SkipForward, RotateCcw, ArrowDownUp, Download, Images, Undo2, Redo2, MoreHorizontal, Info, Bug, Plus, Minus, Maximize, Loader2 } from 'lucide-react';
import { ExecutionMode, ExecutionState } from '@/hooks/useWorkflowDebug';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WorkflowToolbarProps {
  nodeCount: number;
  edgeCount: number;
  isExecuting: boolean;
  onExecute: () => void;
  onCancel: () => void;
  onClear: () => void;
  onSave: () => void;
  isSaving?: boolean;
  onLoad: () => void;
  onDownloadCode: () => void;
  onDownloadAssets: () => void;
  onAutoLayout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  executionMode: ExecutionMode;
  onToggleExecutionMode: () => void;
  executionState: ExecutionState;
  onPause: () => void;
  onResume: () => void;
  onStepNext: () => void;
  onResetDebug: () => void;
  currentNodeIndex: number;
  totalNodes: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

function ToolbarButton({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-zinc-900 border-zinc-800 text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function WorkflowToolbar({
  nodeCount,
  edgeCount,
  isExecuting,
  onExecute,
  onCancel,
  onClear,
  onSave,
  isSaving,
  onLoad,
  onDownloadCode,
  onDownloadAssets,
  onAutoLayout,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  executionMode,
  onToggleExecutionMode,
  executionState,
  onPause,
  onResume,
  onStepNext,
  onResetDebug,
  currentNodeIndex,
  totalNodes,
  onZoomIn,
  onZoomOut,
  onFitView,
}: WorkflowToolbarProps) {
  return (
    <TooltipProvider>
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1.5 rounded-2xl border border-zinc-800"
        style={{ background: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(12px)' }}
      >
        {/* Zoom controls */}
        <ToolbarButton onClick={onZoomIn} label="Zoom +">
          <Plus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onZoomOut} label="Zoom −">
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onFitView} label="Ajustar à tela">
          <Maximize className="w-4 h-4" />
        </ToolbarButton>

        <div className="h-5 w-px bg-zinc-800 mx-0.5" />

        {/* Undo/Redo */}
        <ToolbarButton onClick={onUndo} disabled={!canUndo || isExecuting} label="Desfazer (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onRedo} disabled={!canRedo || isExecuting} label="Refazer (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="h-5 w-px bg-zinc-800 mx-0.5" />

        {/* Execute / Stop */}
        {isExecuting ? (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Parar
          </button>
        ) : (
          <button
            onClick={onExecute}
            disabled={nodeCount === 0}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Executar
          </button>
        )}

        <div className="h-5 w-px bg-zinc-800 mx-0.5" />

        {/* Save dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Save className="w-4 h-4" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="min-w-[160px] bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={onSave} disabled={isExecuting || nodeCount === 0}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLoad} disabled={isExecuting}>
              <FolderOpen className="w-4 h-4 mr-2" /> Carregar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="min-w-[180px] bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={onDownloadCode} disabled={isExecuting || nodeCount === 0}>
              <Download className="w-4 h-4 mr-2" /> Baixar JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadAssets} disabled={isExecuting || nodeCount === 0}>
              <Images className="w-4 h-4 mr-2" /> Baixar arquivos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="min-w-[180px] bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={onAutoLayout} disabled={isExecuting || nodeCount === 0}>
              <ArrowDownUp className="w-4 h-4 mr-2" /> Organizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClear} disabled={isExecuting}>
              <Trash2 className="w-4 h-4 mr-2" /> Limpar canvas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleExecutionMode} disabled={isExecuting}>
              <Bug className="w-4 h-4 mr-2" /> {executionMode === 'normal' ? 'Modo Debug' : 'Modo Normal'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Debug step controls */}
        {executionMode === 'step-by-step' && (
          <>
            <div className="h-5 w-px bg-zinc-800 mx-0.5" />
            {executionState === 'paused' && (
              <>
                <ToolbarButton onClick={onResume} disabled={!isExecuting} label="Continuar">
                  <Play className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton onClick={onStepNext} disabled={!isExecuting} label="Próximo passo">
                  <SkipForward className="w-4 h-4" />
                </ToolbarButton>
              </>
            )}
            {executionState === 'running' && (
              <ToolbarButton onClick={onPause} disabled={!isExecuting} label="Pausar">
                <Pause className="w-4 h-4" />
              </ToolbarButton>
            )}
            {(executionState === 'completed' || executionState === 'error') && (
              <ToolbarButton onClick={onResetDebug} label="Resetar">
                <RotateCcw className="w-4 h-4" />
              </ToolbarButton>
            )}
            {currentNodeIndex >= 0 && (
              <span className="text-xs text-zinc-500 tabular-nums px-1">
                {currentNodeIndex + 1}/{totalNodes}
              </span>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
