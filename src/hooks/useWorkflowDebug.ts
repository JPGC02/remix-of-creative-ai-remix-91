import { useState, useCallback, useRef } from 'react';

export type ExecutionMode = 'normal' | 'step-by-step';
export type ExecutionState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export function useWorkflowDebug() {
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('normal');
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');
  const [currentNodeIndex, setCurrentNodeIndex] = useState(-1);
  const [executionOrder, setExecutionOrder] = useState<string[]>([]);
  const pauseResolver = useRef<(() => void) | null>(null);

  const pause = useCallback(() => {
    setExecutionState('paused');
  }, []);

  const resume = useCallback(() => {
    setExecutionState('running');
    if (pauseResolver.current) {
      pauseResolver.current();
      pauseResolver.current = null;
    }
  }, []);

  const stepNext = useCallback(() => {
    resume();
  }, [resume]);

  const reset = useCallback(() => {
    setExecutionState('idle');
    setCurrentNodeIndex(-1);
    setExecutionOrder([]);
    pauseResolver.current = null;
  }, []);

  const createPausePoint = useCallback((): Promise<void> => {
    if (executionMode === 'normal' || executionState !== 'running') {
      return Promise.resolve();
    }

    setExecutionState('paused');
    
    return new Promise((resolve) => {
      pauseResolver.current = resolve;
    });
  }, [executionMode, executionState]);

  return {
    executionMode,
    setExecutionMode,
    executionState,
    setExecutionState,
    currentNodeIndex,
    setCurrentNodeIndex,
    executionOrder,
    setExecutionOrder,
    pause,
    resume,
    stepNext,
    reset,
    createPausePoint,
  };
}
