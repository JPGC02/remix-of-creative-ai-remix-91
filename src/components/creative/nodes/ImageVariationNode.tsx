import { memo, useState, useMemo, useCallback } from 'react';
import { NodeProps, NodeResizer, useNodes, useEdges, Position, useReactFlow } from 'reactflow';
import { Image, Sparkles } from 'lucide-react';
import { ImageVariationNodeData } from '@/types/workflow';
import { CustomHandle } from './CustomHandle';
import { LockIndicator } from './LockIndicator';

export const ImageVariationNode = memo(({ id, data, selected }: NodeProps<ImageVariationNodeData>) => {
  const nodes = useNodes();
  const edges = useEdges();
  const { setNodes } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  
  const nodeNumber = useMemo(() => {
    return nodes.filter(n => n.type === 'imageVariationNode').findIndex(n => n.id === id) + 1;
  }, [nodes, id]);

  const isOutputConnected = edges.some(edge => edge.source === id);
  const isInputImageConnected = edges.some(edge => edge.target === id && edge.targetHandle === 'inputImage');
  const isPromptConnected = edges.some(edge => edge.target === id && edge.targetHandle === 'prompt');

  const borderClass = getBorderClass(data.status);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, prompt: e.target.value } } : n));
  }, [id, setNodes]);

  return (
    <div
      className="relative w-full h-full"
      style={{ minWidth: 260, minHeight: 280 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer color="#10b981" isVisible={selected} minWidth={260} minHeight={280} />
      <LockIndicator locked={data.locked} />
      
      <div className="h-1 rounded-t-xl bg-pink-500" />
      
      <div className={`w-full h-[calc(100%-4px)] bg-zinc-900 border border-t-0 rounded-b-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden ${borderClass}`}>
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-pink-500" />
            <span className="text-xs font-medium text-zinc-300">Variação #{nodeNumber}</span>
          </div>
          <StatusDot status={data.status} />
        </div>
        
        <div className="px-3 pb-2 flex-1 min-h-0">
          <div className="relative w-full h-full min-h-[100px] rounded-lg overflow-hidden bg-zinc-950">
            {data.resultUrl ? (
              <img src={data.resultUrl} className="w-full h-full object-contain" alt="Variação" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="w-6 h-6 text-zinc-700" />
              </div>
            )}
          </div>
        </div>

        {/* Built-in prompt — shown when no text node is connected */}
        {!isPromptConnected && (
          <div className="px-3 pb-3 shrink-0">
            <textarea
              value={data.prompt || ''}
              onChange={handlePromptChange}
              placeholder="Descreva a variação..."
              className="nodrag nowheel w-full h-14 text-xs bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-pink-500/50"
            />
          </div>
        )}
      </div>
        
      <CustomHandle type="target" handleType="image" id="inputImage" position={Position.Left} style={{ top: '20px', left: '-8px' }} isConnected={isInputImageConnected} isConnecting={data.isConnecting} connectingType={data.connectingHandleType} />
      <CustomHandle type="target" handleType="text" id="prompt" position={Position.Left} style={{ top: '50px', left: '-8px' }} isConnected={isPromptConnected} isConnecting={data.isConnecting} connectingType={data.connectingHandleType} />
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

ImageVariationNode.displayName = 'ImageVariationNode';
