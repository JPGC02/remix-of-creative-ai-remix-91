import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { OpenAIControls as OpenAIControlsType } from '@/types/workflow';

interface OpenAIControlsProps {
  controls: OpenAIControlsType;
  onChange: (controls: OpenAIControlsType) => void;
  showFidelity?: boolean;
}

export const OpenAIControls = ({ controls, onChange, showFidelity = true }: OpenAIControlsProps) => {
  const showCompression = controls.outputFormat === 'jpeg' || controls.outputFormat === 'webp';

  return (
    <div className="space-y-2 p-2 bg-blue-500/5 rounded-lg border border-blue-500/20">
      <Badge variant="outline" className="text-[10px] bg-blue-500/10">
        🤖 Controles OpenAI
      </Badge>

      {/* Size */}
      <div className="space-y-1">
        <Label className="text-xs">Tamanho</Label>
        <Select 
          value={controls.size || 'auto'} 
          onValueChange={(val) => onChange({ ...controls, size: val as any })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="1024x1024">1024×1024 (Quadrado)</SelectItem>
            <SelectItem value="1536x1024">1536×1024 (Paisagem)</SelectItem>
            <SelectItem value="1024x1536">1024×1536 (Retrato)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quality */}
      <div className="space-y-1">
        <Label className="text-xs">Qualidade</Label>
        <Select 
          value={controls.quality || 'auto'} 
          onValueChange={(val) => onChange({ ...controls, quality: val as any })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="high">Alta (mais lenta)</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Rápida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="space-y-1">
        <Label className="text-xs">Quantidade</Label>
        <Select 
          value={String(controls.n || 1)} 
          onValueChange={(val) => onChange({ ...controls, n: Number(val) })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 imagem</SelectItem>
            <SelectItem value="2">2 imagens</SelectItem>
            <SelectItem value="3">3 imagens</SelectItem>
            <SelectItem value="4">4 imagens</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showFidelity && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">Preservar original</Label>
          <Switch
            checked={controls.inputFidelity === 'high'}
            onCheckedChange={(checked) => 
              onChange({ ...controls, inputFidelity: checked ? 'high' : 'low' })
            }
          />
        </div>
      )}

      {/* Background */}
      <div className="space-y-1">
        <Label className="text-xs">Fundo</Label>
        <Select 
          value={controls.background || 'auto'} 
          onValueChange={(val) => onChange({ ...controls, background: val as any })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="opaque">Opaco</SelectItem>
            <SelectItem value="transparent">Transparente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Format */}
      <div className="space-y-1">
        <Label className="text-xs">Formato</Label>
        <Select 
          value={controls.outputFormat || 'png'} 
          onValueChange={(val) => onChange({ ...controls, outputFormat: val as any })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG (qualidade)</SelectItem>
            <SelectItem value="jpeg">JPEG (menor)</SelectItem>
            <SelectItem value="webp">WebP (moderno)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compression - only for JPEG/WebP */}
      {showCompression && (
        <div className="space-y-1">
          <Label className="text-xs">Compressão: {controls.outputCompression ?? 80}%</Label>
          <Slider
            value={[controls.outputCompression ?? 80]}
            onValueChange={([val]) => onChange({ ...controls, outputCompression: val })}
            min={0}
            max={100}
            step={5}
            className="py-1"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Menor arquivo</span>
            <span>Maior qualidade</span>
          </div>
        </div>
      )}

      {/* Moderation */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Moderação relaxada</Label>
        <Switch
          checked={controls.moderation === 'low'}
          onCheckedChange={(checked) => 
            onChange({ ...controls, moderation: checked ? 'low' : 'auto' })
          }
        />
      </div>
    </div>
  );
};
