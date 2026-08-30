import { Node, Edge } from 'reactflow';
import { createNodeData } from '@/lib/create-node-data';
import { ImageIcon, Wand2, Sparkles, Layers, Video, FolderOpen } from 'lucide-react';

interface TemplateDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  create: () => { nodes: Node[]; edges: Edge[] };
}

function makeId(type: string) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const templates: TemplateDefinition[] = [
  {
    id: 'text-to-image',
    title: 'Texto → Imagem',
    description: 'Gere imagens a partir de um prompt',
    icon: <ImageIcon className="w-4 h-4" />,
    create: () => {
      const textId = makeId('textInputNode');
      const imgId = makeId('imageGeneratorNode');
      return {
        nodes: [
          { id: textId, type: 'textInputNode', position: { x: 100, y: 200 }, data: createNodeData('textInputNode') },
          { id: imgId, type: 'imageGeneratorNode', position: { x: 500, y: 200 }, data: createNodeData('imageGeneratorNode') },
        ],
        edges: [{ id: `edge-${textId}-${imgId}`, source: textId, sourceHandle: 'output', target: imgId, targetHandle: 'prompt' }],
      };
    },
  },
  {
    id: 'edit-photo',
    title: 'Editar Foto',
    description: 'Upload e edite com IA',
    icon: <Wand2 className="w-4 h-4" />,
    create: () => {
      const upId = makeId('imageUploadNode');
      const edId = makeId('imageEditorNode');
      return {
        nodes: [
          { id: upId, type: 'imageUploadNode', position: { x: 100, y: 200 }, data: createNodeData('imageUploadNode') },
          { id: edId, type: 'imageEditorNode', position: { x: 500, y: 200 }, data: createNodeData('imageEditorNode') },
        ],
        edges: [{ id: `edge-${upId}-${edId}`, source: upId, sourceHandle: 'output', target: edId, targetHandle: 'inputImage' }],
      };
    },
  },
  {
    id: 'variations',
    title: 'Variações',
    description: 'Crie versões criativas',
    icon: <Sparkles className="w-4 h-4" />,
    create: () => {
      const upId = makeId('imageUploadNode');
      const varId = makeId('imageVariationNode');
      return {
        nodes: [
          { id: upId, type: 'imageUploadNode', position: { x: 100, y: 200 }, data: createNodeData('imageUploadNode') },
          { id: varId, type: 'imageVariationNode', position: { x: 500, y: 200 }, data: createNodeData('imageVariationNode') },
        ],
        edges: [{ id: `edge-${upId}-${varId}`, source: upId, sourceHandle: 'output', target: varId, targetHandle: 'inputImage' }],
      };
    },
  },
  {
    id: 'combine-images',
    title: 'Combinar',
    description: '2 imagens + instrução',
    icon: <Layers className="w-4 h-4" />,
    create: () => {
      const up1 = makeId('imageUploadNode');
      const up2 = makeId('imageUploadNode');
      const textId = makeId('textInputNode');
      const combId = makeId('imageCombinerNode');
      return {
        nodes: [
          { id: up1, type: 'imageUploadNode', position: { x: 100, y: 80 }, data: createNodeData('imageUploadNode') },
          { id: up2, type: 'imageUploadNode', position: { x: 100, y: 380 }, data: createNodeData('imageUploadNode') },
          { id: textId, type: 'textInputNode', position: { x: 100, y: 600 }, data: createNodeData('textInputNode') },
          { id: combId, type: 'imageCombinerNode', position: { x: 550, y: 250 }, data: createNodeData('imageCombinerNode') },
        ],
        edges: [
          { id: `edge-${up1}-${combId}`, source: up1, sourceHandle: 'output', target: combId, targetHandle: 'imageA' },
          { id: `edge-${up2}-${combId}`, source: up2, sourceHandle: 'output', target: combId, targetHandle: 'imageB' },
          { id: `edge-${textId}-${combId}`, source: textId, sourceHandle: 'output', target: combId, targetHandle: 'instruction' },
        ],
      };
    },
  },
  {
    id: 'text-to-video',
    title: 'Texto → Vídeo',
    description: 'Gere vídeos com IA',
    icon: <Video className="w-4 h-4" />,
    create: () => {
      const textId = makeId('textInputNode');
      const vidId = makeId('videoGeneratorNode');
      return {
        nodes: [
          { id: textId, type: 'textInputNode', position: { x: 100, y: 200 }, data: createNodeData('textInputNode') },
          { id: vidId, type: 'videoGeneratorNode', position: { x: 500, y: 200 }, data: createNodeData('videoGeneratorNode') },
        ],
        edges: [{ id: `edge-${textId}-${vidId}`, source: textId, sourceHandle: 'output', target: vidId, targetHandle: 'prompt' }],
      };
    },
  },
];

interface WorkflowTemplatesProps {
  onSelectTemplate: (nodes: Node[], edges: Edge[]) => void;
  onLoadWorkflow?: () => void;
}

export function WorkflowTemplates({ onSelectTemplate, onLoadWorkflow }: WorkflowTemplatesProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
      <div className="pointer-events-auto max-w-md w-full px-4">
        <p className="text-center text-zinc-500 text-lg mb-1">
          Comece um novo fluxo
        </p>
        <p className="text-center text-zinc-600 text-sm mb-6">
          Escolha um template ou abra um fluxo salvo
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                const { nodes, edges } = t.create();
                onSelectTemplate(nodes, edges);
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all text-center"
            >
              <div className="text-zinc-500">
                {t.icon}
              </div>
              <span className="text-[10px] font-medium text-zinc-400">{t.title}</span>
            </button>
          ))}
        </div>
        {onLoadWorkflow && (
          <div className="flex justify-center">
            <button
              onClick={onLoadWorkflow}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all text-sm text-zinc-400 hover:text-zinc-200"
            >
              <FolderOpen className="w-4 h-4" />
              Abrir fluxo salvo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
