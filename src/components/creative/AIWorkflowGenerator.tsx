import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Node, Edge } from 'reactflow';

interface AIWorkflowGeneratorProps {
  onGenerate: (nodes: Node[], edges: Edge[]) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EXAMPLE_PROMPTS = [
  'Gerar uma imagem de produto',
  'Criar anúncio: texto → imagem → 3 variações',
  'Upload de foto → editar → criar versões',
  'Combinar 2 imagens em uma composição',
];

export function AIWorkflowGenerator({ onGenerate, trigger, open: controlledOpen, onOpenChange }: AIWorkflowGeneratorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Digite o que você quer criar');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('🚀 Gerando workflow para:', prompt);
      
      const { data, error } = await supabase.functions.invoke('generate-workflow-ai', {
        body: { prompt: prompt.trim() }
      });

      if (error) {
        console.error('❌ Erro da função:', error);
        throw error;
      }

      if (!data || !data.nodes || !data.edges) {
        throw new Error('Resposta inválida da IA');
      }

      console.log('✅ Workflow gerado:', data);

      onGenerate(data.nodes, data.edges);
      setOpen(false);
      setPrompt('');
      toast.success('🎨 Workflow criado com sucesso!');
    } catch (err) {
      console.error('❌ Erro ao gerar workflow:', err);
      toast.error('Erro ao gerar workflow. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Gerar com IA
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Gerar Workflow com IA
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                O que você quer criar?
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Criar anúncio de produto com 3 variações de estilo"
                className="min-h-[100px]"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">
                📚 Exemplos de prompts:
              </label>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(example)}
                    disabled={isGenerating}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isGenerating}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Workflow
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
