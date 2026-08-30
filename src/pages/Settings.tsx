import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Check, Eye, EyeOff, Loader2, Save, ChevronDown } from "lucide-react";
import { UsersSection } from "@/components/settings/UsersSection";
import { RegistrationToggle } from "@/components/settings/RegistrationToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserRole } from "@/hooks/useUserRole";

interface ApiKeyConfig {
  keyName: string;
  label: string;
  shortDesc: string;
  helpUrl: string;
  helpLabel: string;
  placeholder: string;
}

const API_KEYS: ApiKeyConfig[] = [
  {
    keyName: "GEMINI_API_KEY",
    label: "Google Gemini",
    shortDesc: "Veo 3.1",
    helpUrl: "https://aistudio.google.com/apikey",
    helpLabel: "aistudio.google.com",
    placeholder: "AIza...",
  },
  {
    keyName: "REMOVE_BG_API_KEY",
    label: "Remove.bg",
    shortDesc: "Remoção de fundo",
    helpUrl: "https://www.remove.bg/dashboard#api-key",
    helpLabel: "remove.bg",
    placeholder: "",
  },
];

const SECTIONS = [
  { title: "GERAÇÃO DE VIDEO", keys: ["GEMINI_API_KEY"] },
  { title: "UTILITÁRIOS", keys: ["REMOVE_BG_API_KEY"] },
];

function IntegrationRow({
  config,
  configured,
  isExpanded,
  onToggle,
  onSave,
  onCollapse,
  isLast,
}: {
  config: ApiKeyConfig;
  configured: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (keyName: string, value: string) => Promise<void>;
  onCollapse: () => void;
  isLast: boolean;
}) {
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(config.keyName, value.trim());
      setValue("");
      setEditing(false);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onCollapse();
      }, 2000);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isExpanded) {
      e.preventDefault();
      onToggle();
    }
    if (e.key === "Escape" && isExpanded) {
      e.preventDefault();
      onCollapse();
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl transition-colors",
        isExpanded ? "bg-zinc-900/30" : "",
        !isLast && !isExpanded && "border-b border-zinc-800/30",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center justify-between py-3.5 px-4 rounded-xl cursor-pointer group transition-colors",
          !isExpanded && "hover:bg-zinc-900/50",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "text-sm font-bold uppercase tracking-wide w-5 h-5 flex items-center justify-center rounded shrink-0",
              configured ? "text-zinc-200" : "text-zinc-600",
            )}
          >
            {config.label[0]}
          </span>
          <span className="text-sm font-medium text-zinc-200">{config.label}</span>
          <span className="text-sm text-zinc-500 hidden sm:inline">{config.shortDesc}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", configured ? "bg-emerald-500" : "bg-zinc-600")} />
            <span className={cn("text-xs", configured ? "text-emerald-500" : "text-zinc-500")}>
              {configured ? "Ativa" : "Pendente"}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 mt-1">
              {configured && !editing ? (
                <div>
                  <p className="text-sm font-mono text-zinc-500">{config.placeholder.slice(0, 3)}•••••••••••</p>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer transition-colors"
                    >
                      Atualizar
                    </button>
                    <button className="text-xs text-red-400/70 hover:text-red-400 cursor-pointer transition-colors">
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Input
                        type={showValue ? "text" : "password"}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={config.placeholder || "Cole sua API key aqui..."}
                        className="pr-10 bg-zinc-950 border-zinc-800 text-zinc-200 text-sm font-mono rounded-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave();
                          if (e.key === "Escape") onCollapse();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowValue(!showValue)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={!value.trim() || saving}
                      className={cn(
                        "gap-1.5 text-sm font-medium rounded-lg px-4 py-2.5 text-white transition-colors",
                        saved ? "bg-emerald-600/20 text-emerald-400" : "bg-emerald-600 hover:bg-emerald-500",
                      )}
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : saved ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {saved ? "Salva" : "Salvar"}
                    </Button>
                  </div>
                  {editing && (
                    <button
                      onClick={() => {
                        setEditing(false);
                        setValue("");
                      }}
                      className="text-xs text-zinc-500 hover:text-zinc-300 mt-2 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              )}
              <a
                href={config.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-500 mt-3 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Obter key em {config.helpLabel}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusOverview({ configuredKeys }: { configuredKeys: string[] }) {
  const total = API_KEYS.length;
  const configured = API_KEYS.filter((k) => configuredKeys.includes(k.keyName)).length;

  const dotColor = configured === total ? "bg-emerald-500" : configured > 0 ? "bg-amber-500" : "bg-red-500";

  const label =
    configured === total
      ? "Todas as integrações ativas"
      : configured === 0
        ? "Nenhuma integração configurada"
        : `${configured} de ${total} integrações configuradas`;

  return (
    <div className="flex items-center justify-between gap-6 py-4 px-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50 mb-10">
      <div className="flex items-center gap-2.5">
        <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", dotColor)} />
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <div className="hidden sm:flex items-center gap-4">
        {API_KEYS.map((k) => {
          const active = configuredKeys.includes(k.keyName);
          return (
            <div key={k.keyName} className="flex items-center gap-1 text-xs">
              <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-emerald-500" : "bg-zinc-600")} />
              <span className={active ? "text-zinc-500" : "text-zinc-600"}>{k.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const { role: currentUserRole, isLoading: roleLoading } = useUserRole(user?.id);

  const { data: configuredKeys = [], isLoading: loading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        method: "POST",
        body: { action: "list" },
      });

      if (!error && data?.keys) {
        return data.keys as string[];
      }
      return [];
    },
    enabled: !!user && currentUserRole === "admin" && !isAuthLoading && !roleLoading,
    staleTime: 1000 * 60 * 5,
  });

  const handleSave = async (keyName: string, value: string) => {
    const { data, error } = await supabase.functions.invoke("manage-api-keys", {
      method: "POST",
      body: { action: "upsert", keyName, keyValue: value },
    });

    if (error || data?.error) {
      toast.error(data?.error || "Erro ao salvar a chave");
      throw new Error(data?.error || "Erro");
    }

    toast.success("Chave salva com sucesso!");
    queryClient.setQueryData(["api-keys"], (prev: string[] = []) =>
      prev.includes(keyName) ? prev : [...prev, keyName],
    );
  };

  if (isAuthLoading || roleLoading) {
    return (
      <div className="fixed inset-0 top-[72px] bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!user || currentUserRole !== "admin") {
    return <Navigate to="/creative" replace />;
  }

  return (
    <div className="fixed inset-0 top-[72px] bg-zinc-950 overflow-y-auto">
      <div className="max-w-[960px] mx-auto px-4 py-6">
        <div className="flex items-baseline gap-3 mb-8">
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <span className="text-sm text-zinc-500">API keys e integrações</span>
        </div>

        {!loading && <StatusOverview configuredKeys={configuredKeys} />}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="space-y-8">
            {SECTIONS.map((section) => {
              const sectionConfigs = section.keys.map((k) => API_KEYS.find((a) => a.keyName === k)!);
              return (
                <div key={section.title}>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">{section.title}</h2>
                  <div>
                    {sectionConfigs.map((config, i) => (
                      <IntegrationRow
                        key={config.keyName}
                        config={config}
                        configured={configuredKeys.includes(config.keyName)}
                        isExpanded={expandedKey === config.keyName}
                        onToggle={() => setExpandedKey(expandedKey === config.keyName ? null : config.keyName)}
                        onSave={handleSave}
                        onCollapse={() => setExpandedKey(null)}
                        isLast={i === sectionConfigs.length - 1}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <RegistrationToggle />

            <UsersSection />
          </div>
        )}
      </div>
    </div>
  );
}
