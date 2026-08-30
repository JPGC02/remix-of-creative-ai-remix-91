import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { executeWorkflow, executeWorkflowStepByStep } from '@/lib/workflow-engine';
import { toast } from 'sonner';
import { ExecutionMode, ExecutionState } from './useWorkflowDebug';
import { supabase } from '@/integrations/supabase/client';

export function useWorkflowExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const updateNodeRef = useRef<((nodeId: string, data: any) => void) | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const cancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      cancelledRef.current = true;
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // Immediate visual reset
      setIsExecuting(false);
      setExecutionLog(prev => [...prev, '⏹️ Workflow interrompido pelo usuário']);
      
      // Reset running nodes to idle
      if (updateNodeRef.current && nodesRef.current) {
        nodesRef.current.forEach(node => {
          if (node.data?.status === 'running') {
            updateNodeRef.current!(node.id, { ...node.data, status: 'idle' });
          }
        });
      }
      
      toast.info('Workflow interrompido pelo usuário');
    }
  }, []);

  const execute = useCallback(async (
    nodes: Node[],
    edges: Edge[],
    updateNode: (nodeId: string, data: any) => void,
    executionMode: ExecutionMode = 'normal',
    debugControls?: {
      setExecutionState: (state: ExecutionState) => void;
      setCurrentNodeIndex: (index: number) => void;
      setExecutionOrder: (order: string[]) => void;
      createPausePoint: () => Promise<void>;
    }
  ) => {
    // Validar antes de executar
    const errors: string[] = [];
    
    nodes.forEach(node => {
      if (node.type === 'imageCombinerNode') {
        const incomingEdges = edges.filter(e => e.target === node.id);
        const hasInstruction = incomingEdges.some(e => e.targetHandle === 'instruction');
        const hasImageA = incomingEdges.some(e => e.targetHandle === 'imageA');
        const hasImageB = incomingEdges.some(e => e.targetHandle === 'imageB');
        
        const missing = [];
        if (!hasInstruction) missing.push('Instrução');
        if (!hasImageA) missing.push('Imagem A');
        if (!hasImageB) missing.push('Imagem B');
        
        if (missing.length > 0) {
          errors.push(`Nó Combinador: precisa das seguintes entradas conectadas: ${missing.join(', ')}`);
        }
      }
      
      if (node.type === 'imageGeneratorNode') {
        const incomingEdges = edges.filter(e => e.target === node.id);
        const hasPrompt = incomingEdges.some(e => e.targetHandle === 'prompt');
        
        if (!hasPrompt && !node.data.prompt) {
          errors.push(`Nó Gerador de Imagem: precisa de um prompt conectado ou digitado`);
        }
      }
    });
    
    if (errors.length > 0) {
      toast.error('Erro de Conexão', {
        description: errors.join('\n\n')
      });
      return;
    }
    
    // Create AbortController for this execution
    const controller = new AbortController();
    abortControllerRef.current = controller;
    cancelledRef.current = false;
    
    // Store refs for immediate cancellation, wrapping updateNode to keep nodesRef in sync
    nodesRef.current = nodes;
    const wrappedUpdateNode = (nodeId: string, data: any) => {
      nodesRef.current = nodesRef.current.map(n => n.id === nodeId ? { ...n, data } : n);
      updateNode(nodeId, data);
    };
    updateNodeRef.current = wrappedUpdateNode;
    
    setIsExecuting(true);
    setExecutionLog([]);
    
    try {
      setExecutionLog(prev => [...prev, 'Iniciando execução do workflow...']);
      
      if (executionMode === 'step-by-step' && debugControls) {
        debugControls.setExecutionState('running');
        await executeWorkflowStepByStep(
          nodes, 
          edges, 
          wrappedUpdateNode, 
          debugControls.createPausePoint,
          (index, order) => {
            debugControls.setCurrentNodeIndex(index);
            debugControls.setExecutionOrder(order);
            setExecutionLog(prev => [...prev, `Executando nó ${index + 1}/${order.length}: ${order[index]}`]);
          },
          userId,
          controller.signal
        );
      } else {
        await executeWorkflow(nodes, edges, wrappedUpdateNode, userId, controller.signal);
      }
      
      setExecutionLog(prev => [...prev, '✅ Workflow concluído com sucesso!']);
      toast.success('Workflow executado com sucesso!');
      
      if (debugControls) {
        debugControls.setExecutionState('completed');
      }
    } catch (error) {
      // If already cancelled visually, skip all UI updates
      if (cancelledRef.current) {
        if (debugControls) {
          debugControls.setExecutionState('idle');
        }
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setExecutionLog(prev => [...prev, `❌ Erro: ${errorMessage}`]);
      toast.error(`Erro ao executar workflow: ${errorMessage}`);
      
      if (debugControls) {
        debugControls.setExecutionState('error');
      }
    } finally {
      abortControllerRef.current = null;
      // Only set false if not already cancelled
      if (!cancelledRef.current) {
        setIsExecuting(false);
      }
    }
  }, [userId]);

  const clearLog = useCallback(() => {
    setExecutionLog([]);
  }, []);

  return { 
    execute, 
    isExecuting, 
    executionLog,
    clearLog,
    cancelExecution
  };
}
