/**
 * Centraliza a criação de dados iniciais para cada tipo de node.
 * Elimina duplicação em onDrop, addNodeAtPosition e handleCreateNodeFromMenu.
 */
export function createNodeData(type: string): Record<string, any> {
  const imageEditorDefaults = {
    label: '✏️ Editar',
    status: 'idle',
    editMode: 'filters',
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    textSize: 32,
    textColor: '#ffffff',
    cropAspectRatio: 'original',
    cropPosition: 'center',
    rotateAngle: 0,
    flipHorizontal: false,
    flipVertical: false,
    resizeScale: 100,
    maintainAspectRatio: true,
  };

  const aiImageEditorDefaults = {
    label: '🪄 Editar IA',
    status: 'idle',
    provider: 'gemini',
    openaiControls: {
      quality: 'auto',
      background: 'auto',
      outputFormat: 'png',
    },
  };

  const removeBackgroundDefaults = {
    label: '🧹 Rem. Fundo',
    status: 'idle',
  };

  const imageGeneratorDefaults = {
    label: '🖼️ Gerador',
    status: 'idle',
    provider: 'gemini',
    openaiControls: {
      quality: 'auto',
      background: 'auto',
      outputFormat: 'png',
    },
  };

  const imageCombinerDefaults = {
    label: '🔀 Combinar',
    status: 'idle',
    provider: 'gemini',
    openaiControls: {
      quality: 'high',
      inputFidelity: 'high',
      background: 'auto',
      outputFormat: 'png',
    },
  };

  const imageVariationDefaults = {
    label: '✨ Variações',
    status: 'idle',
    provider: 'gemini',
    openaiControls: {
      quality: 'high',
      inputFidelity: 'low',
      background: 'auto',
      outputFormat: 'png',
    },
  };

  const defaults: Record<string, Record<string, any>> = {
    textInputNode: { label: '📝 Texto', status: 'idle', text: '' },
    aiTextGeneratorNode: { label: '🤖 IA Texto', status: 'idle', text: '', provider: 'lovable', openrouterModel: '' },
    imageUploadNode: { label: '📤 Upload', status: 'idle' },
    imageEditorNode: imageEditorDefaults,
    aiImageEditorNode: aiImageEditorDefaults,
    removeBackgroundNode: removeBackgroundDefaults,
    imageGeneratorNode: imageGeneratorDefaults,
    imageCombinerNode: imageCombinerDefaults,
    imageVariationNode: imageVariationDefaults,
    videoGeneratorNode: { label: '🎬 Vídeo', status: 'idle', provider: 'gemini', openrouterModel: '' },
  };

  return defaults[type] || { label: type, status: 'idle' };
}
