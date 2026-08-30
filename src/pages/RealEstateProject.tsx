import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Loader2,
  Sparkles,
  Plus,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useProject,
  useUpdateProject,
  useAssets,
  useUploadAsset,
  useUpdateAsset,
  useDeleteAsset,
  useCreatives,
  useSummarizeContext,
  AssetType,
} from "@/hooks/useRealEstate";
import { AssetPreview } from "@/components/real-estate/AssetPreview";
import { CreativeGeneratorDialog } from "@/components/real-estate/CreativeGeneratorDialog";
import { CreativeCard } from "@/components/real-estate/CreativeCard";
import { toast } from "sonner";

const assetTypeLabels: Record<AssetType, string> = {
  sales_book: "Book de vendas",
  render_3d: "Render 3D",
  construction_photo: "Foto de obra",
  logo: "Logo",
  other: "Outro",
};

export default function RealEstateProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: assets = [] } = useAssets(id);
  const { data: creatives = [] } = useCreatives(id);
  const updateProject = useUpdateProject();
  const uploadAsset = useUploadAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const summarize = useSummarizeContext();

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<AssetType>("render_3d");
  const [genOpen, setGenOpen] = useState(false);

  const [ctxForm, setCtxForm] = useState({
    positioning: "",
    brand_notes: "",
  });
  const [ctxInit, setCtxInit] = useState(false);

  if (project && !ctxInit) {
    setCtxForm({
      positioning: project.positioning ?? "",
      brand_notes: project.brand_notes ?? "",
    });
    setCtxInit(true);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!project) {
    return (
      <div className="container mx-auto px-6 py-24 max-w-6xl">
        <p className="text-muted-foreground">Empreendimento não encontrado.</p>
        <Button variant="link" onClick={() => navigate("/real-estate")}>
          Voltar
        </Button>
      </div>
    );
  }

  const saveContext = async () => {
    await updateProject.mutateAsync({ id: project.id, patch: ctxForm });
    toast.success("Contexto salvo");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      try {
        await uploadAsset.mutateAsync({
          projectId: project.id,
          file: f,
          assetType: uploadType,
        });
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }
    toast.success(`${files.length} arquivo(s) enviado(s)`);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="container mx-auto px-6 py-24 max-w-6xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/real-estate")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Projetos
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 text-sm">
          {project.location && <span>{project.location}</span>}
          {project.developer && <span>{project.developer}</span>}
        </div>
      </div>

      <Tabs defaultValue="creatives">
        <TabsList>
          <TabsTrigger value="creatives">Criativos</TabsTrigger>
          <TabsTrigger value="library">
            Biblioteca ({assets.length})
          </TabsTrigger>
          <TabsTrigger value="context">Contexto</TabsTrigger>
        </TabsList>

        {/* Creatives */}
        <TabsContent value="creatives" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {creatives.length} peça(s) gerada(s)
            </p>
            <Button onClick={() => setGenOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Nova peça
            </Button>
          </div>

          {creatives.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">
                  Ainda nenhuma peça. Comece descrevendo o que quer comunicar.
                </p>
                <Button onClick={() => setGenOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar primeira peça
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {creatives.map((c) => (
                <CreativeCard key={c.id} creative={c} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Library */}
        <TabsContent value="library" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar arquivos</CardTitle>
              <CardDescription>
                Book de vendas (PDF), renders 3D, fotos de obra e logos servem
                de referência para as peças.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 items-end">
              <div className="w-48">
                <Label>Tipo</Label>
                <Select
                  value={uploadType}
                  onValueChange={(v) => setUploadType(v as AssetType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(assetTypeLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Button
                  onClick={() => fileInput.current?.click()}
                  disabled={uploadAsset.isPending}
                  variant="outline"
                >
                  {uploadAsset.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Enviar arquivos
                </Button>
              </div>
            </CardContent>
          </Card>

          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum arquivo adicionado ainda.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {assets.map((a) => (
                <Card key={a.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    <AssetPreview
                      path={a.file_path}
                      mimeType={a.mime_type}
                      className="w-full h-full absolute inset-0"
                    />
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <Badge variant="secondary" className="text-xs">
                      {assetTypeLabels[a.asset_type]}
                    </Badge>
                    <p className="text-xs font-medium truncate">
                      {a.file_name}
                    </p>
                    <Textarea
                      placeholder="Legenda: o que essa imagem mostra?"
                      defaultValue={a.caption ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (a.caption ?? "")) {
                          updateAsset.mutate({
                            id: a.id,
                            projectId: project.id,
                            patch: { caption: e.target.value },
                          });
                        }
                      }}
                      rows={2}
                      className="text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() =>
                        deleteAsset.mutate({
                          id: a.id,
                          projectId: project.id,
                          filePath: a.file_path,
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Context */}
        <TabsContent value="context" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Posicionamento</CardTitle>
              <CardDescription>
                Descreva público-alvo, diferenciais competitivos, tom de voz.
                Quanto mais claro, melhor a IA vai direcionar as peças.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={ctxForm.positioning}
                onChange={(e) =>
                  setCtxForm({ ...ctxForm, positioning: e.target.value })
                }
                rows={6}
                placeholder="Ex.: Empreendimento voltado a jovens profissionais em ascensão, 28-40 anos, que valorizam localização estratégica e áreas de convivência. Diferenciais: rooftop, coworking, delivery hub. Tom aspiracional mas acessível."
              />

              <div>
                <Label>Observações de marca</Label>
                <Textarea
                  value={ctxForm.brand_notes}
                  onChange={(e) =>
                    setCtxForm({ ...ctxForm, brand_notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Paleta, fontes, elementos visuais recorrentes, o que evitar."
                />
              </div>

              <Button onClick={saveContext} disabled={updateProject.isPending}>
                {updateProject.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row justify-between items-start">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resumo de contexto (IA)
                </CardTitle>
                <CardDescription>
                  Consolidação estruturada que a IA usa como referência ao gerar
                  peças.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => summarize.mutate(project.id)}
                disabled={summarize.isPending}
              >
                {summarize.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {project.context_summary ? "Regenerar" : "Gerar"}
              </Button>
            </CardHeader>
            <CardContent>
              {project.context_summary ? (
                <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded-md p-4 max-h-96 overflow-auto">
                  {project.context_summary}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não gerado. Preencha posicionamento e biblioteca antes
                  para melhores resultados.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreativeGeneratorDialog
        projectId={project.id}
        open={genOpen}
        onOpenChange={setGenOpen}
      />
    </div>
  );
}
