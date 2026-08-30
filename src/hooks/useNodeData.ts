import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';

export function useNodeData(nodeId: string) {
  const { getNode, setNodes } = useReactFlow();
  
  const updateData = useCallback((newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
  }, [nodeId, setNodes]);

  const node = getNode(nodeId);
  return { data: node?.data, updateData };
}
