import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Format = "square_1_1" | "vertical_4_5" | "story_9_16" | "carousel";

function sizeFor(format: Format): string {
  switch (format) {
    case "square_1_1":
      return "1024x1024";
    case "vertical_4_5":
      return "1024x1280";
    case "story_9_16":
    case "carousel":
    default:
      return "1024x1024";
  }
}

function sizeForCarousel(childFormat: Format): string {
  return sizeFor(childFormat === "carousel" ? "square_1_1" : childFormat);
}

interface SlidePlan {
  headline: string;
  body_copy: string;
  cta: string;
  image_prompt: string;
}

interface CreativePlan {
  slides: SlidePlan[];
  caption: string;
  hashtags: string[];
}

async function planCreative(params: {
  brief: string;
  format: Format;
  slideCount: number;
  carouselFormat: Format;
  contextText: string;
  projectName: string;
}): Promise<CreativePlan> {
  const {
    brief,
    format,
    slideCount,
    carouselFormat,
    contextText,
    projectName,
  } = params;

  const isCarousel = format === "carousel";
  const finalCount = isCarousel ? Math.max(2, Math.min(10, slideCount)) : 1;
  const aspectHint =
    format === "story_9_16"
      ? "vertical 9:16 story/reels"
      : format === "vertical_4_5"
      ? "vertical 4:5 Instagram feed"
      : carouselFormat === "vertical_4_5"
      ? "vertical 4:5 Instagram feed"
      : carouselFormat === "story_9_16"
      ? "vertical 9:16 story"
      : "square 1:1 Instagram feed";

  const system = `Você é um diretor criativo especializado em anúncios de tráfego pago para o mercado imobiliário no Instagram. Cria peças com copy afiada, chamadas de impacto e prompts de imagem detalhados em INGLÊS (o modelo de imagem é anglófono). Sempre mantém consistência visual entre slides de um carrossel: mesma paleta, iluminação, tratamento de renderização e estilo tipográfico mental. Nunca inventa fatos sobre o empreendimento — usa apenas o contexto fornecido.`;

  const userPrompt = `# Empreendimento
${projectName}

# Contexto do empreendimento
${contextText || "(sem contexto adicional — trabalhe apenas com o brief)"}

# Brief da peça
${brief}

# Formato
${isCarousel ? `Carrossel Instagram com ${finalCount} slides — cada slide em ${aspectHint}` : `Peça única em ${aspectHint}`}

# Tarefa
Retorne um JSON estrito com esta forma:

{
  "slides": [
    {
      "headline": "chamada curta e forte para overlay na imagem (pt-BR, máx 60 chars)",
      "body_copy": "subtítulo/apoio para overlay (pt-BR, máx 120 chars)",
      "cta": "call-to-action curto (pt-BR, máx 25 chars)",
      "image_prompt": "prompt detalhado EM INGLÊS para gerar a imagem deste slide, mencionando composição, iluminação, ângulo, estilo (fotorrealista arquitetônico, render 3D cinematográfico, etc), paleta e mood. NÃO peça texto sobreposto — a headline será renderizada por outro processo. Descreva apenas a cena visual."
    }
  ],
  "caption": "legenda completa do post no Instagram em pt-BR (2-4 parágrafos, tom que combine com o empreendimento, terminando com CTA claro e emojis usados com moderação)",
  "hashtags": ["array", "de", "hashtags", "sem", "o", "#", "misturando", "nichos", "amplos", "e", "específicos"]
}

Regras:
- Array "slides" com exatamente ${finalCount} item${finalCount > 1 ? "s" : ""}.
${isCarousel ? "- Slide 1 é o hook (para a persona parar de rolar). Slides do meio entregam valor/argumentos. Último slide é o CTA final.\n- Todos os slides compartilham a mesma âncora visual (paleta, estilo, iluminação) descrita explicitamente em cada image_prompt para garantir consistência." : ""}
- 8 a 15 hashtags.
- Retorne SOMENTE o JSON, sem markdown, sem comentários.`;

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Planejamento falhou (${res.status}): ${t.slice(0, 400)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  let parsed: CreativePlan;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta do planejador não é JSON válido.");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed.slides || !Array.isArray(parsed.slides))
    throw new Error("Plano sem slides.");
  return parsed;
}

async function generateImage(prompt: string, size: string): Promise<Uint8Array> {
  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/images/generations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt,
        size,
        quality: "low",
        n: 1,
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Imagem falhou (${res.status}): ${t.slice(0, 400)}`);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Sem b64_json na resposta.");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const {
      project_id,
      brief,
      format,
      slide_count = 1,
      carousel_format = "square_1_1",
      title,
    } = body as {
      project_id: string;
      brief: string;
      format: Format;
      slide_count?: number;
      carousel_format?: Format;
      title?: string;
    };

    if (!project_id || !brief || !format) {
      return new Response(JSON.stringify({ error: "Parâmetros faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load project + assets
    const { data: project, error: projErr } = await service
      .from("real_estate_projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (projErr || !project) {
      return new Response(
        JSON.stringify({ error: "Projeto não encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: assets } = await service
      .from("real_estate_assets")
      .select("asset_type, file_name, caption, extracted_text")
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    // Build context text
    const contextParts: string[] = [];
    if (project.description) contextParts.push(`Descrição: ${project.description}`);
    if (project.location) contextParts.push(`Localização: ${project.location}`);
    if (project.developer) contextParts.push(`Construtora: ${project.developer}`);
    if (project.positioning) contextParts.push(`Posicionamento: ${project.positioning}`);
    if (project.brand_notes) contextParts.push(`Marca: ${project.brand_notes}`);
    if (project.context_summary)
      contextParts.push(`Resumo prévio: ${project.context_summary}`);
    if (assets && assets.length > 0) {
      const lines: string[] = ["Assets de referência:"];
      for (const a of assets) {
        const label =
          a.asset_type === "sales_book"
            ? "Book de vendas"
            : a.asset_type === "render_3d"
            ? "Render 3D"
            : a.asset_type === "construction_photo"
            ? "Foto de obra"
            : a.asset_type === "logo"
            ? "Logo"
            : "Outro";
        lines.push(`- [${label}] ${a.file_name}${a.caption ? ` — ${a.caption}` : ""}`);
        if (a.extracted_text) {
          const excerpt = a.extracted_text.slice(0, 1500);
          lines.push(`  Trecho extraído: ${excerpt}`);
        }
      }
      contextParts.push(lines.join("\n"));
    }
    const contextText = contextParts.join("\n\n");

    // Create draft creative row
    const { data: creative, error: creativeErr } = await service
      .from("real_estate_creatives")
      .insert({
        user_id: user.id,
        project_id,
        title: title || brief.slice(0, 60),
        brief,
        format,
        status: "generating",
      })
      .select()
      .single();
    if (creativeErr || !creative) {
      throw new Error(creativeErr?.message || "Falha ao criar peça");
    }

    // Plan
    let plan: CreativePlan;
    try {
      plan = await planCreative({
        brief,
        format,
        slideCount: slide_count,
        carouselFormat: carousel_format,
        contextText,
        projectName: project.name,
      });
    } catch (e) {
      await service
        .from("real_estate_creatives")
        .update({
          status: "failed",
          error_message: (e as Error).message,
        })
        .eq("id", creative.id);
      throw e;
    }

    // Determine size per slide
    const size =
      format === "carousel"
        ? sizeForCarousel(carousel_format)
        : sizeFor(format);

    // Generate images
    const slidesResult: any[] = [];
    for (let i = 0; i < plan.slides.length; i++) {
      const s = plan.slides[i];
      try {
        const png = await generateImage(s.image_prompt, size);
        const path = `${user.id}/creatives/${creative.id}/slide-${i + 1}.png`;
        const { error: upErr } = await service.storage
          .from("real-estate-assets")
          .upload(path, png, {
            contentType: "image/png",
            upsert: true,
          });
        if (upErr) throw new Error(`Upload falhou: ${upErr.message}`);
        slidesResult.push({
          image_path: path,
          headline: s.headline,
          body_copy: s.body_copy,
          cta: s.cta,
          prompt_used: s.image_prompt,
        });
      } catch (e) {
        await service
          .from("real_estate_creatives")
          .update({
            status: "failed",
            slides: slidesResult,
            error_message: `Slide ${i + 1}: ${(e as Error).message}`,
          })
          .eq("id", creative.id);
        throw e;
      }
    }

    const { error: finalErr } = await service
      .from("real_estate_creatives")
      .update({
        status: "ready",
        slides: slidesResult,
        caption: plan.caption,
        hashtags: plan.hashtags ?? [],
      })
      .eq("id", creative.id);
    if (finalErr) throw new Error(finalErr.message);

    return new Response(
      JSON.stringify({ creative_id: creative.id, status: "ready" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
