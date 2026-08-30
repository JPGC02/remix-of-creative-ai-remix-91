import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert prompt engineer specializing in Google's Gemini image generation model (Nano Banana Pro / gemini-3-pro-image-preview).

Your job is to take a casual, short user prompt and rewrite it into a highly detailed, visually rich prompt that will produce stunning images.

Rules:
- Output ONLY the enhanced prompt, no explanations or commentary
- Write in English (the model performs best in English)
- Keep the enhanced prompt under 200 words
- Preserve the user's original intent and subject matter
- Add specific visual details: lighting, composition, camera angle, depth of field
- Include artistic style references when appropriate (photorealistic, oil painting, watercolor, etc)
- Specify materials, textures, and surface qualities
- Describe the atmosphere, mood, and color palette
- Add technical photography terms: bokeh, golden hour, rim lighting, macro, wide-angle
- If an aspect ratio is provided, adapt the composition description accordingly:
  - 1:1 = centered, balanced composition
  - 16:9 or 3:2 = panoramic, landscape-oriented, wide establishing shots
  - 9:16 or 2:3 = vertical, portrait-oriented, tall compositions
- Make every prompt feel like a professional art director's brief
- Be specific about the number of subjects, their positions, and their relationships
- Avoid generic filler words; every word should add visual information`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, aspectRatio } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userMessage = aspectRatio
      ? `Aspect ratio: ${aspectRatio}\n\nUser prompt: ${prompt.trim()}`
      : `User prompt: ${prompt.trim()}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedPrompt) {
      throw new Error("No enhanced prompt returned");
    }

    return new Response(
      JSON.stringify({ enhancedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("enhance-image-prompt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
