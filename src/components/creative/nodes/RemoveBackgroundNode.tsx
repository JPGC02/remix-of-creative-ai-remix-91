import { memo, useState, useMemo } from 'react';
import { NodeProps, NodeResizer, useNodes, useEdges, Position } from 'reactflow';
import { Eraser, Image as ImageIcon } from 'lucide-react';
import { RemoveBackgroundNodeData } from '@/types/workflow';
import { CustomHandle } from './CustomHandle';
import { LockIndicator } from './LockIndicator';

export const RemoveBackgroundNode = memo(({ id, data, selected }: NodeProps<RemoveBackgroundNodeData>) => {
  const nodes = useNodes();
  const edges = useEdges();
  const [isHovered, setIsHovered] = useState(false);
  
  const nodeNumber = useMemo(() => {
    return nodes.filter(n => n.type === 'removeBackgroundNode').findIndex(n => n.id === id) + 1;
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
      
      <div className="h-1 rounded-t-xl bg-rose-500" />
      
      <div className={`w-full h-[calc(100%-4px)] bg-zinc-900 border border-t-0 rounded-b-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden ${borderClass}`}>
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Eraser className="w-3 h-3 text-rose-500" />
            <span className="text-xs font-medium text-zinc-300">Remover Fundo #{nodeNumber}</span>
          </div>
          <StatusDot status={data.status} />
        </div>
        
        <div className="px-3 pb-3 flex-1 min-h-0">
          <div className="relative w-full h-full min-h-[140px] rounded-lg overflow-hidden bg-zinc-950">
            {data.outputImageUrl ? (
              <img src={data.outputImageUrl} className="w-full h-full object-contain" alt="Sem fundo" />
            ) : data.inputImageUrl ? (
              <>
                <img src={data.inputImageUrl} className="w-full h-full object-contain opacity-60" alt="Original" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Eraser className="w-6 h-6 text-zinc-500" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-zinc-700" />
              </div>
            )}
          </div>
        </div>
      </div>
        
      <CustomHandle type="target" handleType="image" id="inputImage" position={Position.Left} style={{ top: '20px', left: '-8px' }} isConnected={isInputConnected('inputImage')} isConnecting={data.isConnecting} connectingType={data.connectingHandleType} />
      <CustomHandle type="source" handleType="image" id="output" position={Position.Right} style={{ top: '20px', right: '-8px' }} isConnected={isOutputConnected} showOnHover={isHovered} />
    </div>
  );
});

function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    idle: 'bg-zinc-600', running: 'bg-emerald-500 animate-pulse', completed: 'bg-emerald-500', error: 'bg-red-500',
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

RemoveBackgroundNode.displayName = 'RemoveBackgroundNode';
