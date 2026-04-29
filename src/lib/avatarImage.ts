const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_DIMENSION = 512;

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler a imagem selecionada.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

export async function optimizeAvatarImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Escolha uma imagem PNG, JPG, JPEG ou WebP.');
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('A imagem original deve ter no máximo 8MB.');
  }

  const image = await loadImageFromFile(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Não foi possível otimizar a imagem neste dispositivo.');
  }

  context.drawImage(image, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, 'image/webp', 0.8);
  if (!blob || blob.size === 0) {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
  }

  if (!blob) {
    throw new Error('Não foi possível gerar uma imagem otimizada.');
  }

  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new Error('A imagem otimizada ficou acima de 1MB. Escolha uma imagem menor.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível preparar a imagem para envio.'));
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl,
    previewUrl: URL.createObjectURL(blob),
    size: blob.size,
    type: blob.type,
  };
}
