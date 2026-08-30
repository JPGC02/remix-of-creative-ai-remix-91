import { useState } from "react";
import {
  Copy,
  Loader2,
  Trash2,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetPreview } from "./AssetPreview";
import {
  RealEstateCreative,
  useDeleteCreative,
} from "@/hooks/useRealEstate";
import { toast } from "sonner";

const formatLabels: Record<string, string> = {
  square_1_1: "1:1",
  vertical_4_5: "4:5",
  story_9_16: "9:16",
  carousel: "Carrossel",
};

const aspectClass: Record<string, string> = {
  square_1_1: "aspect-square",
  vertical_4_5: "aspect-[4/5]",
  story_9_16: "aspect-[9/16]",
  carousel: "aspect-square",
};

export function CreativeCard({ creative }: { creative: RealEstateCreative }) {
  const del = useDeleteCreative();
  const [slideIdx, setSlideIdx] = useState(0);

  const slides = creative.slides ?? [];
  const current = slides[slideIdx];
  const isCarousel = creative.format === "carousel";
  const isBusy = creative.status === "generating";
  const isFailed = creative.status === "failed";

  const copyCaption = () => {
    const full = [creative.caption, (creative.hashtags ?? []).map((h) => `#${h}`).join(" ")]
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(full);
    toast.success("Legenda copiada");
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image */}
          <div
            className={`relative bg-muted ${aspectClass[creative.format] ?? "aspect-square"}`}
          >
            {isBusy ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Gerando...</span>
              </div>
            ) : isFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-destructive p-4 text-center">
                <AlertCircle className="h-8 w-8" />
                <span className="text-xs">
                  {creative.error_message ?? "Falha ao gerar"}
                </span>
              </div>
            ) : current ? (
              <>
                <AssetPreview
                  path={current.image_path}
                  mimeType="image/png"
                  className="absolute inset-0 w-full h-full"
                  alt={current.headline}
                />
                {current.headline && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16 text-white">
                    <div className="font-bold text-lg leading-tight drop-shadow">
                      {current.headline}
                    </div>
                    {current.body_copy && (
                      <div className="text-sm mt-1 opacity-90 drop-shadow">
                        {current.body_copy}
                      </div>
                    )}
                  </div>
                )}
                {isCarousel && slides.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80"
                      onClick={() =>
                        setSlideIdx((i) => (i === 0 ? slides.length - 1 : i - 1))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80"
                      onClick={() =>
                        setSlideIdx((i) => (i + 1) % slides.length)
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      {slideIdx + 1}/{slides.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Sparkles className="h-8 w-8" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold line-clamp-2">{creative.title}</h3>
                <div className="flex gap-1.5 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {formatLabels[creative.format]}
                  </Badge>
                  {creative.status === "generating" && (
                    <Badge variant="secondary" className="text-xs">
                      Gerando
                    </Badge>
                  )}
                  {creative.status === "failed" && (
                    <Badge variant="destructive" className="text-xs">
                      Falhou
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  del.mutate({ id: creative.id, projectId: creative.project_id })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {creative.brief && (
              <p className="text-xs text-muted-foreground line-clamp-2 italic">
                “{creative.brief}”
              </p>
            )}

            {creative.caption && (
              <div className="text-sm bg-muted/40 rounded-md p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                {creative.caption}
              </div>
            )}

            {creative.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {creative.hashtags.map((h) => (
                  <Badge key={h} variant="secondary" className="text-xs">
                    #{h}
                  </Badge>
                ))}
              </div>
            )}

            {creative.status === "ready" && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyCaption}
                className="mt-auto"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar legenda + hashtags
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
