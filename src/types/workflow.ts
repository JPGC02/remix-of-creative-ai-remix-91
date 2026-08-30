export type NodeStatus = 'idle' | 'running' | 'completed' | 'error';
export type ImageProvider = 'gemini' | 'openai' | 'openrouter';

export interface CustomModel {
  id: string;
  model_id: string;
  display_name: string;
  model_type: 'text' | 'image' | 'video';
  provider: string;
  is_active: boolean;
}

export interface OpenAIControls {
  quality?: 'high' | 'medium' | 'low' | 'auto';
  inputFidelity?: 'high' | 'low';
  background?: 'transparent' | 'opaque' | 'auto';
  outputFormat?: 'png' | 'jpeg' | 'webp';
  mask?: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  n?: number;
  outputCompression?: number;
  moderation?: 'auto' | 'low';
}

export interface BaseNodeData {
  label: string;
  status: NodeStatus;
  locked?: boolean;
  isConnecting?: boolean;
  connectingHandleType?: 'text' | 'image' | 'video' | null;
}

export interface TextInputNodeData extends BaseNodeData {
  text: string;
}

export interface ImageGeneratorNodeData extends BaseNodeData {
  prompt?: string;
  imageUrl?: string;
  provider?: ImageProvider;
  openaiControls?: OpenAIControls;
  openrouterModel?: string;
}

export interface ImageCombinerNodeData extends BaseNodeData {
  imageA?: string;
  imageB?: string;
  instruction?: string;
  resultUrl?: string;
  provider?: ImageProvider;
  openaiControls?: OpenAIControls;
  openrouterModel?: string;
}

export interface AITextGeneratorNodeData extends BaseNodeData {
  prompt?: string;
  generatedText?: string;
  provider?: 'lovable' | 'openrouter';
  openrouterModel?: string;
}

export interface ImageUploadNodeData extends BaseNodeData {
  uploadedImageUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface AIImageEditorNodeData extends BaseNodeData {
  inputImageUrl?: string;
  outputImageUrl?: string;
  editPrompt?: string;
  provider?: ImageProvider;
  openaiControls?: OpenAIControls;
  openrouterModel?: string;
}

export interface ImageEditorNodeData extends BaseNodeData {
  inputImageUrl?: string;
  outputImageUrl?: string;

  // Modo de edição (sem IA)
  editMode?: 'filters' | 'adjustments' | 'text' | 'transform';

  // Filtros
  filter?: 'none' | 'grayscale' | 'sepia' | 'invert' | 'blur';

  // Ajustes
  brightness?: number;
  contrast?: number;
  saturation?: number;

  // Texto
  textOverlay?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  textSize?: number;
  textColor?: string;

  // Transformações
  cropAspectRatio?: '1:1' | '16:9' | '4:3' | '9:16' | 'original' | 'custom';
  cropWidth?: number;
  cropHeight?: number;
  cropPosition?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  rotateAngle?: 0 | 90 | 180 | 270;
  rotatedPreviewUrl?: string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  resizeScale?: number;
  resizeWidth?: number;
  resizeHeight?: number;
  maintainAspectRatio?: boolean;
}

export interface RemoveBackgroundNodeData extends BaseNodeData {
  inputImageUrl?: string;
  outputImageUrl?: string;
}

export interface ImageVariationNodeData extends BaseNodeData {
  inputImage?: string;
  prompt?: string;
  resultUrl?: string;
  provider?: ImageProvider;
  openaiControls?: OpenAIControls;
  openrouterModel?: string;
}

export interface VideoGeneratorNodeData extends BaseNodeData {
  prompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  model?: 'veo-3.1-2025-04-16';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number; // 4-8 segundos
  personGeneration?: 'allow_adults';
  provider?: 'gemini' | 'openrouter';
  openrouterModel?: string;
}

export type WorkflowNodeData = 
  | TextInputNodeData 
  | ImageGeneratorNodeData 
  | ImageCombinerNodeData
  | AITextGeneratorNodeData
  | ImageUploadNodeData
  | AIImageEditorNodeData
  | ImageEditorNodeData
  | RemoveBackgroundNodeData
  | ImageVariationNodeData
  | VideoGeneratorNodeData;

export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}
