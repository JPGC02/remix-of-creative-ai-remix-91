import { FileText, ImageIcon, Wand2, Upload, Sparkles, Combine, Video, Sparkles as SparklesVariation, Eraser, Paintbrush } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const nodeTypes = [
  {
    type: 'aiTextGeneratorNode',
    label: 'Texto IA',
    icon: Sparkles,
    description: 'Gera texto com IA',
    category: 'generate',
  },
  {
    type: 'textInputNode',
    label: 'Texto',
    icon: FileText,
    description: 'Entrada de texto',
    category: 'input',
  },
  {
    type: 'imageUploadNode',
    label: 'Upload',
    icon: Upload,
    description: 'Enviar imagem',
    category: 'input',
  },
  {
    type: 'imageGeneratorNode',
    label: 'Imagem',
    icon: ImageIcon,
    description: 'Gerar imagem com IA',
    category: 'input',
  },
  {
    type: 'videoGeneratorNode',
    label: 'Vídeo',
    icon: Video,
    description: 'Gerar vídeo com IA',
    category: 'input',
  },
  {
    type: 'aiImageEditorNode',
    label: 'Editar IA',
    icon: Wand2,
    description: 'Editar imagem com IA',
    category: 'edit',
  },
  {
    type: 'imageEditorNode',
    label: 'Editar',
    icon: Paintbrush,
    description: 'Filtros, ajustes, texto, transformações',
    category: 'edit',
  },
  {
    type: 'removeBackgroundNode',
    label: 'Rem. Fundo',
    icon: Eraser,
    description: 'Remover fundo',
    category: 'edit',
  },
  {
    type: 'imageVariationNode',
    label: 'Variação',
    icon: SparklesVariation,
    description: 'Criar variações',
    category: 'edit',
  },
  {
    type: 'imageCombinerNode',
    label: 'Combinar',
    icon: Combine,
    description: 'Combinar imagens',
    category: 'edit',
  },
];

interface NodesSidebarVerticalProps {
  onGenerateAI?: () => void;
  onAddNode?: (nodeType: string, label: string) => void;
}

function NodeButton({ node, onAddNode }: { node: typeof nodeTypes[0]; onAddNode?: (type: string, label: string) => void }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', node.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          draggable
          onDragStart={onDragStart}
          onClick={() => onAddNode?.(node.type, node.label)}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            'cursor-grab active:cursor-grabbing',
            'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
            'transition-all duration-100',
          )}
        >
          <node.icon className="w-[18px] h-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <span className="text-xs font-medium">{node.label}</span>
        <span className="text-xs text-zinc-500 ml-1">— {node.description}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return <div className="w-6 h-px bg-zinc-800 mx-auto my-1" />;
}

export function NodesSidebarVertical({ onGenerateAI, onAddNode }: NodesSidebarVerticalProps) {
  const generate = nodeTypes.filter(n => n.category === 'generate');
  const input = nodeTypes.filter(n => n.category === 'input');
  const edit = nodeTypes.filter(n => n.category === 'edit');

  return (
    <TooltipProvider>
      <div className="absolute left-4 top-[40%] -translate-y-1/2 z-10">
        <div
          className="flex flex-col items-center p-2 gap-0.5 rounded-2xl border border-zinc-800"
          style={{ background: 'rgba(24, 24, 27, 0.9)' }}
        >
          {/* Auto IA */}
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={onGenerateAI}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-100"
              >
                <Sparkles className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <span className="text-xs font-medium">Auto IA</span>
              <span className="text-xs text-zinc-500 ml-1">— Gerar fluxo com IA</span>
            </TooltipContent>
          </Tooltip>

          {generate.map((node) => (
            <NodeButton key={node.type} node={node} onAddNode={onAddNode} />
          ))}

          <Divider />

          {input.map((node) => (
            <NodeButton key={node.type} node={node} onAddNode={onAddNode} />
          ))}

          <Divider />

          {edit.map((node) => (
            <NodeButton key={node.type} node={node} onAddNode={onAddNode} />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
