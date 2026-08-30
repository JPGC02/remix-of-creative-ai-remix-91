import { memo, useState, useMemo } from 'react';
import { NodeProps, NodeResizer, useNodes, Position, useEdges } from 'reactflow';
import { Textarea } from '@/components/ui/textarea';
import { useNodeData } from '@/hooks/useNodeData';
import { TextInputNodeData } from '@/types/workflow';
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import { LockIndicator } from './LockIndicator';
import { CustomHandle } from './CustomHandle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const TextInputNode = memo(({ id, data, selected }: NodeProps<TextInputNodeData>) => {
  const { updateData } = useNodeData(id);
  const nodes = useNodes();
  const edges = useEdges();
  const [isHovered, setIsHovered] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const isOutputConnected = edges.some(edge => edge.source === id);

  const nodeNumber = useMemo(() => {
    const sameTypeNodes = nodes.filter(n => n.type === 'textInputNode');
    return sameTypeNodes.findIndex(n => n.id === id) + 1;
  }, [nodes, id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateData({ text: e.target.value });
  };

  const handleEnhancePrompt = async () => {
    const text = data.text?.trim();
    if (!text) {
      toast.error('Escreva um prompt antes de melhorar.');
      return;
    }
    setIsEnhancing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('enhance-image-prompt', {
        body: { prompt: text },
      });
      if (error) throw error;
      if (result?.enhancedPrompt) {
        updateData({ text: result.enhancedPrompt });
        toast.success('Prompt melhorado com IA!');
      }
    } catch (err: any) {
      console.error('Enhance prompt error:', err);
      toast.error('Erro ao melhorar prompt.');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div
      className="relative w-full h-full"
      style={{ minWidth: 220, minHeight: 140 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer color="#10b981" isVisible={selected} minWidth={220} minHeight={140} />
      <LockIndicator locked={data.locked} />
      
      <div className="h-1 rounded-t-xl bg-blue-500" />
      
      <div className="w-full h-[calc(100%-4px)] bg-zinc-900 border border-zinc-800 border-t-0 rounded-b-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-medium text-zinc-300">Texto #{nodeNumber}</span>
          </div>
          <StatusDot status={data.status} />
        </div>
        
        {/* Content */}
        <div className="px-3 pb-3 flex-1 flex flex-col gap-2 min-h-0">
          <Textarea
            value={data.text || ''}
            onChange={handleTextChange}
            placeholder="Digite seu prompt..."
            className="nodrag nowheel flex-1 min-h-[60px] resize-none bg-zinc-950 border-none text-xs text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-0 rounded-lg p-2"
          />
          <button
            onClick={handleEnhancePrompt}
            disabled={isEnhancing || !data.text?.trim()}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Melhorar prompt com IA"
          >
            {isEnhancing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {isEnhancing ? 'Melhorando...' : 'Melhorar com IA'}
          </button>
        </div>
      </div>
      
      <CustomHandle
        type="source"
        handleType="text"
        id="output"
        position={Position.Right}
        style={{ top: '20px', right: '-8px' }}
        isConnected={isOutputConnected}
        showOnHover={isHovered}
      />
    </div>
  );
});

function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    idle: 'bg-zinc-600',
    running: 'bg-emerald-500 animate-pulse',
    completed: 'bg-emerald-500',
    error: 'bg-red-500',
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status || 'idle']}`} />;
}

TextInputNode.displayName = 'TextInputNode';
