import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Workflow, Wand2, FolderOpen, Library, Settings, LogOut, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useLayoutEffect, useCallback, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserRole } from "@/hooks/useUserRole";

interface NavItem {
  id: string;
  icon: typeof Workflow;
  path: string;
  label: string;
}

const allNavItems: (NavItem & { adminOnly?: boolean })[] = [
  { id: "fluxo", icon: Workflow, path: "/creative", label: "Fluxo" },
  { id: "studio", icon: Wand2, path: "/creative/studio", label: "Criar" },
  { id: "imobiliario", icon: Building2, path: "/real-estate", label: "Imobiliário" },
  { id: "salvos", icon: FolderOpen, path: "/creative/salvos", label: "Fluxos Salvos" },
  { id: "colecoes", icon: Library, path: "/creative/colecoes", label: "Coleções" },
  { id: "settings", icon: Settings, path: "/settings", label: "Configurações", adminOnly: true },
];

export const PlatformNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const { role: userRole } = useUserRole(user?.id);
  const userEmail = user?.email ?? "";
  const [sliderStyle, setSliderStyle] = useState<{ x: number; width: number } | null>(null);

  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.adminOnly || userRole === "admin"),
    [userRole],
  );

  const isAuthPage = location.pathname === "/auth";

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch {
      toast.error("Erro ao fazer logout.");
    }
  };

  const getInitials = (email: string) => {
    if (!email) return "VD";
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  const getActiveItem = () => {
    if (location.pathname === "/creative") return "fluxo";
    if (location.pathname === "/creative/studio") return "studio";
    if (location.pathname.startsWith("/real-estate")) return "imobiliario";
    if (location.pathname === "/creative/salvos") return "salvos";
    if (location.pathname === "/creative/colecoes") return "colecoes";
    if (location.pathname === "/settings") return "settings";
    return "";
  };

  const activeItem = getActiveItem();

  const updateSliderPosition = useCallback(() => {
    const container = containerRef.current;
    const target = activeItem ? itemRefs.current[activeItem] : null;

    if (!container || !target || !activeItem) {
      setSliderStyle(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const x = targetRect.left - containerRect.left;

    setSliderStyle({ x, width: targetRect.width });
  }, [activeItem]);

  useLayoutEffect(() => {
    updateSliderPosition();
    window.addEventListener("resize", updateSliderPosition);
    return () => window.removeEventListener("resize", updateSliderPosition);
  }, [updateSliderPosition]);

  if (isAuthPage) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed top-4 left-1/2 z-50 flex items-center gap-3"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none transition-transform duration-200 hover:scale-105">
            <Avatar className="h-10 w-10 cursor-pointer border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                {isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : getInitials(userEmail)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-popover border border-border shadow-lg z-50">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userEmail ? userEmail.split("@")[0] : "Usuário"}</p>
              <p className="text-xs leading-none text-muted-foreground">{userEmail || "Carregando..."}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {userRole === "admin" && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        ref={containerRef}
        className="relative flex items-center gap-1 p-1.5 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(24, 24, 27, 0.8)",
          backdropFilter: "blur(12px)",
          border: "1px solid #27272a",
          willChange: "transform",
          isolation: "isolate",
        }}
      >
        <div
          className="absolute top-1.5 bottom-1.5 rounded-xl"
          style={{
            background: "#27272a",
            left: 0,
            opacity: sliderStyle ? 1 : 0,
            transform: sliderStyle ? `translateX(${sliderStyle.x}px)` : "translateX(0)",
            width: sliderStyle ? sliderStyle.width : 0,
            transition:
              "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease",
            pointerEvents: "none",
          }}
        />

        {navItems.map((item) => {
          const isActive = activeItem === item.id;

          return (
            <div
              key={item.id}
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={cn(
                "relative z-10 flex items-center px-3 py-1.5 rounded-xl cursor-pointer transition-colors duration-200",
                isActive ? "text-white font-medium" : "text-zinc-500 hover:text-zinc-300",
              )}
              style={{ transform: "translateZ(0)" }}
            >
              <span className="text-sm whitespace-nowrap">{item.label}</span>
            </div>
          );
        })}
      </div>
    </motion.nav>
  );
};
