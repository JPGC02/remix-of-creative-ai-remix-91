import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listWorkflowsTool from "./tools/list-workflows";
import getWorkflowTool from "./tools/get-workflow";
import listConversationsTool from "./tools/list-conversations";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "creative-studio-mcp",
  title: "Creative Studio MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas para acessar workflows criativos e conversas do usuário autenticado. Use `whoami` para verificar a conexão, `list_workflows` / `get_workflow` para inspecionar workflows e `list_conversations` para listar conversas de chat.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listWorkflowsTool, getWorkflowTool, listConversationsTool],
});
