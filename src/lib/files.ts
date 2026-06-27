// Utilitaires fichiers : téléchargement et lecture/compression d'images.

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Lit un fichier image et le redimensionne/compresse en dataURL JPEG pour limiter la taille. */
export function fileToCompressedDataURL(file: File, maxSize = 1280, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Image illisible'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas indisponible'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Lit un fichier tel quel en dataURL (sans transformation) — utilisé pour les PDF. */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

/** Prépare un fichier pour stockage : compresse les images, garde les PDF tels quels. */
export async function fileToStorableDataURL(file: File): Promise<string> {
  if (file.type === 'application/pdf') return fileToDataURL(file)
  return fileToCompressedDataURL(file, 1600, 0.72)
}

export function isPdfDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith('data:application/pdf')
}

/** Ouvre un document (image ou PDF) dans un nouvel onglet via une URL blob (fiable en PWA). */
export function openDataUrl(dataUrl: string): void {
  try {
    const [meta, b64] = dataUrl.split(',')
    const mime = meta.match(/data:([^;]+)/)?.[1] || 'application/octet-stream'
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  } catch {
    window.open(dataUrl, '_blank')
  }
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
