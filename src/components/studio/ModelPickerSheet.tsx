import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Sparkles, Zap } from 'lucide-react';
import { useCustomModels } from '@/hooks/useCustomModels';

type ContentType = 'image' | 'text' | 'video';

interface ModelOption {
  id: string;
  provider: string;
  name: string;
  description: string;
  free: boolean;
  capabilities: string[];
}

const builtInModels: Record<ContentType, ModelOption[]> = {
  image: [
    {
      id: 'gemini',
      provider: 'gemini',
      name: 'Gemini Image',
      description: 'Geração rápida e gratuita via Lovable AI',
      free: true,
      capabilities: ['Geração', 'Variação', 'Combinação'],
    },
    {
      id: 'openai',
      provider: 'openai',
      name: 'GPT Image 1',
      description: 'Alta qualidade, fundo transparente',
      free: false,
      capabilities: ['Geração', 'Variação', 'Transparente'],
    },
  ],
  text: [
    {
      id: 'lovable',
      provider: 'lovable',
      name: 'Lovable AI',
      description: 'Geração de texto rápida e gratuita',
      free: true,
      capabilities: ['Texto', 'Resumo', 'Roteiro'],
    },
  ],
  video: [
    {
      id: 'gemini',
      provider: 'gemini',
      name: 'Gemini Veo',
      description: 'Geração de vídeo via Google Veo',
      free: false,
      capabilities: ['Vídeo', 'Image-to-Video'],
    },
  ],
};

interface ModelPickerSheetProps {
  contentType: ContentType;
  selectedProvider: string;
  onSelect: (provider: string, modelId?: string) => void;
  children: React.ReactNode;
}

export const ModelPickerSheet = ({ contentType, selectedProvider, onSelect, children }: ModelPickerSheetProps) => {
  const [open, setOpen] = useState(false);
  const { imageModels, textModels, videoModels } = useCustomModels();

  const customModels = contentType === 'image' ? imageModels : contentType === 'text' ? textModels : videoModels;

  const handleSelect = (provider: string, modelId?: string) => {
    onSelect(provider, modelId);
    setOpen(false);
  };

  const models = builtInModels[contentType];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent className="w-[340px] sm:w-[400px] p-0 flex flex-col bg-zinc-900 border-zinc-800">
        <SheetHeader className="p-4 border-b border-zinc-800">
          <SheetTitle className="text-sm">Selecionar Modelo</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Built-in models */}
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 px-1 pt-1">Lovable AI</p>
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model.provider)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedProvider === model.provider
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  {model.name}
                </span>
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${model.free ? 'text-emerald-500 border-emerald-500/30' : 'text-amber-500 border-amber-500/30'}`}>
                  {model.free ? 'GRÁTIS' : 'PAGO'}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500 mb-1.5">{model.description}</p>
              <div className="flex flex-wrap gap-1">
                {model.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-800 text-zinc-400">
                    {cap}
                  </Badge>
                ))}
              </div>
            </button>
          ))}

          {/* OpenRouter custom models */}
          {customModels.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 px-1 pt-3">OpenRouter</p>
              {customModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect('openrouter', model.model_id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedProvider === 'openrouter'
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      {model.display_name}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-500 border-amber-500/30">
                      CUSTOM
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500">{model.model_id}</p>
                </button>
              ))}
            </>
          )}

          {customModels.length === 0 && (
            <div className="text-center py-4">
              <p className="text-[11px] text-zinc-500">
                Configure modelos OpenRouter em Configurações para vê-los aqui
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
