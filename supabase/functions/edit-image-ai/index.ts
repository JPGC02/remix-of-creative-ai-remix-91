import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

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

async function downloadAndResizeImage(imageUrl: string, maxSize = 800, quality = 70): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error('Falha ao buscar imagem');
  const buffer = await response.arrayBuffer();
  const image = await Image.decode(new Uint8Array(buffer));

  if (image.width > maxSize || image.height > maxSize) {
    const ratio = Math.min(maxSize / image.width, maxSize / image.height);
    image.resize(Math.floor(image.width * ratio), Math.floor(image.height * ratio));
  }

  const encoded = await image.encodeJPEG(quality);
  let base64 = '';
  const chunkSize = 8192;
  for (let i = 0; i < encoded.length; i += chunkSize) {
    const chunk = encoded.slice(i, i + chunkSize);
    base64 += String.fromCharCode(...chunk);
  }
  return `data:image/jpeg;base64,${btoa(base64)}`;
}

async function uploadToStorage(imageBase64: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

  const { error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: false });

  if (uploadError) throw new Error(`Erro upload: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);

  return publicUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, prompt, userId, provider } = await req.json();

    console.log('📝 Prompt recebido:', prompt);
    console.log('🖼️ Image URL:', imageUrl?.substring(0, 80));

    if (!imageUrl) throw new Error('imageUrl é obrigatório');
    if (!prompt) throw new Error('prompt é obrigatório');

    const selectedProvider = provider || 'gemini';
    let resultImageUrl: string;

    if (selectedProvider === 'gemini') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

      console.log('📸 Baixando e redimensionando imagem...');
      const inputImageBase64 = await downloadAndResizeImage(imageUrl, 800, 70);
      console.log('📸 Imagem preparada, enviando para edição IA...');

      const MAX_RETRIES = 2;
      let imageBase64: string | undefined;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        console.log(`🔄 Tentativa ${attempt + 1}/${MAX_RETRIES + 1}...`);
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: inputImageBase64 } },
                  {
                    type: 'text',
                    text: `Edit this image following these instructions exactly: ${prompt}. You MUST return the modified image as output. Do not describe changes, apply them visually to the image and return the result.`,
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Lovable AI error:', response.status, errorText);
          if (response.status === 429) throw new Error('Rate limit excedido. Tente novamente em alguns segundos.');
          if (response.status === 402) throw new Error('Créditos insuficientes. Adicione créditos no workspace.');
          throw new Error(`Erro na edição: ${response.status}`);
        }

        const data = await response.json();
        console.log('📋 Response keys:', JSON.stringify(Object.keys(data)));
        
        const msg = data.choices?.[0]?.message;
        console.log('📋 Message keys:', msg ? JSON.stringify(Object.keys(msg)) : 'null');
        
        // Try multiple extraction paths
        // Path 1: images array (Lovable AI Gateway format)
        imageBase64 = msg?.images?.[0]?.image_url?.url;
        
        // Path 2: content array with image parts
        if (!imageBase64 && Array.isArray(msg?.content)) {
          const imgPart = msg.content.find((p: any) => p.type === 'image_url');
          imageBase64 = imgPart?.image_url?.url;
        }
        
        // Path 3: inline base64 in text content
        if (!imageBase64 && typeof msg?.content === 'string') {
          const match = msg.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
          if (match) imageBase64 = match[0];
        }

        if (imageBase64) {
          console.log(`✅ Imagem extraída na tentativa ${attempt + 1}`);
          break;
        }
        
        console.warn(`⚠️ Tentativa ${attempt + 1}: sem imagem. Content type: ${typeof msg?.content}, preview: ${JSON.stringify(msg?.content)?.substring(0, 300)}`);
        
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      if (!imageBase64) {
        throw new Error('O modelo não retornou uma imagem editada após múltiplas tentativas. Tente com outra instrução.');
      }

      console.log('✅ Fazendo upload da imagem editada...');
      resultImageUrl = await uploadToStorage(imageBase64);

    } else if (selectedProvider === 'openai') {
      const OPENAI_API_KEY = await getGlobalApiKey('OPENAI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada. Configure em Configurações.');

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error('Falha ao buscar imagem');
      const imageBuffer = await imageResponse.arrayBuffer();

      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'input.png');
      formData.append('prompt', prompt);
      formData.append('model', 'gpt-image-1');
      formData.append('quality', 'high');
      formData.append('output_format', 'png');

      const openaiResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI error:', errorText);
        throw new Error(`Erro OpenAI: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      const b64 = openaiData.data?.[0]?.b64_json;
      if (b64) {
        resultImageUrl = await uploadToStorage(`data:image/png;base64,${b64}`);
      } else if (openaiData.data?.[0]?.url) {
        resultImageUrl = openaiData.data[0].url;
      } else {
        throw new Error('Resposta OpenAI sem imagem');
      }

    } else {
      throw new Error(`Provedor '${selectedProvider}' não suportado`);
    }

    console.log('✅ Edição concluída! URL:', resultImageUrl);

    return new Response(
      JSON.stringify({ success: true, imageUrl: resultImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na edição:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
