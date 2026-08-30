import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getGlobalApiKey(keyName: string): Promise<string | undefined> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data } = await supabase
      .from('user_api_keys')
      .select('key_value')
      .eq('key_name', keyName)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.key_value || undefined;
  } catch { return undefined; }
}

async function handleLovableAI(prompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurada');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente criativo especializado em gerar textos curtos e objetivos para uso em workflows criativos (geração de imagens, vídeos, marketing). REGRAS: Máximo 3-4 frases. Seja direto e conciso. Se o prompt pedir uma descrição visual ou prompt de imagem, responda com no máximo 1-2 frases descritivas em inglês. Nunca gere textos longos, artigos ou redações.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error('RATE_LIMIT');
    if (status === 402) throw new Error('INSUFFICIENT_CREDITS');
    throw new Error('Erro ao gerar texto com IA');
  }

  const data = await response.json();
  const generatedText = data.choices?.[0]?.message?.content;
  if (!generatedText) throw new Error('Resposta da IA vazia');
  return generatedText;
}

async function handleOpenRouter(prompt: string, model: string, apiKey: string): Promise<string> {
  console.log('=== OPENROUTER TEXT ===');
  console.log('Model:', model);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Viver de IA',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente criativo especializado em gerar textos curtos e objetivos para uso em workflows criativos (geração de imagens, vídeos, marketing). REGRAS: Máximo 3-4 frases. Seja direto e conciso. Se o prompt pedir uma descrição visual ou prompt de imagem, responda com no máximo 1-2 frases descritivas em inglês. Nunca gere textos longos, artigos ou redações.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter error:', response.status, errorText);
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (response.status === 402) throw new Error('INSUFFICIENT_CREDITS');
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.choices?.[0]?.message?.content;
  if (!generatedText) throw new Error('Resposta da IA vazia');
  return generatedText;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, provider = 'lovable', model, userId } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Provider:', provider, '| Model:', model);

    let generatedText: string;

    if (provider === 'openrouter') {
      if (!model) {
        return new Response(
          JSON.stringify({ error: 'Modelo não selecionado para OpenRouter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiKey = await getGlobalApiKey('OPENROUTER_API_KEY');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'Chave OpenRouter não configurada. Adicione em Configurações.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      generatedText = await handleOpenRouter(prompt, model, apiKey);
    } else {
      generatedText = await handleLovableAI(prompt);
    }

    return new Response(
      JSON.stringify({ generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro na função generate-text-ai:', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';

    if (msg === 'RATE_LIMIT') {
      return new Response(
        JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (msg === 'INSUFFICIENT_CREDITS') {
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
