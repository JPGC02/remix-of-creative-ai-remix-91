import { memo, useRef, useState, useMemo } from 'react';
import { NodeProps, NodeResizer, useNodes, Position, useEdges } from 'reactflow';
import { Button } from '@/components/ui/button';
import { useNodeData } from '@/hooks/useNodeData';
import { ImageUploadNodeData } from '@/types/workflow';
import { Upload, ImageIcon, Loader2 } from 'lucide-react';
import { LockIndicator } from './LockIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomHandle } from './CustomHandle';

export const ImageUploadNode = memo(({ id, data, selected }: NodeProps<ImageUploadNodeData>) => {
  const { updateData } = useNodeData(id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const nodes = useNodes();
  const edges = useEdges();
  const isOutputConnected = edges.some(edge => edge.source === id);
  
  const nodeNumber = useMemo(() => {
    return nodes.filter(n => n.type === 'imageUploadNode').findIndex(n => n.id === id) + 1;
  }, [nodes, id]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande (máx 10MB)');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Use PNG, JPG ou WEBP');
      return;
    }

    setIsUploading(true);
    updateData({ status: 'running' });

    try {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const extension = file.name.split('.').pop();
      const fileName = `upload-${timestamp}-${randomId}.${extension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, file, { contentType: file.type, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('generated-images')
        .getPublicUrl(uploadData.path);

      updateData({ uploadedImageUrl: publicUrl, fileName: file.name, fileSize: file.size, status: 'completed' });
      toast.success('Imagem enviada!');
    } catch (error: any) {
      updateData({ status: 'error' });
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const borderClass = getBorderClass(data.status);

  return (
    <div
      className="relative w-full h-full"
      style={{ minWidth: 240, minHeight: 200 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer color="#10b981" isVisible={selected} minWidth={240} minHeight={200} />
      <LockIndicator locked={data.locked} />
      
      <div className="h-1 rounded-t-xl bg-zinc-400" />
      
      <div className={`w-full h-[calc(100%-4px)] bg-zinc-900 border border-t-0 rounded-b-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden ${borderClass}`}>
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Upload className="w-3 h-3 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-300">Upload #{nodeNumber}</span>
          </div>
          <StatusDot status={data.status} />
        </div>
        
        <div className="px-3 pb-3 flex-1 flex flex-col min-h-0">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileSelect} className="hidden" />
          
          {!data.uploadedImageUrl ? (
            <div className="flex flex-col items-center justify-center gap-2 flex-1">
              <Upload className="w-6 h-6 text-zinc-700" />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline" size="sm" className="text-xs bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200">
                {isUploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Enviando...</> : 'Selecionar'}
              </Button>
            </div>
          ) : (
            <div className="relative w-full flex-1 min-h-0 rounded-lg overflow-hidden bg-zinc-950">
              <img src={data.uploadedImageUrl} className="w-full h-full object-contain" alt="Upload" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] h-6 bg-black/60 hover:bg-black/80 text-zinc-400 rounded flex items-center justify-center gap-1"
              >
                <ImageIcon className="w-3 h-3" /> Trocar
              </button>
            </div>
          )}
        </div>
      </div>
      
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

ImageUploadNode.displayName = 'ImageUploadNode';
