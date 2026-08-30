import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerateCreative, CreativeFormat } from "@/hooks/useRealEstate";
import { toast } from "sonner";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CreativeGeneratorDialog({
  projectId,
  open,
  onOpenChange,
}: Props) {
  const generate = useGenerateCreative();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<CreativeFormat>("square_1_1");
  const [carouselFormat, setCarouselFormat] =
    useState<CreativeFormat>("square_1_1");
  const [slideCount, setSlideCount] = useState(4);
  const [brief, setBrief] = useState("");

  const handleGenerate = async () => {
    if (!brief.trim()) {
      toast.error("Descreva o que a peça deve comunicar");
      return;
    }
    try {
      await generate.mutateAsync({
        projectId,
        brief,
        format,
        slideCount: format === "carousel" ? slideCount : 1,
        carouselFormat,
        title: title.trim() || undefined,
      });
      onOpenChange(false);
      setBrief("");
      setTitle("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Nova peça
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Título interno (opcional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Lançamento — hero carrossel"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Formato</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as CreativeFormat)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square_1_1">Feed 1:1</SelectItem>
                  <SelectItem value="vertical_4_5">Feed 4:5</SelectItem>
                  <SelectItem value="story_9_16">Story/Reels 9:16</SelectItem>
                  <SelectItem value="carousel">Carrossel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {format === "carousel" && (
              <>
                <div>
                  <Label>Nº de slides</Label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={slideCount}
                    onChange={(e) =>
                      setSlideCount(
                        Math.max(2, Math.min(10, Number(e.target.value) || 2)),
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Formato dos slides</Label>
                  <Select
                    value={carouselFormat}
                    onValueChange={(v) =>
                      setCarouselFormat(v as CreativeFormat)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square_1_1">1:1</SelectItem>
                      <SelectItem value="vertical_4_5">4:5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div>
            <Label>Direcionamento *</Label>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="O que essa peça deve comunicar? Público, oferta, gatilhos, mood. Ex.: 'Anúncio de lançamento focado em investidores. Destacar retorno, localização premium e infraestrutura de lazer. Tom sofisticado.'"
              rows={6}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            A IA usa o contexto do empreendimento (posicionamento, book, renders,
            fotos de obra) que você já cadastrou. Enriqueça o contexto na aba
            correspondente para peças mais fiéis.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generate.isPending}>
            {generate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar peça
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
