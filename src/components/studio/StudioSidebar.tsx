import { useState, useRef } from 'react';
import { ImageIcon, Video, Sparkles, Loader2, Upload, X, ChevronRight, Wand2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OpenRouterModelSelect } from '@/components/creative/nodes/OpenRouterModelSelect';
import { OpenAIControls } from '@/components/creative/nodes/OpenAIControls';
import { ModelPickerSheet } from './ModelPickerSheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ImageProvider, OpenAIControls as OpenAIControlsType } from '@/types/workflow';

export interface StudioResult {
  id: string;
  type: 'text' | 'image' | 'video';
  prompt: string;
  provider: string;
  result: string;
  createdAt: Date;
  batchId?: string;
}

type ContentType = 'image' | 'video';

interface StudioSidebarProps {
  onResult: (result: StudioResult) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

// Visual aspect ratio buttons
const aspectRatioOptions = [
  { ratio: '1:1', w: 14, h: 14 },
  { ratio: '3:2', w: 18, h: 12 },
  { ratio: '2:3', w: 12, h: 18 },
  { ratio: '16:9', w: 22, h: 12 },
  { ratio: '9:16', w: 12, h: 22 },
];

const providerLabel: Record<string, string> = {
  gemini: '✨ Gemini',
  openai: '🤖 OpenAI',
  lovable: '✨ Lovable AI',
  openrouter: '🔌 OpenRouter',
};

export const StudioSidebar = ({ onResult, loading, setLoading }: StudioSidebarProps) => {
  const [contentType, setContentType] = useState<ContentType>('image');
  const [prompt, setPrompt] = useState('');


  // Image state
  const [imageProvider, setImageProvider] = useState<ImageProvider>('gemini');
  const [imageModel, setImageModel] = useState('');
  const [imageCount, setImageCount] = useState(1);
  const [openaiControls, setOpenaiControls] = useState<OpenAIControlsType>({
    quality: 'auto',
    background: 'auto',
    outputFormat: 'png',
    size: 'auto',
    n: 1,
    moderation: 'auto',
  });
  const [geminiAspectRatio, setGeminiAspectRatio] = useState('1:1');
  const [imageReferenceImage, setImageReferenceImage] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Video state
  const [videoProvider, setVideoProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [videoModel, setVideoModel] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(8);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'video' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (target === 'video') setReferenceImage(ev.target?.result as string);
      else setImageReferenceImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleModelSelect = (provider: string, modelId?: string) => {
    if (contentType === 'image') {
      setImageProvider(provider as ImageProvider);
      if (modelId) setImageModel(modelId);
    } else {
      setVideoProvider(provider as 'gemini' | 'openrouter');
      if (modelId) setVideoModel(modelId);
    }
  };

  const currentProvider = contentType === 'image' ? imageProvider : videoProvider;

  const isDisabled = () => {
    if (loading || !prompt.trim()) return true;
    if (contentType === 'image' && imageProvider === 'openrouter' && !imageModel) return true;
    if (contentType === 'video' && videoProvider === 'openrouter' && !videoModel) return true;
    return false;
  };

  const handleGenerate = async () => {
    if (isDisabled()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const batchId = crypto.randomUUID();

      const saveGeneration = async (result: StudioResult) => {
        if (user) {
          await supabase.from('studio_generations' as any).insert({
            id: result.id,
            user_id: user.id,
            type: result.type,
            prompt: result.prompt,
            provider: result.provider,
            result: result.result,
            batch_id: result.batchId,
          } as any);
        }
        onResult(result);
      };

      if (contentType === 'image') {
        const body: any = {
          prompt: prompt.trim(),
          provider: imageProvider,
          openaiControls: imageProvider === 'openai' ? openaiControls : undefined,
          openrouterModel: imageProvider === 'openrouter' ? imageModel : undefined,
          userId: user?.id,
          aspectRatio: imageProvider === 'gemini' ? geminiAspectRatio : undefined,
          count: imageCount,
        };
        if (imageReferenceImage) {
          body.inputImage = imageReferenceImage;
          body.mode = 'variation';
          body.instruction = prompt.trim();
        }
        const { data, error } = await supabase.functions.invoke('generate-image', { body });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        const urls: string[] = data.imageUrls || [data.imageUrl];
        for (const url of urls) {
          await saveGeneration({
            id: crypto.randomUUID(),
            type: 'image',
            prompt: prompt.trim(),
            provider: imageProvider,
            result: url,
            createdAt: new Date(),
            batchId,
          });
        }
      } else {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: {
            prompt: prompt.trim(),
            imageUrl: referenceImage || undefined,
            aspectRatio: videoProvider === 'gemini' ? aspectRatio : undefined,
            duration: videoProvider === 'gemini' ? duration : undefined,
            provider: videoProvider,
            openrouterModel: videoProvider === 'openrouter' ? videoModel : undefined,
            userId: user?.id,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        await saveGeneration({
          id: crypto.randomUUID(),
          type: 'video',
          prompt: prompt.trim(),
          provider: videoProvider,
          result: data.videoUrl,
          createdAt: new Date(),
          batchId,
        });
      }
    } catch (err: any) {
      const { handleQuotaError } = await import('@/lib/api-error-utils');
      if (!handleQuotaError(err.message || '')) {
        toast({ title: `Erro ao gerar ${contentType === 'image' ? 'imagem' : 'vídeo'}`, description: err.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const typeOptions: { id: ContentType; icon: React.ElementType; label: string }[] = [
    { id: 'image', icon: ImageIcon, label: 'Imagem' },
    { id: 'video', icon: Video, label: 'Vídeo' },
  ];

  return (
    <aside className="w-full md:w-[340px] md:min-w-[340px] rounded-2xl border border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
        {/* Content Type Selector */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500 uppercase tracking-wider">Tipo</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {typeOptions.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setContentType(id)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  contentType === id
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'bg-zinc-950 text-zinc-500 hover:bg-zinc-800 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Model Picker Button */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500 uppercase tracking-wider">Modelo</Label>
          <ModelPickerSheet contentType={contentType} selectedProvider={currentProvider} onSelect={handleModelSelect}>
            <button className="w-full flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 transition-all text-sm">
              <span className="font-medium text-zinc-300">{providerLabel[currentProvider] || currentProvider}</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          </ModelPickerSheet>
        </div>

        {/* OpenRouter model select (when openrouter is chosen) */}
        {contentType === 'image' && imageProvider === 'openrouter' && (
          <OpenRouterModelSelect modelType="image" value={imageModel} onChange={setImageModel} />
        )}
        {contentType === 'video' && videoProvider === 'openrouter' && (
          <OpenRouterModelSelect modelType="video" value={videoModel} onChange={setVideoModel} />
        )}

        {/* OpenAI specific controls */}
        {contentType === 'image' && imageProvider === 'openai' && (
          <OpenAIControls controls={openaiControls} onChange={setOpenaiControls} showFidelity={!!imageReferenceImage} />
        )}

        {/* Aspect Ratio - visual buttons */}
        {contentType === 'image' && imageProvider !== 'openai' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Proporção</Label>
            <div className="flex gap-1.5">
              {aspectRatioOptions.map(({ ratio, w, h }) => (
                <button
                  key={ratio}
                  onClick={() => setGeminiAspectRatio(ratio)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all flex-1 ${
                    geminiAspectRatio === ratio
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-zinc-950 border border-transparent hover:bg-zinc-800'
                  }`}
                >
                  <div
                    className={`rounded-sm ${geminiAspectRatio === ratio ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                    style={{ width: w, height: h }}
                  />
                  <span className="text-[9px] text-zinc-500">{ratio}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Count */}
        {contentType === 'image' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Número de imagens</Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setImageCount(n)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    imageCount === n
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-950 text-zinc-500 hover:bg-zinc-800 border border-transparent'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reference image for image generation */}
        {contentType === 'image' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Imagem de referência (opcional)</Label>
            {imageReferenceImage ? (
              <div className="relative inline-block">
                <img src={imageReferenceImage} alt="Referência" className="h-16 rounded-lg border border-zinc-800" />
                <button
                  onClick={() => { setImageReferenceImage(null); if (imageFileInputRef.current) imageFileInputRef.current.value = ''; }}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => imageFileInputRef.current?.click()} className="text-xs border-dashed border-zinc-800 bg-zinc-950 hover:bg-zinc-800 w-full">
                <Upload className="w-3 h-3 mr-1" /> Upload imagem
              </Button>
            )}
            <input ref={imageFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'image')} />
          </div>
        )}

        {contentType === 'video' && videoProvider === 'gemini' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Proporção</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 Paisagem</SelectItem>
                  <SelectItem value="9:16">9:16 Retrato</SelectItem>
                  <SelectItem value="1:1">1:1 Quadrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Duração</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4s</SelectItem>
                  <SelectItem value="6">6s</SelectItem>
                  <SelectItem value="8">8s</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Reference image for video */}
        {contentType === 'video' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Imagem de referência (opcional)</Label>
            {referenceImage ? (
              <div className="relative inline-block">
                <img src={referenceImage} alt="Referência" className="h-16 rounded-lg border border-zinc-800" />
                <button
                  onClick={() => { setReferenceImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs border-dashed border-zinc-800 bg-zinc-950 hover:bg-zinc-800 w-full">
                <Upload className="w-3 h-3 mr-1" /> Upload imagem
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'video')} />
          </div>
        )}

        {/* Prompt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-500 uppercase tracking-wider">Prompt</Label>
            {contentType === 'image' && (
              <EnhancePromptButton
                prompt={prompt}
                aspectRatio={imageProvider === 'gemini' ? geminiAspectRatio : undefined}
                onEnhanced={setPrompt}
                disabled={loading}
              />
            )}
          </div>
          <Textarea
            placeholder={
              contentType === 'image' ? 'Descreva a imagem que deseja gerar...' :
              'Descreva o vídeo que deseja gerar...'
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] bg-zinc-950 border-zinc-800 text-zinc-300 resize-none text-sm"
          />
        </div>
        </div>
      </ScrollArea>

      {/* Generate button pinned to bottom */}
      <div className="p-4 border-t border-zinc-800">
        <Button
          onClick={handleGenerate}
          disabled={isDisabled()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl h-11"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {loading ? 'Gerando...' : `Gerar ${contentType === 'image' ? (imageCount > 1 ? `${imageCount} Imagens` : 'Imagem') : 'Vídeo'}`}
        </Button>
      </div>
    </aside>
  );
};

// --- Enhance Prompt Button ---
function EnhancePromptButton({ prompt, aspectRatio, onEnhanced, disabled }: {
  prompt: string;
  aspectRatio?: string;
  onEnhanced: (text: string) => void;
  disabled?: boolean;
}) {
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-image-prompt', {
        body: { prompt: prompt.trim(), aspectRatio },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.enhancedPrompt) {
        onEnhanced(data.enhancedPrompt);
        toast({ title: 'Prompt melhorado!', description: 'O prompt foi otimizado pelo agente especialista.' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao melhorar prompt', description: err.message, variant: 'destructive' });
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <button
      onClick={handleEnhance}
      disabled={!prompt.trim() || enhancing || disabled}
      className="flex items-center gap-1 text-[10px] text-emerald-500 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      title="Melhorar prompt com IA"
    >
      {enhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
      Melhorar
    </button>
  );
}
