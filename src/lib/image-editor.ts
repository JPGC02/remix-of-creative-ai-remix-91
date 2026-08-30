import { pipeline, env } from '@huggingface/transformers';

// Configurar transformers.js
env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

/**
 * Redimensiona imagem se necessário
 */
function resizeImageIfNeeded(
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D, 
  image: HTMLImageElement
): boolean {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

/**
 * Carrega imagem de URL ou base64
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Aplica filtros CSS à imagem
 */
export const applyFilter = async (
  imageUrl: string,
  filter: string
): Promise<string> => {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');
  
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  // Aplicar filtro CSS
  const filters: Record<string, string> = {
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    invert: 'invert(100%)',
    blur: 'blur(5px)',
    none: 'none'
  };
  
  ctx.filter = filters[filter] || 'none';
  ctx.drawImage(img, 0, 0);
  
  return canvas.toDataURL('image/png');
};

/**
 * Aplica ajustes de brilho, contraste e saturação
 */
export const applyAdjustments = async (
  imageUrl: string,
  brightness: number = 100,  // 0-200
  contrast: number = 100,    // 0-200
  saturation: number = 100   // 0-200
): Promise<string> => {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');
  
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  // Aplicar filtros combinados
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  ctx.drawImage(img, 0, 0);
  
  return canvas.toDataURL('image/png');
};

/**
 * Adiciona texto sobre a imagem
 */
export const addTextOverlay = async (
  imageUrl: string,
  text: string,
  position: 'top' | 'center' | 'bottom' = 'center',
  fontSize: number = 32,
  color: string = '#ffffff'
): Promise<string> => {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');
  
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  // Desenhar imagem
  ctx.drawImage(img, 0, 0);
  
  // Configurar texto
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Adicionar sombra para legibilidade
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Calcular posição Y
  let y: number;
  if (position === 'top') {
    y = fontSize + 20;
  } else if (position === 'bottom') {
    y = canvas.height - fontSize - 20;
  } else {
    y = canvas.height / 2;
  }
  
  // Desenhar texto
  ctx.fillText(text, canvas.width / 2, y);
  
  return canvas.toDataURL('image/png');
};

/**
 * Remove fundo da imagem usando IA
 */
export const removeBackground = async (imageUrl: string): Promise<string> => {
  console.log('Iniciando remoção de fundo...');
  
  const img = await loadImage(imageUrl);
  const segmenter = await pipeline(
    'image-segmentation', 
    'Xenova/segformer-b0-finetuned-ade-512-512',
    { device: 'webgpu' }
  );
  
  // Criar canvas e redimensionar se necessário
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');
  
  const wasResized = resizeImageIfNeeded(canvas, ctx, img);
  console.log(`Imagem ${wasResized ? 'redimensionada' : 'mantida'}. Dimensões: ${canvas.width}x${canvas.height}`);
  
  // Converter para base64
  const imageData = canvas.toDataURL('image/jpeg', 0.8);
  
  // Processar com modelo de segmentação
  console.log('Processando com modelo de IA...');
  const result = await segmenter(imageData);
  
  if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
    throw new Error('Erro na segmentação da imagem');
  }
  
  // Criar canvas de saída
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;
  const outputCtx = outputCanvas.getContext('2d');
  
  if (!outputCtx) throw new Error('Canvas context not available');
  
  // Desenhar imagem original
  outputCtx.drawImage(canvas, 0, 0);
  
  // Aplicar máscara ao canal alpha
  const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const data = outputImageData.data;
  
  // Inverter máscara para manter o sujeito
  for (let i = 0; i < result[0].mask.data.length; i++) {
    const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
    data[i * 4 + 3] = alpha;
  }
  
  outputCtx.putImageData(outputImageData, 0, 0);
  console.log('Fundo removido com sucesso!');
  
  return outputCanvas.toDataURL('image/png');
};

/**
 * Recorta a imagem
 */
export const cropImage = async (
  imageUrl: string,
  aspectRatio: string,
  customWidth?: number,
  customHeight?: number,
  position: string = 'center'
): Promise<string> => {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');
  
  let targetWidth = img.naturalWidth;
  let targetHeight = img.naturalHeight;
  
  // Calcular dimensões baseado no aspect ratio
  if (aspectRatio === '1:1') {
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    targetWidth = targetHeight = size;
  } else if (aspectRatio === '16:9') {
    targetWidth = img.naturalWidth;
    targetHeight = Math.round(targetWidth * 9 / 16);
  } else if (aspectRatio === '4:3') {
    targetWidth = img.naturalWidth;
    targetHeight = Math.round(targetWidth * 3 / 4);
  } else if (aspectRatio === '9:16') {
    targetHeight = img.naturalHeight;
    targetWidth = Math.round(targetHeight * 9 / 16);
  } else if (aspectRatio === 'custom' && customWidth && customHeight) {
    targetWidth = customWidth;
    targetHeight = customHeight;
  }
  
  // Calcular posição de origem
  let sx = 0, sy = 0;
  if (position === 'center') {
    sx = (img.naturalWidth - targetWidth) / 2;
    sy = (img.naturalHeight - targetHeight) / 2;
  } else if (position === 'top-left') {
    sx = sy = 0;
  } else if (position === 'top-right') {
    sx = img.naturalWidth - targetWidth;
    sy = 0;
  } else if (position === 'bottom-left') {
    sx = 0;
    sy = img.naturalHeight - targetHeight;
  } else if (position === 'bottom-right') {
    sx = img.naturalWidth - targetWidth;
    sy = img.naturalHeight - targetHeight;
  }
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  ctx.drawImage(
    img,
    sx, sy, targetWidth, targetHeight,
    0, 0, targetWidth, targetHeight
  );
  
  return canvas.toDataURL('image/png');
};

/**
 * Rotaciona a imagem
 */
export const rotateImage = async (
  imageUrl: string,
  angle: number
): Promise<string> => {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');
  
  const radians = (angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  
  canvas.width = img.naturalWidth * cos + img.naturalHeight * sin;
  canvas.height = img.naturalWidth * sin + img.naturalHeight * cos;
  
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  
  return canvas.toDataURL('image/png');
};

/**
 * Espelha a imagem
 */
export const flipImage = async (
  imageUrl: string,
  horizontal: boolean,
  vertical: boolean
): Promise<string> => {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');
  
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  ctx.save();
  
  if (horizontal) {
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
  }
  
  if (vertical) {
    ctx.scale(1, -1);
    ctx.translate(0, -canvas.height);
  }
  
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  
  return canvas.toDataURL('image/png');
};

/**
 * Redimensiona a imagem
 */
export const resizeImage = async (
  imageUrl: string,
  scale?: number,
  customWidth?: number,
  customHeight?: number,
  maintainAspectRatio: boolean = true
): Promise<string> => {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Canvas context not available');
  
  let targetWidth = img.naturalWidth;
  let targetHeight = img.naturalHeight;
  
  if (scale) {
    targetWidth = Math.round(img.naturalWidth * (scale / 100));
    targetHeight = Math.round(img.naturalHeight * (scale / 100));
  } else if (customWidth || customHeight) {
    if (maintainAspectRatio) {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      if (customWidth) {
        targetWidth = customWidth;
        targetHeight = Math.round(customWidth / aspectRatio);
      } else if (customHeight) {
        targetHeight = customHeight;
        targetWidth = Math.round(customHeight * aspectRatio);
      }
    } else {
      targetWidth = customWidth || targetWidth;
      targetHeight = customHeight || targetHeight;
    }
  }
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  
  return canvas.toDataURL('image/png');
};
