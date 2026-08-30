import { Node, Edge } from 'reactflow';
import { supabase } from '@/integrations/supabase/client';
import { applyFilter, applyAdjustments, addTextOverlay, cropImage, rotateImage, flipImage, resizeImage } from '@/lib/image-editor';

interface Graph {
  [nodeId: string]: string[];
}

export function buildGraph(nodes: Node[], edges: Edge[]): Graph {
  const graph: Graph = {};
  
  // Initialize all nodes
  nodes.forEach(node => {
    graph[node.id] = [];
  });
  
  // Build adjacency list
  edges.forEach(edge => {
    if (!graph[edge.source]) graph[edge.source] = [];
    graph[edge.source].push(edge.target);
  });
  
  return graph;
}

export function topologicalSort(graph: Graph): string[] {
  const inDegree: { [key: string]: number } = {};
  const result: string[] = [];
  const queue: string[] = [];
  
  // Initialize in-degree
  Object.keys(graph).forEach(node => {
    inDegree[node] = 0;
  });
  
  // Calculate in-degree for each node
  Object.keys(graph).forEach(node => {
    graph[node].forEach(neighbor => {
      inDegree[neighbor] = (inDegree[neighbor] || 0) + 1;
    });
  });
  
  // Find all nodes with in-degree 0
  Object.keys(inDegree).forEach(node => {
    if (inDegree[node] === 0) {
      queue.push(node);
    }
  });
  
  // Process queue
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    
    // Reduce in-degree for neighbors
    graph[node].forEach(neighbor => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }
  
  // Check for cycles
  if (result.length !== Object.keys(graph).length) {
    throw new Error('Ciclo detectado no workflow! Remova conexões circulares.');
  }
  
  return result;
}

export function getNodeInputData(
  nodeId: string,
  edges: Edge[],
  nodes: Node[]
): Record<string, any> {
  const inputData: Record<string, any> = {};
  
  // Find all edges that connect to this node
  const incomingEdges = edges.filter(edge => edge.target === nodeId);
  
  incomingEdges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (sourceNode) {
      // Map the data based on target handle
      const handleId = edge.targetHandle || 'input';
      
      // Get output data from source node
      if (sourceNode.type === 'textInputNode') {
        inputData[handleId] = sourceNode.data.text;
      } else if (sourceNode.type === 'imageGeneratorNode') {
        inputData[handleId] = sourceNode.data.imageUrl;
      } else if (sourceNode.type === 'imageCombinerNode') {
        inputData[handleId] = sourceNode.data.resultUrl;
      } else if (sourceNode.type === 'aiTextGeneratorNode') {
        inputData[handleId] = sourceNode.data.generatedText;
      } else if (sourceNode.type === 'imageUploadNode') {
        inputData[handleId] = sourceNode.data.uploadedImageUrl;
      } else if (sourceNode.type === 'imageEditorNode') {
      inputData[handleId] = sourceNode.data.outputImageUrl;
      } else if (sourceNode.type === 'aiImageEditorNode') {
        inputData[handleId] = sourceNode.data.outputImageUrl;
      } else if (sourceNode.type === 'imageVariationNode') {
        inputData[handleId] = sourceNode.data.resultUrl;
      } else if (sourceNode.type === 'videoGeneratorNode') {
        inputData[handleId] = sourceNode.data.videoUrl;
      }
    }
  });
  
  return inputData;
}

const EXECUTION_TIMEOUT_MS = 120_000; // 120 seconds

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} excedeu ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function executeNode(
  node: Node,
  inputData: Record<string, any>,
  updateNode: (nodeId: string, data: any) => void,
  userId?: string
): Promise<void> {
  // Update node status to running
  updateNode(node.id, { ...node.data, status: 'running' });
  
  try {
    if (node.type === 'textInputNode') {
      // Text input nodes are always ready
      await new Promise(resolve => setTimeout(resolve, 100));
      updateNode(node.id, { ...node.data, status: 'completed' });
    } else if (node.type === 'imageGeneratorNode') {
      // Get prompt from input
      const prompt = inputData.prompt || node.data.prompt || '';
      
      if (!prompt) {
        throw new Error('Prompt não pode estar vazio');
      }
      
      // Call generate-image edge function with timeout
      const { data, error } = await withTimeout(
        supabase.functions.invoke('generate-image', {
          body: { 
            prompt,
            provider: node.data.provider || 'gemini',
            openaiControls: node.data.openaiControls || {},
            openrouterModel: node.data.openrouterModel,
            userId
          }
        }),
        EXECUTION_TIMEOUT_MS,
        'Geração de imagem'
      );
      
      if (error) {
        console.error('Erro ao gerar imagem:', error);
        throw new Error(error.message || 'Erro ao gerar imagem');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const imageUrl = data.imageUrl;
      updateNode(node.id, {
        ...node.data,
        prompt,
        imageUrl,
        status: 'completed'
      });
    } else if (node.type === 'imageCombinerNode') {
      // Get inputs
      const imageA = inputData.imageA || node.data.imageA;
      const imageB = inputData.imageB || node.data.imageB;
      const instruction = inputData.instruction || node.data.instruction;
      
      console.log('Executando ImageCombinerNode:', {
        imageA: imageA ? '✅' : '❌',
        imageB: imageB ? '✅' : '❌',
        instruction: instruction ? '✅' : '❌'
      });
      
      // Check if all inputs are available
      if (!imageA || !imageB || !instruction) {
        const missing = [];
        if (!imageA) missing.push('Imagem A');
        if (!imageB) missing.push('Imagem B');
        if (!instruction) missing.push('Instrução');
        
        throw new Error(
          `O nó Combinador precisa de 3 ENTRADAS conectadas. Faltando: ${missing.join(', ')}`
        );
      }
      
      // Call generate-image edge function in combine mode with timeout
      const { data, error } = await withTimeout(
        supabase.functions.invoke('generate-image', {
          body: { 
            imageA, 
            imageB, 
            instruction,
            mode: 'combine',
            provider: node.data.provider || 'gemini',
            openaiControls: node.data.openaiControls || {},
            openrouterModel: node.data.openrouterModel,
            userId
          }
        }),
        EXECUTION_TIMEOUT_MS,
        'Combinação de imagens'
      );
      
      if (error) {
        console.error('Erro ao combinar imagens:', error);
        throw new Error(error.message || 'Erro ao combinar imagens');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const resultUrl = data.imageUrl;
      updateNode(node.id, {
        ...node.data,
        imageA,
        imageB,
        instruction,
        resultUrl,
        status: 'completed'
      });
    } else if (node.type === 'imageVariationNode') {
      // Get inputs
      const inputImage = inputData.inputImage || inputData.input || node.data.inputImage;
      const prompt = inputData.prompt || node.data.prompt;
      
      console.log('Executando ImageVariationNode:', {
        inputImage: inputImage ? '✅' : '❌',
        prompt: prompt ? '✅' : '❌'
      });
      
      // Check if all inputs are available
      if (!inputImage || !prompt) {
        const missing = [];
        if (!inputImage) missing.push('Imagem de entrada');
        if (!prompt) missing.push('Prompt de variação');
        
        throw new Error(
          `O nó Gerador de Variações precisa de 2 ENTRADAS conectadas. Faltando: ${missing.join(', ')}`
        );
      }
      
      // Call generate-image edge function in variation mode with timeout
      const { data, error } = await withTimeout(
        supabase.functions.invoke('generate-image', {
          body: { 
            inputImage, 
            instruction: prompt,
            mode: 'variation',
            provider: node.data.provider || 'gemini',
            openaiControls: node.data.openaiControls || {},
            openrouterModel: node.data.openrouterModel,
            userId
          }
        }),
        EXECUTION_TIMEOUT_MS,
        'Variação de imagem'
      );
      
      if (error) {
        console.error('Erro ao gerar variação:', error);
        throw new Error(error.message || 'Erro ao gerar variação');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const resultUrl = data.imageUrl;
      updateNode(node.id, {
        ...node.data,
        inputImage,
        prompt,
        resultUrl,
        status: 'completed'
      });
    } else if (node.type === 'aiTextGeneratorNode') {
      // Get prompt from input
      const prompt = inputData.prompt || node.data.prompt || '';
      
      if (!prompt) {
        throw new Error('Prompt não pode estar vazio');
      }
      
      // Call generate-text-ai edge function with timeout
      const { data, error } = await withTimeout(
        supabase.functions.invoke('generate-text-ai', {
          body: { 
            prompt,
            provider: node.data.provider || 'lovable',
            model: node.data.openrouterModel,
            userId
          }
        }),
        EXECUTION_TIMEOUT_MS,
        'Geração de texto'
      );
      
      if (error) {
        console.error('Erro ao gerar texto:', error);
        throw new Error(error.message || 'Erro ao gerar texto');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const generatedText = data.generatedText;
      updateNode(node.id, {
        ...node.data,
        prompt,
        generatedText,
        status: 'completed'
      });
    } else if (node.type === 'imageUploadNode') {
      // Image upload nodes don't need execution
      // Upload happens in the node component itself
      if (!node.data.uploadedImageUrl) {
        throw new Error('Nenhuma imagem foi enviada');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      updateNode(node.id, { ...node.data, status: 'completed' });
    } else if (node.type === 'imageEditorNode') {
      const inputImageUrl = inputData.inputImage || inputData.input || node.data.inputImageUrl;
      
      if (!inputImageUrl) {
        throw new Error('Nenhuma imagem conectada ao Editor');
      }

      const editMode = node.data.editMode || 'filters';
      let outputUrl = '';

      if (editMode === 'filters') {
        const filter = node.data.filter || 'none';
        outputUrl = filter === 'none' ? inputImageUrl : await applyFilter(inputImageUrl, filter);
      } else if (editMode === 'adjustments') {
        outputUrl = await applyAdjustments(
          inputImageUrl,
          node.data.brightness ?? 100,
          node.data.contrast ?? 100,
          node.data.saturation ?? 100
        );
      } else if (editMode === 'text') {
        const text = node.data.textOverlay?.trim();
        outputUrl = text
          ? await addTextOverlay(
              inputImageUrl,
              text,
              node.data.textPosition || 'center',
              node.data.textSize ?? 32,
              node.data.textColor || '#ffffff'
            )
          : inputImageUrl;
      } else if (editMode === 'transform') {
        let transformedUrl = inputImageUrl;
        
        if (node.data.cropAspectRatio && node.data.cropAspectRatio !== 'original') {
          transformedUrl = await cropImage(transformedUrl, node.data.cropAspectRatio, node.data.cropWidth, node.data.cropHeight, node.data.cropPosition || 'center');
        }
        if (node.data.rotateAngle && node.data.rotateAngle !== 0) {
          transformedUrl = await rotateImage(transformedUrl, node.data.rotateAngle);
        }
        if (node.data.flipHorizontal || node.data.flipVertical) {
          transformedUrl = await flipImage(transformedUrl, node.data.flipHorizontal || false, node.data.flipVertical || false);
        }
        if (node.data.resizeScale && node.data.resizeScale !== 100) {
          transformedUrl = await resizeImage(transformedUrl, node.data.resizeScale, undefined, undefined, node.data.maintainAspectRatio ?? true);
        }
        outputUrl = transformedUrl;
      } else {
        throw new Error('Modo de edição inválido');
      }

      updateNode(node.id, {
        ...node.data,
        inputImageUrl,
        outputImageUrl: outputUrl,
        status: 'completed'
      });
    } else if (node.type === 'aiImageEditorNode') {
      const inputImageUrl = inputData.inputImage || inputData.input || node.data.inputImageUrl;
      
      if (!inputImageUrl) {
        throw new Error('Nenhuma imagem conectada ao Editor IA');
      }

      const editPrompt = inputData.prompt || node.data.editPrompt;
      if (!editPrompt) {
        throw new Error('Nenhum prompt conectado ao Editor IA. Conecte um nó de texto com a instrução de edição.');
      }

      updateNode(node.id, { ...node.data, inputImageUrl, editPrompt, status: 'running' });

      const provider = node.data.provider || 'gemini';
      const { data: result, error } = await withTimeout(
        supabase.functions.invoke('edit-image-ai', {
          body: { imageUrl: inputImageUrl, prompt: editPrompt, userId, provider }
        }),
        EXECUTION_TIMEOUT_MS,
        'Edição de imagem IA'
      );

      if (error || !result?.success) {
        throw new Error(result?.error || 'Erro ao editar imagem');
      }

      updateNode(node.id, {
        ...node.data,
        inputImageUrl,
        editPrompt,
        outputImageUrl: result.imageUrl,
        status: 'completed'
      });
    } else if (node.type === 'removeBackgroundNode') {
      const inputImageUrl = inputData.inputImage || inputData.input || node.data.inputImageUrl;
      
      if (!inputImageUrl) {
        throw new Error('Nenhuma imagem conectada ao Remover Fundo');
      }

      updateNode(node.id, { 
        ...node.data, 
        inputImageUrl,
        status: 'running' 
      });

      const { data: result, error } = await withTimeout(
        supabase.functions.invoke('remove-background', {
          body: { imageUrl: inputImageUrl, userId }
        }),
        EXECUTION_TIMEOUT_MS,
        'Remoção de fundo'
      );

      if (error || !result?.success) {
        throw new Error(result?.error || 'Erro ao remover fundo');
      }

      updateNode(node.id, {
        ...node.data,
        inputImageUrl,
        outputImageUrl: result.imageUrl,
        status: 'completed'
      });
    } else if (node.type === 'videoGeneratorNode') {
      // Get inputs
      const prompt = inputData.prompt || node.data.prompt;
      const imageUrl = inputData.imageUrl || inputData.image || node.data.imageUrl;
      
      console.log('Executando VideoGeneratorNode:', {
        prompt: prompt ? '✅' : '❌',
        imageUrl: imageUrl ? '✅' : '❌'
      });
      
      if (!prompt) {
        throw new Error('O nó Gerador de Vídeo precisa de um prompt conectado');
      }
      
      // Call generate-video edge function with timeout
      const { data, error } = await withTimeout(
        supabase.functions.invoke('generate-video', {
          body: { 
            prompt,
            imageUrl: imageUrl || undefined,
            aspectRatio: node.data.aspectRatio || '16:9',
            duration: node.data.duration || 8,
            personGeneration: node.data.personGeneration,
            provider: node.data.provider || 'gemini',
            openrouterModel: node.data.openrouterModel,
            userId
          }
        }),
        EXECUTION_TIMEOUT_MS,
        'Geração de vídeo'
      );
      
      if (error) {
        console.error('Erro ao gerar vídeo:', error);
        const { handleQuotaError } = await import('@/lib/api-error-utils');
        if (handleQuotaError(error.message || '')) {
          throw new Error('Limite de créditos atingido.');
        }
        throw new Error(error.message || 'Erro ao gerar vídeo');
      }
      
      if (data.error) {
        const { handleQuotaError } = await import('@/lib/api-error-utils');
        if (handleQuotaError(data.error)) {
          throw new Error('Limite de créditos atingido.');
        }
        throw new Error(data.error);
      }
      
      const videoUrl = data.videoUrl;
      updateNode(node.id, {
        ...node.data,
        prompt,
        imageUrl,
        videoUrl,
        status: 'completed'
      });
    }
  } catch (error) {
    updateNode(node.id, {
      ...node.data,
      status: 'error'
    });
    throw error;
  }
}

export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[],
  updateNode: (nodeId: string, data: any) => void,
  userId?: string,
  signal?: AbortSignal
): Promise<void> {
  const graph = buildGraph(nodes, edges);
  const executionOrder = topologicalSort(graph);
  
  let currentNodes = [...nodes];
  
  currentNodes.forEach(node => {
    updateNode(node.id, { ...node.data, status: 'idle' });
  });
  
  const updateNodeWithTracking = (nodeId: string, data: any) => {
    updateNode(nodeId, data);
    currentNodes = currentNodes.map(n => 
      n.id === nodeId ? { ...n, data } : n
    );
  };
  
  for (const nodeId of executionOrder) {
    if (signal?.aborted) {
      throw new Error('Execução cancelada pelo usuário');
    }
    
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    // Skip locked nodes - keep their current data
    if (node.data?.locked) {
      updateNodeWithTracking(node.id, { ...node.data, status: 'completed' });
      continue;
    }
    
    const inputData = getNodeInputData(nodeId, edges, currentNodes);
    await executeNode(node, inputData, updateNodeWithTracking, userId);
  }
}

export async function executeWorkflowFromNode(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[],
  updateNode: (nodeId: string, data: any) => void,
  userId?: string,
  signal?: AbortSignal
): Promise<void> {
  const graph = buildGraph(nodes, edges);
  const fullOrder = topologicalSort(graph);

  const downstream = new Set<string>();
  const queue = [startNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (downstream.has(id)) continue;
    downstream.add(id);
    (graph[id] || []).forEach(dep => queue.push(dep));
  }

  const executionOrder = fullOrder.filter(id => downstream.has(id));

  let currentNodes = [...nodes];

  executionOrder.forEach(id => {
    const node = currentNodes.find(n => n.id === id);
    if (node) updateNode(node.id, { ...node.data, status: 'idle' });
  });

  const updateNodeWithTracking = (nodeId: string, data: any) => {
    updateNode(nodeId, data);
    currentNodes = currentNodes.map(n => n.id === nodeId ? { ...n, data } : n);
  };

  for (const nodeId of executionOrder) {
    if (signal?.aborted) {
      throw new Error('Execução cancelada pelo usuário');
    }
    
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    // Skip locked nodes - keep their current data
    if (node.data?.locked) {
      updateNodeWithTracking(node.id, { ...node.data, status: 'completed' });
      continue;
    }
    
    const inputData = getNodeInputData(nodeId, edges, currentNodes);
    await executeNode(node, inputData, updateNodeWithTracking, userId);
  }
}

export async function executeWorkflowStepByStep(
  nodes: Node[],
  edges: Edge[],
  updateNode: (nodeId: string, data: any) => void,
  createPausePoint: () => Promise<void>,
  onNodeStart: (index: number, order: string[]) => void,
  userId?: string,
  signal?: AbortSignal
): Promise<void> {
  const graph = buildGraph(nodes, edges);
  const executionOrder = topologicalSort(graph);
  
  let currentNodes = [...nodes];
  
  currentNodes.forEach(node => {
    updateNode(node.id, { ...node.data, status: 'idle' });
  });
  
  const updateNodeWithTracking = (nodeId: string, data: any) => {
    updateNode(nodeId, data);
    currentNodes = currentNodes.map(n => 
      n.id === nodeId ? { ...n, data } : n
    );
  };
  
  for (let i = 0; i < executionOrder.length; i++) {
    if (signal?.aborted) {
      throw new Error('Execução cancelada pelo usuário');
    }
    
    const nodeId = executionOrder[i];
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    // Skip locked nodes - keep their current data
    if (node.data?.locked) {
      onNodeStart(i, executionOrder);
      updateNodeWithTracking(node.id, { ...node.data, status: 'completed' });
      continue;
    }
    
    onNodeStart(i, executionOrder);
    updateNodeWithTracking(node.id, { ...node.data, status: 'running', isCurrentDebugNode: true });
    
    await createPausePoint();
    
    const inputData = getNodeInputData(nodeId, edges, currentNodes);
    
    try {
      await executeNode(node, inputData, updateNodeWithTracking, userId);
      const currentData = currentNodes.find(n => n.id === nodeId)?.data || node.data;
      updateNodeWithTracking(node.id, { ...currentData, isCurrentDebugNode: false });
    } catch (error) {
      const currentData = currentNodes.find(n => n.id === nodeId)?.data || node.data;
      updateNodeWithTracking(node.id, { ...currentData, isCurrentDebugNode: false });
      throw error;
    }
  }
}
