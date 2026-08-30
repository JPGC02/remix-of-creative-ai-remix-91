import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsWithSlider, TabsContent, TabsListWithSlider, TabsTriggerWithSlider } from "@/components/ui/tabs-with-slider";
import GlassSurface from "@/components/ui/glass-surface";
import { toast } from "sonner";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const postAuthRedirect = () => {
    if (next) window.location.href = next;
    else navigate("/");
  };
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  // Buscar configuração de registro
  useEffect(() => {
    const fetchRegistrationSetting = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('registration_enabled')
        .limit(1)
        .single();
      // Se não existe row (data é null), mantém true (padrão)
      setRegistrationEnabled(data ? data.registration_enabled : true);
    };
    fetchRegistrationSetting();
  }, []);

  // Verificar se usuário já está logado
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        postAuthRedirect();
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        postAuthRedirect();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registrationEnabled === false) {
      toast.error("Novos registros estão desabilitados no momento.");
      return;
    }
    
    // Validar inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${next ?? "/creative"}`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este email já está cadastrado. Faça login.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Conta criada com sucesso! Você já pode fazer login.");
      }
    } catch (error: any) {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Login realizado com sucesso!");
      }
    } catch (error: any) {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center justify-center p-4">
        <div className="flex flex-col items-center w-full max-w-md">
        {/* Glass Card */}
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={24}
          borderWidth={0}
          blur={20}
          opacity={0.15}
          brightness={120}
          backgroundOpacity={0.05}
          className="w-full"
        >
          <div className="p-8 space-y-6 bg-black/40 rounded-[24px]">
            {/* Header */}
            <div className="space-y-4 text-center flex flex-col items-center">
              <img 
                src="/logo-viver-de-ia.png" 
                alt="Viver de IA" 
                className="h-14 w-auto mb-2"
              />
              <p className="text-sm text-white/70">
                Faça login ou crie sua conta para começar
              </p>
            </div>
            
            {/* Tabs */}
          <TabsWithSlider defaultValue="login" className="w-full">
            <TabsListWithSlider className="grid w-full grid-cols-2">
              <TabsTriggerWithSlider value="login">
                Login
              </TabsTriggerWithSlider>
              <TabsTriggerWithSlider value="signup">
                Criar Conta
              </TabsTriggerWithSlider>
            </TabsListWithSlider>

              {/* Tab: Login */}
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white/90">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white/90">
                      Senha
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
                    />
                  </div>
                  
                  <div className="flex justify-center pt-4">
                    <Button 
                      type="submit" 
                      className="px-12 py-2.5 min-w-[200px] bg-primary hover:bg-primary/90" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Tab: Signup */}
              <TabsContent value="signup">
                {registrationEnabled === false ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-sm text-white/70">Novos registros estão desabilitados no momento.</p>
                    <p className="text-xs text-white/40">Entre em contato com o administrador.</p>
                  </div>
                ) : (
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white/90">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white/90">
                      Senha
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
                    />
                    <p className="text-xs text-white/50">
                      Mínimo de 6 caracteres
                    </p>
                  </div>
                  
                  <div className="flex justify-center pt-4">
                    <Button 
                      type="submit" 
                      className="px-12 py-2.5 min-w-[200px] bg-primary hover:bg-primary/90" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Criando conta..." : "Criar Conta"}
                    </Button>
                  </div>
                </form>
                )}
            </TabsContent>
          </TabsWithSlider>
          </div>
        </GlassSurface>
      </div>
    </div>
    </div>
  );
}
