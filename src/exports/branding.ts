const BRAND_MARK_URL = '/site/images/logos/nook-icon-blue-transparent.svg'

let brandMarkPromise: Promise<HTMLImageElement> | undefined

function loadBrandMark() {
  if (!brandMarkPromise) {
    brandMarkPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not load the Nook logo for export.'))
      image.src = BRAND_MARK_URL
    })
  }
  return brandMarkPromise
}

/** Wait for the same official logo and Clash Display wordmark font used by the editor. */
export async function prepareNookBrand() {
  const fontSet = document.fonts
  const [mark] = await Promise.all([
    loadBrandMark(),
    fontSet?.load('700 42px "Clash Display"') ?? Promise.resolve(),
    fontSet?.load('500 20px Creato') ?? Promise.resolve(),
    fontSet?.load('400 12px Creato') ?? Promise.resolve(),
  ])
  return mark
}

/** Draw the editor's transparent Nook mark and wordmark in the lower-left corner. */
export function drawNookBrand(context: CanvasRenderingContext2D, width: number, height: number, mark: CanvasImageSource) {
  const scale = width / 1600
  const size = 42 * scale
  const x = 32 * scale
  const y = height - 32 * scale - size

  context.save()
  context.drawImage(mark, x, y, size, size)
  context.fillStyle = '#2A4A92'
  context.font = `700 ${42 * scale}px "Clash Display", Creato, Arial, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  const spacedContext = context as CanvasRenderingContext2D & { letterSpacing?: string }
  if ('letterSpacing' in spacedContext) spacedContext.letterSpacing = `${-2.73 * scale}px`
  context.fillText('NOOK', x + size + 9 * scale, y + size / 2)
  context.restore()
}
