import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function buildOptimalVideoPrompt(userPrompt: string, imageUrl: string | undefined): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('LOVABLE_API_KEY não disponível, usando prompt original');
    return userPrompt;
  }

  try {
    console.log('Construindo prompt otimizado para vídeo...');
    
    const userContent: any[] = [];
    
    if (imageUrl) {
      userContent.push({ type: 'image_url', image_url: { url: imageUrl } });
    }
    
    userContent.push({
      type: 'text',
      text: `USER PROMPT: "${userPrompt}"${imageUrl ? '\n\nREFERENCE IMAGE: attached above' : '\n\nNO REFERENCE IMAGE'}`
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert video prompt engineer for Veo 3 (Google's video generation model).

CRITICAL CONSTRAINT — Veo generates ONE continuous camera shot. It CANNOT do:
- Scene transitions, cuts, or "then" sequences
- Post-production effects (slow-motion, bullet-time, freeze-frame, time-lapse)
- Text overlays, titles, or editing effects
- Multiple camera angles in the same clip

IMPORTANT — Veo 3 SUPPORTS AUDIO AND SPEECH. If the user asks for dialogue, speech, or the subject to say something:
- PRESERVE the exact speech/dialogue in the prompt
- Include it naturally: e.g. "the character says: 'exact words here'"
- Do NOT remove, rephrase, or omit dialogue requests
- Do NOT convert speech requests into silent visual descriptions

YOUR JOB: Convert ANY user prompt into a single continuous action that Veo can actually render, while PRESERVING the user's core intent, especially dialogue and speech.

CONVERSION RULES:
1. If user mentions "explosion" → describe fire, smoke, debris physically present in the scene
2. If user mentions "slow motion" → translate to "graceful, fluid movement"
3. If user mentions "transitions" or "cuts" → pick the MOST dramatic single moment
4. If user mentions "bullet time" → describe a sweeping camera orbit around the subject mid-action
5. If user mentions multiple events → choose the climax moment, describe the others as background elements
6. If user asks subject to SAY something → keep the exact quote in the prompt

PROMPT STRUCTURE (follow this order):
1. CAMERA: type of shot and movement (tracking, dolly, orbit, static wide, handheld)
2. ACTION: what the subject is physically doing RIGHT NOW (verb-first, active voice)
3. DIALOGUE: if any speech was requested, include it verbatim
4. SUBJECT: brief identifying traits (only if no reference image, otherwise skip)
5. ENVIRONMENT: what surrounds them, lighting, weather, particles
6. MOOD: one phrase for emotional tone

RULES:
- Under 100 words total
- Present tense, active voice
- Start with camera movement or action verb
- Every element must be physically present in ONE frame/shot
- NO "suddenly", "then", "transitions to", "cuts to"
- Be SPECIFIC about motion: "leaps forward with arms spread" not "jumps"
- NEVER discard or ignore dialogue/speech from the user prompt

OUTPUT: Return ONLY the prompt. No explanations.`
          },
          {
            role: 'user',
            content: userContent
          }
        ],
      }),
    });

    if (!response.ok) {
      console.warn('Erro ao otimizar prompt:', response.status);
      return userPrompt;
    }

    const data = await response.json();
    const optimizedPrompt = data.choices?.[0]?.message?.content?.trim() || userPrompt;
    console.log('Prompt original:', userPrompt);
    console.log('Prompt otimizado:', optimizedPrompt);
    return optimizedPrompt;
  } catch (err) {
    console.warn('Falha na otimização do prompt:', err);
    return userPrompt;
  }
}

async function sanitizePromptForSafety(prompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return prompt;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You rewrite video prompts to avoid safety filters. Rules:
- Remove any references to real people, celebrities, brands, copyrighted characters
- Replace specific person references with generic descriptions (e.g. "a man in a suit" instead of a celebrity name)
- Keep the core action and visual style intact
- Remove violent, sexual, or dangerous content
- Output ONLY the rewritten prompt, nothing else
- If the prompt is already safe, return it unchanged`
          },
          { role: 'user', content: prompt }
        ],
      }),
    });
    if (!response.ok) return prompt;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || prompt;
  } catch {
    return prompt;
  }
}

async function callVeoAPI(
  instance: any,
  aspectRatio: string,
  duration: number,
  personGeneration: string | undefined,
  GEMINI_API_KEY: string
): Promise<Uint8Array> {
  const modelName = 'veo-3.0-generate-001';
  const validDuration = [5, 6, 7, 8].includes(duration) ? duration : 8;

  const requestBody: any = {
    instances: [instance],
    parameters: {
      aspectRatio: aspectRatio || '16:9',
      durationSeconds: validDuration,
    }
  };

  if (personGeneration === 'allow_adults') {
    requestBody.parameters.personGeneration = personGeneration;
  }

  console.log('Request body:', JSON.stringify(requestBody).substring(0, 500));

  const generateResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    console.error('Erro na API Gemini (status ' + generateResponse.status + '):', errorText);
    throw new Error(`Erro na API Gemini: ${errorText}`);
  }

  const generateData = await generateResponse.json();
  const operationName = generateData.name;

  if (!operationName) {
    throw new Error('Resposta inválida da API - sem operação');
  }

  console.log('Iniciando polling da operação:', operationName);
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;

    const pollResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
      { method: 'GET', headers: { 'x-goog-api-key': GEMINI_API_KEY } }
    );

    if (!pollResponse.ok) {
      console.error('Erro no polling:', await pollResponse.text());
      continue;
    }

    const pollData = await pollResponse.json();
    console.log(`Polling tentativa ${attempts}:`, pollData.done ? 'CONCLUÍDO' : 'em progresso');

    if (pollData.done) {
      if (pollData.error) {
        throw new Error(`Erro na geração: ${JSON.stringify(pollData.error)}`);
      }

      const videoResponse = pollData.response?.generateVideoResponse;

      if (videoResponse?.raiMediaFilteredCount > 0) {
        const reasons = videoResponse.raiMediaFilteredReasons?.join('; ') || 'Conteúdo filtrado pela política de segurança.';
        throw new Error(`SAFETY_FILTER: ${reasons}`);
      }

      const videoUri = videoResponse?.generatedSamples?.[0]?.video?.uri;

      if (!videoUri) {
        console.error('Resposta completa:', JSON.stringify(pollData));
        throw new Error('URI do vídeo não encontrada na resposta.');
      }

      const videoDownloadResponse = await fetch(videoUri, {
        headers: { 'x-goog-api-key': GEMINI_API_KEY },
      });

      if (!videoDownloadResponse.ok) {
        throw new Error(`Erro ao baixar vídeo: ${videoDownloadResponse.statusText}`);
      }

      return new Uint8Array(await videoDownloadResponse.arrayBuffer());
    }
  }

  throw new Error('Timeout: A geração do vídeo demorou mais de 5 minutos');
}

async function handleGeminiVideo(prompt: string, imageUrl: string | undefined, aspectRatio: string, duration: number, personGeneration: string | undefined, GEMINI_API_KEY: string) {
  // Build optimal prompt by analyzing text + image context together
  const optimizedPrompt = await buildOptimalVideoPrompt(prompt, imageUrl);

  console.log('Gerando vídeo com Veo:', {
    aspectRatio: aspectRatio || '16:9',
    duration: duration || 8,
    hasImage: !!imageUrl,
    promptOptimized: optimizedPrompt !== prompt
  });

  // Prepare image instance (shared between attempts)
  const imageData: any = {};
  if (imageUrl) {
    try {
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let base64Image = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        base64Image += String.fromCharCode(...uint8Array.slice(i, i + chunkSize));
      }
      base64Image = btoa(base64Image);
      imageData.image = { bytesBase64Encoded: base64Image, mimeType: imageBlob.type || 'image/png' };
    } catch (imgErr) {
      console.warn('Não foi possível carregar imagem:', imgErr);
    }
  }

  // Attempt 1: optimized prompt
  try {
    const instance = { prompt: optimizedPrompt, ...imageData };
    return await callVeoAPI(instance, aspectRatio, duration, personGeneration, GEMINI_API_KEY);
  } catch (err: any) {
    if (!err.message?.includes('SAFETY_FILTER')) throw err;
    console.warn('Prompt otimizado bloqueado pelo filtro de segurança, tentando com prompt sanitizado...');
  }

  // Attempt 2: sanitized version of original prompt
  const safePrompt = await sanitizePromptForSafety(prompt);
  console.log('Tentativa 2 com prompt sanitizado:', safePrompt);
  try {
    const instance = { prompt: safePrompt, ...imageData };
    return await callVeoAPI(instance, aspectRatio, duration, personGeneration, GEMINI_API_KEY);
  } catch (err: any) {
    if (!err.message?.includes('SAFETY_FILTER')) throw err;
    // Re-throw with user-friendly message
    const reason = err.message.replace('SAFETY_FILTER: ', '');
    throw new Error(`Vídeo bloqueado pelo filtro de segurança mesmo após ajuste do prompt. Motivo: ${reason}. Tente reformular seu prompt com termos mais genéricos, sem referências a pessoas reais ou conteúdo protegido.`);
  }
}

async function handleOpenRouterVideo(prompt: string, imageUrl: string | undefined, modelId: string, apiKey: string): Promise<Uint8Array> {
  console.log('Gerando vídeo via OpenRouter:', { model: modelId, hasImage: !!imageUrl });

  const messages: any[] = [];
  
  if (imageUrl) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: `Generate a video based on this image. ${prompt}` }
      ]
    });
  } else {
    messages.push({
      role: 'user',
      content: `Generate a video: ${prompt}`
    });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Title': 'Viver de IA',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro OpenRouter:', errorText);
    throw new Error(`Erro na API OpenRouter: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('Resposta OpenRouter:', JSON.stringify(data).substring(0, 500));

  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Resposta vazia do modelo. O modelo selecionado pode não suportar geração de vídeo.');
  }

  // Try to extract video URL from response
  const urlMatch = typeof content === 'string' 
    ? content.match(/https?:\/\/[^\s"'<>]+\.(mp4|webm|mov)[^\s"'<>]*/i)
    : null;

  if (urlMatch) {
    const videoResponse = await fetch(urlMatch[0]);
    if (videoResponse.ok) {
      return new Uint8Array(await videoResponse.arrayBuffer());
    }
  }

  // Try to find base64 video data
  if (typeof content === 'string') {
    const base64Match = content.match(/data:video\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      const binaryString = atob(base64Match[1]);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  }

  // Check if content is array with video parts
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === 'video_url' && part.video_url?.url) {
        const videoResponse = await fetch(part.video_url.url);
        if (videoResponse.ok) {
          return new Uint8Array(await videoResponse.arrayBuffer());
        }
      }
    }
  }

  throw new Error('O modelo selecionado não retornou um vídeo válido. Verifique se o modelo suporta geração de vídeo.');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageUrl, aspectRatio, duration, personGeneration, provider, openrouterModel, userId } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let videoBytes: Uint8Array;

    if (provider === 'openrouter') {
      const userOpenRouterKey = await getGlobalApiKey('OPENROUTER_API_KEY');
      if (!userOpenRouterKey) {
        throw new Error('Chave OpenRouter não configurada. Configure em Configurações.');
      }
      if (!openrouterModel) {
        throw new Error('Selecione um modelo OpenRouter nas configurações do nó.');
      }
      videoBytes = await handleOpenRouterVideo(prompt, imageUrl, openrouterModel, userOpenRouterKey);
    } else {
      const userGeminiKey = await getGlobalApiKey('GEMINI_API_KEY');
      const GEMINI_API_KEY = userGeminiKey || Deno.env.get('GEMINI_API_KEY');
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY não configurada. Configure em Configurações.');
      }
      videoBytes = await handleGeminiVideo(prompt, imageUrl, aspectRatio, duration, personGeneration, GEMINI_API_KEY);
    }

    // Upload video to storage
    const videoFileName = `video-${Date.now()}.mp4`;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: uploadError } = await supabase.storage
      .from('generated-videos')
      .upload(videoFileName, videoBytes, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generated-videos')
      .getPublicUrl(videoFileName);

    console.log('Vídeo gerado e salvo com sucesso:', publicUrl);

    return new Response(
      JSON.stringify({ videoUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro na edge function generate-video:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
