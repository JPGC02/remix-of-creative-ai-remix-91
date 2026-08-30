import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { PreviewNode } from './nodes/PreviewNode';

const nodeTypes = {
  textInput: PreviewNode,
  textInputNode: PreviewNode,
  imageGenerator: PreviewNode,
  imageGeneratorNode: PreviewNode,
  imageEditor: PreviewNode,
  imageEditorNode: PreviewNode,
  imageCombiner: PreviewNode,
  imageCombinerNode: PreviewNode,
  videoGenerator: PreviewNode,
  videoGeneratorNode: PreviewNode,
  aiTextGenerator: PreviewNode,
  aiTextGeneratorNode: PreviewNode,
  imageUpload: PreviewNode,
  imageUploadNode: PreviewNode,
  imageVariation: PreviewNode,
  imageVariationNode: PreviewNode,
};

interface WorkflowPreviewProps {
  nodes: Node[];
  edges: Edge[];
}

export function WorkflowPreview({ nodes, edges }: WorkflowPreviewProps) {
  return (
    <div className="h-[calc(100vh-20rem)] border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={true}
        panOnDrag={true}
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background color="#27272a" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
