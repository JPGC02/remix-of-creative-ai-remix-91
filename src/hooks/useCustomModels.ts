import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomModel } from '@/types/workflow';

export function useCustomModels() {
  const { data: models = [], isLoading, refetch } = useQuery({
    queryKey: ['custom-models'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('user_custom_models' as any)
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar modelos customizados:', error);
        return [];
      }

      return (data || []) as unknown as CustomModel[];
    },
  });

  const textModels = models.filter(m => m.model_type === 'text');
  const imageModels = models.filter(m => m.model_type === 'image');
  const videoModels = models.filter(m => m.model_type === 'video');

  return { models, textModels, imageModels, videoModels, isLoading, refetch };
}
