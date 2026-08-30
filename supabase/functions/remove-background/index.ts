import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, userId } = await req.json();
    
    if (!imageUrl) {
      throw new Error('imageUrl é obrigatório');
    }

    const globalKey = await getGlobalApiKey('REMOVE_BG_API_KEY');
    const REMOVE_BG_API_KEY = globalKey || Deno.env.get('REMOVE_BG_API_KEY');

    if (!REMOVE_BG_API_KEY) {
      throw new Error('REMOVE_BG_API_KEY não configurada. Configure em Configurações.');
    }

    // Chamar API Remove.bg
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('size', 'auto'); // ou 'preview', 'full', 'auto'
    
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro Remove.bg:', response.status, errorText);
      
      // Tratar erros específicos
      if (response.status === 402) {
        throw new Error('Créditos do Remove.bg esgotados. Adicione mais créditos em https://www.remove.bg/users/sign_in');
      }
      if (response.status === 403) {
        throw new Error('API key do Remove.bg inválida');
      }
      
      throw new Error(`Erro Remove.bg: ${response.status} - ${errorText}`);
    }

    // Converter blob para base64
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    const resultImageUrl = `data:image/png;base64,${base64}`;
    
    console.log('✅ Fundo removido com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: resultImageUrl,
        creditsUsed: response.headers.get('X-Credits-Charged') || '1'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro na remoção de fundo:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
