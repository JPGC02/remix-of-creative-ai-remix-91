import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/contexts/SidebarContext";
import RemixOverlay from "@/components/RemixOverlay";
import { PlatformNav } from "@/components/ui/platform-nav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ApiKeyWizard } from "@/components/onboarding/ApiKeyWizard";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserRole } from "@/hooks/useUserRole";
import Auth from "./pages/Auth";
import Creative from "./pages/Creative";
import CreativeSalvos from "./pages/creative/CreativeSalvos";
import CreativeStudio from "./pages/creative/CreativeStudio";
import CreativeColecoes from "./pages/creative/CreativeColecoes";
import Settings from "./pages/Settings";
import OAuthConsent from "./pages/OAuthConsent";
import NotFound from "./pages/NotFound";
import RealEstate from "./pages/RealEstate";
import RealEstateProject from "./pages/RealEstateProject";

const queryClient = new QueryClient();

const WizardController = () => {
  const [isOpen, setIsOpen] = useState(false);
  const qc = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const { role, isLoading: isRoleLoading } = useUserRole(user?.id);
  const isAdmin = role === "admin";

  const { data: configuredKeys = [], refetch } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        method: "POST",
        body: { action: "list" },
      });

      if (!error && data?.keys) return data.keys as string[];
      return [];
    },
    enabled: !!user && isAdmin && !isAuthLoading && !isRoleLoading,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (isAuthLoading || isRoleLoading || !user || !isAdmin) {
      setIsOpen(false);
      return;
    }

    setIsOpen(configuredKeys.length === 0);
  }, [configuredKeys.length, isAdmin, isAuthLoading, isRoleLoading, user]);

  if (isAuthLoading || isRoleLoading || !user || !isAdmin) return null;

  return (
    <ApiKeyWizard
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        localStorage.setItem("apikey-wizard-seen", "true");
      }}
      configuredKeys={configuredKeys}
      onKeysSaved={() => {
        refetch();
        qc.invalidateQueries({ queryKey: ["api-keys"] });
      }}
    />
  );
};

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isCreativePage = location.pathname === "/creative";

  return (
    <>
      {!isAuthPage && <PlatformNav />}
      {!isAuthPage && <WizardController />}

      <div style={{ display: isCreativePage ? "block" : "none" }} className="h-screen">
        <ProtectedRoute>
          <Creative />
        </ProtectedRoute>
      </div>

      {!isCreativePage && (
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          <Route path="/" element={<Navigate to="/creative" replace />} />
          <Route
            path="/creative/studio"
            element={
              <ProtectedRoute>
                <CreativeStudio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creative/salvos"
            element={
              <ProtectedRoute>
                <CreativeSalvos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creative/colecoes"
            element={
              <ProtectedRoute>
                <CreativeColecoes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/real-estate"
            element={
              <ProtectedRoute>
                <RealEstate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/real-estate/:id"
            element={
              <ProtectedRoute>
                <RealEstateProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark"]}
      forcedTheme="dark"
    >
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Sonner />
          {/* <RemixOverlay /> */}
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
