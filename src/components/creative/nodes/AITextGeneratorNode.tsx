import { memo, useState, useMemo } from 'react';
import { NodeProps, NodeResizer, useNodes, useEdges, Position } from 'reactflow';
import { AITextGeneratorNodeData } from '@/types/workflow';
import { Sparkles } from 'lucide-react';
import { CustomHandle } from './CustomHandle';
import { LockIndicator } from './LockIndicator';

export const AITextGeneratorNode = memo(({ id, data, selected }: NodeProps<AITextGeneratorNodeData>) => {
  const nodes = useNodes();
  const edges = useEdges();
  const [isHovered, setIsHovered] = useState(false);

  const nodeNumber = useMemo(() => {
    return nodes.filter(n => n.type === 'aiTextGeneratorNode').findIndex(n => n.id === id) + 1;
  }, [nodes, id]);

  const isOutputConnected = edges.some(edge => edge.source === id);
  const isInputConnected = (handleId: string) => 
    edges.some(edge => edge.target === id && edge.targetHandle === handleId);

  const borderClass = getBorderClass(data.status);

  return (
    <div
      className="relative w-full h-full"
      style={{ minWidth: 220, minHeight: 140 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer color="#10b981" isVisible={selected} minWidth={220} minHeight={140} />
      <LockIndicator locked={data.locked} />
      
      <div className="h-1 rounded-t-xl bg-emerald-500" />
      
      <div className={`w-full h-[calc(100%-4px)] bg-zinc-900 border border-t-0 rounded-b-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden ${borderClass}`}>
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-medium text-zinc-300">Texto IA #{nodeNumber}</span>
          </div>
          <StatusDot status={data.status} />
        </div>
        
        <div className="px-3 pb-3 flex-1 min-h-0">
          <div className="bg-zinc-950 rounded-lg p-2 h-full min-h-[60px] overflow-auto">
            {data.generatedText ? (
              <p className="text-xs text-zinc-400">{data.generatedText}</p>
            ) : data.prompt ? (
              <p className="text-xs text-zinc-500">{data.prompt}</p>
            ) : (
              <p className="text-xs text-zinc-600 italic">Conecte um prompt para gerar texto</p>
            )}
          </div>
        </div>
      </div>
      
      <CustomHandle type="target" handleType="text" id="prompt" position={Position.Left} style={{ top: '20px', left: '-8px' }} isConnected={isInputConnected('prompt')} isConnecting={data.isConnecting} connectingType={data.connectingHandleType} />
      <CustomHandle type="source" handleType="text" id="output" position={Position.Right} style={{ top: '20px', right: '-8px' }} isConnected={isOutputConnected} showOnHover={isHovered} />
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

function getBorderClass(status?: string): string {
  switch (status) {
    case 'running': return 'border-emerald-500/50';
    case 'completed': return 'border-emerald-500/20';
    case 'error': return 'border-red-500/50';
    default: return 'border-zinc-800';
  }
}

AITextGeneratorNode.displayName = 'AITextGeneratorNode';
