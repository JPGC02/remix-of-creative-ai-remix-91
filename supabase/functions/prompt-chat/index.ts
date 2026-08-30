import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente especializado em criar prompts perfeitos para geração de imagens e vídeos com IA.

Seu papel é guiar o usuário através de perguntas para construir o prompt ideal. Você deve:

1. Fazer perguntas específicas sobre o que o usuário quer criar
2. Sugerir melhorias e detalhes visuais
3. Quando o usuário estiver satisfeito, gerar o prompt final otimizado

Diretrizes:
- Converse em português brasileiro
- Seja conciso e direto
- Faça 1-2 perguntas por vez, não bombardeie
- Sugira opções quando possível (ex: "Você prefere estilo fotorrealista ou ilustração?")
- Considere: composição, iluminação, estilo artístico, cores, atmosfera, ângulo de câmera
- Quando gerar o prompt final, escreva-o em INGLÊS (modelos funcionam melhor em inglês)
- Marque o prompt final com o prefixo exato "PROMPT_FINAL:" seguido do prompt em inglês
- O prompt final deve ter no máximo 200 palavras
- Não inclua explicações após o PROMPT_FINAL, apenas o prompt puro

Exemplo de fluxo:
Usuário: "quero uma imagem de um gato"
Você: "Legal! Vamos refinar isso. Que tipo de gato? (siamês, persa, vira-lata...) E qual estilo você prefere: fotorrealista, cartoon, ou pintura a óleo?"
...
Quando pronto: "PROMPT_FINAL: A majestic siamese cat sitting on a velvet cushion..."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentPrompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemContent = currentPrompt
      ? `${SYSTEM_PROMPT}\n\nO prompt atual do usuário é: "${currentPrompt}". Use isso como ponto de partida.`
      : SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("Resposta vazia da IA");

    // Check if response contains a final prompt
    let finalPrompt: string | null = null;
    if (content.includes("PROMPT_FINAL:")) {
      finalPrompt = content.split("PROMPT_FINAL:")[1].trim();
    }

    return new Response(
      JSON.stringify({ message: content, finalPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("prompt-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
