import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Parâmetro authorization_id ausente");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-3">
          <h1 className="text-xl font-semibold">Não foi possível carregar esta autorização</h1>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "um aplicativo externo";
  const redirectUri = details.client?.redirect_uri ?? details.redirect_uri;
  const scopes: string[] = Array.isArray(details.scopes)
    ? details.scopes
    : typeof details.scope === "string"
      ? details.scope.split(/\s+/).filter(Boolean)
      : [];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Conectar {clientName} à sua conta</h1>
          <p className="text-sm text-zinc-400">
            Isso permite que {clientName} use este app como você. Suas permissões e políticas de acesso continuam
            valendo.
          </p>
        </div>

        {redirectUri && (
          <div className="text-xs text-zinc-500">
            <div className="uppercase tracking-wider mb-1">Redirecionamento</div>
            <div className="font-mono break-all text-zinc-300">{redirectUri}</div>
          </div>
        )}

        {scopes.length > 0 && (
          <div className="text-xs text-zinc-500">
            <div className="uppercase tracking-wider mb-2">Permissões solicitadas</div>
            <ul className="space-y-1 text-zinc-300">
              {scopes.map((s) => (
                <li key={s} className="font-mono">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aprovar"}
          </Button>
          <Button disabled={busy} onClick={() => decide(false)} variant="outline" className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </main>
  );
}
