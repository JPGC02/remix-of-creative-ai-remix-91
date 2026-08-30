import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    console.log('🎨 Gerando workflow para prompt:', prompt);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um gerador de workflows visuais para criação de conteúdo. Retorne APENAS JSON válido, sem markdown ou explicações.

NODES DISPONÍVEIS (com handles EXATOS):

1. textInputNode - Entrada de texto/prompt
   - Source handles: output (text)
   - Target handles: nenhum

2. aiTextGeneratorNode - Gera texto com IA a partir de um prompt
   - Source handles: output (text)
   - Target handles: prompt (text)

3. imageUploadNode - Upload de imagem pelo usuário
   - Source handles: output (image)
   - Target handles: nenhum

4. imageGeneratorNode - Gera imagem a partir de texto
   - Source handles: image (image)
   - Target handles: prompt (text)

5. imageCombinerNode - Combina 2 imagens com uma instrução de texto
   - Source handles: output (image)
   - Target handles: imageA (image), imageB (image), instruction (text)

6. aiImageEditorNode - Edita imagem com IA usando um prompt de texto
   - Source handles: output (image)
   - Target handles: inputImage (image), prompt (text)

7. imageEditorNode - Edita imagem manualmente (filtros, crop, ajustes). NÃO aceita texto.
   - Source handles: output (image)
   - Target handles: inputImage (image)

8. removeBackgroundNode - Remove o fundo de uma imagem
   - Source handles: output (image)
   - Target handles: inputImage (image)

9. imageVariationNode - Cria variações de uma imagem com base em um prompt
   - Source handles: output (image)
   - Target handles: inputImage (image), prompt (text)

10. videoGeneratorNode - Gera vídeo a partir de texto e opcionalmente uma imagem
    - Source handles: video (video)
    - Target handles: prompt (text), imageUrl (image)

FORMATO DE RESPOSTA (JSON):
{
  "nodes": [
    {
      "id": "node_1",
      "type": "textInputNode",
      "position": { "x": 100, "y": 200 },
      "data": { 
        "label": "Prompt inicial",
        "text": "",
        "status": "idle"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "sourceHandle": "output",
      "targetHandle": "prompt"
    }
  ]
}

REGRAS IMPORTANTES:
1. Posicionar nodes horizontalmente com 300px de distância no eixo X
2. Centralizar verticalmente em y=200, mas espalhar em Y quando há múltiplas entradas
3. Usar IDs únicos e sequenciais (node_1, node_2, edge_1, edge_2)
4. sourceHandle DEVE ser o handle de saída EXATO do nó (output, image, video)
5. targetHandle DEVE ser o handle de entrada EXATO do nó destino (prompt, inputImage, imageA, imageB, instruction, imageUrl)
6. NUNCA use "image" como targetHandle - use "inputImage" para nós de edição/variação
7. imageEditorNode NÃO aceita texto - apenas imagem via inputImage
8. Status sempre "idle"
9. Label deve ser descritivo do propósito do nó

EXEMPLOS:

Exemplo 1 - Gerar imagem:
{"nodes":[{"id":"node_1","type":"textInputNode","position":{"x":100,"y":200},"data":{"label":"Prompt","text":"","status":"idle"}},{"id":"node_2","type":"imageGeneratorNode","position":{"x":400,"y":200},"data":{"label":"Gerar Imagem","status":"idle"}}],"edges":[{"id":"edge_1","source":"node_1","target":"node_2","sourceHandle":"output","targetHandle":"prompt"}]}

Exemplo 2 - Gerar e criar variação:
{"nodes":[{"id":"node_1","type":"textInputNode","position":{"x":100,"y":100},"data":{"label":"Prompt Base","text":"","status":"idle"}},{"id":"node_2","type":"imageGeneratorNode","position":{"x":400,"y":100},"data":{"label":"Gerar","status":"idle"}},{"id":"node_3","type":"textInputNode","position":{"x":100,"y":300},"data":{"label":"Estilo Variação","text":"","status":"idle"}},{"id":"node_4","type":"imageVariationNode","position":{"x":700,"y":200},"data":{"label":"Variação","status":"idle"}}],"edges":[{"id":"edge_1","source":"node_1","target":"node_2","sourceHandle":"output","targetHandle":"prompt"},{"id":"edge_2","source":"node_2","target":"node_4","sourceHandle":"image","targetHandle":"inputImage"},{"id":"edge_3","source":"node_3","target":"node_4","sourceHandle":"output","targetHandle":"prompt"}]}

Retorne APENAS o JSON, sem explicações ou markdown.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Crie um workflow para: ${prompt}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Lovable AI:', response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    console.log('📝 Resposta da IA:', generatedText);
    
    // Tentar extrair JSON se vier com markdown
    let jsonText = generatedText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
    const workflowData = JSON.parse(jsonText);
    
    console.log('✅ Workflow gerado:', workflowData);
    
    return new Response(JSON.stringify(workflowData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Erro ao gerar workflow:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: 'Não foi possível gerar o workflow. Tente novamente.'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
