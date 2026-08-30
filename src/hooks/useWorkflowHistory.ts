import { useCallback, useRef, useState } from 'react';
import { Node, Edge } from 'reactflow';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

function cloneState(nodes: Node[], edges: Edge[]): HistoryState {
  return { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
}

export function useWorkflowHistory() {
  const pastRef = useRef<HistoryState[]>([]);
  const futureRef = useRef<HistoryState[]>([]);
  const skipNextPushRef = useRef(false);
  const [version, setVersion] = useState(0);

  const pushState = useCallback((nodes: Node[], edges: Edge[]) => {
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    pastRef.current = [...pastRef.current, cloneState(nodes, edges)].slice(-MAX_HISTORY);
    futureRef.current = [];
    setVersion(v => v + 1);
  }, []);

  const undo = useCallback((currentNodes: Node[], currentEdges: Edge[]): HistoryState | null => {
    if (pastRef.current.length === 0) return null;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, cloneState(currentNodes, currentEdges)];
    skipNextPushRef.current = true;
    setVersion(v => v + 1);
    return previous;
  }, []);

  const redo = useCallback((currentNodes: Node[], currentEdges: Edge[]): HistoryState | null => {
    if (futureRef.current.length === 0) return null;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, cloneState(currentNodes, currentEdges)];
    skipNextPushRef.current = true;
    setVersion(v => v + 1);
    return next;
  }, []);

  return {
    pushState,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
