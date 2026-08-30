import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UseUserRoleResult {
  role: AppRole | null;
  isLoading: boolean;
}

export function useUserRole(userId?: string): UseUserRoleResult {
  const query = useQuery({
    queryKey: ["user-role", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    queryFn: async (): Promise<AppRole | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role", { userId, error });
        return null;
      }

      return data?.role ?? "user";
    },
  });

  return {
    role: query.data ?? null,
    isLoading: !!userId && query.isLoading,
  };
}
