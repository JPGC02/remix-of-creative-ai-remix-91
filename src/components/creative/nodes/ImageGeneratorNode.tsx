import { memo, useState, useMemo } from 'react';
import { NodeProps, NodeResizer, useNodes, useEdges, Position } from 'reactflow';
import { Image } from 'lucide-react';
import { ImageGeneratorNodeData } from '@/types/workflow';
import { CustomHandle } from './CustomHandle';
import { LockIndicator } from './LockIndicator';

export const ImageGeneratorNode = memo(({ id, data, selected }: NodeProps<ImageGeneratorNodeData>) => {
  const nodes = useNodes();
  const edges = useEdges();
  const [isHovered, setIsHovered] = useState(false);
  
  const nodeNumber = useMemo(() => {
    return nodes.filter(n => n.type === 'imageGeneratorNode').findIndex(n => n.id === id) + 1;
  }, [nodes, id]);

  const isOutputConnected = edges.some(edge => edge.source === id);
  const isInputConnected = (handleId: string) => 
    edges.some(edge => edge.target === id && edge.targetHandle === handleId);

  const borderClass = getBorderClass(data.status);

  return (
    <div
      className="relative w-full h-full"
      style={{ minWidth: 260, minHeight: 220 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer color="#10b981" isVisible={selected} minWidth={260} minHeight={220} />
      <LockIndicator locked={data.locked} />

      <div className={`flex h-full flex-col overflow-hidden rounded-xl border bg-zinc-900 shadow-lg shadow-black/20 ${borderClass}`}>
        <div className="h-1 shrink-0 bg-violet-500" />

        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Image className="w-3 h-3 text-violet-500" />
            <span className="text-xs font-medium text-zinc-300">Gerar Imagem #{nodeNumber}</span>
          </div>
          <StatusDot status={data.status} />
        </div>

        <div className="flex-1 px-3 pb-3 min-h-0">
          <div className="relative h-full w-full min-h-[140px] overflow-hidden rounded-lg bg-zinc-950">
            {data.imageUrl ? (
              <img src={data.imageUrl} className="h-full w-full object-cover" alt="Imagem gerada" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Image className="w-6 h-6 text-zinc-700" />
              </div>
            )}
          </div>
        </div>
      </div>

      <CustomHandle type="target" handleType="text" id="prompt" position={Position.Left} style={{ top: '20px', left: '-8px' }} isConnected={isInputConnected('prompt')} isConnecting={data.isConnecting} connectingType={data.connectingHandleType} />
      <CustomHandle type="source" handleType="image" id="image" position={Position.Right} style={{ top: '20px', right: '-8px' }} isConnected={isOutputConnected} showOnHover={isHovered} />
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

ImageGeneratorNode.displayName = 'ImageGeneratorNode';
