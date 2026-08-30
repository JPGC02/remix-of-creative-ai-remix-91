import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AssetType =
  | "sales_book"
  | "render_3d"
  | "construction_photo"
  | "logo"
  | "other";

export type CreativeFormat =
  | "square_1_1"
  | "vertical_4_5"
  | "story_9_16"
  | "carousel";

export type CreativeStatus = "draft" | "generating" | "ready" | "failed";

export interface RealEstateProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  location: string | null;
  developer: string | null;
  positioning: string | null;
  context_summary: string | null;
  brand_colors: string[];
  brand_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RealEstateAsset {
  id: string;
  project_id: string;
  user_id: string;
  asset_type: AssetType;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreativeSlide {
  image_path: string;
  headline: string;
  body_copy: string;
  cta: string;
  prompt_used?: string;
}

export interface RealEstateCreative {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  brief: string | null;
  format: CreativeFormat;
  status: CreativeStatus;
  slides: CreativeSlide[];
  caption: string | null;
  hashtags: string[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ["real-estate", "projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("real_estate_projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RealEstateProject[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["real-estate", "project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("real_estate_projects")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as RealEstateProject | null;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      location?: string;
      developer?: string;
      positioning?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      const { data, error } = await supabase
        .from("real_estate_projects")
        .insert({ ...input, user_id: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as RealEstateProject;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["real-estate"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<RealEstateProject>;
    }) => {
      const { error } = await supabase
        .from("real_estate_projects")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["real-estate"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("real_estate_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["real-estate"] }),
  });
}

export function useAssets(projectId: string | undefined) {
  return useQuery({
    queryKey: ["real-estate", "assets", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("real_estate_assets")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RealEstateAsset[];
    },
  });
}

export function useUploadAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      file,
      assetType,
      caption,
    }: {
      projectId: string;
      file: File;
      assetType: AssetType;
      caption?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      const userId = userData.user.id;
      const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${projectId}/${Date.now()}-${clean}`;
      const { error: upErr } = await supabase.storage
        .from("real-estate-assets")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("real_estate_assets").insert({
        project_id: projectId,
        user_id: userId,
        asset_type: assetType,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        caption: caption ?? null,
      });
      if (dbErr) throw dbErr;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: ["real-estate", "assets", v.projectId],
      }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      projectId: string;
      patch: Partial<RealEstateAsset>;
    }) => {
      const { error } = await supabase
        .from("real_estate_assets")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: ["real-estate", "assets", v.projectId],
      }),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      filePath,
    }: {
      id: string;
      projectId: string;
      filePath: string;
    }) => {
      await supabase.storage.from("real-estate-assets").remove([filePath]);
      const { error } = await supabase
        .from("real_estate_assets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: ["real-estate", "assets", v.projectId],
      }),
  });
}

export function useCreatives(projectId: string | undefined) {
  return useQuery({
    queryKey: ["real-estate", "creatives", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("real_estate_creatives")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RealEstateCreative[];
    },
    refetchInterval: (query) => {
      const items = (query.state.data ?? []) as RealEstateCreative[];
      return items.some((c) => c.status === "generating") ? 3000 : false;
    },
  });
}

export function useGenerateCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      brief: string;
      format: CreativeFormat;
      slideCount?: number;
      carouselFormat?: CreativeFormat;
      title?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-real-estate-creative",
        {
          body: {
            project_id: input.projectId,
            brief: input.brief,
            format: input.format,
            slide_count: input.slideCount ?? 1,
            carousel_format: input.carouselFormat ?? "square_1_1",
            title: input.title,
          },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: ["real-estate", "creatives", v.projectId],
      });
      toast.success("Peça gerada com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("real_estate_creatives")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: ["real-estate", "creatives", v.projectId],
      }),
  });
}

export function useSummarizeContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "summarize-real-estate-project",
        { body: { project_id: projectId } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.summary as string;
    },
    onSuccess: (_d, projectId) => {
      qc.invalidateQueries({ queryKey: ["real-estate", "project", projectId] });
      qc.invalidateQueries({ queryKey: ["real-estate", "projects"] });
      toast.success("Contexto atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function getSignedUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("real-estate-assets")
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export function useSignedUrl(path: string | undefined | null) {
  return useQuery({
    queryKey: ["real-estate", "signed", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 45,
    queryFn: async () => {
      if (!path) return null;
      return await getSignedUrl(path);
    },
  });
}
