import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function downloadAndResizeImage(
  imageUrl: string, 
  maxSize: number = 800,
  quality: number = 70
): Promise<string> {
  console.log('Baixando e redimensionando imagem:', imageUrl);
  
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Erro ao baixar imagem: ${response.status}`);
  
  const buffer = await response.arrayBuffer();
  const image = await Image.decode(new Uint8Array(buffer));
  
  console.log(`Tamanho original: ${image.width}x${image.height}`);
  
  if (image.width > maxSize || image.height > maxSize) {
    const ratio = Math.min(maxSize / image.width, maxSize / image.height);
    const newWidth = Math.floor(image.width * ratio);
    const newHeight = Math.floor(image.height * ratio);
    
    image.resize(newWidth, newHeight);
    console.log(`Redimensionado para: ${newWidth}x${newHeight}`);
  }
  
  const encoded = await image.encodeJPEG(quality);
  
  let base64 = '';
  const chunkSize = 8192;
  for (let i = 0; i < encoded.length; i += chunkSize) {
    const chunk = encoded.slice(i, i + chunkSize);
    base64 += String.fromCharCode(...chunk);
  }
  base64 = btoa(base64);
  
  console.log(`Tamanho base64: ~${(base64.length / 1024).toFixed(2)}KB`);
  
  return `data:image/jpeg;base64,${base64}`;
}

async function uploadToStorage(imageBase64: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const fileName = `${timestamp}-${randomId}.png`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: false
    });

  if (uploadError) {
    console.error('Erro ao fazer upload:', uploadError);
    throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);

  console.log('Upload concluído, URL:', publicUrl);
  return publicUrl;
}

async function handleGeminiGenerate(prompt: string, aspectRatio?: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurada');
  }
  
  console.log('=== GEMINI GENERATE ===');
  console.log('Prompt:', prompt, 'AspectRatio:', aspectRatio);
  
  // Include aspect ratio in prompt if specified
  const enhancedPrompt = aspectRatio && aspectRatio !== '1:1'
    ? `Generate an image with ${aspectRatio} aspect ratio. ${prompt}`
    : prompt;

  const requestBody: any = {
    model: "google/gemini-3-pro-image-preview",
    messages: [{ role: "user", content: enhancedPrompt }],
    modalities: ["image", "text"]
  };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  console.log('API Response status:', response.status);

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(data)}`);
  }

  const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageBase64) {
    console.error('Estrutura da resposta:', JSON.stringify(data, null, 2));
    throw new Error('Nenhuma imagem foi gerada pela API');
  }

  console.log('Imagem gerada com sucesso, fazendo upload...');
  return await uploadToStorage(imageBase64);
}

async function handleGeminiCombine(imageA: string, imageB: string, instruction: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  console.log('=== GEMINI COMBINE ===');
  
  const imageABase64 = await downloadAndResizeImage(imageA, 800, 70);
  const imageBBase64 = await downloadAndResizeImage(imageB, 800, 70);
  
  const requestBody = {
    model: "google/gemini-3-pro-image-preview",
    messages: [
      {
        role: "system",
        content: "You are an image generation AI. When given images and instructions, you must create and output a new image. Never output text only."
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Create a new image: ${instruction}. Output the actual image, not a description.` },
          { type: "image_url", image_url: { url: imageABase64 } },
          { type: "image_url", image_url: { url: imageBBase64 } }
        ]
      }
    ],
    modalities: ["image"]
  };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageBase64) {
    const textResponse = data.choices?.[0]?.message?.content;
    if (textResponse) {
      throw new Error(`A API retornou texto ao invés de imagem. Tente reformular a instrução.`);
    }
    throw new Error('Nenhuma imagem foi gerada pela API');
  }

  return await uploadToStorage(imageBase64);
}

async function handleGeminiVariation(inputImage: string, instruction: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  console.log('=== GEMINI VARIATION ===');
  
  const inputImageBase64 = await downloadAndResizeImage(inputImage, 800, 70);
  
  const requestBody = {
    model: "google/gemini-3-pro-image-preview",
    messages: [
      {
        role: "system",
        content: "You are an expert image variation generator. When given an image and instructions, create a new variation while maintaining key elements. Always output an actual image, never just text."
      },
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: `Create a variation of this image: ${instruction}. Maintain the overall composition but apply the requested changes. Output the actual modified image.` 
          },
          { type: "image_url", image_url: { url: inputImageBase64 } }
        ]
      }
    ],
    modalities: ["image", "text"]
  };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini variation error response:', errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    throw new Error('Resposta vazia da API Gemini para variação');
  }

  const data = JSON.parse(responseText);
  const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageBase64) {
    throw new Error('Nenhuma imagem foi gerada pela API');
  }

  return await uploadToStorage(imageBase64);
}

async function handleOpenAIGenerate(prompt: string, controls: any) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  console.log('=== OPENAI GENERATE ===', controls);
  
  const n = Math.min(Math.max(controls.n || 1, 1), 4);
  const body: any = {
    model: 'gpt-image-1',
    prompt,
    size: controls.size || 'auto',
    quality: controls.quality || 'auto',
    output_format: controls.outputFormat || 'png',
    background: controls.background || 'auto',
    n,
  };

  if (controls.moderation === 'low') {
    body.moderation = 'low';
  }

  if ((controls.outputFormat === 'jpeg' || controls.outputFormat === 'webp') && controls.outputCompression != null) {
    body.output_compression = controls.outputCompression;
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || 'OpenAI error');
  }
  
  const data = await response.json();
  
  // Return multiple images if n > 1
  const urls: string[] = [];
  for (const item of data.data) {
    const fmt = controls.outputFormat || 'png';
    const imageBase64 = `data:image/${fmt};base64,${item.b64_json}`;
    const url = await uploadToStorage(imageBase64);
    urls.push(url);
  }
  
  return urls;
}

async function handleOpenAICombine(imageA: string, imageB: string, instruction: string, controls: any) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  console.log('=== OPENAI COMBINE ===');
  console.log('Controls:', controls);
  console.log('ImageA URL:', imageA);
  console.log('ImageB URL:', imageB);
  console.log('Instruction:', instruction);
  
  console.log('Baixando imagem A...');
  const imageABuffer = await fetch(imageA).then(r => r.arrayBuffer());
  console.log(`Imagem A: ${imageABuffer.byteLength} bytes`);
  
  console.log('Baixando imagem B...');
  const imageBBuffer = await fetch(imageB).then(r => r.arrayBuffer());
  console.log(`Imagem B: ${imageBBuffer.byteLength} bytes`);
  
  const formData = new FormData();
  formData.append('image[]', new Blob([imageABuffer], { type: 'image/png' }), 'imageA.png');
  formData.append('image[]', new Blob([imageBBuffer], { type: 'image/png' }), 'imageB.png');
  formData.append('prompt', instruction);
  formData.append('model', 'gpt-image-1');
  formData.append('quality', controls.quality || 'high');
  formData.append('input_fidelity', controls.inputFidelity || 'high');
  formData.append('background', controls.background || 'auto');
  formData.append('output_format', controls.outputFormat || 'png');
  
  console.log('Enviando para OpenAI /v1/images/edits...');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData
  });

  console.log('Resposta OpenAI status:', response.status);
  
  if (!response.ok) {
    const data = await response.json();
    console.error('Erro OpenAI:', data);
    throw new Error(data.error?.message || 'OpenAI error');
  }
  
  const data = await response.json();
  console.log('Imagem recebida com sucesso');
  const imageBase64 = `data:image/png;base64,${data.data[0].b64_json}`;
  
  return await uploadToStorage(imageBase64);
}

async function handleOpenAIVariation(inputImage: string, instruction: string, controls: any) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  console.log('=== OPENAI VARIATION ===', controls);
  
  const imageBuffer = await fetch(inputImage).then(r => r.arrayBuffer());
  
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'input.png');
  formData.append('prompt', instruction);
  formData.append('model', 'gpt-image-1');
  formData.append('quality', controls.quality || 'high');
  formData.append('input_fidelity', controls.inputFidelity || 'low');
  formData.append('background', controls.background || 'auto');
  formData.append('output_format', controls.outputFormat || 'png');
  
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || 'OpenAI error');
  }
  
  const data = await response.json();
  const imageBase64 = `data:image/png;base64,${data.data[0].b64_json}`;
  
  return await uploadToStorage(imageBase64);
}
async function handleOpenRouterImage(
  prompt: string,
  model: string,
  apiKey: string,
  imageA?: string,
  imageB?: string,
  inputImage?: string,
  mode?: string
): Promise<string> {
  console.log('=== OPENROUTER IMAGE ===');
  console.log('Model:', model, 'Mode:', mode);

  const messages: any[] = [
    {
      role: 'system',
      content: 'You are an image generation AI. When asked to create images, generate and output actual images. Always output an image, never just text.'
    }
  ];

  const content: any[] = [{ type: 'text', text: `Generate an image: ${prompt}. Output the actual image.` }];

  // Add input images if available
  if (mode === 'combine' && imageA && imageB) {
    const imgABase64 = await downloadAndResizeImage(imageA, 800, 70);
    const imgBBase64 = await downloadAndResizeImage(imageB, 800, 70);
    content.push({ type: 'image_url', image_url: { url: imgABase64 } });
    content.push({ type: 'image_url', image_url: { url: imgBBase64 } });
  } else if ((mode === 'variation') && inputImage) {
    const imgBase64 = await downloadAndResizeImage(inputImage, 800, 70);
    content.push({ type: 'image_url', image_url: { url: imgBase64 } });
  }

  messages.push({ role: 'user', content });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Viver de IA',
    },
    body: JSON.stringify({
      model,
      messages,
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter error:', response.status, errorText);
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  
  // Try to extract image from response (format may vary by model)
  const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
    || data.choices?.[0]?.message?.content;

  if (!imageBase64 || !imageBase64.startsWith('data:')) {
    throw new Error('O modelo selecionado não suporta geração de imagens. Tente outro modelo.');
  }

  return await uploadToStorage(imageBase64);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      imageA, 
      imageB, 
      instruction, 
      mode, 
      inputImage,
      provider = 'gemini',
      openaiControls = {},
      openrouterModel,
      userId,
      aspectRatio,
      count = 1,
    } = await req.json();

    console.log('Provider selecionado:', provider, 'Count:', count);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const globalOpenAIKey = await getGlobalApiKey('OPENAI_API_KEY');
    const OPENAI_API_KEY = globalOpenAIKey || Deno.env.get('OPENAI_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    let imageUrl: string;
    let imageUrls: string[] | undefined;

    if (provider === 'openrouter') {
      const apiKey = await getGlobalApiKey('OPENROUTER_API_KEY');
      if (!apiKey) {
        throw new Error('Chave OpenRouter não configurada. Adicione em Configurações.');
      }
      if (!openrouterModel) {
        throw new Error('Modelo OpenRouter não selecionado.');
      }
      const numImages = Math.min(Math.max(count || 1, 1), 4);
      if (numImages > 1 && !mode) {
        const promises = Array.from({ length: numImages }, () => 
          handleOpenRouterImage(prompt || instruction || '', openrouterModel, apiKey, imageA, imageB, inputImage, mode)
        );
        const urls = await Promise.all(promises);
        imageUrl = urls[0];
        imageUrls = urls;
      } else {
        imageUrl = await handleOpenRouterImage(prompt || instruction || '', openrouterModel, apiKey, imageA, imageB, inputImage, mode);
      }
    } else if (provider === 'openai') {
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY não configurada');
      }

      if (mode === 'combine' && imageA && imageB && instruction) {
        imageUrl = await handleOpenAICombine(imageA, imageB, instruction, openaiControls);
      } else if (mode === 'variation' && inputImage && instruction) {
        imageUrl = await handleOpenAIVariation(inputImage, instruction, openaiControls);
      } else if (prompt) {
        const result = await handleOpenAIGenerate(prompt, { ...openaiControls, n: count || openaiControls.n || 1 });
        if (result.length === 1) {
          imageUrl = result[0];
        } else {
          imageUrl = result[0];
          imageUrls = result;
        }
      } else {
        throw new Error('Parâmetros inválidos para OpenAI');
      }
    } else {
      // Gemini (padrão)
      if (mode === 'combine' && imageA && imageB && instruction) {
        imageUrl = await handleGeminiCombine(imageA, imageB, instruction);
      } else if (mode === 'variation' && inputImage && instruction) {
        imageUrl = await handleGeminiVariation(inputImage, instruction);
      } else if (prompt) {
        const numImages = Math.min(Math.max(count || 1, 1), 4);
        if (numImages > 1) {
          const promises = Array.from({ length: numImages }, () => handleGeminiGenerate(prompt, aspectRatio));
          const urls = await Promise.all(promises);
          imageUrl = urls[0];
          imageUrls = urls;
        } else {
          imageUrl = await handleGeminiGenerate(prompt, aspectRatio);
        }
      } else {
        throw new Error('Parâmetros inválidos para Gemini');
      }
    }

    return new Response(
      JSON.stringify({ imageUrl, imageUrls, prompt }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro ao gerar imagem:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    if (errorMessage.includes('429')) {
      return new Response(
        JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (errorMessage.includes('402')) {
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos no workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
