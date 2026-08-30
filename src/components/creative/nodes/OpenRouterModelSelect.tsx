import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCustomModels } from '@/hooks/useCustomModels';
import { Loader2 } from 'lucide-react';

interface OpenRouterModelSelectProps {
  modelType: 'text' | 'image' | 'video';
  value?: string;
  onChange: (model: string) => void;
}

export const OpenRouterModelSelect = ({ modelType, value, onChange }: OpenRouterModelSelectProps) => {
  const { textModels, imageModels, videoModels, isLoading } = useCustomModels();
  const models = modelType === 'text' ? textModels : modelType === 'image' ? imageModels : videoModels;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground py-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Carregando modelos...
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground/60 italic py-1">
        Nenhum modelo de {modelType === 'text' ? 'texto' : 'imagem'} configurado.{' '}
        <span className="text-primary/70">Adicione em Configurações.</span>
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-white/70">Modelo OpenRouter</Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
          <SelectValue placeholder="Selecione um modelo" />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.id} value={m.model_id}>
              <span className="text-xs">{m.display_name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
