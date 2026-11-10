export const FURNITURE_DRAG_TYPE = 'application/x-nook-furniture'
let activeFurniture: string | null = null
let transparentDragImage: HTMLCanvasElement | null = null
export function clearFurnitureDragImage() {
  transparentDragImage?.remove()
  transparentDragImage = null
}
export function snapFurnitureMm(value: number, precise = false) {
  return precise ? Math.round(value) : Math.round(value / 100) * 100
}
export function setActiveFurnitureDrag(id: string | null) {
  activeFurniture = id
  if (!id) clearFurnitureDragImage()
}
export function getActiveFurnitureDrag() { return activeFurniture }
export function hideFurnitureDragImage(transfer: DataTransfer) {
  transparentDragImage?.remove()
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;pointer-events:none;'
  document.body.appendChild(canvas)
  transparentDragImage = canvas
  transfer.setDragImage(canvas, 0, 0)
}
