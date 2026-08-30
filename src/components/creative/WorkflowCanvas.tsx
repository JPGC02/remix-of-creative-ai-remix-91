import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './workflow-styles.css';

import { TextInputNode } from './nodes/TextInputNode';
import { ImageGeneratorNode } from './nodes/ImageGeneratorNode';
import { ImageCombinerNode } from './nodes/ImageCombinerNode';
import { AITextGeneratorNode } from './nodes/AITextGeneratorNode';
import { ImageUploadNode } from './nodes/ImageUploadNode';
import { ImageEditorNode } from './nodes/ImageEditorNode';
import { AIImageEditorNode } from './nodes/AIImageEditorNode';
import { RemoveBackgroundNode } from './nodes/RemoveBackgroundNode';
import { ImageVariationNode } from './nodes/ImageVariationNode';
import { HandleHoverProvider } from './nodes/CustomHandle';
import VideoGeneratorNode from './nodes/VideoGeneratorNode';
import { NodesSidebarVertical, nodeTypes as availableNodeTypes } from './NodesSidebarVertical';
import { WorkflowToolbar } from './WorkflowToolbar';
import { ContextNodeMenu } from './ContextNodeMenu';
import { NodeContextMenu } from './NodeContextMenu';
import { NodeInspectorPanel } from './NodeInspectorPanel';
import { AIWorkflowGenerator } from './AIWorkflowGenerator';
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution';
import { useWorkflowPersistence, SavedWorkflow } from '@/hooks/useWorkflowPersistence';
import { useWorkflowDebug } from '@/hooks/useWorkflowDebug';
import { useWorkflowHistory } from '@/hooks/useWorkflowHistory';
import { SaveWorkflowDialog } from './SaveWorkflowDialog';
import { LoadWorkflowDialog } from './LoadWorkflowDialog';
import { toast } from 'sonner';
import { getDefaultTargetHandle, isConnectionValid } from './node-compatibility';
import { autoLayoutWorkflow } from '@/lib/workflow-layout';
import { createNodeData } from '@/lib/create-node-data';
import { executeWorkflowFromNode } from '@/lib/workflow-engine';
import { Map } from 'lucide-react';
import { WorkflowTemplates } from './WorkflowTemplates';

const nodeTypes = {
  textInputNode: TextInputNode,
  imageGeneratorNode: ImageGeneratorNode,
  imageCombinerNode: ImageCombinerNode,
  aiTextGeneratorNode: AITextGeneratorNode,
  imageUploadNode: ImageUploadNode,
  imageEditorNode: ImageEditorNode,
  aiImageEditorNode: AIImageEditorNode,
  removeBackgroundNode: RemoveBackgroundNode,
  imageVariationNode: ImageVariationNode,
  videoGeneratorNode: VideoGeneratorNode,
};

function getNodeDefaultDimensions(type: string): { width: number; height: number } {
  const dimensions: Record<string, { width: number; height: number }> = {
    textInputNode: { width: 280, height: 200 },
    aiTextGeneratorNode: { width: 320, height: 280 },
    imageGeneratorNode: { width: 260, height: 220 },
    imageUploadNode: { width: 240, height: 200 },
    imageVariationNode: { width: 260, height: 220 },
    imageCombinerNode: { width: 260, height: 220 },
    imageEditorNode: { width: 320, height: 320 },
    aiImageEditorNode: { width: 260, height: 220 },
    removeBackgroundNode: { width: 260, height: 220 },
    videoGeneratorNode: { width: 260, height: 220 },
  };
  return dimensions[type] || { width: 260, height: 220 };
}

/** Normalize nodes to always have explicit style.width/height, preventing React Flow auto-measure jumps */
function normalizeWorkflowNodes(nodes: Node[]): Node[] {
  return nodes.map(node => {
    const existingWidth = node.style?.width ?? (node as any).width;
    const existingHeight = node.style?.height ?? (node as any).height;
    const defaults = getNodeDefaultDimensions(node.type || '');

    // Strip transient React Flow fields that trigger remeasure
    const { width: _w, height: _h, measured: _m, ...cleanNode } = node as any;

    return {
      ...cleanNode,
      style: {
        ...(cleanNode.style || {}),
        width: existingWidth || defaults.width,
        height: existingHeight || defaults.height,
      },
    } as Node;
  });
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];



interface WorkflowCanvasInnerProps {
  loadWorkflowData?: { nodes: Node[], edges: Edge[], workflowId?: string, workflowName?: string } | null;
  clearCache?: boolean;
}

function WorkflowCanvasInner({ loadWorkflowData, clearCache }: WorkflowCanvasInnerProps = {}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const justOpenedMenu = useRef(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    sourceNodeId: string;
    sourceNodeType: string;
    sourceHandleId: string | null;
  } | null>(null);
  const { execute, isExecuting, cancelExecution } = useWorkflowExecution();
  const debugControls = useWorkflowDebug();
  const history = useWorkflowHistory();
  const {
    saveWorkflow,
    updateWorkflow,
    loadWorkflows,
    deleteWorkflow,
    workflows,
    isSaving,
    isLoading,
  } = useWorkflowPersistence();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingHandleType, setConnectingHandleType] = useState<'text' | 'image' | 'video' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(() => {
    const saved = localStorage.getItem('creative-minimap-visible');
    return saved !== null ? saved === 'true' : true;
  });
  const initialLoadDoneRef = useRef(false);
  
  // Node context menu state
  const [nodeContextMenu, setNodeContextMenu] = useState<{ open: boolean; position: { x: number; y: number }; nodeId: string | null }>({
    open: false, position: { x: 0, y: 0 }, nodeId: null,
  });

  // Track current workflow ID
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [currentWorkflowName, setCurrentWorkflowName] = useState<string | null>(null);


  // Carregar workflow quando vier de outra aba
  useEffect(() => {
    if (clearCache) {
      setNodes([]);
      setEdges([]);
      setCurrentWorkflowId(null);
      setCurrentWorkflowName(null);
      initialLoadDoneRef.current = true;
      return;
    }

    if (loadWorkflowData) {
      console.log('[WorkflowCanvas] Carregando workflow explícito:', {
        workflowId: loadWorkflowData.workflowId,
        nodesCount: loadWorkflowData.nodes.length,
        edgesCount: loadWorkflowData.edges.length,
      });
      
      setNodes(normalizeWorkflowNodes(loadWorkflowData.nodes));
      setEdges(loadWorkflowData.edges);
      setCurrentWorkflowId(loadWorkflowData.workflowId || null);
      setCurrentWorkflowName(loadWorkflowData.workflowName || null);
      initialLoadDoneRef.current = true;
      toast.success('Fluxo carregado no editor!');
      
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
        }
      }, 100);
    } else if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
    }
  }, [loadWorkflowData, clearCache, setNodes, setEdges, reactFlowInstance]);

  const onConnectStart = useCallback(
    (event: any, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      setIsConnecting(true);
      
      if (params.nodeId) {
        const sourceNode = nodes.find(n => n.id === params.nodeId);
        if (sourceNode) {
          const typeMap: Record<string, 'text' | 'image' | 'video'> = {
            'textInputNode': 'text',
            'aiTextGeneratorNode': 'text',
            'imageGeneratorNode': 'image',
            'imageUploadNode': 'image',
            'imageEditorNode': 'image',
            'aiImageEditorNode': 'image',
            'imageVariationNode': 'image',
            'imageCombinerNode': 'image',
            'videoGeneratorNode': 'video',
          };
          setConnectingHandleType(typeMap[sourceNode.type || ''] || null);
        }
      }
    },
    [nodes]
  );

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
    setConnectingHandleType(null);
  }, []);

  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return false;
    // Não permitir auto-conexão
    if (connection.source === connection.target) return false;
    
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    if (!sourceNode?.type || !targetNode?.type) return false;

    return isConnectionValid(
      sourceNode.type,
      connection.sourceHandle,
      targetNode.type,
      connection.targetHandle
    );
  }, [nodes]);

  const onNodeDragStart = useCallback(() => {
    setIsDragging(true);
    // Save state BEFORE the drag so undo restores pre-drag position
    history.pushState(nodesRef.current, edgesRef.current);
  }, [history]);

  const onNodeDragStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      history.pushState(nodes, edges);
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.sourceHandle || 'default'}-${params.target}-${params.targetHandle || 'default'}`,
        className: 'edge-animating',
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      
      setTimeout(() => {
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === newEdge.id
              ? { ...edge, className: '' }
              : edge
          )
        );
      }, 500);
    },
    [setEdges, nodes, edges, history]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      history.pushState(nodes, edges);

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const data = createNodeData(type);

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data,
        style: getNodeDefaultDimensions(type),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, nodes, edges, history]
  );

  const handleExecute = useCallback(() => {
    // Diagnostic logs
    console.log('[handleExecute] Nodes snapshot:', nodes.map(n => ({
      id: n.id,
      type: n.type,
      text: n.data?.text,
      prompt: n.data?.prompt,
    })));
    console.log('[handleExecute] Edges snapshot:', edges.map(e => ({
      source: e.source,
      target: e.target,
    })));

    const updateNode = (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data };
          }
          return node;
        })
      );
    };

    execute(
      nodes, 
      edges, 
      updateNode,
      debugControls.executionMode,
      debugControls.executionMode === 'step-by-step' ? {
        setExecutionState: debugControls.setExecutionState,
        setCurrentNodeIndex: debugControls.setCurrentNodeIndex,
        setExecutionOrder: debugControls.setExecutionOrder,
        createPausePoint: debugControls.createPausePoint,
      } : undefined
    );
  }, [nodes, edges, execute, setNodes, debugControls]);

  const handleClear = useCallback(() => {
    history.pushState(nodes, edges);
    setNodes([]);
    setEdges([]);
    setCurrentWorkflowId(null);
    setCurrentWorkflowName(null);
    toast.success('Canvas limpo!');
  }, [setNodes, setEdges, nodes, edges, history]);

  const handleAIGenerate = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    history.pushState(nodes, edges);
    setNodes(normalizeWorkflowNodes(newNodes));
    setEdges(newEdges);
    debugControls.reset();
    toast.success('Workflow gerado com sucesso!');
  }, [setNodes, setEdges, debugControls, nodes, edges, history]);

  const downloadWorkflowCode = useCallback(() => {
    const workflowData = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle
      }))
    };

    const json = JSON.stringify(workflowData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Código do fluxo baixado!');
  }, [nodes, edges]);

  const addNodeAtPosition = useCallback((type: string, position: { x: number, y: number }) => {
    const data = createNodeData(type);

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data,
      style: getNodeDefaultDimensions(type),
    };

    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const showEmptyState = nodes.length === 0;

  const createNodeAtCenter = useCallback((nodeType: string, label: string) => {
    if (!reactFlowInstance || !reactFlowWrapper.current) return;
    
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: bounds.width / 2,
      y: bounds.height / 2,
    });
    
    addNodeAtPosition(nodeType, position);
    toast.success(`${label} adicionado!`);
  }, [reactFlowInstance, addNodeAtPosition]);

  // flowerMenuItems removed — sidebar now handles all node creation

  const downloadAssets = useCallback(() => {
    const assets: { url: string, name: string, type: string }[] = [];
    
    nodes.forEach(node => {
      if (node.data.imageUrl) {
        assets.push({
          url: node.data.imageUrl,
          name: `${node.data.label || node.type}_${node.id}.png`,
          type: 'image'
        });
      }
      if (node.data.result) {
        assets.push({
          url: node.data.result,
          name: `${node.data.label || node.type}_${node.id}_result.png`,
          type: 'image'
        });
      }
      if (node.data.videoUrl) {
        assets.push({
          url: node.data.videoUrl,
          name: `${node.data.label || node.type}_${node.id}.mp4`,
          type: 'video'
        });
      }
    });

    if (assets.length === 0) {
      toast.error('Nenhum arquivo gerado para baixar');
      return;
    }

    if (assets.length === 1) {
      const link = document.createElement('a');
      link.href = assets[0].url;
      link.download = assets[0].name;
      link.click();
      toast.success('Arquivo baixado!');
    } else {
      assets.forEach((asset, index) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = asset.url;
          link.download = asset.name;
          link.click();
        }, index * 200);
      });
      toast.success(`${assets.length} arquivos baixados!`);
    }
  }, [nodes]);

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) {
      toast.info('Adicione nodes para organizar');
      return;
    }
    
    const layoutedNodes = autoLayoutWorkflow(nodes, edges);
    setNodes(layoutedNodes);
    
    // Fit view após layout com pequeno delay
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ 
          padding: 0.2, 
          duration: 800 
        });
      }, 100);
    }
    
    toast.success('Fluxo organizado!');
  }, [nodes, edges, setNodes, reactFlowInstance]);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    history.pushState(nodes, edges);
    toast.info(`${deleted.length} node(s) deletado(s)`);
  }, [nodes, edges, history]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    history.pushState(nodes, edges);
    toast.info(`${deleted.length} conexão(ões) deletada(s)`);
  }, [nodes, edges, history]);

  const handleToggleExecutionMode = useCallback(() => {
    debugControls.setExecutionMode(
      debugControls.executionMode === 'normal' ? 'step-by-step' : 'normal'
    );
    toast.info(
      debugControls.executionMode === 'normal' 
        ? 'Modo Debug ativado - Execução passo-a-passo' 
        : 'Modo Normal ativado'
    );
  }, [debugControls]);

  const handleSave = useCallback(async (name: string, description: string | undefined) => {
    const result = await saveWorkflow(name, description, nodes, edges);
    if (result) {
      setCurrentWorkflowId(result.id);
      setCurrentWorkflowName(result.name);
    }
  }, [saveWorkflow, nodes, edges]);

  const handleQuickSaveOrOpenDialog = useCallback(async () => {
    if (currentWorkflowId && currentWorkflowName) {
      // Auto-save to existing workflow
      await updateWorkflow(currentWorkflowId, currentWorkflowName, undefined, nodes, edges);
    } else {
      setSaveDialogOpen(true);
    }
  }, [currentWorkflowId, currentWorkflowName, updateWorkflow, nodes, edges]);

  const handleLoad = useCallback((workflow: SavedWorkflow) => {
    history.pushState(nodes, edges);
    setNodes(normalizeWorkflowNodes(workflow.nodes as Node[]));
    setEdges(workflow.edges as Edge[]);
    setCurrentWorkflowId(workflow.id);
    setCurrentWorkflowName(workflow.name);
    toast.success('Workflow carregado!', {
      description: `"${workflow.name}" foi carregado no canvas.`
    });
  }, [setNodes, setEdges, nodes, edges, history]);

  // Undo/Redo handlers - use refs to always get fresh state
  const handleUndo = useCallback(() => {
    const state = history.undo(nodesRef.current, edgesRef.current);
    if (state) {
      setNodes(normalizeWorkflowNodes(state.nodes));
      setEdges(state.edges);
    }
  }, [history, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const state = history.redo(nodesRef.current, edgesRef.current);
    if (state) {
      setNodes(normalizeWorkflowNodes(state.nodes));
      setEdges(state.edges);
    }
  }, [history, setNodes, setEdges]);

  // Node context menu handlers
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setNodeContextMenu({
      open: true,
      position: { x: event.clientX, y: event.clientY },
      nodeId: node.id,
    });
  }, []);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    history.pushState(nodes, edges);
    const defaults = getNodeDefaultDimensions(node.type || '');
    const newNode: Node = {
      id: `${node.type}-${Date.now()}`,
      type: node.type,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: { ...JSON.parse(JSON.stringify(node.data)), status: 'idle' },
      style: {
        width: node.style?.width || defaults.width,
        height: node.style?.height || defaults.height,
      },
    };
    setNodes(nds => nds.concat(newNode));
    toast.success('Nó duplicado!');
  }, [nodes, edges, setNodes, history]);

  const handleExecuteFrom = useCallback(async (nodeId: string) => {
    const updateNode = (nId: string, data: any) => {
      setNodes((nds) => nds.map((n) => n.id === nId ? { ...n, data } : n));
    };
    try {
      await executeWorkflowFromNode(nodeId, nodes, edges, updateNode);
      toast.success('Execução parcial concluída!');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro: ${msg}`);
    }
  }, [nodes, edges, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    history.pushState(nodes, edges);
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    toast.info('Nó deletado');
  }, [nodes, edges, setNodes, setEdges, history]);

  const handleCreateNodeFromMenu = useCallback(
    (nodeType: string) => {
      if (!pendingConnection || !reactFlowInstance || !reactFlowWrapper.current) return;
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: contextMenuPosition.x,
        y: contextMenuPosition.y,
      });
      
      const data = createNodeData(nodeType);
      
      const newNodeId = `${nodeType}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: nodeType,
        position,
        data,
        style: getNodeDefaultDimensions(nodeType),
      };
      
      setNodes((nds) => nds.concat(newNode));
      
      const targetHandle = getDefaultTargetHandle(nodeType);
      
      const newEdge: Edge = {
        id: `edge-${pendingConnection.sourceNodeId}-${newNodeId}-${Date.now()}`,
        source: pendingConnection.sourceNodeId,
        sourceHandle: pendingConnection.sourceHandleId,
        target: newNodeId,
        targetHandle: targetHandle,
      };
      
      setEdges((eds) => eds.concat(newEdge));
      
      toast.success('Nó adicionado e conectado!', {
        description: `${data.label} criado com sucesso`
      });
      
      setPendingConnection(null);
      setContextMenuOpen(false);
    },
    [pendingConnection, contextMenuPosition, reactFlowInstance, setNodes, setEdges]
  );

  const handlePaneClick = useCallback(() => {
    if (contextMenuOpen && !justOpenedMenu.current) {
      setContextMenuOpen(false);
      setPendingConnection(null);
    }
    if (nodeContextMenu.open) {
      setNodeContextMenu(prev => ({ ...prev, open: false }));
    }
    setSelectedNodeId(null);
  }, [contextMenuOpen, nodeContextMenu.open]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenuOpen) {
        setContextMenuOpen(false);
        setPendingConnection(null);
      }
      if (e.key === 'Escape' && nodeContextMenu.open) {
        setNodeContextMenu(prev => ({ ...prev, open: false }));
      }
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenuOpen, nodeContextMenu.open, handleUndo, handleRedo]);

  // Atualizar nodes com atributo de debug (memoizado com early return)
  const nodesWithDebug = useMemo(() => {
    // Se não há node em debug, retornar nodes original sem clonar
    const hasDebugNode = nodes.some(n => n.data.isCurrentDebugNode);
    if (!hasDebugNode) return nodes;
    
    // Só clonar se houver debug ativo
    return nodes.map(node => {
      if (!node.data.isCurrentDebugNode) return node;
      
      return {
        ...node,
        data: { ...node.data },
        style: { ...node.style },
        className: `${node.className || ''} react-flow__node-debug-current`.trim(),
      };
    });
  }, [nodes]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full flex">
      <div className="flex-1 relative">
      <ReactFlow
        nodes={nodesWithDebug}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onPaneClick={handlePaneClick}
        onNodeClick={handleNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Ctrl']}
        isValidConnection={isValidConnection}
        nodesDraggable={true}
        nodesConnectable={true}
        selectNodesOnDrag={false}
        autoPanOnNodeDrag={true}
        panOnDrag={[1, 2]}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        minZoom={0.2}
        maxZoom={4}
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        snapToGrid={false}
        snapGrid={[1, 1]}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#52525b', strokeWidth: 1.5 },
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        className="bg-[#09090b]"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="rgba(63, 63, 70, 0.3)"
        />
        <Controls position="bottom-left" style={{ left: 64, bottom: 16 }} className="hidden" />
        {showMiniMap && (
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'textInputNode': return '#3b82f6';
                case 'imageGeneratorNode': return '#8b5cf6';
                case 'imageCombinerNode': return '#f59e0b';
                case 'aiTextGeneratorNode': return '#10b981';
                case 'imageUploadNode': return '#a1a1aa';
                case 'imageEditorNode': return '#06b6d4';
                case 'imageVariationNode': return '#ec4899';
                case 'videoGeneratorNode': return '#f43f5e';
                default: return '#3f3f46';
              }
            }}
          />
        )}
        
        {showEmptyState && (
          <WorkflowTemplates
            onSelectTemplate={(newNodes, newEdges) => {
              history.pushState(nodes, edges);
              setNodes(normalizeWorkflowNodes(newNodes));
              setEdges(newEdges);
              toast.success('Template aplicado!');
            }}
            onLoadWorkflow={() => setLoadDialogOpen(true)}
          />
        )}
      </ReactFlow>
      
      <WorkflowToolbar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        isExecuting={isExecuting}
        onExecute={handleExecute}
        onCancel={cancelExecution}
        onClear={handleClear}
        onSave={handleQuickSaveOrOpenDialog}
        isSaving={isSaving}
        onLoad={() => setLoadDialogOpen(true)}
        onDownloadCode={downloadWorkflowCode}
        onDownloadAssets={downloadAssets}
        onAutoLayout={handleAutoLayout}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        executionMode={debugControls.executionMode}
        onToggleExecutionMode={handleToggleExecutionMode}
        executionState={debugControls.executionState}
        onPause={debugControls.pause}
        onResume={debugControls.resume}
        onStepNext={debugControls.stepNext}
        onResetDebug={debugControls.reset}
        currentNodeIndex={debugControls.currentNodeIndex}
        totalNodes={debugControls.executionOrder.length}
        onZoomIn={() => reactFlowInstance.zoomIn()}
        onZoomOut={() => reactFlowInstance.zoomOut()}
        onFitView={() => reactFlowInstance.fitView()}
      />
      
      {/* MiniMap toggle */}
      <button
        onClick={() => {
          setShowMiniMap(prev => {
            const next = !prev;
            localStorage.setItem('creative-minimap-visible', String(next));
            return next;
          });
        }}
        aria-label={showMiniMap ? 'Ocultar minimapa' : 'Mostrar minimapa'}
        className="absolute bottom-4 right-4 z-10 h-8 w-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        style={{ background: 'rgba(24, 24, 27, 0.8)', border: '1px solid #27272a' }}
      >
        <Map className="w-3.5 h-3.5" />
      </button>
      
      <NodesSidebarVertical
        onGenerateAI={() => setAiGeneratorOpen(true)}
        onAddNode={(nodeType, label) => createNodeAtCenter(nodeType, label)}
      />
      
      <AIWorkflowGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
        onGenerate={handleAIGenerate}
      />
      
      <SaveWorkflowDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSave}
        isSaving={isSaving}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />

      <LoadWorkflowDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
        workflows={workflows}
        isLoading={isLoading}
        onLoad={handleLoad}
        onDelete={deleteWorkflow}
        onRefresh={loadWorkflows}
      />

      <ContextNodeMenu
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        sourceNodeType={pendingConnection?.sourceNodeType || null}
        allNodeTypes={availableNodeTypes}
        onClose={() => {
          setContextMenuOpen(false);
          setPendingConnection(null);
        }}
        onSelectNode={handleCreateNodeFromMenu}
      />

      <NodeContextMenu
        isOpen={nodeContextMenu.open}
        position={nodeContextMenu.position}
        nodeId={nodeContextMenu.nodeId}
        onClose={() => setNodeContextMenu(prev => ({ ...prev, open: false }))}
        onDuplicate={handleDuplicateNode}
        onExecuteFrom={handleExecuteFrom}
        onDelete={handleDeleteNode}
        onToggleLock={(nodeId) => {
          setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, locked: !n.data.locked } } : n));
        }}
        isLocked={nodes.find(n => n.id === nodeContextMenu.nodeId)?.data?.locked || false}
      />
      </div>
      {selectedNode && (
        <NodeInspectorPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
      )}
    </div>
  );
}

export function WorkflowCanvas({ loadWorkflowData, clearCache }: WorkflowCanvasInnerProps = {}) {
  return (
    <ReactFlowProvider>
      <HandleHoverProvider>
        <WorkflowCanvasInner loadWorkflowData={loadWorkflowData} clearCache={clearCache} />
      </HandleHoverProvider>
    </ReactFlowProvider>
  );
}
