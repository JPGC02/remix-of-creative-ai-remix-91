import { memo, useState, useMemo, useRef, useEffect } from 'react';
import { NodeProps, NodeResizer, useNodes, useEdges, Position } from 'reactflow';
import { Wand2, Image as ImageIcon } from 'lucide-react';
import { ImageEditorNodeData } from '@/types/workflow';
import { CustomHandle } from './CustomHandle';
import { LockIndicator } from './LockIndicator';

/** Build a CSS filter string from non-AI edit settings */
function buildCssFilter(data: ImageEditorNodeData): string {
  const parts: string[] = [];
  const mode = data.editMode || 'filters';

  // Filters tab
  if (mode === 'filters' || true) {
    const f = data.filter || 'none';
    if (f === 'grayscale') parts.push('grayscale(100%)');
    else if (f === 'sepia') parts.push('sepia(100%)');
    else if (f === 'invert') parts.push('invert(100%)');
    else if (f === 'blur') parts.push('blur(3px)');
  }

  // Adjustments tab — always applied (they default to 100 = no change)
  if (mode === 'adjustments' || true) {
    const b = data.brightness ?? 100;
    const c = data.contrast ?? 100;
    const s = data.saturation ?? 100;
    if (b !== 100) parts.push(`brightness(${b}%)`);
    if (c !== 100) parts.push(`contrast(${c}%)`);
    if (s !== 100) parts.push(`saturate(${s}%)`);
  }

  return parts.length ? parts.join(' ') : 'none';
}

/** Build a CSS transform string from transform settings (no rotation — rotation is canvas-based) */
function buildCssTransform(data: ImageEditorNodeData): string {
  const parts: string[] = [];

  const scaleX = data.flipHorizontal ? -1 : 1;
  const scaleY = data.flipVertical ? -1 : 1;
  if (scaleX !== 1 || scaleY !== 1) {
    parts.push(`scale(${scaleX}, ${scaleY})`);
  }

  return parts.length ? parts.join(' ') : 'none';
}

export const ImageEditorNode = memo(({ id, data, selected }: NodeProps<ImageEditorNodeData>) => {
  const nodes = useNodes();
  const edges = useEdges();
  const [isHovered, setIsHovered] = useState(false);
  const [containerWidth, setContainerWidth] = useState(200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  const nodeNumber = useMemo(() => {
    return nodes.filter(n => n.type === 'imageEditorNode').findIndex(n => n.id === id) + 1;
  }, [nodes, id]);

  const isOutputConnected = edges.some(edge => edge.source === id);
  const isInputConnected = (handleId: string) => 
    edges.some(edge => edge.target === id && edge.targetHandle === handleId);

  const borderClass = getBorderClass(data.status);

  const editMode = data.editMode || 'filters';
  const previewImage = data.rotatedPreviewUrl || data.inputImageUrl;
  const cssFilter = buildCssFilter(data);
  const cssTransform = buildCssTransform(data);

  // Text overlay for 'text' mode
  const showTextOverlay = data.textOverlay?.trim();
  const textPosition = data.textPosition || 'center';
  const textPosClass = textPosition === 'top' ? 'top-2' : textPosition === 'bottom' ? 'bottom-2' : 'top-1/2 -translate-y-1/2';

  return (
    <div
      className="relative w-full h-full"
      style={{ minWidth: 260, minHeight: 220 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer color="#10b981" isVisible={selected} minWidth={260} minHeight={220} />
      <LockIndicator locked={data.locked} />
      
      <div className="h-1 rounded-t-xl bg-cyan-500" />
      
      <div className={`w-full h-[calc(100%-4px)] bg-zinc-900 border border-t-0 rounded-b-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden ${borderClass}`}>
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Wand2 className="w-3 h-3 text-cyan-500" />
            <span className="text-xs font-medium text-zinc-300">Editar #{nodeNumber}</span>
          </div>
          <StatusDot status={data.status} />
        </div>
        
        <div className="px-3 pb-3 flex-1 flex flex-col min-h-0">
          <div ref={containerRef} className="relative w-full flex-1 min-h-[80px] rounded-lg overflow-hidden bg-zinc-950">
            {previewImage ? (
              <>
                <img
                  src={previewImage}
                  className="w-full h-full object-contain transition-all duration-200"
                  style={{ filter: cssFilter, transform: cssTransform }}
                  alt="Preview"
                />
                {showTextOverlay && (
                  <div
                    className={`absolute left-0 right-0 ${textPosClass} text-center pointer-events-none`}
                    style={{
                      fontSize: `${Math.round((data.textSize || 32) * (containerWidth / 500))}px`,
                      color: data.textColor || '#ffffff',
                      textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                      fontWeight: 'bold',
                    }}
                  >
                    {data.textOverlay}
                  </div>
                )}
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

ImageEditorNode.displayName = 'ImageEditorNode';
