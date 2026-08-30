import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OpenRouterModel {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video';
}

export function useOpenRouterModels() {
  const { data: models = [], isLoading } = useQuery<OpenRouterModel[]>({
    queryKey: ['openrouter-models'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-openrouter-models');
      if (error) throw error;
      return data?.models || [];
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });

  return { models, isLoading };
}
