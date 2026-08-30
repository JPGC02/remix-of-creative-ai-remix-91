import { Node, Edge } from 'reactflow';

export function autoLayoutWorkflow(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  // Construir grafo de dependências
  const adjacencyList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  nodes.forEach(node => {
    adjacencyList[node.id] = [];
    inDegree[node.id] = 0;
  });
  
  edges.forEach(edge => {
    adjacencyList[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });
  
  // BFS para detectar camadas
  const layers: string[][] = [];
  const queue: string[] = [];
  const visited = new Set<string>();
  const nodeToLayer = new Map<string, number>();
  
  // Iniciar com nodes sem entrada (camada 0)
  nodes.forEach(node => {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
      visited.add(node.id);
      nodeToLayer.set(node.id, 0);
    }
  });
  
  // Se não houver nodes sem entrada, adicionar todos (grafo sem direção clara)
  if (queue.length === 0) {
    nodes.forEach(node => {
      queue.push(node.id);
      visited.add(node.id);
      nodeToLayer.set(node.id, 0);
    });
  }
  
  while (queue.length > 0) {
    const currentLayer: string[] = [];
    const layerSize = queue.length;
    
    for (let i = 0; i < layerSize; i++) {
      const nodeId = queue.shift()!;
      currentLayer.push(nodeId);
      
      const currentNodeLayer = nodeToLayer.get(nodeId) || 0;
      
      // Adicionar filhos à próxima camada
      adjacencyList[nodeId].forEach(childId => {
        if (!visited.has(childId)) {
          queue.push(childId);
          visited.add(childId);
          nodeToLayer.set(childId, currentNodeLayer + 1);
        }
      });
    }
    
    if (currentLayer.length > 0) {
      layers.push(currentLayer);
    }
  }
  
  // Calcular posições
  const HORIZONTAL_SPACING = 450;
  const VERTICAL_SPACING = 250;
  const START_X = 100;
  const START_Y = 100;
  
  const newNodes = nodes.map(node => {
    // Encontrar camada do node
    let layerIndex = 0;
    let nodeIndexInLayer = 0;
    
    for (let i = 0; i < layers.length; i++) {
      const index = layers[i].indexOf(node.id);
      if (index !== -1) {
        layerIndex = i;
        nodeIndexInLayer = index;
        break;
      }
    }
    
    // Calcular offset vertical para centralizar camada
    const layerHeight = layers[layerIndex].length * VERTICAL_SPACING;
    const verticalOffset = -(layerHeight / 2) + (VERTICAL_SPACING / 2);
    
    return {
      ...node,
      position: {
        x: START_X + (layerIndex * HORIZONTAL_SPACING),
        y: START_Y + (nodeIndexInLayer * VERTICAL_SPACING) + verticalOffset + 200
      }
    };
  });
  
  return newNodes;
}
