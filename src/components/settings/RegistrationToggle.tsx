import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function RegistrationToggle() {
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("id, registration_enabled")
        .limit(1)
        .single();
      if (data) {
        setSettingsId(data.id);
        setRegistrationEnabled(data.registration_enabled);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setUpdating(true);
    let error;

    if (settingsId) {
      const result = await supabase
        .from("system_settings")
        .update({ registration_enabled: checked })
        .eq("id", settingsId);
      error = result.error;
    } else {
      const result = await supabase
        .from("system_settings")
        .insert({ registration_enabled: checked })
        .select("id")
        .single();
      error = result.error;
      if (!error && result.data) {
        setSettingsId(result.data.id);
      }
    }

    if (error) {
      toast.error("Erro ao atualizar configuração");
    } else {
      setRegistrationEnabled(checked);
      toast.success(checked ? "Registro habilitado" : "Registro desabilitado");
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-4 h-4 text-zinc-500" />
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Registro de usuários
        </h2>
      </div>
      <div className="rounded-xl border border-zinc-800/50 p-4 flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm text-zinc-200">Permitir novos registros</Label>
          <p className="text-xs text-zinc-500">
            {registrationEnabled
              ? "Novos usuários podem se registrar"
              : "Registro de novos usuários está bloqueado"}
          </p>
        </div>
        <Switch
          checked={registrationEnabled}
          onCheckedChange={handleToggle}
          disabled={updating}
        />
      </div>
    </div>
  );
}
