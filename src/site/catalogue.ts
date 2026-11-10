import * as THREE from 'three'
import { buildFurniture, disposeFurniture, prepareFurniture, updateFurnitureMaterials } from '../assets/models'
import { defaultFinishes, FINISH_COLORS, getConcept } from '../catalog'
import type { FurnitureInstance } from '../domain/types'

type Item = { label: string; id: string; title: string; copy: string; finishRegion: string }
const items: Item[] = [
  { label: 'Seating', id: 'SOF-SCA-01', title: 'Find your favorite seat.', copy: 'Soft lines and a generous seat make this the kind of spot where one more chapter turns into three.', finishRegion: 'Upholstery' },
  { label: 'Tables', id: 'CFT-SCA-01', title: 'Set the scene.', copy: 'A natural landing place for coffee, books, and the little things that make a room feel lived in.', finishRegion: 'Top' },
  { label: 'Storage', id: 'MED-SCA-01', title: 'Keep your favorites close.', copy: 'Tuck away the everyday clutter and give the pieces you love a little room to stand out.', finishRegion: 'Body' },
  { label: 'Lighting', id: 'LMP-SCA-01', title: 'Set a softer mood.', copy: 'A warm pool of light can turn an ordinary corner into the place you reach for at the end of the day.', finishRegion: 'Shade' },
  { label: 'Plants', id: 'PLT-PLT-01', title: 'Bring a little green in.', copy: 'A leafy silhouette brings a quieter rhythm to the room. Try it by a window and see how the space changes.', finishRegion: 'Leaves' },
  { label: 'Electronics', id: 'ELC-ELC-01', title: 'Make room for movie night.', copy: 'Settle in with a screen that fits your setup and lets the rest of the room keep its own character.', finishRegion: 'Frame' },
]

const host = document.querySelector<HTMLElement>('.catalogue-viewer')
const canvas = document.querySelector<HTMLCanvasElement>('#catalogue-canvas')
const tabs = document.querySelector<HTMLElement>('.catalogue-tabs')
const category = document.querySelector<HTMLElement>('#catalogue-category')
const title = document.querySelector<HTMLElement>('#catalogue-item-title')
const copy = document.querySelector<HTMLElement>('#catalogue-description')
const itemName = document.querySelector<HTMLElement>('#catalogue-item-name')
const dimensions = document.querySelector<HTMLElement>('#catalogue-dimensions')
const finishFieldset = document.querySelector<HTMLFieldSetElement>('.catalogue-finish')
const finishLabel = document.querySelector<HTMLElement>('#catalogue-finish-label')
const colorSwatches = document.querySelector<HTMLElement>('#catalogue-color-swatches')
if (!host || !canvas || !tabs || !category || !title || !copy || !itemName || !dimensions || !finishFieldset || !finishLabel || !colorSwatches) throw new Error('Catalogue viewer markup is incomplete')

const pill = document.createElement('span')
pill.className = 'catalogue-pill'
pill.setAttribute('aria-hidden', 'true')
tabs.append(pill)
const buttons = items.map((item, index) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('role', 'tab')
  button.id = 'catalogue-tab-' + index
  button.setAttribute('aria-selected', index === 0 ? 'true' : 'false')
  button.setAttribute('aria-controls', 'catalogue-details')
  button.tabIndex = index === 0 ? 0 : -1
  button.textContent = item.label
  button.addEventListener('click', () => selectItem(index))
  tabs.append(button)
  return button
})

let renderer: THREE.WebGLRenderer
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
} catch {
  host.classList.add('catalogue-unavailable')
  copy.textContent = '3D previews are unavailable in this browser.'
  throw new Error('WebGL is unavailable for catalogue previews')
}

const scene = new THREE.Scene()
scene.background = new THREE.Color('#f4f2eb')
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
camera.position.set(0, 1.05, 5.2)
camera.lookAt(0, 0, 0)
scene.add(new THREE.HemisphereLight(0xfff8e8, 0x718297, 2.2))
const keyLight = new THREE.DirectionalLight(0xffffff, 3)
keyLight.position.set(-3, 5, 4)
scene.add(keyLight)
const fillLight = new THREE.DirectionalLight(0xc8dcff, 1.35)
fillLight.position.set(4, 2, -3)
scene.add(fillLight)
const pivot = new THREE.Group()
scene.add(pivot)
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.setClearColor('#f4f2eb', 0)
renderer.outputColorSpace = THREE.SRGBColorSpace

let selected = 0
let generation = 0
let model: THREE.Group | null = null
let activeInstance: FurnitureInstance | null = null
const selectedFinishes = new Map<string, string>()
let pointer: { id: number; x: number; lastX: number; y: number } | null = null
let dragging = false
let resumeAt = 0
let lastFrame = performance.now()
let viewerVisible = false
let rendering = false
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function resize() {
  const bounds = host!.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  renderer.setSize(bounds.width, bounds.height, false)
  camera.aspect = bounds.width / bounds.height
  camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(host)
resize()

function movePill(index: number) {
  const button = buttons[index]
  const baseWidth = Math.max(buttons[0].offsetWidth, 1)
  pill.style.width = baseWidth + 'px'
  pill.style.transform = 'translateX(' + button.offsetLeft + 'px) scaleX(' + button.offsetWidth / baseWidth + ')'
}

const finishLabels: Record<string, string> = {
  LIN: 'Linen', SAG: 'Sage', BLU: 'Blue grey', OAK: 'Oak', WAL: 'Walnut', OFF: 'Off white',
  CHA: 'Charcoal', BRZ: 'Bronze', OAT: 'Oatmeal', RBL: 'Blue', CRM: 'Cream', SWH: 'Soft white',
  CAN: 'Cane', ROSE: 'Rose', RUST: 'Rust', OCHR: 'Ochre', FOREST: 'Forest', ASH: 'Ash',
  ESP: 'Espresso', SIL: 'Silver', GLD: 'Gold', PLANT_LEAF: 'Leaf green', PLANT_LEAF_LIGHT: 'Light leaf',
}

function setSwatchesDisabled(disabled: boolean) {
  colorSwatches!.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = disabled })
}

function renderSwatches(item: Item, concept: ReturnType<typeof getConcept>, selectedColor: string) {
  const rule = concept?.finishes?.[item.finishRegion]
  finishLabel!.textContent = 'Available in:'
  colorSwatches!.replaceChildren()
  if (!rule) {
    finishFieldset!.hidden = true
    return
  }
  const colors = rule.allowed.filter((color) => color in FINISH_COLORS)
  finishFieldset!.hidden = colors.length < 2
  colors.forEach((color) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'catalogue-color-swatch'
    const colorLabel = finishLabels[color] ?? color
    button.setAttribute('aria-label', colorLabel)
    button.setAttribute('aria-pressed', String(color === selectedColor))
    const tooltip = document.createElement('span')
    tooltip.className = 'catalogue-color-tooltip'
    tooltip.setAttribute('aria-hidden', 'true')
    tooltip.textContent = colorLabel
    const dot = document.createElement('span')
    dot.className = 'catalogue-color-dot'
    dot.setAttribute('aria-hidden', 'true')
    dot.style.backgroundColor = FINISH_COLORS[color as keyof typeof FINISH_COLORS]
    button.append(dot, tooltip)
    button.addEventListener('click', () => {
      if (!activeInstance || activeInstance.conceptId !== item.id || !model) return
      activeInstance.finishes[item.finishRegion] = color
      selectedFinishes.set(item.id, color)
      // Swatch changes only affect materials. Keep the centered model transform
      // established when the preview was built instead of reapplying the editor
      // placement transform (which would move the preview back to the origin).
      updateFurnitureMaterials(model.children[0] as THREE.Group, activeInstance)
      colorSwatches!.querySelectorAll<HTMLButtonElement>('button').forEach((swatch) => {
        swatch.setAttribute('aria-pressed', String(swatch === button))
      })
    })
    colorSwatches!.append(button)
  })
}

async function selectItem(index: number) {
  if (index === selected && model) return
  selected = index
  const item = items[index]
  const token = ++generation
  buttons.forEach((button, i) => {
    button.setAttribute('aria-selected', String(i === index))
    button.tabIndex = i === index ? 0 : -1
  })
  movePill(index)
  category!.textContent = item.label
  title!.textContent = item.title
  copy!.textContent = item.copy
  const concept = getConcept(2, item.id)
  itemName!.textContent = concept?.name ?? item.id
  const cm = (value: number) => Number.isInteger(value / 10) ? String(value / 10) : (value / 10).toFixed(1)
  dimensions!.textContent = concept
    ? cm(concept.dimensions.widthMm) + ' × ' + cm(concept.dimensions.depthMm) + ' × ' + cm(concept.dimensions.heightMm) + ' cm'
    : ''
  const defaultColor = concept ? defaultFinishes(concept)[item.finishRegion] : ''
  renderSwatches(item, concept, selectedFinishes.get(item.id) ?? defaultColor)
  setSwatchesDisabled(true)
  host!.classList.add('is-changing')
  try {
    await prepareFurniture([item.id])
    if (token !== generation) return
    if (!concept) throw new Error('Unavailable catalogue item: ' + item.id)
    const finishes = defaultFinishes(concept)
    finishes[item.finishRegion] = selectedFinishes.get(item.id) ?? finishes[item.finishRegion]
    const instance: FurnitureInstance = { id: 'catalogue-' + item.id, conceptId: item.id, centerXMm: 0, centerZMm: 0, quarterTurn: 0, finishes }
    const nextModel = buildFurniture(instance)
    const bounds = new THREE.Box3().setFromObject(nextModel)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    nextModel.position.sub(center)
    const display = new THREE.Group()
    display.scale.setScalar(2.53 / Math.max(size.x, size.y, size.z, 0.01))
    display.add(nextModel)
    if (model) {
      pivot.remove(model)
      disposeFurniture(model.children[0] as THREE.Group)
    }
    model = display
    activeInstance = instance
    pivot.add(display)
    pivot.rotation.y = 0.35
    host!.classList.remove('is-changing')
    setSwatchesDisabled(false)
  } catch (error) {
    if (token === generation) {
      host!.classList.remove('is-changing')
      copy!.textContent = 'This piece could not load. Choose another category to keep exploring.'
    }
    console.error(error)
  }
}

buttons.forEach((button, index) => button.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
  buttons[next].focus()
  void selectItem(next)
}))
canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX }
})
canvas.addEventListener('pointermove', (event) => {
  if (!pointer || pointer.id !== event.pointerId) return
  if (!dragging && Math.abs(event.clientX - pointer.x) > 5 && Math.abs(event.clientX - pointer.x) > Math.abs(event.clientY - pointer.y)) {
    dragging = true
    canvas.setPointerCapture(event.pointerId)
  }
  if (dragging) {
    pivot.rotation.y += (event.clientX - pointer.lastX) * 0.009
    pointer.lastX = event.clientX
    event.preventDefault()
  }
})
const finishDrag = () => { pointer = null; dragging = false; resumeAt = performance.now() + 180 }
canvas.addEventListener('pointerup', finishDrag)
canvas.addEventListener('pointercancel', finishDrag)
canvas.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  pivot.rotation.y += event.key === 'ArrowRight' ? 0.22 : -0.22
  resumeAt = performance.now() + 180
})

function render(now: number) {
  if (!viewerVisible || document.hidden) {
    rendering = false
    return
  }
  const delta = Math.min((now - lastFrame) / 1000, 0.05)
  lastFrame = now
  if (!reducedMotion.matches && !dragging && !document.hidden && now >= resumeAt) pivot.rotation.y += (Math.PI * 2 / 38) * delta
  renderer.render(scene, camera)
  requestAnimationFrame(render)
}
const viewerObserver = new IntersectionObserver((entries) => {
  viewerVisible = entries.some((entry) => entry.isIntersecting)
  if (viewerVisible && !rendering) {
    rendering = true
    lastFrame = performance.now()
    requestAnimationFrame(render)
  }
}, { threshold: 0.05 })
viewerObserver.observe(document.querySelector('#catalogue')!)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && viewerVisible && !rendering) {
    rendering = true
    lastFrame = performance.now()
    requestAnimationFrame(render)
  }
})
category.textContent = items[0].label
title.textContent = items[0].title
copy.textContent = items[0].copy
movePill(0)
void selectItem(0)
window.addEventListener('resize', () => movePill(selected))
