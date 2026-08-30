import { useCallback, useState, useRef, useEffect } from 'react';
import { Node, useReactFlow } from 'reactflow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { X, Download, Image, Sparkles, Video, Wand2, Layers, FileText, Upload, Loader2, Eraser, MessageSquare, Send, Check, RotateCcw, Lock, Unlock, FolderPlus } from 'lucide-react';
import { AddToCollectionDialog } from '@/components/studio/AddToCollectionDialog';
import { OpenAIControls } from './nodes/OpenAIControls';
import { OpenRouterModelSelect } from './nodes/OpenRouterModelSelect';
import { downloadImage } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface NodeInspectorPanelProps {
  node: Node;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  idle: { label: 'Aguardando', className: 'bg-muted text-muted-foreground' },
  running: { label: 'Gerando...', className: 'bg-yellow-500/20 text-yellow-500 animate-pulse' },
  completed: { label: 'Concluído', className: 'bg-green-500/20 text-green-500' },
  error: { label: 'Erro', className: 'bg-red-500/20 text-red-500' },
};

const nodeIcons: Record<string, React.ReactNode> = {
  imageGeneratorNode: <Image className="w-4 h-4" />,
  aiTextGeneratorNode: <Sparkles className="w-4 h-4" />,
  videoGeneratorNode: <Video className="w-4 h-4" />,
  imageEditorNode: <Wand2 className="w-4 h-4" />,
  aiImageEditorNode: <Wand2 className="w-4 h-4" />,
  removeBackgroundNode: <Eraser className="w-4 h-4" />,
  imageVariationNode: <Sparkles className="w-4 h-4" />,
  imageCombinerNode: <Layers className="w-4 h-4" />,
  textInputNode: <FileText className="w-4 h-4" />,
  imageUploadNode: <Upload className="w-4 h-4" />,
};

const nodeLabels: Record<string, string> = {
  imageGeneratorNode: 'Gerar Imagem',
  aiTextGeneratorNode: 'Texto IA',
  videoGeneratorNode: 'Gerar Vídeo',
  imageEditorNode: 'Editar Imagem',
  aiImageEditorNode: 'Editar Imagem (IA)',
  removeBackgroundNode: 'Remover Fundo',
  imageVariationNode: 'Variação de Imagem',
  imageCombinerNode: 'Combinar Imagens',
  textInputNode: 'Texto',
  imageUploadNode: 'Upload de Imagem',
};

export function NodeInspectorPanel({ node, onClose }: NodeInspectorPanelProps) {
  const { setNodes } = useReactFlow();
  const data = node.data;
  const status = statusConfig[data.status || 'idle'];

  const updateData = useCallback((newData: any) => {
    setNodes((nds) =>
      nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, ...newData } } : n)
    );
  }, [node.id, setNodes]);

  const handleDownload = async (url: string) => {
    try {
      await downloadImage(url, `${node.type}-${Date.now()}.png`);
      toast.success('Baixado com sucesso!');
    } catch { toast.error('Erro ao baixar'); }
  };

  return (
    <div className="w-[360px] h-full border-l border-white/10 bg-zinc-950 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          {nodeIcons[node.type || '']}
          <span className="text-sm font-medium text-white/90">
            {nodeLabels[node.type || ''] || 'Node'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px] px-1.5 py-0", status.className)} variant="outline">
            {status.label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", data.locked ? "text-amber-400 hover:text-amber-300" : "text-white/30 hover:text-white/60")}
            onClick={() => updateData({ locked: !data.locked })}
            title={data.locked ? 'Destravar nó' : 'Travar nó'}
          >
            {data.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-white/80" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {node.type === 'imageGeneratorNode' && <ImageGeneratorInspector data={data} updateData={updateData} onDownload={handleDownload} />}
          {node.type === 'aiTextGeneratorNode' && <AITextInspector data={data} updateData={updateData} />}
          {node.type === 'videoGeneratorNode' && <VideoGeneratorInspector data={data} updateData={updateData} />}
          {node.type === 'imageEditorNode' && <ImageEditorInspector data={data} updateData={updateData} onDownload={handleDownload} />}
          {node.type === 'aiImageEditorNode' && <AIImageEditorInspector data={data} updateData={updateData} onDownload={handleDownload} />}
          {node.type === 'removeBackgroundNode' && <RemoveBackgroundInspector data={data} onDownload={handleDownload} />}
          {node.type === 'imageVariationNode' && <ImageVariationInspector data={data} updateData={updateData} onDownload={handleDownload} />}
          {node.type === 'imageCombinerNode' && <ImageCombinerInspector data={data} updateData={updateData} onDownload={handleDownload} />}
          {node.type === 'textInputNode' && <TextInputInspector data={data} updateData={updateData} />}
          {node.type === 'imageUploadNode' && <ImageUploadInspector data={data} />}
        </div>
      </ScrollArea>
    </div>
  );
}

// === Sub-inspectors ===

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">{children}</h3>;
}

function ProviderSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; badge?: string; badgeColor?: string }[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-white/70">Provedor</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                {opt.badge && <Badge variant="outline" className={`text-[9px] ${opt.badgeColor || ''}`}>{opt.badge}</Badge>}
                {opt.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ImagePreview({ url, label, onDownload }: { url?: string; label: string; onDownload?: (url: string) => void }) {
  if (!url) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>{label}</SectionTitle>
        {onDownload && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => onDownload(url)}>
            <Download className="w-3 h-3" /> Baixar
          </Button>
        )}
      </div>
      <img src={url} alt={label} className="w-full rounded-lg border border-white/10" />
    </div>
  );
}

function SaveToCollectionButton({ resultUrl, prompt, type, provider }: { resultUrl: string; prompt?: string; type: 'image' | 'video'; provider?: string }) {
  const [saving, setSaving] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Faça login primeiro'); setSaving(false); return; }

      const { data, error } = await supabase
        .from('studio_generations' as any)
        .insert({ user_id: user.id, type, prompt: prompt || '', result: resultUrl, provider: provider || 'workflow' } as any)
        .select('id')
        .single();

      if (error) throw error;
      setGenerationId((data as any).id);
      setDialogOpen(true);
    } catch (err: any) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 w-full" onClick={handleSave} disabled={saving}>
        <FolderPlus className="w-3 h-3" /> {saving ? 'Salvando...' : 'Salvar na Coleção'}
      </Button>
      {generationId && (
        <AddToCollectionDialog open={dialogOpen} onOpenChange={setDialogOpen} generationId={generationId} />
      )}
    </>
  );
}

function PromptPreview({ prompt }: { prompt?: string }) {
  if (!prompt) return null;
  return (
    <div className="space-y-1.5">
      <SectionTitle>Prompt</SectionTitle>
      <div className="text-xs text-white/70 bg-white/5 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">
        {prompt}
      </div>
    </div>
  );
}

const imageProviderOptions = [
  { value: 'gemini', label: 'Gemini', badge: 'GRÁTIS', badgeColor: 'bg-green-500/10' },
  { value: 'openai', label: 'OpenAI GPT-Image-1', badge: 'PAGO', badgeColor: 'bg-blue-500/10' },
  { value: 'openrouter', label: 'OpenRouter', badge: 'CUSTOM', badgeColor: 'bg-orange-500/10' },
];

const textProviderOptions = [
  { value: 'lovable', label: 'Lovable AI', badge: 'GRÁTIS', badgeColor: 'bg-green-500/10' },
  { value: 'openrouter', label: 'OpenRouter', badge: 'CUSTOM', badgeColor: 'bg-orange-500/10' },
];

const videoProviderOptions = [
  { value: 'gemini', label: 'Gemini Veo', badge: 'PADRÃO', badgeColor: 'bg-green-500/10' },
  { value: 'openrouter', label: 'OpenRouter', badge: 'CUSTOM', badgeColor: 'bg-orange-500/10' },
];

// --- Image Generator ---
function ImageGeneratorInspector({ data, updateData, onDownload }: { data: any; updateData: (d: any) => void; onDownload: (url: string) => void }) {
  const provider = data.provider || 'gemini';
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhancePrompt = async () => {
    if (!data.prompt?.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('enhance-image-prompt', {
        body: { prompt: data.prompt.trim() },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      if (result?.enhancedPrompt) {
        updateData({ prompt: result.enhancedPrompt });
        toast.success('Prompt melhorado!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao melhorar prompt');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <>
      <ProviderSelect value={provider} onChange={(v) => updateData({ provider: v })} options={imageProviderOptions} />
      {provider === 'openai' && (
        <OpenAIControls controls={data.openaiControls || {}} onChange={(c) => updateData({ openaiControls: c })} showFidelity={false} />
      )}
      {provider === 'openrouter' && (
        <OpenRouterModelSelect modelType="image" value={data.openrouterModel} onChange={(m) => updateData({ openrouterModel: m })} />
      )}
      <Separator className="bg-white/10" />
      {data.prompt && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SectionTitle>Prompt</SectionTitle>
            <button
              onClick={handleEnhancePrompt}
              disabled={enhancing}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
              title="Melhorar prompt com IA"
            >
              {enhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              Melhorar
            </button>
          </div>
          <div className="text-xs text-white/70 bg-white/5 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">
            {data.prompt}
          </div>
        </div>
      )}
      <ImagePreview url={data.imageUrl} label="Imagem Gerada" onDownload={onDownload} />
      {data.imageUrl && data.status === 'completed' && (
        <SaveToCollectionButton resultUrl={data.imageUrl} prompt={data.prompt} type="image" provider={provider} />
      )}
    </>
  );
}

// --- AI Text ---
function AITextInspector({ data, updateData }: { data: any; updateData: (d: any) => void }) {
  const provider = data.provider || 'lovable';
  return (
    <>
      <ProviderSelect value={provider} onChange={(v) => updateData({ provider: v })} options={textProviderOptions} />
      {provider === 'openrouter' && (
        <OpenRouterModelSelect modelType="text" value={data.openrouterModel} onChange={(m) => updateData({ openrouterModel: m })} />
      )}
      <Separator className="bg-white/10" />
      <PromptPreview prompt={data.prompt} />
      {data.generatedText && (
        <div className="space-y-1.5">
          <SectionTitle>Texto Gerado</SectionTitle>
          <div className="text-xs text-white/80 bg-white/5 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">
            {data.generatedText}
          </div>
        </div>
      )}
    </>
  );
}

// --- Video Generator ---
function VideoGeneratorInspector({ data, updateData }: { data: any; updateData: (d: any) => void }) {
  const provider = data.provider || 'gemini';
  return (
    <>
      <ProviderSelect value={provider} onChange={(v) => updateData({ provider: v })} options={videoProviderOptions} />
      {provider === 'openrouter' ? (
        <OpenRouterModelSelect modelType="video" value={data.openrouterModel} onChange={(m) => updateData({ openrouterModel: m })} />
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Proporção</Label>
            <Select value={data.aspectRatio || '16:9'} onValueChange={(v: any) => updateData({ aspectRatio: v })} disabled={data.status === 'running'}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9 (Paisagem)</SelectItem>
                <SelectItem value="9:16">9:16 (Retrato)</SelectItem>
                <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Pessoas</Label>
            <Select value={data.personGeneration || 'none'} onValueChange={(v: any) => updateData({ personGeneration: v === 'none' ? undefined : v })} disabled={data.status === 'running'}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem pessoas</SelectItem>
                <SelectItem value="allow">Permitir</SelectItem>
                <SelectItem value="require">Exigir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70">Duração</Label>
              <span className="text-xs text-white/50">{data.duration || 5}s</span>
            </div>
            <Slider value={[data.duration || 5]} onValueChange={([v]) => updateData({ duration: v })} min={5} max={8} step={1} disabled={data.status === 'running'} />
          </div>
        </>
      )}
      <Separator className="bg-white/10" />
      <PromptPreview prompt={data.prompt} />
      {data.videoUrl && (
        <div className="space-y-1.5">
          <SectionTitle>Vídeo Gerado</SectionTitle>
          <video src={data.videoUrl} controls autoPlay loop playsInline className="w-full rounded-lg border border-white/10" />
          <SaveToCollectionButton resultUrl={data.videoUrl} prompt={data.prompt} type="video" provider={provider} />
        </div>
      )}
      {data.imageUrl && !data.videoUrl && (
        <div className="space-y-1.5">
          <SectionTitle>Imagem de Referência</SectionTitle>
          <img src={data.imageUrl} alt="Referência" className="w-full rounded-lg border border-white/10" />
        </div>
      )}
    </>
  );
}

// --- AI Image Editor (dedicated AI editing) ---
function AIImageEditorInspector({ data, updateData, onDownload }: { data: any; updateData: (d: any) => void; onDownload: (url: string) => void }) {
  const provider = data.provider || 'gemini';

  return (
    <>
      <ProviderSelect value={provider} onChange={(v) => updateData({ provider: v })} options={imageProviderOptions} />
      {provider === 'openai' && (
        <OpenAIControls controls={data.openaiControls || {}} onChange={(c) => updateData({ openaiControls: c })} showFidelity={false} />
      )}
      {provider === 'openrouter' && (
        <OpenRouterModelSelect modelType="image" value={data.openrouterModel} onChange={(m) => updateData({ openrouterModel: m })} />
      )}
      <div className="space-y-1.5">
        <Label className="text-xs text-white/70">Como funciona</Label>
        <p className="text-[10px] text-white/40">
          Conecte uma imagem + um nó de texto com a instrução de edição (ex: "torne mais vibrante", "adicione neve").
        </p>
      </div>
      <PromptPreview prompt={data.editPrompt} />
      <Separator className="bg-white/10" />
      {data.inputImageUrl && <ImagePreview url={data.inputImageUrl} label="Imagem Original" />}
      <ImagePreview url={data.outputImageUrl} label="Resultado" onDownload={onDownload} />
      {data.outputImageUrl && data.status === 'completed' && (
        <SaveToCollectionButton resultUrl={data.outputImageUrl} prompt={data.editPrompt} type="image" provider={provider} />
      )}
    </>
  );
}

// --- Image Editor (local editing: filters, adjustments, text, transform) ---
function ImageEditorInspector({ data, updateData, onDownload }: { data: any; updateData: (d: any) => void; onDownload: (url: string) => void }) {
  const editMode = data.editMode || 'filters';
  const [rotating, setRotating] = useState(false);

  const handleRotate90 = async () => {
    if (!data.inputImageUrl || rotating) return;
    setRotating(true);
    try {
      const baseUrl = data.inputImageUrl;
      const newAngle = (((data.rotateAngle || 0) + 90) % 360) as 0 | 90 | 180 | 270;

      if (newAngle === 0) {
        updateData({ rotateAngle: 0, rotatedPreviewUrl: undefined });
        setRotating(false);
        return;
      }

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const swap = newAngle === 90 || newAngle === 270;
        canvas.width = swap ? img.height : img.width;
        canvas.height = swap ? img.width : img.height;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((newAngle * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotatedUrl = canvas.toDataURL('image/png');
        updateData({ rotateAngle: newAngle, rotatedPreviewUrl: rotatedUrl });
        setRotating(false);
      };
      img.onerror = () => { setRotating(false); };
      img.src = baseUrl;
    } catch { setRotating(false); }
  };

  return (
    <>
      <Tabs value={editMode} onValueChange={(v) => updateData({ editMode: v })} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/5 h-8">
          <TabsTrigger value="filters" className="text-[10px] px-1">Filtros</TabsTrigger>
          <TabsTrigger value="adjustments" className="text-[10px] px-1">Ajustes</TabsTrigger>
          <TabsTrigger value="text" className="text-[10px] px-1">Texto</TabsTrigger>
          <TabsTrigger value="transform" className="text-[10px] px-1">Transf.</TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-2 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Filtro</Label>
            <Select value={data.filter || 'none'} onValueChange={(v) => updateData({ filter: v })}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="grayscale">Preto e Branco</SelectItem>
                <SelectItem value="sepia">Sépia</SelectItem>
                <SelectItem value="invert">Inverter</SelectItem>
                <SelectItem value="blur">Desfoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-3 mt-3">
          {[
            { key: 'brightness', label: 'Brilho' },
            { key: 'contrast', label: 'Contraste' },
            { key: 'saturation', label: 'Saturação' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-white/70">{label}</Label>
                <span className="text-[10px] text-white/50">{data[key] ?? 100}</span>
              </div>
              <Slider value={[data[key] ?? 100]} onValueChange={([v]) => updateData({ [key]: v })} min={0} max={200} step={1} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="text" className="space-y-2 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Texto</Label>
            <Input value={data.textOverlay || ''} onChange={(e) => updateData({ textOverlay: e.target.value })} placeholder="Digite o texto..." className="h-8 text-xs bg-white/5 border-white/10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Posição</Label>
            <Select value={data.textPosition || 'center'} onValueChange={(v) => updateData({ textPosition: v })}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Topo</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="bottom">Rodapé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Cor</Label>
            <Input type="color" value={data.textColor || '#ffffff'} onChange={(e) => updateData({ textColor: e.target.value })} className="h-8 bg-white/5 border-white/10" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-white/70">Tamanho</Label>
              <span className="text-[10px] text-white/50">{data.textSize || 32}px</span>
            </div>
            <Slider value={[data.textSize || 32]} onValueChange={([v]) => updateData({ textSize: v })} min={12} max={72} step={2} />
          </div>
        </TabsContent>

        <TabsContent value="transform" className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Recorte</Label>
            <Select value={data.cropAspectRatio || 'original'} onValueChange={(v) => updateData({ cropAspectRatio: v })}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70">Rotação</Label>
              <span className="text-[10px] text-white/50">{data.rotateAngle || 0}°</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleRotate90}
              disabled={rotating || !data.inputImageUrl}
            >
              {rotating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Rotacionar 90°
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/70">Inverter H</Label>
            <Switch checked={data.flipHorizontal || false} onCheckedChange={(c) => updateData({ flipHorizontal: c })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/70">Inverter V</Label>
            <Switch checked={data.flipVertical || false} onCheckedChange={(c) => updateData({ flipVertical: c })} />
          </div>
        </TabsContent>
      </Tabs>

      <Separator className="bg-white/10" />
      {data.inputImageUrl && <ImagePreview url={data.inputImageUrl} label="Imagem Original" />}
      
      {/* Live preview */}
      {data.inputImageUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionTitle>Preview</SectionTitle>
          </div>
          <div className="relative w-full rounded-lg border border-white/10 overflow-hidden">
            <img
              src={data.rotatedPreviewUrl || data.inputImageUrl}
              alt="Preview"
              className="w-full transition-all duration-200"
              style={{
                filter: (() => {
                  const parts: string[] = [];
                  const f = data.filter || 'none';
                  if (f === 'grayscale') parts.push('grayscale(100%)');
                  else if (f === 'sepia') parts.push('sepia(100%)');
                  else if (f === 'invert') parts.push('invert(100%)');
                  else if (f === 'blur') parts.push('blur(3px)');
                  const b = data.brightness ?? 100;
                  const c = data.contrast ?? 100;
                  const s = data.saturation ?? 100;
                  if (b !== 100) parts.push(`brightness(${b}%)`);
                  if (c !== 100) parts.push(`contrast(${c}%)`);
                  if (s !== 100) parts.push(`saturate(${s}%)`);
                  return parts.length ? parts.join(' ') : 'none';
                })(),
                transform: (() => {
                  const parts: string[] = [];
                  const scaleX = data.flipHorizontal ? -1 : 1;
                  const scaleY = data.flipVertical ? -1 : 1;
                  if (scaleX !== 1 || scaleY !== 1) parts.push(`scale(${scaleX}, ${scaleY})`);
                  return parts.length ? parts.join(' ') : 'none';
                })(),
              }}
            />
            {data.textOverlay?.trim() && (
              <div
                className={`absolute left-0 right-0 ${
                  (data.textPosition || 'center') === 'top' ? 'top-2' : (data.textPosition || 'center') === 'bottom' ? 'bottom-2' : 'top-1/2 -translate-y-1/2'
                } text-center pointer-events-none`}
                style={{
                  fontSize: `${Math.round((data.textSize || 32) * 0.6)}px`,
                  color: data.textColor || '#ffffff',
                  textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                  fontWeight: 'bold',
                }}
              >
                {data.textOverlay}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      <ImagePreview url={data.outputImageUrl} label="Resultado" onDownload={onDownload} />
    </>
  );
}

// --- Remove Background ---
function RemoveBackgroundInspector({ data, onDownload }: { data: any; onDownload: (url: string) => void }) {
  return (
    <>
      <div className="space-y-1.5">
        <SectionTitle>Como funciona</SectionTitle>
        <p className="text-[10px] text-white/40">
          Conecte uma imagem e execute. O fundo será removido automaticamente usando a API Remove.bg.
        </p>
      </div>
      <Separator className="bg-white/10" />
      {data.inputImageUrl && <ImagePreview url={data.inputImageUrl} label="Imagem Original" />}
      <ImagePreview url={data.outputImageUrl} label="Sem Fundo" onDownload={onDownload} />
    </>
  );
}

// --- Image Variation ---
function ImageVariationInspector({ data, updateData, onDownload }: { data: any; updateData: (d: any) => void; onDownload: (url: string) => void }) {
  const provider = data.provider || 'gemini';
  return (
    <>
      <ProviderSelect value={provider} onChange={(v) => updateData({ provider: v })} options={imageProviderOptions} />
      {provider === 'openai' && (
        <OpenAIControls controls={data.openaiControls || {}} onChange={(c) => updateData({ openaiControls: c })} showFidelity={true} />
      )}
      {provider === 'openrouter' && (
        <OpenRouterModelSelect modelType="image" value={data.openrouterModel} onChange={(m) => updateData({ openrouterModel: m })} />
      )}
      <Separator className="bg-white/10" />
      <PromptPreview prompt={data.prompt} />
      {data.inputImage && <ImagePreview url={data.inputImage} label="Imagem Original" />}
      <ImagePreview url={data.resultUrl} label="Variação Gerada" onDownload={onDownload} />
    </>
  );
}

// --- Image Combiner ---
function ImageCombinerInspector({ data, updateData, onDownload }: { data: any; updateData: (d: any) => void; onDownload: (url: string) => void }) {
  const provider = data.provider || 'gemini';
  return (
    <>
      <ProviderSelect value={provider} onChange={(v) => updateData({ provider: v })} options={imageProviderOptions} />
      {provider === 'openai' && (
        <OpenAIControls controls={data.openaiControls || {}} onChange={(c) => updateData({ openaiControls: c })} showFidelity={true} />
      )}
      {provider === 'openrouter' && (
        <OpenRouterModelSelect modelType="image" value={data.openrouterModel} onChange={(m) => updateData({ openrouterModel: m })} />
      )}
      <Separator className="bg-white/10" />
      {data.instruction && (
        <div className="space-y-1.5">
          <SectionTitle>Instrução</SectionTitle>
          <div className="text-xs text-white/70 bg-white/5 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">{data.instruction}</div>
        </div>
      )}
      {data.imageA && <ImagePreview url={data.imageA} label="Imagem A" />}
      {data.imageB && <ImagePreview url={data.imageB} label="Imagem B" />}
      <ImagePreview url={data.resultUrl} label="Resultado" onDownload={onDownload} />
    </>
  );
}

// --- Text Input with guided chat ---
type ChatMessage = { role: 'user' | 'assistant'; content: string };

function TextInputInspector({ data, updateData }: { data: any; updateData: (d: any) => void }) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'chat'>('content');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setInputValue('');
    setIsSending(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('prompt-chat', {
        body: {
          messages: newMessages,
          currentPrompt: data.text || '',
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      const assistantMsg: ChatMessage = { role: 'assistant', content: result.message };
      setChatMessages(prev => [...prev, assistantMsg]);

      if (result.finalPrompt) {
        setFinalPrompt(result.finalPrompt);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const applyFinalPrompt = () => {
    if (finalPrompt) {
      updateData({ text: finalPrompt });
      toast.success('Prompt aplicado!');
      setFinalPrompt(null);
    }
  };

  const resetChat = () => {
    setChatMessages([]);
    setFinalPrompt(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
        <button
          onClick={() => setActiveTab('content')}
          className={cn(
            "flex-1 text-[10px] font-medium px-2 py-1.5 rounded-md transition-colors",
            activeTab === 'content' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
          )}
        >
          <FileText className="w-3 h-3 inline mr-1" />
          Conteúdo
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            "flex-1 text-[10px] font-medium px-2 py-1.5 rounded-md transition-colors",
            activeTab === 'chat' ? 'bg-violet-600/30 text-violet-400' : 'text-white/50 hover:text-white/70'
          )}
        >
          <MessageSquare className="w-3 h-3 inline mr-1" />
          Chat Guiado
        </button>
      </div>

      {activeTab === 'content' && (
        <div className="space-y-1.5">
          <SectionTitle>Conteúdo</SectionTitle>
          <div className="text-xs text-white/80 bg-white/5 p-3 rounded-lg border border-white/10 whitespace-pre-wrap min-h-[100px]">
            {data.text || <span className="text-white/40 italic">Nenhum texto digitado</span>}
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionTitle>Construa seu prompt</SectionTitle>
            {chatMessages.length > 0 && (
              <button onClick={resetChat} className="text-[10px] text-white/40 hover:text-white/60 flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5" /> Limpar
              </button>
            )}
          </div>

          {/* Chat messages */}
          <div
            ref={scrollRef}
            className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin"
          >
            {chatMessages.length === 0 && (
              <div className="text-[10px] text-white/30 italic text-center py-6">
                Descreva o que você quer criar e eu te ajudo a construir o prompt perfeito ✨
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "text-[11px] p-2.5 rounded-lg max-w-[95%] whitespace-pre-wrap leading-relaxed",
                  msg.role === 'user'
                    ? 'bg-violet-600/20 text-violet-300 ml-auto'
                    : 'bg-white/5 text-white/80'
                )}
              >
                {msg.content}
              </div>
            ))}
            {isSending && (
              <div className="bg-white/5 text-white/50 text-[11px] p-2.5 rounded-lg flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Pensando...
              </div>
            )}
          </div>

          {/* Final prompt banner */}
          {finalPrompt && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 space-y-2">
              <div className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Prompt final gerado
              </div>
              <div className="text-[10px] text-emerald-300/80 whitespace-pre-wrap line-clamp-4">
                {finalPrompt}
              </div>
              <Button
                size="sm"
                onClick={applyFinalPrompt}
                className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              >
                <Check className="w-3 h-3" /> Aplicar ao nó
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-1.5">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o que quer criar..."
              className="h-8 text-[11px] bg-white/5 border-white/10 placeholder:text-white/30"
              disabled={isSending}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!inputValue.trim() || isSending}
              className="h-8 w-8 shrink-0 bg-violet-600 hover:bg-violet-700"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Image Upload (read-only content) ---
function ImageUploadInspector({ data }: { data: any }) {
  return (
    <>
      {data.uploadedImageUrl && (
        <ImagePreview url={data.uploadedImageUrl} label="Imagem Enviada" />
      )}
      {data.fileName && (
        <div className="text-xs text-white/50">
          📄 {data.fileName}
          {data.fileSize && ` • ${(data.fileSize / 1024).toFixed(1)} KB`}
        </div>
      )}
      {!data.uploadedImageUrl && (
        <div className="text-xs text-white/40 italic">Nenhuma imagem enviada</div>
      )}
    </>
  );
}
