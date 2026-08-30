import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StudioCollection {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  item_count: number;
}

const fetchCollections = async (): Promise<StudioCollection[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: cols, error } = await supabase
    .from('studio_collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const collectionsWithCounts: StudioCollection[] = await Promise.all(
    (cols || []).map(async (col) => {
      const { count } = await supabase
        .from('studio_collection_items')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', col.id);
      return { ...col, item_count: count || 0 };
    })
  );

  return collectionsWithCounts;
};

export const useStudioCollections = () => {
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading: loading } = useQuery({
    queryKey: ['studio-collections'],
    queryFn: fetchCollections,
    staleTime: 1000 * 60,
  });

  // Fetch preview URLs (4 most recent images per collection)
  const { data: previews = {} } = useQuery({
    queryKey: ['studio-collection-previews', collections.map(c => c.id).join(',')],
    queryFn: async (): Promise<Record<string, string[]>> => {
      if (collections.length === 0) return {};
      const collectionIds = collections.map(c => c.id);

      // Get up to 4 most recent items per collection
      const { data: items } = await supabase
        .from('studio_collection_items')
        .select('collection_id, generation_id')
        .in('collection_id', collectionIds)
        .order('added_at', { ascending: false });

      if (!items || items.length === 0) return {};

      // Group by collection, take first 4
      const grouped: Record<string, string[]> = {};
      for (const item of items) {
        if (!grouped[item.collection_id]) grouped[item.collection_id] = [];
        if (grouped[item.collection_id].length < 4) {
          grouped[item.collection_id].push(item.generation_id);
        }
      }

      // Batch fetch generation results
      const allGenIds = Object.values(grouped).flat();
      if (allGenIds.length === 0) return {};

      const { data: generations } = await supabase
        .from('studio_generations')
        .select('id, result')
        .in('id', allGenIds);

      if (!generations) return {};

      const genMap = new Map(generations.map(g => [g.id, g.result]));
      const result: Record<string, string[]> = {};
      for (const [colId, genIds] of Object.entries(grouped)) {
        result[colId] = genIds.map(id => genMap.get(id)).filter(Boolean) as string[];
      }
      return result;
    },
    enabled: collections.length > 0,
    staleTime: 1000 * 60,
  });

  // Keep loadCollections for backward compat
  const loadCollections = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['studio-collections'] });
  }, [queryClient]);

  const createCollection = useCallback(async (name: string, color: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('studio_collections')
      .insert({ name, color, user_id: user.id });

    if (error) {
      toast({ title: 'Erro ao criar coleção', variant: 'destructive' });
      return;
    }
    toast({ title: 'Coleção criada!' });
    queryClient.invalidateQueries({ queryKey: ['studio-collections'] });
  }, [queryClient]);

  const deleteCollection = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('studio_collections')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir coleção', variant: 'destructive' });
      return;
    }
    toast({ title: 'Coleção excluída' });
    queryClient.invalidateQueries({ queryKey: ['studio-collections'] });
  }, [queryClient]);

  const addToCollection = useCallback(async (collectionId: string, generationId: string) => {
    const { error } = await supabase
      .from('studio_collection_items')
      .insert({ collection_id: collectionId, generation_id: generationId });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Já está nesta coleção' });
        return;
      }
      toast({ title: 'Erro ao adicionar', variant: 'destructive' });
      return;
    }
    toast({ title: 'Adicionado à coleção!' });
    queryClient.invalidateQueries({ queryKey: ['studio-collections'] });
    queryClient.invalidateQueries({ queryKey: ['studio-collection-previews'] });
  }, [queryClient]);

  const removeFromCollection = useCallback(async (collectionId: string, generationId: string) => {
    const { error } = await supabase
      .from('studio_collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('generation_id', generationId);

    if (error) {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  }, []);

  const loadCollectionItems = useCallback(async (collectionId: string) => {
    const { data, error } = await supabase
      .from('studio_collection_items')
      .select('generation_id')
      .eq('collection_id', collectionId);

    if (error) return [];

    const generationIds = (data || []).map(d => d.generation_id);
    if (generationIds.length === 0) return [];

    const { data: generations } = await supabase
      .from('studio_generations')
      .select('*')
      .in('id', generationIds)
      .order('created_at', { ascending: false });

    return generations || [];
  }, []);

  const renameCollection = useCallback(async (id: string, newName: string) => {
    const { error } = await supabase
      .from('studio_collections')
      .update({ name: newName })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao renomear', variant: 'destructive' });
      return;
    }
    toast({ title: 'Coleção renomeada!' });
    queryClient.invalidateQueries({ queryKey: ['studio-collections'] });
  }, [queryClient]);

  // Enrich collections with preview URLs
  const collectionsWithPreviews = collections.map(c => ({
    ...c,
    preview_urls: previews[c.id] || [],
  }));

  return {
    collections: collectionsWithPreviews,
    loading,
    loadCollections,
    createCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    loadCollectionItems,
    renameCollection,
    previews,
  };
};
