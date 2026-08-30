import { GitBranch } from "lucide-react";

const NODE_TYPE_COLORS: Record<string, string> = {
  textInput: '#3b82f6',       // blue
  aiTextGenerator: '#10b981', // emerald
  imageGenerator: '#8b5cf6',  // violet
  imageUpload: '#06b6d4',     // cyan
  imageEditor: '#ec4899',     // pink
  imageCombiner: '#f59e0b',   // amber
  imageVariation: '#a855f7',  // purple
  videoGenerator: '#f97316',  // orange
  preview: '#6b7280',         // gray
};

interface WorkflowMiniThumbnailProps {
  nodes: any[];
  edges: any[];
  width?: number;
  height?: number;
  className?: string;
}

export function WorkflowMiniThumbnail({ nodes, edges, width = 48, height = 40, className = '' }: WorkflowMiniThumbnailProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg ${className}`} style={{ width, height }}>
        <GitBranch className="w-4 h-4 text-zinc-600" />
      </div>
    );
  }

  // Normalize positions to fit in the SVG
  const padding = 6;
  const dotR = 3;
  const positions = nodes.map(n => ({ x: n.position?.x || 0, y: n.position?.y || 0, type: n.type }));
  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const mapped = positions.map(p => ({
    cx: padding + ((p.x - minX) / rangeX) * (width - padding * 2),
    cy: padding + ((p.y - minY) / rangeY) * (height - padding * 2),
    color: NODE_TYPE_COLORS[p.type] || '#6b7280',
  }));

  // Build edge lines
  const nodeMap = new Map(nodes.map((n: any, i: number) => [n.id, i]));
  const lines = (edges || []).map((e: any) => {
    const si = nodeMap.get(e.source);
    const ti = nodeMap.get(e.target);
    if (si === undefined || ti === undefined) return null;
    return { x1: mapped[si].cx, y1: mapped[si].cy, x2: mapped[ti].cx, y2: mapped[ti].cy };
  }).filter(Boolean);

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex-shrink-0 ${className}`} style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {lines.map((l: any, i: number) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#3f3f46" strokeWidth={1} />
        ))}
        {mapped.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={dotR} fill={d.color} />
        ))}
      </svg>
    </div>
  );
}
