export type NodeIOType = 'text' | 'image' | 'video' | 'any';

export interface NodeCompatibility {
  accepts: NodeIOType[];  // O que o nó aceita como entrada
  produces: NodeIOType;   // O que o nó produz como saída
  defaultTargetHandle?: string | null; // Handle de entrada padrão
}

export const NODE_COMPATIBILITY: Record<string, NodeCompatibility> = {
  textInputNode: {
    accepts: [],
    produces: 'text',
    defaultTargetHandle: null,
  },
  aiTextGeneratorNode: {
    accepts: ['text'],
    produces: 'text',
    defaultTargetHandle: 'prompt',
  },
  imageUploadNode: {
    accepts: [],
    produces: 'image',
    defaultTargetHandle: null,
  },
  imageGeneratorNode: {
    accepts: ['text'],
    produces: 'image',
    defaultTargetHandle: 'prompt',
  },
  imageCombinerNode: {
    accepts: ['image'],
    produces: 'image',
    defaultTargetHandle: 'image',
  },
  aiImageEditorNode: {
    accepts: ['image', 'text'],
    produces: 'image',
    defaultTargetHandle: 'image',
  },
  imageEditorNode: {
    accepts: ['image'],
    produces: 'image',
    defaultTargetHandle: 'inputImage',
  },
  removeBackgroundNode: {
    accepts: ['image'],
    produces: 'image',
    defaultTargetHandle: 'image',
  },
  imageVariationNode: {
    accepts: ['image', 'text'],
    produces: 'image',
    defaultTargetHandle: 'image',
  },
  videoGeneratorNode: {
    accepts: ['text', 'image'],
    produces: 'video',
    defaultTargetHandle: 'prompt',
  },
};

// Mapa de tipo esperado por cada handle de entrada (target) de cada node
// Chave: "nodeType::handleId" → tipo esperado
export const HANDLE_TYPE_MAP: Record<string, NodeIOType> = {
  // Source handles (output)
  'textInputNode::output': 'text',
  'aiTextGeneratorNode::output': 'text',
  'imageUploadNode::output': 'image',
  'imageGeneratorNode::image': 'image',
  'imageCombinerNode::output': 'image',
  'aiImageEditorNode::output': 'image',
  'imageEditorNode::output': 'image',
  'removeBackgroundNode::output': 'image',
  'imageVariationNode::output': 'image',
  'videoGeneratorNode::video': 'video',

  // Target handles (input)
  'aiTextGeneratorNode::prompt': 'text',
  'imageGeneratorNode::prompt': 'text',
  'imageCombinerNode::imageA': 'image',
  'imageCombinerNode::imageB': 'image',
  'imageCombinerNode::instruction': 'text',
  'aiImageEditorNode::inputImage': 'image',
  'aiImageEditorNode::prompt': 'text',
  'imageEditorNode::inputImage': 'image',
  'removeBackgroundNode::inputImage': 'image',
  'imageVariationNode::inputImage': 'image',
  'imageVariationNode::prompt': 'text',
  'videoGeneratorNode::imageUrl': 'image',
  'videoGeneratorNode::prompt': 'text',
};

// Função para verificar se uma conexão específica é válida (handle a handle)
export function isConnectionValid(
  sourceNodeType: string,
  sourceHandleId: string,
  targetNodeType: string,
  targetHandleId: string
): boolean {
  const sourceKey = `${sourceNodeType}::${sourceHandleId}`;
  const targetKey = `${targetNodeType}::${targetHandleId}`;

  const sourceType = HANDLE_TYPE_MAP[sourceKey];
  const targetType = HANDLE_TYPE_MAP[targetKey];

  // Se não encontrou no mapa, bloqueia por segurança
  if (!sourceType || !targetType) return false;

  return sourceType === targetType;
}

// Função helper para verificar compatibilidade
export function isCompatible(sourceNodeType: string, targetNodeType: string): boolean {
  const source = NODE_COMPATIBILITY[sourceNodeType];
  const target = NODE_COMPATIBILITY[targetNodeType];
  
  if (!source || !target) return false;
  
  const sourceOutput = source.produces;
  const targetAccepts = target.accepts;
  
  return targetAccepts.includes('any' as NodeIOType) || targetAccepts.includes(sourceOutput);
}

// Função para obter nós compatíveis com um nó de origem
export function getCompatibleNodes(sourceNodeType: string, allNodeTypes: any[]): any[] {
  return allNodeTypes.filter(nodeType => 
    isCompatible(sourceNodeType, nodeType.type)
  );
}

// Função para obter o handle de entrada padrão de um tipo de nó
export function getDefaultTargetHandle(nodeType: string): string | null {
  const nodeConfig = NODE_COMPATIBILITY[nodeType];
  return nodeConfig?.defaultTargetHandle ?? null;
}
