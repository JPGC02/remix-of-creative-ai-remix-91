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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Sessão inválida");

    const service = createClient(SUPABASE_URL, SERVICE_KEY);
    const { project_id } = await req.json();
    if (!project_id) throw new Error("project_id obrigatório");

    const { data: project } = await service
      .from("real_estate_projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!project) throw new Error("Projeto não encontrado");

    const { data: assets } = await service
      .from("real_estate_assets")
      .select("asset_type, file_name, caption, extracted_text")
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    const parts: string[] = [];
    if (project.description) parts.push(`Descrição: ${project.description}`);
    if (project.location) parts.push(`Localização: ${project.location}`);
    if (project.developer) parts.push(`Construtora: ${project.developer}`);
    if (project.positioning) parts.push(`Posicionamento: ${project.positioning}`);
    if (project.brand_notes) parts.push(`Marca: ${project.brand_notes}`);
    for (const a of assets ?? []) {
      parts.push(
        `[${a.asset_type}] ${a.file_name}${a.caption ? ` — ${a.caption}` : ""}`,
      );
      if (a.extracted_text) parts.push(a.extracted_text.slice(0, 3000));
    }

    const prompt = `Você é um diretor de marketing imobiliário. Analise o contexto do empreendimento abaixo e produza um RESUMO ESTRUTURADO em pt-BR com:

- **Público-alvo**: perfil demográfico e psicográfico principal
- **Diferenciais competitivos**: 3-5 pontos concretos
- **Tom de voz**: como o empreendimento deve se comunicar
- **Âncoras visuais**: paleta, estilo fotográfico e elementos recorrentes
- **Pilares de mensagem**: temas que os criativos devem explorar

Use markdown compacto. Seja específico e útil para direcionar criação de anúncios.

# Contexto
${parts.join("\n\n")}`;

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
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );
    if (!res.ok) throw new Error(`Falha (${res.status})`);
    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content ?? "";

    await service
      .from("real_estate_projects")
      .update({ context_summary: summary })
      .eq("id", project_id);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
