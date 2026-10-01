// Client-side validation + resize/compress before upload. The server validates
// again (magic bytes + size) and never trusts this step.
const MAX_INPUT_BYTES = 25 * 1024 * 1024
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024
const MAX_EDGE = 1600

export class ImageError extends Error {}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new ImageError('Não foi possível ler esta imagem. Tente outra foto (JPG, PNG ou WebP).'))
    img.src = src
  })
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

export async function prepareImage(input: Blob): Promise<Blob> {
  if (input.type && !input.type.startsWith('image/')) {
    throw new ImageError('Esse arquivo não é uma imagem.')
  }
  if (input.size > MAX_INPUT_BYTES) {
    throw new ImageError('Essa imagem é grande demais (máx. 25 MB).')
  }
  const url = URL.createObjectURL(input)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageError('Seu navegador não conseguiu processar a imagem.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    for (const q of [0.85, 0.72, 0.6]) {
      const blob = await toBlob(canvas, q)
      if (blob && blob.size <= MAX_OUTPUT_BYTES) return blob
    }
    throw new ImageError('Não foi possível reduzir a imagem o suficiente.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
