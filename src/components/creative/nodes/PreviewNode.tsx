import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText, Image, Palette, Layers, Video, Sparkles, Upload, Shuffle } from 'lucide-react';

const nodeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  textInput: { icon: FileText, label: 'Texto' },
  textInputNode: { icon: FileText, label: 'Texto' },
  imageGenerator: { icon: Image, label: 'Gerar Imagem' },
  imageGeneratorNode: { icon: Image, label: 'Gerar Imagem' },
  imageEditor: { icon: Palette, label: 'Editor de Imagem' },
  imageEditorNode: { icon: Palette, label: 'Editor de Imagem' },
  imageCombiner: { icon: Layers, label: 'Combinar Imagens' },
  imageCombinerNode: { icon: Layers, label: 'Combinar Imagens' },
  videoGenerator: { icon: Video, label: 'Gerar Vídeo' },
  videoGeneratorNode: { icon: Video, label: 'Gerar Vídeo' },
  aiTextGenerator: { icon: Sparkles, label: 'IA Texto' },
  aiTextGeneratorNode: { icon: Sparkles, label: 'IA Texto' },
  imageUpload: { icon: Upload, label: 'Upload de Imagem' },
  imageUploadNode: { icon: Upload, label: 'Upload de Imagem' },
  imageVariation: { icon: Shuffle, label: 'Variação de Imagem' },
  imageVariationNode: { icon: Shuffle, label: 'Variação de Imagem' },
};

function getImageUrl(data: any): string | null {
  return data?.imageUrl || data?.resultUrl || data?.uploadedImageUrl || data?.outputImageUrl || data?.videoUrl || null;
}

export const PreviewNode = memo(({ type, data }: NodeProps) => {
  const config = nodeConfig[type || ''] || { icon: FileText, label: type || 'Node' };
  const Icon = config.icon;
  const thumbnail = getImageUrl(data);

  return (
    <div className="w-[200px] rounded-lg border border-white/10 bg-black/90 shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <Icon className="w-3.5 h-3.5 text-white/60" />
        <span className="text-[11px] font-medium text-white/70 truncate">{config.label}</span>
      </div>

      {thumbnail ? (
        <div className="h-[100px] bg-white/5">
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-[60px] flex items-center justify-center bg-white/5">
          <Icon className="w-6 h-6 text-white/15" />
        </div>
      )}

      {data?.text && (
        <div className="px-3 py-1.5 border-t border-white/5">
          <p className="text-[10px] text-white/40 truncate">{data.text}</p>
        </div>
      )}

      <Handle type="target" position={Position.Left} className="!bg-white/20 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Right} className="!bg-white/20 !w-2 !h-2 !border-0" />
    </div>
  );
});

PreviewNode.displayName = 'PreviewNode';
