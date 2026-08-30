import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Node, Edge } from 'reactflow';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string | null;
  nodes: any;
  edges: any;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkflowPersistence() {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['saved-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as SavedWorkflow[];
    },
    staleTime: 1000 * 60,
  });

  const saveWorkflow = useCallback(async (
    name: string,
    description: string | undefined,
    nodes: Node[],
    edges: Edge[]
  ) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const cleanedNodes = nodes.map(node => ({
        ...node,
        data: { ...node.data, status: 'idle' }
      }));

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          name,
          description,
          nodes: cleanedNodes as any,
          edges: edges as any,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Workflow salvo com sucesso!', {
        description: `"${name}" foi salvo no banco de dados.`
      });

      queryClient.invalidateQueries({ queryKey: ['saved-workflows'] });
      return data as unknown as SavedWorkflow;
    } catch (error) {
      console.error('Erro ao salvar workflow:', error);
      toast.error('Erro ao salvar workflow', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [queryClient]);

  const updateWorkflow = useCallback(async (
    id: string,
    name: string,
    description: string | undefined,
    nodes: Node[],
    edges: Edge[]
  ) => {
    setIsSaving(true);
    try {
      const cleanedNodes = nodes.map(node => ({
        ...node,
        data: { ...node.data, status: 'idle' }
      }));

      const { data, error } = await supabase
        .from('workflows')
        .update({
          name,
          description,
          nodes: cleanedNodes as any,
          edges: edges as any,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Workflow atualizado!');
      queryClient.invalidateQueries({ queryKey: ['saved-workflows'] });
      return data as unknown as SavedWorkflow;
    } catch (error) {
      console.error('Erro ao atualizar workflow:', error);
      toast.error('Erro ao atualizar workflow');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [queryClient]);

  const deleteWorkflow = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Workflow deletado');
      queryClient.invalidateQueries({ queryKey: ['saved-workflows'] });
    } catch (error) {
      console.error('Erro ao deletar workflow:', error);
      toast.error('Erro ao deletar workflow');
    }
  }, [queryClient]);

  // Keep loadWorkflows for backward compat but it just refetches
  const loadWorkflows = useCallback(async () => {
    const result = await queryClient.fetchQuery({
      queryKey: ['saved-workflows'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as unknown as SavedWorkflow[];
      },
    });
    return result;
  }, [queryClient]);

  return {
    saveWorkflow,
    updateWorkflow,
    loadWorkflows,
    deleteWorkflow,
    workflows,
    isSaving,
    isLoading,
  };
}
