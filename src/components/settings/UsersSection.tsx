import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserRole } from "@/hooks/useUserRole";

interface UserItem {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: "admin" | "user";
}

export function UsersSection() {
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const { role: currentUserRole, isLoading: isRoleLoading } = useUserRole(user?.id);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-users");
      if (error) throw error;
      return (data?.users || []) as UserItem[];
    },
    enabled: !!user && currentUserRole === "admin" && !isAuthLoading && !isRoleLoading,
  });

  if (isAuthLoading || isRoleLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!user || currentUserRole !== "admin") return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-zinc-500" />
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Usuários cadastrados</h2>
        {!isLoading && <span className="text-xs text-zinc-600">({users.length})</span>}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
          {users.map((listedUser, i) => (
            <div
              key={listedUser.id}
              className={cn(
                "flex items-center justify-between py-3 px-4",
                i !== users.length - 1 && "border-b border-zinc-800/30",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    listedUser.role === "admin"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-zinc-800 text-zinc-400",
                  )}
                >
                  {listedUser.role === "admin" ? (
                    <Shield className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-200 truncate">{listedUser.email}</span>
                    <Badge
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4",
                        listedUser.role === "admin"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-zinc-800 text-zinc-500 border-zinc-700",
                      )}
                    >
                      {listedUser.role}
                    </Badge>
                  </div>
                  <span className="text-xs text-zinc-600">
                    Cadastro: {format(new Date(listedUser.created_at), "dd MMM yyyy", { locale: ptBR })}
                    {listedUser.last_sign_in_at && (
                      <>
                        {" "}· Último login: {format(new Date(listedUser.last_sign_in_at), "dd MMM yyyy", { locale: ptBR })}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
