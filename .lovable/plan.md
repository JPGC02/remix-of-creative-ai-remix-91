## Módulo: Projetos Imobiliários

Novo módulo dedicado para criar criativos de tráfego pago (Instagram) para empreendimentos, com contexto persistente (book, imagens 3D, fotos de obra) e geração de peças por IA (imagem + copy).

### 1. Modelo de dados (nova migração)

Três tabelas novas em `public`, todas com RLS por `auth.uid() = user_id`, GRANTs para `authenticated`/`service_role`, e trigger de `updated_at`.

- **`real_estate_projects`** — o empreendimento
  - `name`, `description`, `location`, `developer` (construtora)
  - `positioning` (texto livre: público-alvo, diferenciais, tom de voz)
  - `context_summary` (resumo gerado por IA a partir dos assets, cacheado)
  - `brand_colors` (jsonb: paleta), `brand_notes`
- **`real_estate_assets`** — arquivos de contexto
  - `project_id` (FK), `asset_type` enum: `sales_book` | `render_3d` | `construction_photo` | `logo` | `other`
  - `file_path` (storage), `file_name`, `mime_type`, `size_bytes`
  - `caption` (o que a imagem mostra — editável, pré-preenchido por IA de visão quando aplicável)
  - `extracted_text` (para PDFs do book, via `document--parse_document` no backend)
- **`real_estate_creatives`** — peças geradas
  - `project_id` (FK), `title`, `brief` (direcionamento do usuário)
  - `format` enum: `square_1_1` | `vertical_4_5` | `story_9_16` | `carousel`
  - `status` enum: `draft` | `generating` | `ready` | `failed`
  - `slides` jsonb (array — 1 item para estáticos, N para carrossel; cada item: `{ image_path, headline, body_copy, cta, prompt_used }`)
  - `caption` (legenda do post completo), `hashtags` text[]

Novo bucket de storage **`real-estate-assets`** (privado, signed URLs).

### 2. Edge Functions

- **`ingest-real-estate-asset`** — recebe upload; se PDF (book de vendas), roda parser e salva texto em `extracted_text`; se imagem, chama `google/gemini-3-flash-preview` (multimodal) para gerar `caption` descritiva automaticamente.
- **`summarize-real-estate-project`** — reúne `positioning` + captions + textos extraídos e produz `context_summary` estruturado (público-alvo, diferenciais, tom, âncoras visuais). Executada quando o usuário clica "Atualizar contexto" ou ao gerar a primeira peça.
- **`generate-real-estate-creative`** — recebe `project_id`, `brief`, `format`, `slide_count` (se carrossel). Fluxo:
  1. Carrega `context_summary` + `brand_notes`.
  2. Chama LLM (`google/gemini-3-flash-preview`) com function calling para gerar estrutura: para cada slide → `{ image_prompt, headline, body_copy }`, mais `caption` global e `hashtags`.
  3. Para cada slide, chama `/v1/images/generations` com `openai/gpt-image-2`, `quality: "low"`, tamanho conforme formato (1024x1024, 1024x1280, 1024x1792), streaming SSE repassado ao cliente.
  4. Salva PNGs em `real-estate-assets/creatives/{creative_id}/slide-{n}.png`.
  5. Atualiza `real_estate_creatives` com `status: 'ready'` e `slides` preenchidos.

Todas usam `LOVABLE_API_KEY` (já configurado) via AI Gateway.

### 3. Frontend — nova área `/real-estate`

Rota registrada em `src/App.tsx`; item de menu na navegação principal.

- **`RealEstateProjectsList.tsx`** (`/real-estate`) — grid de projetos, botão "Novo empreendimento".
- **`RealEstateProjectDetail.tsx`** (`/real-estate/:id`) — aba única com três seções:
  1. **Contexto** — form de `positioning`, `brand_notes`, seletor de paleta; botão "Regenerar resumo de contexto".
  2. **Biblioteca** — upload drag-and-drop tipado (book PDF, renders, fotos de obra); grid de assets com preview, caption editável, delete.
  3. **Criativos** — lista de peças geradas + botão "Nova peça" abrindo `CreativeGeneratorDialog`.
- **`CreativeGeneratorDialog.tsx`** — wizard curto:
  - Passo 1: formato (1:1 / 4:5 / 9:16 / carrossel + nº de slides).
  - Passo 2: brief (textarea grande — "o que essa peça deve comunicar?"), opcional escolher assets de referência visual da biblioteca (usados no prompt como descrição textual, já que a decisão é gerar do zero).
  - Passo 3: preview em streaming — cada slide renderiza progressivamente via SSE (blur em partials, nítido no `completed`), copy aparece ao lado.
- **`CreativeDetail.tsx`** — visualização final da peça: slides + copy + hashtags + botões "Copiar legenda", "Baixar todas as imagens" (zip), "Duplicar", "Regenerar slide N".

### 4. Detalhes técnicos

- **Streaming de imagem:** seguir o padrão do arquivo `ai-image-generation` — SSE com `eventsource-parser` no cliente, `flushSync` a cada frame, blur em `partial_image`, `image_generation.completed` remove blur; a Edge Function repassa o corpo SSE do gateway diretamente ao browser.
- **Tamanhos por formato:** 1:1 → `1024x1024`; 4:5 → `1024x1280`; 9:16 → `1024x1792`; carrossel → mesma proporção do formato-pai para todos os slides.
- **Consistência visual em carrossel:** o LLM recebe instrução explícita de manter paleta, tipografia mental e âncora visual do empreendimento entre os slides; cada `image_prompt` inclui um "style anchor" derivado do `context_summary`.
- **Segurança:** RLS restritivo (`user_id = auth.uid()`) em todas as tabelas; bucket privado com signed URLs geradas server-side.
- **Sem dependências novas** além do `jszip` para o botão "Baixar todas".

### 5. Escopo fora deste plano

- Publicação direta no Meta Ads (fica para depois).
- Edição de imagem sobre assets reais (usuário escolheu "gerar do zero").
- Vídeo/Reels animado (apenas imagem estática 9:16 no story).

### 6. Ordem de implementação

1. Migração + bucket.
2. Edge Functions (`ingest`, `summarize`, `generate`).
3. Hooks e páginas frontend.
4. Wizard de geração com streaming.
5. Teste end-to-end criando um projeto mock e uma peça 1:1.