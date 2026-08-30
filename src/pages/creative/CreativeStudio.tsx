import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudioPromptBar, type StudioResult } from '@/components/studio/StudioPromptBar';
import { StudioMasonryGallery } from '@/components/studio/StudioMasonryGallery';
import { supabase } from '@/integrations/supabase/client';

const CreativeStudio = () => {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: queryData } = useQuery({
    queryKey: ['studio-generations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { results: [] as StudioResult[], favoriteIds: new Set<string>() };

      const { data } = await supabase
        .from('studio_generations' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (!data) return { results: [] as StudioResult[], favoriteIds: new Set<string>() };

      const results: StudioResult[] = (data as any[]).map((row: any) => ({
        id: row.id, type: row.type, prompt: row.prompt, provider: row.provider,
        result: row.result, createdAt: new Date(row.created_at), batchId: row.batch_id || undefined,
      }));

      const favoriteIds = new Set<string>();
      (data as any[]).forEach((row: any) => { if (row.is_favorite) favoriteIds.add(row.id); });

      return { results, favoriteIds };
    },
    staleTime: 1000 * 60,
  });

  const results = queryData?.results ?? [];
  const favoriteIds = queryData?.favoriteIds ?? new Set<string>();

  const handleResult = (result: StudioResult) => {
    queryClient.setQueryData(['studio-generations'], (old: any) => {
      if (!old) return { results: [result], favoriteIds: new Set<string>() };
      return { ...old, results: [result, ...old.results] };
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('studio_generations' as any).delete().eq('id', id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['studio-generations'] });
      queryClient.setQueryData(['studio-generations'], (old: any) => {
        if (!old) return old;
        const newFavs = new Set(old.favoriteIds);
        newFavs.delete(id);
        return { results: old.results.filter((r: StudioResult) => r.id !== id), favoriteIds: newFavs };
      });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      await supabase.from('studio_generations' as any).update({ is_favorite: isFavorite } as any).eq('id', id);
    },
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['studio-generations'] });
      queryClient.setQueryData(['studio-generations'], (old: any) => {
        if (!old) return old;
        const newFavs = new Set(old.favoriteIds);
        if (isFavorite) newFavs.add(id); else newFavs.delete(id);
        return { ...old, favoriteIds: newFavs };
      });
    },
  });

  return (
    <div className="fixed inset-0 top-[72px] bg-zinc-950 overflow-y-auto">
      <div className="max-w-[960px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Criar</h1>
        </div>

        {/* Prompt hero */}
        <StudioPromptBar onResult={handleResult} loading={loading} setLoading={setLoading} />

        {/* Gallery */}
        <StudioMasonryGallery
          results={results}
          loading={loading}
          onDelete={(id) => deleteMutation.mutate(id)}
          onToggleFavorite={(id, isFav) => favoriteMutation.mutate({ id, isFavorite: isFav })}
          favoriteIds={favoriteIds}
        />
      </div>
    </div>
  );
};

export default CreativeStudio;
