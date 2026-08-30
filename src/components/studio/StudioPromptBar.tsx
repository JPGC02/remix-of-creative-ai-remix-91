import { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Paperclip, X, ArrowRight, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelPickerSheet } from './ModelPickerSheet';
import { OpenRouterModelSelect } from '@/components/creative/nodes/OpenRouterModelSelect';
import { OpenAIControls } from '@/components/creative/nodes/OpenAIControls';
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

interface StudioPromptBarProps {
  onResult: (result: StudioResult) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const aspectRatioOptions = [
  { ratio: '1:1', w: 'w-5', h: 'h-5' },
  { ratio: '3:2', w: 'w-6', h: 'h-4' },
  { ratio: '2:3', w: 'w-4', h: 'h-6' },
  { ratio: '16:9', w: 'w-7', h: 'h-4' },
  { ratio: '9:16', w: 'w-4', h: 'h-7' },
];

const providerLabel: Record<string, string> = {
  gemini: 'Gemini',
  openai: 'GPT Image',
  openrouter: 'OpenRouter',
};

export const StudioPromptBar = ({ onResult, loading, setLoading }: StudioPromptBarProps) => {
  const [contentType, setContentType] = useState<ContentType>('image');
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Image state
  const [imageProvider, setImageProvider] = useState<ImageProvider>('gemini');
  const [imageModel, setImageModel] = useState('');
  const [imageCount, setImageCount] = useState(1);
  const [openaiControls, setOpenaiControls] = useState<OpenAIControlsType>({
    quality: 'auto', background: 'auto', outputFormat: 'png', size: 'auto', n: 1, moderation: 'auto',
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
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Enhance prompt
  const [enhancing, setEnhancing] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [prompt]);

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
  const currentRefImage = contentType === 'image' ? imageReferenceImage : referenceImage;
  const currentFileRef = contentType === 'image' ? imageFileInputRef : videoFileInputRef;

  const isDisabled = () => {
    if (loading || !prompt.trim()) return true;
    if (contentType === 'image' && imageProvider === 'openrouter' && !imageModel) return true;
    if (contentType === 'video' && videoProvider === 'openrouter' && !videoModel) return true;
    return false;
  };

  const handleEnhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-image-prompt', {
        body: { prompt: prompt.trim(), aspectRatio: imageProvider === 'gemini' ? geminiAspectRatio : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        toast({ title: 'Prompt melhorado!' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao melhorar prompt', description: err.message, variant: 'destructive' });
    } finally {
      setEnhancing(false);
    }
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
            id: result.id, user_id: user.id, type: result.type, prompt: result.prompt,
            provider: result.provider, result: result.result, batch_id: result.batchId,
          } as any);
        }
        onResult(result);
      };

      if (contentType === 'image') {
        const body: any = {
          prompt: prompt.trim(), provider: imageProvider,
          openaiControls: imageProvider === 'openai' ? openaiControls : undefined,
          openrouterModel: imageProvider === 'openrouter' ? imageModel : undefined,
          userId: user?.id, aspectRatio: imageProvider === 'gemini' ? geminiAspectRatio : undefined,
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
            id: crypto.randomUUID(), type: 'image', prompt: prompt.trim(),
            provider: imageProvider, result: url, createdAt: new Date(), batchId,
          });
        }
      } else {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: {
            prompt: prompt.trim(), imageUrl: referenceImage || undefined,
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
          id: crypto.randomUUID(), type: 'video', prompt: prompt.trim(),
          provider: videoProvider, result: data.videoUrl, createdAt: new Date(), batchId,
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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8">
        {/* Textarea + Enhance */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate();
            }}
            placeholder={contentType === 'image' ? 'Descreva a imagem que você quer criar...' : 'Descreva o vídeo que você quer criar...'}
            className="w-full bg-transparent text-base text-zinc-100 leading-relaxed placeholder:text-zinc-600 resize-none outline-none min-h-[100px]"
          />
          {contentType === 'image' && (
            <button
              onClick={handleEnhance}
              disabled={!prompt.trim() || enhancing || loading}
              className="absolute top-0 right-0 flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {enhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Melhorar
            </button>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-zinc-800/50 pt-3 mt-3" />

        {/* OpenRouter model select (conditional) */}
        {contentType === 'image' && imageProvider === 'openrouter' && (
          <div className="mb-3">
            <OpenRouterModelSelect modelType="image" value={imageModel} onChange={setImageModel} />
          </div>
        )}
        {contentType === 'video' && videoProvider === 'openrouter' && (
          <div className="mb-3">
            <OpenRouterModelSelect modelType="video" value={videoModel} onChange={setVideoModel} />
          </div>
        )}

        {/* OpenAI controls (conditional) */}
        {contentType === 'image' && imageProvider === 'openai' && (
          <div className="mb-3">
            <OpenAIControls controls={openaiControls} onChange={setOpenaiControls} showFidelity={!!imageReferenceImage} />
          </div>
        )}

        {/* Parameters bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center flex-wrap gap-3">
            {/* Content type toggle */}
            <div className="bg-zinc-800 rounded-lg p-0.5 flex">
              {(['image', 'video'] as ContentType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setContentType(type)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    contentType === type ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {type === 'image' ? 'Imagem' : 'Vídeo'}
                </button>
              ))}
            </div>

            {/* Model picker */}
            <ModelPickerSheet contentType={contentType} selectedProvider={currentProvider} onSelect={handleModelSelect}>
              <button className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-zinc-100 transition-colors">
                {providerLabel[currentProvider] || currentProvider}
                <ChevronDown className="w-3 h-3" />
              </button>
            </ModelPickerSheet>

            {/* Aspect ratio - image (non-openai) */}
            {contentType === 'image' && imageProvider !== 'openai' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 hidden sm:inline">Proporção</span>
                {aspectRatioOptions.map(({ ratio, w, h }) => (
                  <Tooltip key={ratio}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setGeminiAspectRatio(ratio)}
                        className={`${w} ${h} rounded-sm border transition-all ${
                          geminiAspectRatio === ratio
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs bg-zinc-800 border-zinc-700">
                      {ratio}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Video controls */}
            {contentType === 'video' && videoProvider === 'gemini' && (
              <div className="flex items-center gap-2">
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="h-7 w-20 text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger className="h-7 w-16 text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="4">4s</SelectItem>
                    <SelectItem value="6">6s</SelectItem>
                    <SelectItem value="8">8s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Image count */}
            {contentType === 'image' && (
              <div className="bg-zinc-800 rounded-lg p-0.5 flex">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setImageCount(n)}
                    className={`w-7 py-1 text-xs font-medium rounded-md transition-all ${
                      imageCount === n ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {/* Reference image upload */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  {currentRefImage ? (
                    <div className="relative">
                      <img src={currentRefImage} alt="Ref" className="w-8 h-8 rounded-md object-cover" />
                      <button
                        onClick={() => {
                          if (contentType === 'image') { setImageReferenceImage(null); if (imageFileInputRef.current) imageFileInputRef.current.value = ''; }
                          else { setReferenceImage(null); if (videoFileInputRef.current) videoFileInputRef.current.value = ''; }
                        }}
                        className="absolute -top-1 -right-1 p-0.5 rounded-full bg-zinc-700 text-zinc-300 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => currentFileRef.current?.click()}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs bg-zinc-800 border-zinc-700">
                Imagem de referência
              </TooltipContent>
            </Tooltip>
            <input ref={imageFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'image')} />
            <input ref={videoFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'video')} />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isDisabled()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2 text-sm font-medium flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <>Criando... <Loader2 className="w-3.5 h-3.5 animate-spin" /></>
            ) : (
              <>Criar <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
};
