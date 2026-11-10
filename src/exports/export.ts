import { getPlanPrimitives } from '../geometry'
import { getConcept } from '../catalog'
import { getWallConcept, getWindowStyle } from '../catalog/wall'
import { getDoorStyle } from '../catalog/doors'
import { captureRoomPng, type ExportView } from '../scene/capture'
import type { Snapshot } from './snapshot'
import { drawNookBrand, prepareNookBrand } from './branding'

const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
export function createPlan(snapshot: Snapshot, showDimensions = true, architecturalPlan = true): string {
  const project = snapshot.envelope.project; const { room, instances } = project
  const plan = getPlanPrimitives(project); const pad = 500; const width = room.widthMm + 2 * pad; const height = room.depthMm + 2 * pad
  const items = [...plan.items].sort((a, b) => Number(b.isRug) - Number(a.isRug)).map((item) => `<path d="${esc(item.pathD)}" transform="${esc(item.svgTransform)}" fill="${item.isRug ? '#e7e4dc' : '#fafaf7'}" stroke="#49564e" stroke-width="18"/>`).join('')
  const walls = plan.walls.map((wall) => `<rect x="${wall.xMm}" y="${wall.zMm}" width="${wall.widthMm}" height="${wall.depthMm}" fill="#24302b"/>`).join('')
  const wallMarks = plan.wallObjects.map((item) => `<path d="${esc(item.pathD)}" fill="#b9c9bd" stroke="#35614c" stroke-width="12"><title>${esc(getWallConcept(item.conceptId)?.name ?? item.conceptId)}</title></path>`).join('')
  const openings = plan.openings.map((o) => `<path d="${esc(o.pathD)}" fill="none" stroke="#52665a" stroke-width="20"/>`).join('')
  const numbers = architecturalPlan ? plan.items.map((item) => `<text x="${item.centerXMm}" y="${item.centerZMm}" text-anchor="middle" font-size="100" fill="#24302b">${instances.findIndex((v) => v.id === item.id) + 1}</text>`).join('') : ''
  const list = instances.map((item, index) => { const c = getConcept(2, item.conceptId); return `${index + 1}. ${c?.name ?? item.conceptId} — ${c?.dimensions.widthMm} × ${c?.dimensions.depthMm} × ${c?.dimensions.heightMm} mm; X ${item.centerXMm}, Y ${item.elevationMm??0}, Z ${item.centerZMm}; turn ${item.rotationDegrees??item.quarterTurn*90}°; horizontal flip ${!!item.flipHorizontal}; vertical flip ${!!item.flipVertical}` })
  for (const item of project.wallObjects ?? []) { const c=getWallConcept(item.conceptId); list.push(`Wall: ${c?.name ?? item.conceptId} — ${item.wall}, offset ${item.offsetMm} mm, bottom ${item.bottomMm} mm; ${c?.widthMm} × ${c?.heightMm} × ${c?.depthMm} mm`) }
  for (const opening of room.openings) {
    if (opening.type === 'window') list.push(`Window: ${getWindowStyle(opening.styleId ?? '')?.name ?? 'Plain opening'} — ${opening.wall}, offset ${opening.offsetMm} mm, sill ${opening.sillMm} mm; ${opening.widthMm} × ${opening.heightMm} mm`)
    else list.push(`${opening.type === 'archway' ? 'Archway' : 'Door'}: ${getDoorStyle(opening.styleId ?? '')?.name ?? (opening.type === 'archway' ? 'Open passage' : 'Plain door')} — ${opening.wall}, offset ${opening.offsetMm} mm; ${opening.widthMm} × ${opening.heightMm} mm`)
  }
  const schedule = architecturalPlan ? list.map((line, index) => `<text x="${pad}" y="${height + 300 + index * 110}" font-size="85">${esc(line)}</text>`).join('') : ''
  const header = architecturalPlan ? `<text x="${pad}" y="160" font-size="110" font-weight="500">${esc(project.name)} · ${esc(snapshot.label)}</text>` : ''
  const heightNote = showDimensions ? `<text x="${pad}" y="${height + 150}" font-size="85">Height ${room.heightMm} mm · Planning representation; printed scale not guaranteed.</text>` : ''
  const outputHeight = height + 500 + (architecturalPlan ? list.length * 110 : 0)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${outputHeight}" viewBox="0 0 ${width} ${outputHeight}" role="img"><metadata>Snapshot ID: ${esc(snapshot.id)}</metadata><rect width="100%" height="100%" fill="#fff"/><g font-family="Creato, Arial, sans-serif" fill="#2A4A92">${header}<g transform="translate(${pad} ${pad})"><path d="${esc(plan.roomPathD)}" fill="#f3f1ea"/>${walls}${plan.curvedWallPathD?`<path d="${esc(plan.curvedWallPathD)}" fill="none" stroke="#5f6b6d" stroke-width="100" stroke-linecap="round"/>`:''}${items}${wallMarks}${openings}${numbers}${showDimensions ? `<text x="${room.widthMm / 2}" y="-90" font-size="90" text-anchor="middle">${room.widthMm} mm</text><text x="-80" y="${room.depthMm / 2}" font-size="90" text-anchor="middle" transform="rotate(-90 -80 ${room.depthMm / 2})">${room.depthMm} mm</text>` : ''}</g>${heightNote}${schedule}</g></svg>`
}
async function loadPlanImage(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not render the floor plan.'))
      image.src = url
    })
  } finally { URL.revokeObjectURL(url) }
}
export async function createPng(snapshot: Snapshot, options: { view?: ExportView; dimensions?: boolean; architecturalPlan?: boolean; animationsEnabled?: boolean; nightMode?: boolean } = {}): Promise<Blob> {
  const brandMark = await prepareNookBrand()
  const view = options.view ?? 'isometric'
  const isPlan = view === 'top'
  const image = isPlan
    ? await loadPlanImage(createPlan(snapshot, options.dimensions ?? false, options.architecturalPlan ?? true))
    : await createImageBitmap(await captureRoomPng(snapshot.envelope.project, 1536, 1104, view, options.dimensions ?? false, options))
  try {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1200
    const context = canvas.getContext('2d'); if (!context) throw new Error('Image export is unavailable.')
    context.fillStyle = '#fafaf7'; context.fillRect(0, 0, 1600, 1200)
    if (isPlan) {
      const plan = image as HTMLImageElement
      const scale = Math.min(1536 / plan.naturalWidth, 1104 / plan.naturalHeight)
      const w = plan.naturalWidth * scale, h = plan.naturalHeight * scale
      context.drawImage(plan, (1600 - w) / 2, 64 + (1104 - h) / 2, w, h)
    } else context.drawImage(image, 32, 64, 1536, 1104)
    context.fillStyle = '#2A4A92'; context.font = '500 20px Creato, Arial, sans-serif'; context.fillText(`${snapshot.envelope.project.name} · ${snapshot.label}`, 32, 27, 1536)
    context.font = '400 12px Creato, Arial, sans-serif'; context.fillText(`Snapshot ID: ${snapshot.id}`, 32, 47, 1536)
    drawNookBrand(context, canvas.width, canvas.height, brandMark)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create image.')), 'image/png'))
  } finally { if ('close' in image) image.close() }
}
export { download } from './download'
