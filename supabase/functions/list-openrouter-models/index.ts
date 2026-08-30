import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory cache
let cachedModels: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function classifyModality(modality: string): 'text' | 'image' | 'video' {
  if (modality?.includes('->video')) return 'video';
  if (modality?.includes('->image')) return 'image';
  return 'text';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    if (cachedModels && (now - cacheTimestamp) < CACHE_DURATION_MS) {
      return new Response(JSON.stringify({ models: cachedModels }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const json = await res.json();
    const models = (json.data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      type: classifyModality(m.architecture?.modality || ''),
    }));

    cachedModels = models;
    cacheTimestamp = now;

    return new Response(JSON.stringify({ models }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
