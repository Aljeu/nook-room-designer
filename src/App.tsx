import { Component, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { CATALOG, FINISH_COLORS, defaultFinishes, getConcept } from './catalog'
import { getWallConcept, getWindowStyle, type WallConcept } from './catalog/wall'
import { getDoorStyle } from './catalog/doors'
import { WINDOW_TREATMENT_COLORS, type CatalogConcept, type Door, type ArchwayOpening, type FurnitureInstance, type LampLightColor, type ObjectComment, type Opening, type Project, type RoomShape, type Wall, type WallObject, type WindowOpening } from './domain/types'
import { MAX_DOORWAYS, MAX_INSTANCES, MAX_OPENINGS, MAX_WINDOWS, ROOM_LIMITS } from './domain/constants'
import { useEditor, validateDesign } from './editor/store'
import { duplicateOffset } from './editor/duplicatePosition'
import type { SavedRecord } from './persistence/db'
import { captureSnapshot } from './exports/snapshot'
import { saveCapturedProject } from './optionalServices'
import { download } from './exports/download'
import { PlanViewport } from './scene/PlanViewport'
import { RoomViewport } from './scene/RoomViewport'
import { canonicalPose, DEFAULT_VIEW_ZOOM, type CameraCommand, type CameraPose } from './scene/camera'
import type { ExportView } from './scene/capture'
import { CubeViewIcon, ViewControls, type CubeFace } from './ui/ViewControls'
import { NumberField, parseMetric } from './ui/Fields'
import { Icon, type IconName } from './ui/Icon'
import { Popover } from './ui/Popover'
import { UnsavedDialog } from './ui/UnsavedDialog'
import { SavedProjectDeleteDialog } from './ui/SavedProjectDeleteDialog'
import { CommentDialog } from './ui/CommentDialog'
import { CommentDetailDialog } from './ui/CommentDetailDialog'
import { CommentItems, toCommentDisplay } from './ui/CommentItems'
import { ObjectActionWheel, type ObjectAction } from './ui/ObjectActionWheel'
import { FurnitureThumbnail } from './ui/FurnitureThumbnail'
import { WallPanel } from './ui/WallPanel'
import { DoorsPanel } from './ui/DoorsPanel'
import { AppliancePanel } from './ui/AppliancePanel'
import { ElectronicsPanel } from './ui/ElectronicsPanel'
import { FURNITURE_DRAG_TYPE, hideFurnitureDragImage, setActiveFurnitureDrag } from './domain/furnitureDrag'
import type { WallCatalogDrag } from './domain/wallDrag'
import { furniturePlacementIssue, openingBasis, validateProjectSpatial } from './geometry'
import { validateWallAttachment } from './geometry/wallAttachment'
import './app.css'
import './theme.css'

const categories: Record<string, { name: string; icon: IconName }> = {
  SOF: { name: 'Sofas', icon: 'sofa' }, CHR: { name: 'Lounge chairs', icon: 'chair' },
  CFT: { name: 'Coffee tables', icon: 'table' }, SFT: { name: 'Side tables', icon: 'table' },
  NST: { name: 'Nightstands', icon: 'cabinet' },
  ELC: { name: 'Electronics', icon: 'tv' },
  MED: { name: 'Media consoles', icon: 'cabinet' }, BKC: { name: 'Bookcases', icon: 'bookcase' },
  RUG: { name: 'Rugs', icon: 'rug' }, LMP: { name: 'Floor lamps', icon: 'lamp' }, PLT: { name: 'Plants', icon: 'plant' },
  VNT: { name: 'Ventilation and AC', icon: 'airVent' },
}
const roomShapeOptions: readonly { id: RoomShape; label: string; icon: IconName }[] = [
  { id: 'rectangle', label: 'Rectangle', icon: 'roomShapeRect' },
  { id: 'square', label: 'Square', icon: 'roomShapeSquare' },
  { id: 'l-shape', label: 'L-shaped room', icon: 'roomShapeL' },
  { id: 'd-shape', label: 'D-shaped room', icon: 'roomShapeD' },
]
function readUiPreference(key: string, fallback: boolean) {
  try { const value = window.localStorage.getItem(key); return value === null ? fallback : value === 'true' }
  catch { return fallback }
}
const availableCatalog = CATALOG.filter((concept) => concept.available)
const finishNames: Record<string, string> = { LIN: 'Linen', SAG: 'Sage', BLU: 'Blue', OAK: 'Light oak', WAL: 'Walnut', OFF: 'Off-white', OAT: 'Oatmeal', RBL: 'Muted blue', CHA: 'Charcoal', BRZ: 'Muted bronze', CRM: 'Cream', SWH: 'Off-white', CAN: 'Natural cane', ROSE: 'Dusty rose', RUST: 'Terracotta', OCHR: 'Ochre', FOREST: 'Forest green', ASH: 'Ash wood', ESP: 'Espresso', SIL: 'Silver', GLD: 'Brass', SCREEN: 'Black glass', PLANT_LEAF: 'Deep green', PLANT_LEAF_LIGHT: 'Leaf green', PLANT_TRUNK: 'Natural bark', PLANT_SOIL: 'Dark soil', PLANT_METAL: 'Matte black' }
const designInspirationByStyle: Record<string, string> = {
  SCA: 'A contemporary interpretation of Scandinavian simplicity and lightness.',
  MCM: 'Inspired by the clean lines and organic forms of mid-century modern design.',
  FIL: 'A contemporary interpretation inspired by Filipino materials and forms.',
  PLT: 'Indoor greenery used as a natural accent.',
}
function catalogDesignInspiration(concept: CatalogConcept) {
  if (concept.id === 'RUG-FIL-01') return 'A contemporary floor piece inspired by woven-mat traditions.'
  return designInspirationByStyle[concept.style] ?? 'A contemporary design interpretation.'
}
function catalogMaterialsDescription(concept: CatalogConcept) {
  const woven = Object.hasOwn(concept.finishes ?? {}, 'Weave')
  switch (concept.category) {
    case 'SOF': case 'CHR': return woven ? 'Textile upholstery, a timber-look frame and woven cane details.' : 'Textile upholstery and a timber-look frame.'
    case 'CFT': case 'SFT': return woven ? 'A timber-look top and frame with woven cane details.' : 'A timber-look top and supporting frame.'
    case 'NST': case 'MED': case 'BKC': return woven ? 'A wood-look body and frame with woven cane details.' : 'A wood-look body, fronts and frame.'
    case 'RUG': return 'A woven textile with a surface pattern.'
    case 'LMP': return 'A shade, stem and weighted base.'
    case 'PLT': return 'Foliage, a trunk, soil and a planter.'
    case 'ELC': return concept.id.endsWith('02') ? 'A display, housing, keyboard and trackpad.' : 'A display, housing and support stand.'
    case 'VNT': return 'A housing, grille and airflow components.'
    default: return 'A structural frame with assembled surfaces and components.'
  }
}
function wallMaterialsDescription(concept: WallConcept) {
  if (concept.category === 'appliance') {
    if (concept.id === 'TV-WALL-01') return 'A display, bezel and wall bracket.'
    if (concept.id.startsWith('AC-')) return 'Indoor and outdoor casings, grilles and connecting components.'
    if (concept.id.startsWith('FAN-')) return 'A fan, protective grille and wall bracket.'
    return 'A casing, frame and ventilation grille.'
  }
  if (concept.category === 'panel') return Object.hasOwn(concept.finishes, 'Weave') ? 'A timber-look frame with a woven panel.' : 'A timber-look wall panel.'
  if (concept.category === 'sconce') return Object.hasOwn(concept.finishes, 'Weave') ? 'A light housing, wall plate and woven shade.' : 'A light housing, wall plate and shade.'
  if (concept.category === 'art') return Object.hasOwn(concept.finishes, 'Weave') ? 'A frame, woven surface and backing.' : 'A frame, printed artwork and backing.'
  if (concept.id.startsWith('MIR-')) return 'A frame and mirror surface.'
  return 'A frame and woven decorative surface.'
}
function doorMaterialsDescription(style: ReturnType<typeof getDoorStyle>) {
  if (style?.category === 'archways') return 'A framed opening with no door leaf.'
  if (style?.construction === 'glazed' || style?.sidelightMm) return 'A door leaf, frame, glass panels and hardware.'
  return 'A door leaf, frame and hardware.'
}
const lampLightOptions: { id: LampLightColor; label: string; detail: string; color: string }[] = [
  { id: 'daylight', label: 'Daylight', detail: 'Cool and clear', color: '#d8edff' },
  { id: 'white', label: 'White light', detail: 'Soft neutral light', color: '#fff4dc' },
  { id: 'warm', label: 'Orange · dim', detail: 'Warm ambient light', color: '#ff9b55' },
]
const treatmentColorOptions = WINDOW_TREATMENT_COLORS.map((id) => ({ id, label: finishNames[id], color: FINISH_COLORS[id] }))

function FinishSwatches({ region, options, value, onChange, compact = false }: {
  region: string; options: readonly string[]; value: string; onChange: (color: string) => void
  compact?: boolean
}) {
  const colors = options.filter((color) => color in FINISH_COLORS)
  if (colors.length < 2) return null
  return <fieldset className={'finish' + (compact ? ' object-finish' : '')}>
    <legend>{region}</legend>
    <div className="color-swatches">{colors.map((color) => <button key={color} type="button" className="color-swatch-button"
      aria-label={`${region}: ${finishNames[color] ?? color}`} aria-pressed={value === color}
      onClick={() => onChange(color)}><span className="color-swatch-dot" aria-hidden="true" style={{ background: FINISH_COLORS[color as keyof typeof FINISH_COLORS] }} /></button>)}</div>
  </fieldset>
}
const formatError = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'
type Panel = 'room' | 'furniture' | 'placed' | 'edit' | 'wall' | 'doors'
type PopoverName = 'saved' | 'exports' | 'comments'
type ExportFormat = 'png' | 'svg' | 'glb' | 'video'
type ExportQuality = 'low' | 'high'
const exportFormats: { id: ExportFormat; label: string; description: string; icon: IconName }[] = [
  { id: 'png', label: 'PNG', description: 'Room image or floor plan', icon: 'image' },
  { id: 'video', label: 'Video', description: '5 or 10 second room view', icon: 'image' },
  { id: 'svg', label: 'SVG', description: 'Floor plan with dimensions', icon: 'plan' },
  { id: 'glb', label: 'GLB', description: '3D model for Blender and Three.js', icon: 'cube' },
]
const exportViewOptions: { id: ExportView; label: string; face: CubeFace }[] = [
  { id: 'isometric', label: 'Isometric 3D', face: 'none' },
  { id: 'top-3d', label: 'Top view', face: 'top' },
  { id: 'front', label: 'Front view', face: 'front' },
  { id: 'side-left', label: 'Side left view', face: 'side-left' },
  { id: 'side-right', label: 'Side right view', face: 'side-right' },
]
type WheelPanel = 'info' | 'paint' | 'height' | 'styles' | 'treatment' | 'lampConfig' | null
type WheelSelection = { id: string; x: number; y: number; panel: WheelPanel; closing?: boolean }
type SavedStyle = { id: string; conceptId: string; name: string; finishes: Record<string, string> }
type RotationDrag = { id: string; lastAngle: number; totalAngle: number; startDegrees: number }

const savedStylesKey = 'nook-room-saved-styles-v1'
function readSavedStyles(): SavedStyle[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(savedStylesKey) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((entry): entry is SavedStyle => !!entry && typeof entry.id === 'string' && typeof entry.conceptId === 'string' && typeof entry.name === 'string' && !!entry.finishes && typeof entry.finishes === 'object') : []
  } catch { return [] }
}

function ProjectNameEditor({ name, onRename }: { name: string; onRename: (name: string) => string | null }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!editing) return
    setDraft(name)
    input.current?.focus()
    input.current?.select()
  }, [editing, name])
  function cancel() { setDraft(name); setError(null); setEditing(false) }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = onRename(draft.trim())
    setError(message)
    if (!message) setEditing(false)
  }
  if (!editing) return <button className="project-trigger with-tooltip" aria-label={'Edit project name: ' + name} onClick={() => setEditing(true)}><span>{name}</span><span className="pill-tooltip">Edit project name</span></button>
  return <form className="project-name-form" onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); cancel() } }}>
    <label className="sr-only" htmlFor="project-name">Project name</label>
    <input ref={input} id="project-name" value={draft} maxLength={80} aria-invalid={!!error} aria-describedby={error ? 'project-name-error' : undefined} onChange={(event) => { setDraft(event.target.value); setError(null) }} />
    <button className="icon-button project-name-action" type="submit" aria-label="Save project name" title="Save project name"><Icon name="check" size={19} /></button>
    <button className="icon-button project-name-action" type="button" aria-label="Cancel renaming" title="Cancel renaming" onClick={cancel}><Icon name="close" size={19} /></button>
    {error && <span id="project-name-error" className="field-error" role="alert">{error}</span>}
  </form>
}

function RoomShapeDialog({ shape, onCancel, onApply }: { shape: RoomShape; onCancel: () => void; onApply: (keepFurniture: boolean) => boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const keep = useRef<HTMLButtonElement>(null)
  const [step, setStep] = useState<'confirm' | 'cleanup'>('confirm')
  const shapeLabel = roomShapeOptions.find((option) => option.id === shape)?.label ?? 'room'
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = dialog.current
    node?.showModal()
    cancel.current?.focus()
    return () => {
      node?.close()
      if (previous?.isConnected) previous.focus()
      else document.querySelector<HTMLButtonElement>('[data-room-shape-trigger]')?.focus()
    }
  }, [])
  useEffect(() => { (step === 'confirm' ? cancel.current : keep.current)?.focus() }, [step])
  function handleApply(keepFurniture: boolean) {
    if (onApply(keepFurniture)) onCancel()
  }
  return <dialog ref={dialog} className="room-shape-dialog" aria-labelledby="room-shape-dialog-title" aria-describedby="room-shape-dialog-description"
    onCancel={(event) => { event.preventDefault(); onCancel() }}
    onClick={(event) => { if (event.target === event.currentTarget) onCancel() }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      if (!controls.length) return
      event.preventDefault()
      const current = controls.indexOf(document.activeElement as HTMLButtonElement)
      controls[(current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus()
    }}>
    {step === 'confirm' ? <>
      <h2 id="room-shape-dialog-title">Change room shape?</h2>
      <p id="room-shape-dialog-description">{shape === 'd-shape' ? 'Switch to a D-shaped room with a semicircular front?' : `Switch to a ${shapeLabel.toLowerCase()} room?`}</p>
      <div className="room-shape-dialog-actions">
        <button ref={cancel} className="button" onClick={onCancel}>Cancel</button>
        <button className="button primary" onClick={() => setStep('cleanup')}>Change shape</button>
      </div>
    </> : <>
      <h2 id="room-shape-dialog-title">Some furniture won’t fit</h2>
      <p id="room-shape-dialog-description">Furniture outside the new room or intersecting its walls will be removed.</p>
      <div className="room-shape-dialog-actions room-shape-dialog-actions-compact">
        <button ref={keep} className="button primary" onClick={() => handleApply(true)}>Keep furniture</button>
        <button className="button danger-text" onClick={() => handleApply(false)}>Delete all furniture</button>
      </div>
    </>}
  </dialog>
}
function ElevationSlider({ value, max, onCommit }: { value: number; max: number; onCommit: (value: number) => void }) {
  const [draft,setDraft]=useState(value),lastCommitted=useRef(value)
  useEffect(()=>{setDraft(value);lastCommitted.current=value},[value])
  function commit(){if(draft!==lastCommitted.current){lastCommitted.current=draft;onCommit(draft)}}
  return <label className="elevation-control">Height above floor <output>{(draft/10).toFixed(1)} cm</output><input type="range" min={0} max={max} step={10} value={draft} aria-valuetext={`${(draft/10).toFixed(1)} centimeters above floor`} onChange={(event)=>setDraft(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} /></label>
}
type RoomDimensionKey = 'widthMm' | 'depthMm' | 'heightMm'
function roomMeters(valueMm: number) { return String(valueMm / 1000) }
function minimumDSemircleDepth(widthMm: number) { return Math.ceil(widthMm / 2) }
function roomDimensionLimits(dimension: RoomDimensionKey, room: Project['room']): readonly [number, number] {
  if (dimension === 'depthMm' && room.shape === 'd-shape') return [Math.max(ROOM_LIMITS.depthMm[0], minimumDSemircleDepth(room.widthMm)), ROOM_LIMITS.depthMm[1]]
  return ROOM_LIMITS[dimension]
}
function updateRoomDimension(room: Project['room'], dimension: RoomDimensionKey, value: number) {
  room[dimension] = value
  if (room.shape === 'square' && dimension !== 'heightMm') room[dimension === 'widthMm' ? 'depthMm' : 'widthMm'] = value
  if (room.shape === 'd-shape') room.depthMm = Math.max(room.depthMm, minimumDSemircleDepth(room.widthMm))
}
function RoomDimensionControl({ label, value, limits, dimension, onPreview, onCommit, onCancel }: {
  label: string; value: number; limits: readonly [number, number]; dimension: RoomDimensionKey;
  onPreview: (value: number) => string | null; onCommit: (value: number) => string | null; onCancel: () => void
}) {
  const id = useId(), rangeId = `${id}-range`, numberId = `${id}-number`, helpId = `${id}-help`, errorId = `${id}-error`
  const [draft, setDraft] = useState(value), [text, setText] = useState(roomMeters(value)), [error, setError] = useState<string | null>(null)
  const active = useRef(false), initialValue = useRef(value), lastValidValue = useRef(value)
  useEffect(() => {
    if (active.current) return
    setDraft(value); setText(roomMeters(value)); setError(null)
    initialValue.current = value; lastValidValue.current = value
  }, [value])
  const [min, max] = limits
  const tickStep = dimension === 'heightMm' ? 250 : 1000
  const tickValues = [min]
  const firstRegularTick = (Math.floor(min / tickStep) + 1) * tickStep
  for (let tick = firstRegularTick; tick < max; tick += tickStep) tickValues.push(tick)
  if (max !== min) tickValues.push(max)
  const progress = ((draft - min) / (max - min)) * 100
  function begin() {
    if (active.current) return
    active.current = true; initialValue.current = value; lastValidValue.current = value
  }
  function preview(next: number) {
    begin()
    const clamped = Math.max(min, Math.min(max, next))
    setDraft(clamped); setText(roomMeters(clamped))
    const nextError = onPreview(clamped)
    setError(nextError)
    if (!nextError) lastValidValue.current = clamped
  }
  function finish() {
    if (!active.current) return
    active.current = false
    const finalValue = lastValidValue.current
    setDraft(finalValue); setText(roomMeters(finalValue)); setError(null)
    if (finalValue !== initialValue.current) {
      const nextError = onCommit(finalValue)
      if (nextError) {
        onCancel(); setDraft(initialValue.current); setText(roomMeters(initialValue.current)); setError(nextError)
      } else initialValue.current = finalValue
    } else onCancel()
  }
  function cancel() {
    if (!active.current) return
    active.current = false; onCancel()
    setDraft(initialValue.current); setText(roomMeters(initialValue.current)); setError(null)
    lastValidValue.current = initialValue.current
  }
  function commitTyped() {
    const next = parseMetric(text, 1000)
    if (next === null) { setError('Enter a number with up to three decimal places.'); return }
    if (next < min || next > max) { setError(`Use a value from ${roomMeters(min)} to ${roomMeters(max)} m.`); return }
    const nextError = onCommit(next)
    setError(nextError)
    if (!nextError) { setDraft(next); setText(roomMeters(next)); lastValidValue.current = next }
  }
  function handleRangeKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); return }
    const current = draft
    const steps: Record<string, number> = { ArrowLeft: -100, ArrowDown: -100, ArrowRight: 100, ArrowUp: 100, PageDown: -1000, PageUp: 1000 }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); preview(event.key === 'Home' ? min : max); return
    }
    if (steps[event.key] !== undefined) { event.preventDefault(); preview(current + steps[event.key]) }
  }
  return <div className={'room-dimension-control' + (error ? ' has-error' : '')}>
    <label className="room-dimension-label" htmlFor={numberId}>{label}<span className="sr-only"> in meters</span></label>
    <div className="room-dimension-row">
      <div className="room-dimension-slider-wrap">
        <input id={rangeId} className="room-dimension-slider" type="range" min={min} max={max} step={1} value={draft}
          aria-label={`${label} in meters`} aria-valuetext={`${roomMeters(draft)} meters`} aria-invalid={!!error} aria-describedby={[helpId, error ? errorId : ''].filter(Boolean).join(' ')}
          style={{ '--range-progress': `${progress}%` } as CSSProperties}
          onPointerDown={begin} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onBlur={finish}
          onKeyDown={handleRangeKeyDown} onKeyUp={finish} onChange={(event) => preview(Number(event.target.value))} />
        <div className="room-dimension-ticks" aria-hidden="true">
          {tickValues.map((tick) => {
            const major = dimension === 'heightMm' ? tick % 1000 === 0 : tick % 3000 === 0
            return <span key={tick} className={[major && 'major-tick', tick === min && 'tick-start', tick === max && 'tick-end'].filter(Boolean).join(' ')} style={{ '--tick-position': `${((tick - min) / (max - min)) * 100}%` } as CSSProperties}>
              <i />{major && <small>{roomMeters(tick)}</small>}
            </span>
          })}
        </div>
      </div>
      <div className="room-dimension-input-wrap">
        <input id={numberId} type="number" min={roomMeters(min)} max={roomMeters(max)} step="0.001" inputMode="decimal" autoComplete="off" spellCheck={false}
          value={text} aria-invalid={!!error} aria-describedby={[helpId, error ? errorId : ''].filter(Boolean).join(' ')}
          onChange={(event) => { setText(event.target.value); setError(null) }} onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setText(roomMeters(value)); setError(null) }
          }} />
        <span aria-hidden="true">m</span>
      </div>
    </div>
    <small id={helpId} className="room-dimension-help">{roomMeters(min)}–{roomMeters(max)} m</small>
    {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
  </div>
}
function LampIntensitySlider({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [draft,setDraft]=useState(value),lastCommitted=useRef(value)
  useEffect(()=>{setDraft(value);lastCommitted.current=value},[value])
  function commit(){if(draft!==lastCommitted.current){lastCommitted.current=draft;onCommit(draft)}}
  return <label className="lamp-intensity-control"><span className="lamp-intensity-label">Brightness <output>{draft}%</output></span><input type="range" min={0} max={100} step={1} value={draft} aria-valuetext={`${draft}% brightness`} onChange={(event)=>setDraft(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} /></label>
}
function ObjectInfoDetails({ description, inspiration, dimensions, materials, children }: { description: string; inspiration: string; dimensions: string; materials: string; children?: ReactNode }) {
  return <>
    <p className="object-description">{description}</p>
    <dl className="object-info-list">
      <div><dt>Design inspiration</dt><dd>{inspiration}</dd></div>
      <div><dt>Dimensions</dt><dd>{dimensions}</dd></div>
      <div><dt>Materials</dt><dd>{materials}</dd></div>
    </dl>
    {children}
  </>
}
class ViewportBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="viewport-fallback" role="alert"><strong>The room view couldn’t be shown.</strong><p>Your work is still here. You can continue editing or save it, then reload to try the view again.</p></div> : this.props.children }
}

export default function App() {
  const state = useEditor()
  const project = state.envelope.project
  const [roomPreview, setRoomPreview] = useState<Project['room'] | null>(null)
  const viewportProject = roomPreview ? { ...project, room: roomPreview } : project
  const selected = project.instances.find((item) => item.id === state.selectedId)
  const concept = selected ? getConcept(2, selected.conceptId) : undefined
  const commentCount = [...project.instances, ...(project.wallObjects ?? []), ...project.room.openings].reduce((count, item) => count + (item.comments?.length ?? 0), 0)
  const dirty = state.savedToken !== state.token
  const objectCount = project.instances.length + (project.wallObjects?.length ?? 0)
  const wallEntryCount = (project.wallObjects?.length ?? 0) + project.room.openings.length
  const placedFurnitureGroups = project.instances.reduce((groups, item) => {
    const group = groups.get(item.conceptId) ?? []
    group.push(item)
    groups.set(item.conceptId, group)
    return groups
  }, new Map<string, FurnitureInstance[]>())
  const [panel, setPanel] = useState<Panel | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [animationsEnabled, setAnimationsEnabled] = useState(() => readUiPreference('nook-animations-enabled', true))
  const [nightMode, setNightMode] = useState(() => readUiPreference('nook-night-mode', false))
  const [pendingRoomShape, setPendingRoomShape] = useState<RoomShape | null>(null)
  const [popover, setPopover] = useState<PopoverName | null>(null)
  const [helpVisible, setHelpVisible] = useState(false)
  const [view, setView] = useState<'isometric' | 'top'>('isometric')
  const [interactionMode, setInteractionMode] = useState<'select' | 'pan'>('select')
  const [zoom, setZoom] = useState(DEFAULT_VIEW_ZOOM)
  const [viewLocked, setViewLocked] = useState(false)
  const [wallsUp, setWallsUp] = useState(false)
  const [commentMode, setCommentMode] = useState(false)
  const [commentTargetId, setCommentTargetId] = useState<string | null>(null)
  const [commentDetailTarget, setCommentDetailTarget] = useState<{ targetId: string; commentId: string } | null>(null)
  const [wheelSelection, setWheelSelection] = useState<WheelSelection | null>(null)
  const [wheelCardMeasure, setWheelCardMeasure] = useState<{ id: string; panel: WheelPanel; height: number } | null>(null)
  const [rotationPreview, setRotationPreview] = useState<{ id: string; degrees: number } | null>(null)
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>(readSavedStyles)
  const commentTarget = commentTargetId ? project.instances.find((item) => item.id === commentTargetId) ?? project.wallObjects?.find((item) => item.id === commentTargetId) ?? project.room.openings.find((item) => item.id === commentTargetId) : undefined
  const commentTargetName = commentTarget ? ('conceptId' in commentTarget ? getConcept(2, commentTarget.conceptId)?.name ?? getWallConcept(commentTarget.conceptId)?.name ?? 'Room object' : commentTarget.type === 'window' ? getWindowStyle(commentTarget.styleId ?? '')?.name ?? 'Window' : getDoorStyle(commentTarget.styleId ?? '')?.name ?? (commentTarget.type === 'archway' ? 'Archway' : 'Door')) : ''
  const commentDetailObject = commentDetailTarget ? project.instances.find((item) => item.id === commentDetailTarget.targetId) ?? project.wallObjects?.find((item) => item.id === commentDetailTarget.targetId) ?? project.room.openings.find((item) => item.id === commentDetailTarget.targetId) : undefined
  const commentDetailRecord = commentDetailObject ? toCommentDisplay(commentDetailObject.comments).find((comment) => comment.id === commentDetailTarget?.commentId) : undefined
  const commentDetailObjectName = commentDetailObject ? ('conceptId' in commentDetailObject ? getConcept(2, commentDetailObject.conceptId)?.name ?? getWallConcept(commentDetailObject.conceptId)?.name ?? 'Room object' : commentDetailObject.type === 'window' ? getWindowStyle(commentDetailObject.styleId ?? '')?.name ?? 'Window' : getDoorStyle(commentDetailObject.styleId ?? '')?.name ?? (commentDetailObject.type === 'archway' ? 'Archway' : 'Door')) : ''
  const commentGroups = [
    ...project.instances.map((item) => ({ id: item.id, objectName: getConcept(2, item.conceptId)?.name ?? 'Room object', comments: toCommentDisplay(item.comments) })),
    ...(project.wallObjects ?? []).map((item) => ({ id: item.id, objectName: getWallConcept(item.conceptId)?.name ?? 'Wall object', comments: toCommentDisplay(item.comments) })),
    ...project.room.openings.map((item) => ({ id: item.id, objectName: item.type === 'window' ? getWindowStyle(item.styleId ?? '')?.name ?? 'Window' : getDoorStyle(item.styleId ?? '')?.name ?? (item.type === 'archway' ? 'Archway' : 'Door'), comments: toCommentDisplay(item.comments) })),
  ].filter((group) => group.comments.length > 0)
  const [resetToken, setResetToken] = useState(0)
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>()
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
  const [exportView, setExportView] = useState<ExportView>('isometric')
  const [exportDuration, setExportDuration] = useState<5 | 10>(5)
  const [exportQuality, setExportQuality] = useState<ExportQuality>('high')
  const [exportDimensions, setExportDimensions] = useState(false)
  const [exportPlan, setExportPlan] = useState(true)
  useEffect(() => {
    setExportView(view === 'top' ? 'top' : 'isometric')
    if (view === 'top') setExportFormat((current) => current === 'video' ? 'png' : current)
  }, [view])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedList, setSavedList] = useState<SavedRecord[]>([])
  const [savedError, setSavedError] = useState<string | null>(null)
  const [savedActionError, setSavedActionError] = useState<string | null>(null)
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedActionBusy, setSavedActionBusy] = useState(false)
  const [savedDeleteTarget, setSavedDeleteTarget] = useState<SavedRecord | null>(null)
  const [savedDeleteError, setSavedDeleteError] = useState<string | null>(null)
  const [pendingOpen, setPendingOpen] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [metrics, setMetrics] = useState<Record<string, number | string | boolean>>({})
  const [benchmarkToken, setBenchmarkToken] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [placementWarning, setPlacementWarning] = useState<string | null>(null)
  const [renameToast, setRenameToast] = useState<{ id: number; message: string } | null>(null)
  const diagnostics = new URLSearchParams(window.location.search).get('diagnostics') === '1'
  const savedTrigger = useRef<HTMLButtonElement>(null)
  const exportTrigger = useRef<HTMLButtonElement>(null)
  const commentsTrigger = useRef<HTMLButtonElement>(null)
  const helpTrigger = useRef<HTMLButtonElement>(null)
  const settingsPicker = useRef<HTMLDivElement>(null)
  const settingsTrigger = useRef<HTMLButtonElement>(null)
  const roomShapePicker = useRef<HTMLDivElement>(null)
  const roomShapeTrigger = useRef<HTMLButtonElement>(null)
  const panelHeading = useRef<HTMLHeadingElement>(null)
  const taskScroll = useRef<HTMLDivElement>(null)
  const viewportElement = useRef<HTMLDivElement>(null)
  const wheelCardElement = useRef<HTMLElement>(null)
  const canvasArea = useRef<HTMLElement>(null)
  const rotationDrag = useRef<RotationDrag | null>(null)
  const panelReturn = useRef<HTMLElement | null>(null)
  const previousPanel = useRef<Panel>('furniture')
  const scrollOffsets = useRef<Record<string, number>>({})
  const saveLock = useRef(false)
  const exportLock = useRef(false)
  const renameToastTimer = useRef<number | null>(null)
  const renameToastId = useRef(0)
  const pendingOpenRef = useRef<string | null>(null)
  const lastPopoverTrigger = useRef<HTMLButtonElement | null>(null)
  const scrollKey = panel === 'furniture' ? 'furniture-' + (category ?? 'all') : panel ?? 'none'
  const selectedExportFormat = exportFormats.find((format) => format.id === exportFormat) ?? exportFormats[0]
  const panelTitles: Record<Panel, string> = { room: 'Room details', furniture: category ? categories[category].name : 'Objects', placed: 'In your room', edit: 'Edit piece', wall: 'Walls', doors: 'Doors & entryways' }
  const closePopover = useCallback((restoreFocus = true) => { setPopover(null); if (restoreFocus) lastPopoverTrigger.current?.focus() }, [])
  useEffect(() => {
    if (!shapeMenuOpen) return
    const closeOutside = (event: PointerEvent) => { if (event.target instanceof Node && !roomShapePicker.current?.contains(event.target)) setShapeMenuOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setShapeMenuOpen(false); roomShapeTrigger.current?.focus() } }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [shapeMenuOpen])
  useEffect(() => {
    if (!settingsMenuOpen) return
    const closeOutside = (event: PointerEvent) => { if (event.target instanceof Node && !settingsPicker.current?.contains(event.target)) setSettingsMenuOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setSettingsMenuOpen(false); settingsTrigger.current?.focus() } }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [settingsMenuOpen])
  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', syncFullscreen)
    syncFullscreen()
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])
  useEffect(() => {
    try { window.localStorage.setItem('nook-animations-enabled', String(animationsEnabled)); window.localStorage.setItem('nook-night-mode', String(nightMode)) }
    catch { /* Preferences remain usable for this session when storage is unavailable. */ }
  }, [animationsEnabled, nightMode])
  const refreshSaved = useCallback(async () => {
    setSavedLoading(true)
    try { const { db } = await import('./persistence/db'); setSavedList((await db.projects.toArray()).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))); setSavedError(null); setSavedActionError(null) }
    catch { setSavedError('Saved options are unavailable. Check that this browser allows site storage, then try again.') }
    finally { setSavedLoading(false) }
  }, [])
  async function toggleSavedPinned(record: SavedRecord) {
    setSavedActionBusy(true); setSavedActionError(null)
    try {
      const { db } = await import('./persistence/db')
      await db.projects.update(record.id, { pinned: !record.pinned })
      setSavedList((records) => records.map((entry) => entry.id === record.id ? { ...entry, pinned: !record.pinned } : entry).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)))
    } catch { setSavedActionError('Could not update the pinned project. Please try again.') }
    finally { setSavedActionBusy(false) }
  }
  async function confirmDeleteSavedProject() {
    if (!savedDeleteTarget) return
    const id = savedDeleteTarget.id
    setSavedActionBusy(true); setSavedDeleteError(null)
    try {
      const { db } = await import('./persistence/db')
      await db.projects.delete(id)
      setSavedList((records) => records.filter((record) => record.id !== id))
      setSavedDeleteTarget(null)
    } catch { setSavedDeleteError('Could not delete this saved project. Please try again.') }
    finally { setSavedActionBusy(false) }
  }
  function togglePopover(next: PopoverName) {
    lastPopoverTrigger.current = next === 'saved' ? savedTrigger.current : next === 'exports' ? exportTrigger.current : commentsTrigger.current
    setPopover((current) => current === next ? null : next)
    if (next === 'saved') void refreshSaved()
    if (next === 'exports' && popover !== 'exports') setExportView(view === 'top' ? 'top' : 'isometric')
  }
  function toggleHelp() { setHelpVisible((visible) => !visible) }
  function previewRoomDimension(key: RoomDimensionKey, value: number) {
    const candidate = structuredClone(useEditor.getState().envelope)
    updateRoomDimension(candidate.project.room, key, value)
    const error = validateDesign(candidate)
    if (error) return error
    setRoomPreview(candidate.project.room)
    return null
  }
  function commitRoomDimension(key: RoomDimensionKey, value: number) {
    setRoomPreview(null)
    return applyWithError((next) => updateRoomDimension(next.room, key, value))
  }
  function cancelRoomDimension() { setRoomPreview(null) }
  function requestRoomShape(shape: RoomShape) {
    setShapeMenuOpen(false)
    if (shape === (project.room.shape ?? 'rectangle')) return
    setPendingRoomShape(shape)
  }
  function applyRoomShape(shape: RoomShape, keepFurniture: boolean): boolean {
    const candidate = structuredClone(project)
    candidate.room.shape = shape
    if (shape === 'square') {
      const side = Math.max(candidate.room.widthMm, candidate.room.depthMm)
      candidate.room.widthMm = side
      candidate.room.depthMm = side
    }
    if (shape === 'd-shape') candidate.room.depthMm = Math.max(candidate.room.depthMm, minimumDSemircleDepth(candidate.room.widthMm))
    const validOpenings: Project['room']['openings'] = []
    for (const opening of candidate.room.openings) {
      const length = openingBasis(candidate.room, opening.wall).length
      const fits = opening.offsetMm >= 0 && opening.widthMm > 0 && opening.offsetMm + opening.widthMm <= length && opening.sillMm >= 0 && opening.sillMm + opening.heightMm <= candidate.room.heightMm
      const overlaps = validOpenings.some((other) => other.wall === opening.wall && opening.offsetMm < other.offsetMm + other.widthMm && other.offsetMm < opening.offsetMm + opening.widthMm)
      if (fits && !overlaps) validOpenings.push(opening)
    }
    candidate.room.openings = validOpenings
    if (!keepFurniture) {
      candidate.instances = []
      candidate.wallObjects = []
    } else {
      const invalidIds = new Set(validateProjectSpatial(candidate).filter((issue) => issue.severity === 'hard' && issue.code === 'containment').flatMap((issue) => issue.instanceIds ?? []))
      candidate.instances = candidate.instances.filter((item) => !invalidIds.has(item.id))
      candidate.wallObjects = (candidate.wallObjects ?? []).filter((item) => {
        const concept = getWallConcept(item.conceptId)
        return !!concept && validateWallAttachment(candidate.room, { ...item, widthMm: concept.widthMm, heightMm: concept.heightMm, depthMm: concept.depthMm }).length === 0
      })
    }
    const error = applyWithError((next) => { Object.assign(next, candidate) })
    if (error) return false
    setRoomPreview(null)
    setWheelSelection(null)
    setRotationPreview(null)
    state.select(null)
    return true
  }
  function toggleCommentMode() {
    const next = !commentMode
    if (next) setInteractionMode('select')
    setCommentMode(next)
    state.report(next ? 'Comment mode on. Select a piece to add or review comments.' : 'Comment mode off.')
  }
  function chooseInteractionMode(next: 'select' | 'pan') {
    if (next === 'pan' && viewLocked) return
    setInteractionMode(next)
    if (next === 'pan' && commentMode) setCommentMode(false)
  }
  function showPanel(next: Panel, origin?: HTMLElement) {
    if (panel && panel !== 'edit') previousPanel.current = panel
    panelReturn.current = origin ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setPanel(next); setFocusRequest((current) => current + 1); closePopover(false)
  }
  function closePanel() {
    setPanel(null)
    if (panelReturn.current?.isConnected) panelReturn.current.focus()
    else document.querySelector<HTMLButtonElement>('[data-rail="furniture"]')?.focus()
  }
  function inspect(id: string, origin?: HTMLElement) { useEditor.getState().select(id); showPanel('edit', origin) }
  useLayoutEffect(() => { if (taskScroll.current) taskScroll.current.scrollTop = scrollOffsets.current[scrollKey] ?? 0 }, [scrollKey])
  useLayoutEffect(() => {
    const canvas = canvasArea.current
    const picker = settingsPicker.current
    if (!canvas || !picker) return
    const alignWithAxisOrigin = () => {
      const origin = canvas.querySelector(view === 'top' ? '.coordinate-widget-2d svg circle' : '.coordinate-widget-3d .coordinate-origin')
      if (!origin) return
      const originBounds = origin.getBoundingClientRect()
      const canvasBounds = canvas.getBoundingClientRect()
      const centerX = originBounds.left + originBounds.width / 2 - canvasBounds.left
      picker.style.left = `${centerX - (settingsTrigger.current?.offsetWidth ?? 64) / 2}px`
      picker.style.right = 'auto'
      picker.style.transform = 'none'
    }
    alignWithAxisOrigin()
    const resizeObserver = new ResizeObserver(alignWithAxisOrigin)
    resizeObserver.observe(canvas)
    const widget = canvas.querySelector('.coordinate-widget')
    if (widget) resizeObserver.observe(widget)
    const mutationObserver = new MutationObserver(alignWithAxisOrigin)
    mutationObserver.observe(canvas, { childList: true, subtree: true })
    window.addEventListener('resize', alignWithAxisOrigin)
    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', alignWithAxisOrigin)
    }
  }, [view])
  useEffect(() => { if (panel && focusRequest) panelHeading.current?.focus() }, [panel, focusRequest])
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncement(state.messageKind === 'error' || state.message === 'Change applied.' ? '' : state.message), 300)
    return () => window.clearTimeout(timer)
  }, [state.message, state.messageKind])
  useEffect(() => {
    setFeedbackVisible(true)
    const timer = window.setTimeout(() => setFeedbackVisible(false), 1000)
    return () => window.clearTimeout(timer)
  }, [state.message, state.messageKind, state.token])
  useEffect(() => () => { if (renameToastTimer.current !== null) window.clearTimeout(renameToastTimer.current) }, [])
  useEffect(() => { try { window.localStorage.setItem(savedStylesKey, JSON.stringify(savedStyles)) } catch { /* The style collection remains available for this session. */ } }, [savedStyles])
  useEffect(() => {
    if (!wheelSelection) return
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.object-wheel-action,.object-action-card')) return
      closeObjectWheel()
    }
    window.addEventListener('pointerdown', dismissOutside)
    return () => window.removeEventListener('pointerdown', dismissOutside)
  }, [wheelSelection])
  useLayoutEffect(() => {
    const card = wheelCardElement.current
    const selection = wheelSelection
    if (!card || !selection?.panel || selection.closing) return
    const measure = () => {
      const height = card.getBoundingClientRect().height
      setWheelCardMeasure((current) => current?.id === selection.id && current.panel === selection.panel && Math.abs(current.height - height) < 1
        ? current
        : { id: selection.id, panel: selection.panel!, height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    return () => observer.disconnect()
  }, [wheelSelection?.id, wheelSelection?.panel, wheelSelection?.closing])
  useEffect(() => {
    if (wheelSelection && !wheelSelection.closing && ![...project.instances,...(project.wallObjects??[]),...project.room.openings].some((item) => item.id === wheelSelection.id)) setWheelSelection(null)
  }, [project.instances, project.wallObjects, project.room.openings, wheelSelection])
  const apply = (update: (next: Project) => void) => state.commit(update)
  const applyWithError = (update: (next: Project) => void) => apply(update) ? null : useEditor.getState().message
  function closeObjectWheel() {
    setWheelSelection((current) => current ? current.closing ? current : { ...current, panel: null, closing: true } : null)
    setRotationPreview(null)
    rotationDrag.current = null
  }
  function updateItemFor(id: string, update: (item: FurnitureInstance) => void) {
    return applyWithError((next) => { const item = next.instances.find((entry) => entry.id === id); if (item) update(item) })
  }
  function updateWallObjectFor(id: string, update: (item: WallObject) => void) {
    const current=useEditor.getState().envelope.project,item=current.wallObjects?.find((entry)=>entry.id===id),concept=item?getWallConcept(item.conceptId):undefined
    if(!item||!concept)return 'Select a wall object first.'
    const candidate=structuredClone(item);update(candidate)
    const attachment=validateWallAttachment(current.room,{...candidate,widthMm:concept.widthMm,heightMm:concept.heightMm,depthMm:concept.depthMm})[0]?.message
    const overlap=(current.wallObjects??[]).some((other)=>{if(other.id===id||other.wall!==candidate.wall)return false;const c=getWallConcept(other.conceptId);return c&&candidate.offsetMm<other.offsetMm+c.widthMm&&other.offsetMm<candidate.offsetMm+concept.widthMm&&candidate.bottomMm<other.bottomMm+c.heightMm&&other.bottomMm<candidate.bottomMm+concept.heightMm})
    if(attachment||overlap)return attachment??'Wall objects overlap. Choose a clear section of wall.'
    return applyWithError((next) => { const target = next.wallObjects?.find((entry) => entry.id === id); if (target) update(target) })
  }
  function updateWindowFor(id: string, update: (item: WindowOpening) => void) {
    const current=useEditor.getState().envelope.project,item=current.room.openings.find((entry):entry is WindowOpening=>entry.id===id&&entry.type==='window')
    if(!item)return 'Select a window first.'
    const candidate=structuredClone(item);update(candidate)
    const next={...current,room:{...current.room,openings:[...current.room.openings.filter((entry)=>entry.id!==id),candidate]}}
    const spatial=validateProjectSpatial(next).find((issue)=>issue.severity==='hard')?.message
    const overlap=(current.wallObjects??[]).some((wallItem)=>{const c=getWallConcept(wallItem.conceptId);return c&&wallItem.wall===candidate.wall&&candidate.offsetMm<wallItem.offsetMm+c.widthMm&&wallItem.offsetMm<candidate.offsetMm+candidate.widthMm&&candidate.sillMm<wallItem.bottomMm+c.heightMm&&wallItem.bottomMm<candidate.sillMm+candidate.heightMm})
    if(spatial||overlap)return spatial??'The window overlaps a wall object. Choose another position.'
    return applyWithError((nextProject) => { const target = nextProject.room.openings.find((entry): entry is WindowOpening => entry.id === id && entry.type === 'window'); if (target) update(target) })
  }
  function normalizedDegrees(value: number) { return (Math.round(value) % 360 + 360) % 360 }
  function commitRotation(id: string, degrees: number) {
    const rotationDegrees=normalizedDegrees(degrees)
    return updateItemFor(id,(item)=>{item.rotationDegrees=rotationDegrees;item.quarterTurn=(Math.round(rotationDegrees/90)%4) as FurnitureInstance['quarterTurn']})
  }
  function openObjectWheel(id: string, screenPoint?: { x: number; y: number }) {
    const rect=viewportElement.current?.getBoundingClientRect()
    if(!rect){setWheelSelection({id,x:300,y:300,panel:null});state.select(id);return}
    const edge=116,rawX=screenPoint?screenPoint.x-rect.left:rect.width/2,rawY=screenPoint?screenPoint.y-rect.top:rect.height/2
    const x=Math.max(Math.min(edge,rect.width/2),Math.min(rect.width-Math.min(edge,rect.width/2),rawX))
    const y=Math.max(Math.min(edge,rect.height/2),Math.min(rect.height-Math.min(edge,rect.height/2),rawY))
    setPanel(null);setCategory(null);setRotationPreview(null);rotationDrag.current=null;setWheelSelection({id,x,y,panel:null});state.select(id)
  }
  function openObjectComments(id: string) { state.select(id); setCommentTargetId(id) }
  function addObjectComment(comment: string) {
    if (!commentTarget) return
    const targetId = commentTarget.id, targetName = commentTargetName
    const error = applyWithError((next) => {
      const item = next.instances.find((entry) => entry.id === targetId)
      const wallItem = next.wallObjects?.find((entry) => entry.id === targetId)
      const opening = next.room.openings.find((entry) => entry.id === targetId)
      const target = item ?? wallItem ?? opening
      if (target) target.comments = [...(target.comments ?? []), { id: crypto.randomUUID(), text: comment, createdAt: new Date().toISOString() }]
    })
    if (!error) { setCommentTargetId(null); state.report('Comment added to ' + targetName + '.', 'success') }
  }
  function updateObjectComment(targetId: string, commentId: string, action: 'toggleResolved' | 'delete') {
    let promotedCommentId: string | undefined
    const error = applyWithError((next) => {
      const target = next.instances.find((entry) => entry.id === targetId) ?? next.wallObjects?.find((entry) => entry.id === targetId) ?? next.room.openings.find((entry) => entry.id === targetId)
      if (!target) return
      const now = new Date().toISOString()
      target.comments = (target.comments ?? []).flatMap((entry, index) => {
        if (typeof entry === 'string') {
          const record: ObjectComment = { id: crypto.randomUUID(), text: entry }
          const matches = commentId === `legacy:${index}`
          if (matches && action === 'delete') return []
          if (matches) promotedCommentId = record.id
          return matches ? [{ ...record, resolvedAt: now }] : [record]
        }
        if (entry.id !== commentId) return [entry]
        if (action === 'delete') return []
        return [{ ...entry, resolvedAt: entry.resolvedAt ? undefined : now }]
      })
    })
    if (error) state.report(error, 'error')
    return error ? null : promotedCommentId
  }
  function toggleCommentResolved(targetId: string, commentId: string) {
    const promotedId = updateObjectComment(targetId, commentId, 'toggleResolved')
    if (promotedId) setCommentDetailTarget((current) => current?.targetId === targetId && current.commentId === commentId ? { ...current, commentId: promotedId } : current)
  }
  function deleteComment(targetId: string, commentId: string) {
    if (updateObjectComment(targetId, commentId, 'delete') !== null) setCommentDetailTarget(null)
  }
  const move = useCallback((id: string, xMm: number, zMm: number, placement?: FurnitureInstance) => {
    const current=useEditor.getState(),project=current.envelope.project,item=project.instances.find(entry=>entry.id===id)
    if(!item)return
    const candidate={...item,centerXMm:xMm,centerZMm:zMm,...(placement?{elevationMm:placement.elevationMm,quarterTurn:placement.quarterTurn,rotationDegrees:placement.rotationDegrees}:{})}
    const issue=furniturePlacementIssue(project,candidate)
    if(issue){current.report(issue,'warning');return}
    current.commit((next) => { const target = next.instances.find((entry) => entry.id === id); if (target) { target.centerXMm = xMm; target.centerZMm = zMm; if(placement){target.elevationMm=placement.elevationMm;target.quarterTurn=placement.quarterTurn;target.rotationDegrees=placement.rotationDegrees} } })
  }, [])
  const rotate = useCallback((id: string) => {
    const item=useEditor.getState().envelope.project.instances.find((entry)=>entry.id===id)
    if(item)commitRotation(id,(item.rotationDegrees??item.quarterTurn*90)+90)
  }, [])
  function rotateBy(id: string, degrees: number) {
    const item=useEditor.getState().envelope.project.instances.find((entry)=>entry.id===id)
    if(item)commitRotation(id,(item.rotationDegrees??item.quarterTurn*90)+degrees)
  }
  function flipObject(id: string, axis: 'flipHorizontal' | 'flipVertical') {
    updateItemFor(id,(item)=>{item[axis]=!item[axis]})
  }
  function duplicateObject(id: string) {
    const current=useEditor.getState(),source=current.envelope.project.instances.find((item)=>item.id===id)
    if(!source)return
    if(current.envelope.project.instances.length+(current.envelope.project.wallObjects?.length ?? 0)>=MAX_INSTANCES){current.report('This room already has 24 objects. Remove one before copying.','warning');return}
    const concept=getConcept(2,source.conceptId)
    if(!concept)return
    const [dx,dz]=duplicateOffset(current.envelope.project,source,concept)
    const copy:FurnitureInstance={...source,id:crypto.randomUUID(),centerXMm:source.centerXMm+dx,centerZMm:source.centerZMm+dz,finishes:{...source.finishes},comments:[]}
    if(apply((next)=>{next.instances.push(copy)})){useEditor.getState().select(copy.id);setWheelSelection((wheel)=>wheel?{...wheel,id:copy.id,x:wheel.x+Math.sign(dx)*24,y:wheel.y+Math.sign(dz)*24}:null);state.report(concept.name+' copied.','success')}
  }
  function deleteObject(id: string) {
    const item=project.instances.find((entry)=>entry.id===id),wallItem=project.wallObjects?.find((entry)=>entry.id===id),opening=project.room.openings.find((entry)=>entry.id===id)
    const name=item?getConcept(2,item.conceptId)?.name??'Object':wallItem?getWallConcept(wallItem.conceptId)?.name??'Wall object':opening?.type==='window'?getWindowStyle(opening.styleId??'')?.name??'Window':opening?getDoorStyle(opening.styleId??'')?.name??(opening.type==='archway'?'Archway':'Door'):'Opening'
    if(apply((next)=>{next.instances=next.instances.filter((entry)=>entry.id!==id);next.wallObjects=next.wallObjects?.filter((entry)=>entry.id!==id);next.room.openings=next.room.openings.filter((entry)=>entry.id!==id)})){
      state.select(null);closeObjectWheel()
      if(panel==='edit')setPanel(previousPanel.current)
      state.report(name+' removed. Choose Undo to restore it.')
    }
  }
  function saveStyle(id: string) {
    const item=project.instances.find((entry)=>entry.id===id)??project.wallObjects?.find((entry)=>entry.id===id)
    if(!item)return
    const concept=getConcept(2,item.conceptId),wallConcept=getWallConcept(item.conceptId),colors=Object.values(item.finishes).map((color)=>finishNames[color]??color).join(' · ')
    setSavedStyles((styles)=>[{id:crypto.randomUUID(),conceptId:item.conceptId,name:(concept?.name??wallConcept?.name??'Furniture')+' · '+colors,finishes:{...item.finishes}},...styles].slice(0,40))
    state.report('Style saved for reuse.','success')
  }
  function applySavedStyle(id: string, style: SavedStyle) {
    const item=project.instances.find((entry)=>entry.id===id)??project.wallObjects?.find((entry)=>entry.id===id)
    if(!item||item.conceptId!==style.conceptId)return
    if(project.instances.some((entry)=>entry.id===id))updateItemFor(id,(entry)=>{entry.finishes={...style.finishes}})
    else updateWallObjectFor(id,(entry)=>{entry.finishes={...style.finishes}})
  }
  function duplicateWallObject(id: string) {
    const current=useEditor.getState(),project=current.envelope.project,source=project.wallObjects?.find((entry)=>entry.id===id)
    if(!source){const opening=project.room.openings.find((entry)=>entry.id===id);if(!opening)return
      if(project.room.openings.length>=MAX_OPENINGS){current.report('This room already has the maximum number of wall openings.','warning');return}
      if(opening.type==='window'&&project.room.openings.filter((entry)=>entry.type==='window').length>=MAX_WINDOWS){current.report(`This room already has ${MAX_WINDOWS} windows.`,'warning');return}
      if(opening.type!=='window'&&project.room.openings.filter((entry)=>entry.type!=='window').length>=MAX_DOORWAYS){current.report(`This room already has ${MAX_DOORWAYS} doors or archways.`,'warning');return}
      const candidates=[opening.offsetMm+opening.widthMm+100,opening.offsetMm-opening.widthMm-100]
      const copy=candidates.map((value)=>({...opening,id:crypto.randomUUID(),offsetMm:value,comments:[]})).find((candidate)=>{
        const length=openingBasis(project.room,opening.wall).length
        if(candidate.offsetMm<0||candidate.offsetMm+candidate.widthMm>length)return false
        const candidateProject={...project,room:{...project.room,openings:[...project.room.openings,candidate]}}
        if(validateProjectSpatial(candidateProject).some((issue)=>issue.severity==='hard'))return false
        return !(project.wallObjects??[]).some((wallItem)=>{const c=getWallConcept(wallItem.conceptId);return c&&wallItem.wall===opening.wall&&candidate.offsetMm<wallItem.offsetMm+c.widthMm&&wallItem.offsetMm<candidate.offsetMm+candidate.widthMm&&candidate.sillMm<wallItem.bottomMm+c.heightMm&&wallItem.bottomMm<candidate.sillMm+candidate.heightMm})
      })
      if(!copy){current.report('There is no clear space for a copy on this wall.','warning');return}
      if(apply((next)=>{next.room.openings.push(copy)})){current.select(copy.id);setWheelSelection((wheel)=>wheel?{...wheel,id:copy.id,x:wheel.x+24,y:wheel.y}:null);current.report('Opening copied.','success')}return
    }
    if(project.instances.length+(project.wallObjects?.length??0)>=MAX_INSTANCES){current.report('This room already has 24 objects. Remove one before copying.','warning');return}
    const concept=getWallConcept(source.conceptId);if(!concept)return
    const length=source.wall==='N'||source.wall==='S'?project.room.widthMm:project.room.depthMm,candidates=[source.offsetMm+concept.widthMm+100,source.offsetMm-concept.widthMm-100],offset=candidates.find((value)=>value>=0&&value+concept.widthMm<=length&&!validateWallAttachment(project.room,{...source,offsetMm:value,widthMm:concept.widthMm,heightMm:concept.heightMm,depthMm:concept.depthMm}).length&&!(project.wallObjects??[]).some((other)=>{const c=getWallConcept(other.conceptId);return c&&other.wall===source.wall&&value<other.offsetMm+c.widthMm&&other.offsetMm<value+concept.widthMm&&source.bottomMm<other.bottomMm+c.heightMm&&other.bottomMm<source.bottomMm+concept.heightMm}))
    if(offset===undefined){current.report('There is no clear space for a copy on this wall.','warning');return}
    const copy:WallObject={...source,id:crypto.randomUUID(),offsetMm:offset,finishes:{...source.finishes},comments:[]}
    if(apply((next)=>{(next.wallObjects??=[]).push(copy)})){current.select(copy.id);setWheelSelection((wheel)=>wheel?{...wheel,id:copy.id,x:wheel.x+24,y:wheel.y}:null)}
  }
  function handleWheelAction(id: string, action: ObjectAction) {
    const isFloor=project.instances.some((item)=>item.id===id),wallObject=project.wallObjects?.find((item)=>item.id===id),windowItem=project.room.openings.find((item):item is WindowOpening=>item.id===id&&item.type==='window'),doorItem=project.room.openings.find((item):item is Door=>item.id===id&&item.type==='door')
    if(action==='breeze'){
      if(isFloor)updateItemFor(id,(item)=>{item.breezeEnabled=!item.breezeEnabled})
      else if(windowItem?.treatment==='curtains')updateWindowFor(id,(item)=>{item.breezeEnabled=!item.breezeEnabled})
      return
    }
    if(action==='light'){
      if(isFloor)updateItemFor(id,(item)=>{item.lampOn=!item.lampOn;item.lampLight??='white';item.lampIntensity??=75})
      else if(wallObject&&getWallConcept(wallObject.conceptId)?.category==='sconce')updateWallObjectFor(id,(item)=>{item.lampOn=!item.lampOn;item.lampLight??='white';item.lampIntensity??=75})
      return
    }
    if(action==='treatment'){if(windowItem)setWheelSelection((current)=>current?.id===id?{...current,panel:'treatment'}:current);return}
    if(action==='lampConfig'){if(isFloor||wallObject&&getWallConcept(wallObject.conceptId)?.category==='sconce')setWheelSelection((current)=>current?.id===id?{...current,panel:'lampConfig'}:current);return}
    if(action==='flipVertical'){if(isFloor)flipObject(id,'flipVertical');return}
    if(action==='flipHorizontal'){if(isFloor)flipObject(id,'flipHorizontal');else if(doorItem)applyWithError((next)=>{const door=next.room.openings.find((item):item is Door=>item.id===id&&item.type==='door');if(door)door.hinge=door.hinge==='min'?'max':'min'});return}
    if(action==='copy'){if(isFloor)duplicateObject(id);else duplicateWallObject(id);return}
    if(action==='delete'){deleteObject(id);return}
    if(action==='comment'){closeObjectWheel();openObjectComments(id);return}
    if(action==='rotate'){if(isFloor)rotateBy(id,15);return}
    if(action==='saveStyle'){if(isFloor||wallObject)saveStyle(id);return}
    if(action==='paint'&&!isFloor&&!wallObject&&!doorItem&&!project.room.openings.some((item)=>item.id===id&&item.type==='archway'))return
    const panel:WheelPanel=action==='info'?'info':action==='paint'?'paint':action==='height'?'height':'styles'
    setWheelSelection((current)=>current?.id===id?{...current,panel}:current)
  }
  function rotationStart(id: string, event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect=viewportElement.current?.getBoundingClientRect(),x=wheelSelection?.x??0,y=wheelSelection?.y??0
    const startAngle=Math.atan2(event.clientY-(rect?.top??0)-y,event.clientX-(rect?.left??0)-x)
    const item=useEditor.getState().envelope.project.instances.find((entry)=>entry.id===id)
    if(!item)return
    rotationDrag.current={id,lastAngle:startAngle,totalAngle:0,startDegrees:item.rotationDegrees??item.quarterTurn*90}
  }
  function rotationMove(id: string, event: ReactPointerEvent<HTMLButtonElement>) {
    const drag=rotationDrag.current,rect=viewportElement.current?.getBoundingClientRect()
    if(!drag||drag.id!==id)return
    const x=wheelSelection?.x??0,y=wheelSelection?.y??0,currentAngle=Math.atan2(event.clientY-(rect?.top??0)-y,event.clientX-(rect?.left??0)-x)
    let delta=currentAngle-drag.lastAngle
    while(delta>Math.PI)delta-=Math.PI*2
    while(delta< -Math.PI)delta+=Math.PI*2
    drag.totalAngle+=delta;drag.lastAngle=currentAngle
    setRotationPreview({id,degrees:normalizedDegrees(drag.startDegrees+drag.totalAngle*180/Math.PI)})
  }
  function rotationEnd(id: string) {
    const drag=rotationDrag.current
    if(drag?.id===id&&Math.abs(drag.totalAngle*180/Math.PI)>2)commitRotation(id,drag.startDegrees+drag.totalAngle*180/Math.PI)
    rotationDrag.current=null;setRotationPreview(null)
  }
  function rotationCancel() { rotationDrag.current=null;setRotationPreview(null) }
  const cameraZoomChanged = useCallback((value: number) => setZoom((current) => Math.abs(current - value) < .0001 ? current : value), [])
  function resetView() { setZoom(DEFAULT_VIEW_ZOOM); setView('isometric'); setResetToken((token) => token + 1) }
  function toggleViewLock() {
    const nextLocked = !viewLocked
    setViewLocked(nextLocked)
    if (nextLocked && interactionMode === 'pan') setInteractionMode('select')
    state.report(viewLocked ? 'View unlocked. Drag empty space to rotate, or use Angle controls.' : 'View locked. You can still arrange furniture.')
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
      else throw new Error('Full screen is unavailable in this browser.')
      setSettingsMenuOpen(false)
    } catch {
      state.report('Full screen is unavailable in this browser.', 'warning')
    }
  }
  function selectViewPreset(preset: 'front' | 'top' | 'side-left' | 'side-right') {
    if (viewLocked) return
    
    const poses = {
      top: { azimuth: 0, elevation: Math.PI / 2 - .0001 },
      front: { azimuth: 0, elevation: 0 },
      'side-left': { azimuth: -Math.PI / 2, elevation: 0 },
      'side-right': { azimuth: Math.PI / 2, elevation: 0 },
    }
    setView('isometric')
    setCameraCommand((current) => ({ token: (current?.token ?? 0) + 1, pose: poses[preset] }))
  }
  function selectAxisView(axis: 'x' | 'y' | 'z', sign: 1 | -1) {
    if (viewLocked || (axis === 'y' && sign < 0)) return
    const poses: Record<string, CameraPose> = {
      'x:1': { azimuth: Math.PI / 2, elevation: 0 },
      'x:-1': { azimuth: -Math.PI / 2, elevation: 0 },
      'y:1': { azimuth: Math.PI / 4, elevation: Math.PI / 2 - .0001 },
      'z:1': { azimuth: 0, elevation: 0 },
      'z:-1': { azimuth: Math.PI, elevation: 0 },
    }
    const pose = poses[`${axis}:${sign}`]
    if (!pose) return
    setView('isometric')
    setCameraCommand((current) => ({ token: (current?.token ?? 0) + 1, pose }))
  }
  useEffect(() => {
    function helpShortcut(event: KeyboardEvent) {
      const target = event.target
      const isHelpKey = event.key === '?' || event.key === '/' || event.code === 'Slash'
      if (!isHelpKey || event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
      if (target instanceof Element && target.closest('input,textarea,select,dialog,[contenteditable="true"],[role="textbox"]')) return
      event.preventDefault()
      setHelpVisible((visible) => !visible)
    }
    window.addEventListener('keydown', helpShortcut)
    return () => window.removeEventListener('keydown', helpShortcut)
  }, [])
  useEffect(() => {
    function historyKeys(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (event.defaultPrevented || target.isContentEditable || target.closest('input, textarea, select, dialog, .popover')) return
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) useEditor.getState().redo(); else useEditor.getState().undo(); return }
      // Keep the original quick-placement keys, but only in the focused room.
      if (!(target instanceof HTMLCanvasElement) || !target.closest('#room-workspace') || event.ctrlKey || event.metaKey || event.altKey) return
      const current = useEditor.getState()
      const item = current.envelope.project.instances.find((entry) => entry.id === current.selectedId)
      if (!item) return
      const amount = event.shiftKey ? 100 : 10
      const deltas: Record<string, [number, number]> = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }
      if (deltas[event.key]) { event.preventDefault(); move(item.id, item.centerXMm + deltas[event.key][0], item.centerZMm + deltas[event.key][1]) }
      else if (event.key.toLowerCase() === 'r') { event.preventDefault(); rotate(item.id) }
    }
    window.addEventListener('keydown', historyKeys)
    return () => window.removeEventListener('keydown', historyKeys)
  }, [move, rotate])
  async function save(): Promise<boolean> {
    if (saveLock.current) return false
    saveLock.current = true; setSaving(true); setSaveError(null)
    const start = useEditor.getState(), snapshot = structuredClone(start.envelope), { token, session } = start
    try {
      const version = await saveCapturedProject(snapshot, start.recordVersion)
      useEditor.getState().saved(snapshot.project.id, session, token, version)
      await refreshSaved()
      const current = useEditor.getState()
      return current.session === session && current.envelope.project.id === snapshot.project.id && current.token === token
    } catch (error) {
      const detail = formatError(error)
      const message = detail.includes('another session') ? 'This project was saved in another tab. Your edits are still here. Open saved projects to review the latest version before reopening.' : 'Could not save: ' + detail
      setSaveError(message); useEditor.getState().report(message, 'error'); return false
    }
    finally { saveLock.current = false; setSaving(false) }
  }
  async function open(id: string, expectedIntent?: string) {
    const start = useEditor.getState(); setOpening(true); setOpenError(null)
    try {
      const { db, readRecord } = await import('./persistence/db')
      const record = await readRecord(db, id), current = useEditor.getState()
      if (expectedIntent && pendingOpenRef.current !== expectedIntent) return
      if (current.session !== start.session || current.token !== start.token || current.envelope.project.id !== start.envelope.project.id) { const message = 'The current option changed while opening. Please try again.'; setOpenError(message); current.report(message, 'error'); return }
      current.open(record.envelope, record.recordVersion); setSaveError(null); setPanel(null); setCommentMode(false); setCommentTargetId(null); closePopover(true); pendingOpenRef.current = null; setPendingOpen(null)
    } catch (error) { const message = 'Could not open this option: ' + formatError(error); setOpenError(message); useEditor.getState().report(message, 'error') }
    finally { setOpening(false) }
  }
  function requestOpen(id: string) { if (dirty) { pendingOpenRef.current = id; setPendingOpen(id); setOpenError(null) } else void open(id) }
  function cancelOpen() { pendingOpenRef.current = null; setPendingOpen(null); setOpenError(null) }
  async function saveAndOpen() {
    const id = pendingOpenRef.current
    if (!id) return
    if (await save()) { if (pendingOpenRef.current === id) await open(id, id) }
    else if (pendingOpenRef.current === id) setOpenError('The current option could not be fully saved. Keep editing or try again; your changes are still here.')
  }
  function add(id: string, xMm?: number, zMm?: number, placement?: FurnitureInstance) {
    const definition = getConcept(2, id)
    if (!definition?.available) return
    if ((useEditor.getState().envelope.project.instances.length + (useEditor.getState().envelope.project.wallObjects?.length ?? 0)) >= MAX_INSTANCES) { state.report('This room already has 24 objects. Remove one before adding another.', 'warning'); return }
    const item: FurnitureInstance = { id: crypto.randomUUID(), conceptId: id, centerXMm: xMm ?? Math.round(project.room.widthMm / 200) * 100, centerZMm: zMm ?? Math.round(project.room.depthMm / 200) * 100, quarterTurn: placement?.quarterTurn ?? 0, ...(placement?.elevationMm !== undefined ? {elevationMm:placement.elevationMm} : {}), ...(placement?.rotationDegrees !== undefined ? {rotationDegrees:placement.rotationDegrees} : {}), finishes: defaultFinishes(definition) }
    if (xMm === undefined && zMm === undefined && furniturePlacementIssue(project,item)) {
      const positions:{x:number;z:number;distance:number}[]=[]
      for(let x=0;x<=project.room.widthMm;x+=250)for(let z=0;z<=project.room.depthMm;z+=250)positions.push({x,z,distance:(x-item.centerXMm)**2+(z-item.centerZMm)**2})
      positions.sort((a,b)=>a.distance-b.distance)
      const free=positions.find(p=>!furniturePlacementIssue(project,{...item,centerXMm:p.x,centerZMm:p.z}))
      if(!free){state.report('There is no open space for this furniture.','warning');return}
      item.centerXMm=free.x;item.centerZMm=free.z
    }
    const issue=furniturePlacementIssue(project,item)
    if(issue){state.report(issue,'warning');return}
    if (apply((next) => { next.instances.push(item) })) { state.select(item.id); if (definition.category !== 'VNT') { const current = useEditor.getState(); current.report(definition.name + ' added.' + (current.messageKind === 'warning' ? ' ' + current.message : ''), current.messageKind === 'warning' ? 'warning' : 'success') } }
  }
  function addElectronicsFloor(id: string) {
    const current = useEditor.getState(), project = current.envelope.project
    const definition = getConcept(2, id), selectedSurface = project.instances.find((item) => item.id === current.selectedId)
    const surface = selectedSurface ? getConcept(2, selectedSurface.conceptId) : undefined
    const allowedSurface = id === 'ELC-ELC-01' ? surface?.category === 'MED' : ['CFT', 'SFT', 'NST', 'MED'].includes(surface?.category ?? '')
    if (!definition?.available || !selectedSurface || !surface || !allowedSurface) { add(id); return }
    if (project.instances.length + (project.wallObjects?.length ?? 0) >= MAX_INSTANCES) { current.report('This room already has 24 objects. Remove one before adding another.', 'warning'); return }
    const item: FurnitureInstance = {
      id: crypto.randomUUID(), conceptId: id, centerXMm: selectedSurface.centerXMm, centerZMm: selectedSurface.centerZMm,
      quarterTurn: selectedSurface.quarterTurn, elevationMm: (selectedSurface.elevationMm ?? 0) + surface.dimensions.heightMm,
      finishes: defaultFinishes(definition),
      ...(selectedSurface.rotationDegrees === undefined ? {} : { rotationDegrees: selectedSurface.rotationDegrees }),
    }
    const issue = furniturePlacementIssue(project, item)
    if (issue) { current.report(issue, 'warning'); return }
    if (apply((next) => { next.instances.push(item) })) { current.select(item.id); current.report(definition.name + ' added on top.', 'success') }
  }
  function addWallCatalogItem(item: WallCatalogDrag, wall: Wall, offsetMm: number, bottomMm: number) {
    const current=useEditor.getState(),project=current.envelope.project
    if(item.kind==='wall'){
      const concept=getWallConcept(item.id);if(!concept)return
      if(project.instances.length+(project.wallObjects?.length??0)>=MAX_INSTANCES){current.report('This room already has 24 objects. Remove one before adding another.','warning');return}
      let issue=validateWallAttachment(project.room,{wall,offsetMm,bottomMm,widthMm:concept.widthMm,heightMm:concept.heightMm,depthMm:concept.depthMm})[0]?.message
      if(!issue&&(project.wallObjects??[]).some((other)=>{const c=getWallConcept(other.conceptId);return c&&other.wall===wall&&offsetMm<other.offsetMm+c.widthMm&&other.offsetMm<offsetMm+concept.widthMm&&bottomMm<other.bottomMm+c.heightMm&&other.bottomMm<bottomMm+concept.heightMm}))issue='Wall objects overlap. Choose a clear section of wall.'
      if(issue){current.report(issue,'warning');return}
      const created:WallObject={id:crypto.randomUUID(),conceptId:item.id,wall,offsetMm,bottomMm,finishes:{...concept.defaults}}
      if(apply((next)=>{(next.wallObjects??=[]).push(created)})){current.select(created.id);if(concept.category!=='appliance')current.report(concept.name+' added to the wall.','success')}
      return
    }
    if(item.kind==='door'){
      const style=getDoorStyle(item.id);if(!style)return
      const doorwayCount=project.room.openings.filter((entry)=>entry.type!=='window').length
      if(doorwayCount>=MAX_DOORWAYS||project.room.openings.length>=MAX_OPENINGS){current.report('The room already has the maximum number of doorways.','warning');return}
      const created:Opening=style.category==='archways'?{id:crypto.randomUUID(),type:'archway',styleId:style.id,wall,offsetMm,widthMm:style.widthMm,heightMm:style.heightMm,sillMm:0}:{id:crypto.randomUUID(),type:'door',styleId:style.id,hinge:'min',wall,offsetMm,widthMm:style.widthMm,heightMm:style.heightMm,sillMm:0}
      const issue=doorwayPlacementIssue(project,created)
      if(issue){current.report(issue,'warning');return}
      if(apply((next)=>{next.room.openings.push(created)})){current.select(created.id);current.report(style.name+' added to the wall.','success')}
      return
    }
    const style=getWindowStyle(item.id);if(!style)return
    const openings=project.room.openings.filter((entry)=>entry.type==='window').length
    if(openings>=MAX_WINDOWS){current.report(`This room already has ${MAX_WINDOWS} windows.`,'warning');return}
    if(project.room.openings.length>=MAX_OPENINGS){current.report('This room already has the maximum number of wall openings.','warning');return}
    const created:WindowOpening={id:crypto.randomUUID(),type:'window',styleId:style.id,wall,offsetMm,widthMm:style.widthMm,heightMm:style.heightMm,sillMm:bottomMm}
    const next={...project,room:{...project.room,openings:[...project.room.openings,created]}}
    const spatialIssue=validateProjectSpatial(next).find((entry)=>entry.severity==='hard')?.message
    const overlapsObject=(project.wallObjects??[]).some((other)=>{const c=getWallConcept(other.conceptId);return c&&other.wall===wall&&offsetMm<other.offsetMm+c.widthMm&&other.offsetMm<offsetMm+created.widthMm&&bottomMm<other.bottomMm+c.heightMm&&other.bottomMm<bottomMm+created.heightMm})
    const issue=spatialIssue??(overlapsObject?'The window overlaps a wall object. Choose another position.':null)
    if(issue){current.report(issue,'warning');return}
    if(apply((nextProject)=>{nextProject.room.openings.push(created)})){current.select(created.id);current.report(style.name+' added to the wall.','success')}
  }
  function addWallAppliance(id: string) {
    const concept=getWallConcept(id),current=useEditor.getState(),project=current.envelope.project
    if(!concept||concept.category!=='appliance')return
    if(project.instances.length+(project.wallObjects?.length??0)>=MAX_INSTANCES){current.report('This room already has 24 objects. Remove one before adding another.','warning');return}
    const walls:Wall[]=['N','E','S','W'],bottomMm=Math.max(0,Math.min(concept.preferredBottomMm??1000,project.room.heightMm-concept.heightMm))
    for(const wall of walls){
      const length=openingBasis(project.room,wall).length
      if(length<concept.widthMm)continue
      const offsets=Array.from({length:Math.floor((length-concept.widthMm)/100)+1},(_,index)=>index*100).sort((a,b)=>Math.abs(a+concept.widthMm/2-length/2)-Math.abs(b+concept.widthMm/2-length/2))
      for(const offsetMm of offsets){
        const issue=validateWallAttachment(project.room,{wall,offsetMm,bottomMm,widthMm:concept.widthMm,heightMm:concept.heightMm,depthMm:concept.depthMm})[0]
        const overlap=(project.wallObjects??[]).some((other)=>{const otherConcept=getWallConcept(other.conceptId);return !!otherConcept&&other.wall===wall&&offsetMm<other.offsetMm+otherConcept.widthMm&&other.offsetMm<offsetMm+concept.widthMm&&bottomMm<other.bottomMm+otherConcept.heightMm&&other.bottomMm<bottomMm+concept.heightMm})
        if(issue||overlap)continue
        addWallCatalogItem({kind:'wall',id},wall,offsetMm,bottomMm)
        return
      }
    }
    current.report('No clear space was found for this wall appliance.','warning')
  }
  function doorwayPlacementIssue(project:Project,opening:Exclude<Opening,{type:'window'}>) {
    const next={...project,room:{...project.room,openings:[...project.room.openings,opening]}}
    const spatial=validateProjectSpatial(next).find((entry)=>entry.severity==='hard')?.message
    if(spatial)return spatial
    const overlaps=(project.wallObjects??[]).some((item)=>{const concept=getWallConcept(item.conceptId);return concept&&item.wall===opening.wall&&opening.offsetMm<item.offsetMm+concept.widthMm&&item.offsetMm<opening.offsetMm+opening.widthMm&&opening.sillMm<item.bottomMm+concept.heightMm&&item.bottomMm<opening.sillMm+opening.heightMm})
    return overlaps?'The doorway overlaps a wall object. Choose another position.':null
  }
  function addDoorwayByStyle(styleId:string) {
    const current=useEditor.getState(),project=current.envelope.project,style=getDoorStyle(styleId)
    if(!style)return
    if(project.room.openings.length>=MAX_OPENINGS){current.report('This room already has the maximum number of wall openings.','warning');return}
    if(project.room.openings.filter((entry)=>entry.type!=='window').length>=MAX_DOORWAYS){current.report(`This room already has ${MAX_DOORWAYS} doors or archways.`,'warning');return}
    for(const wall of ['N','E','S','W'] as Wall[]){
      const length=openingBasis(project.room,wall).length
      if(length<style.widthMm)continue
      const center=Math.max(0,Math.min(length-style.widthMm,Math.round((length-style.widthMm)/200)*100))
      for(let delta=0;delta<=length;delta+=100){
        const offsets=delta===0?[center]:[center+delta,center-delta]
        for(const offsetMm of offsets){
          if(offsetMm<0||offsetMm+style.widthMm>length)continue
          const created:Opening=style.category==='archways'?{id:crypto.randomUUID(),type:'archway',styleId:style.id,wall,offsetMm,widthMm:style.widthMm,heightMm:style.heightMm,sillMm:0}:{id:crypto.randomUUID(),type:'door',styleId:style.id,hinge:'min',wall,offsetMm,widthMm:style.widthMm,heightMm:style.heightMm,sillMm:0}
          if(doorwayPlacementIssue(project,created))continue
          if(apply((next)=>{next.room.openings.push(created)})){current.select(created.id);current.report(style.name+' added to the wall.','success')}
          return
        }
      }
    }
    current.report('No clear wall space is available for this doorway.','warning')
  }
  function moveWallItem(id: string, wall: Wall, offsetMm: number, bottomMm: number) {
    const current=useEditor.getState(),project=current.envelope.project,wallItem=project.wallObjects?.find((entry)=>entry.id===id),opening=project.room.openings.find((entry)=>entry.id===id)
    if(wallItem){const concept=getWallConcept(wallItem.conceptId);if(!concept)return
      const attachmentIssue=validateWallAttachment(project.room,{...wallItem,wall,offsetMm,bottomMm,widthMm:concept.widthMm,heightMm:concept.heightMm,depthMm:concept.depthMm})[0]?.message
      const overlapsObject=(project.wallObjects??[]).some((other)=>{if(other.id===id||other.wall!==wall)return false;const c=getWallConcept(other.conceptId);return c&&offsetMm<other.offsetMm+c.widthMm&&other.offsetMm<offsetMm+concept.widthMm&&bottomMm<other.bottomMm+c.heightMm&&other.bottomMm<bottomMm+concept.heightMm})
      const issue=attachmentIssue??(overlapsObject?'Wall objects overlap. Choose a clear section of wall.':null)
      if(issue){current.report(issue,'warning');return}
      const error=applyWithError((next)=>{const target=next.wallObjects?.find((entry)=>entry.id===id);if(target){target.wall=wall;target.offsetMm=offsetMm;target.bottomMm=bottomMm}});if(error)current.report(error,'warning');return
    }
    if(opening){const nextOpening={...opening,wall,offsetMm,sillMm:opening.type==='window'?bottomMm:0},next={...project,room:{...project.room,openings:[...project.room.openings.filter((entry)=>entry.id!==id),nextOpening]}}
      const hard=validateProjectSpatial(next).find((entry)=>entry.severity==='hard')?.message,overlap=(project.wallObjects??[]).some((other)=>{const c=getWallConcept(other.conceptId);return c&&other.wall===wall&&offsetMm<other.offsetMm+c.widthMm&&other.offsetMm<offsetMm+opening.widthMm&&nextOpening.sillMm<other.bottomMm+c.heightMm&&other.bottomMm<nextOpening.sillMm+opening.heightMm})
      if(hard||overlap){current.report(hard??'The doorway overlaps a wall object. Choose another position.','warning');return}
      const error=applyWithError((nextProject)=>{const target=nextProject.room.openings.find((entry)=>entry.id===id);if(target){target.wall=wall;target.offsetMm=offsetMm;target.sillMm=nextOpening.sillMm}});if(error)current.report(error,'warning')
    }
  }
  async function exportSelectedFormat() {
    if (exportLock.current) return
    const format = view === 'top' && exportFormat === 'video' ? 'png' : exportFormat
    exportLock.current = true; setExporting(true); setExportError(null)
    try {
      let current = useEditor.getState()
      if (current.savedToken !== current.token || current.recordVersion === null) {
        if (!await save()) throw new Error('Save your room before exporting so the file includes your latest changes.')
        current = useEditor.getState()
      }
      if (current.savedToken !== current.token || current.recordVersion === null) throw new Error('The room changed while saving. Save again before exporting.')

      const envelope = structuredClone(current.envelope)
      const filenameBase = 'nook-' + (envelope.project.name.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'room')
      let file: Blob
      let extension: string = format
      if (format === 'video') {
        const { captureRoomVideo } = await import('./scene/capture')
        const result = await captureRoomVideo(envelope.project, exportView, exportDuration, { animationsEnabled, nightMode, quality: exportQuality })
        file = result.blob; extension = result.extension
      } else if (format === 'glb') {
        const { exportRoomGlb } = await import('./exports/glb')
        file = await exportRoomGlb(envelope.project)
      } else {
        const snapshot = captureSnapshot(envelope)
        const { createPlan, createPng } = await import('./exports/export')
        file = format === 'svg'
          ? new Blob([createPlan(snapshot)], { type: 'image/svg+xml' })
          : await createPng(snapshot, { view: view === 'top' ? 'top' : exportView, dimensions: exportDimensions, architecturalPlan: view === 'top' && exportPlan, animationsEnabled, nightMode })
      }
      download(file, `${filenameBase}.${extension}`)
    } catch (error) { const message = 'Could not export: ' + formatError(error); setExportError(message); useEditor.getState().report(message, 'error') }
    finally { exportLock.current = false; setExporting(false) }
  }
  const setItem = (update: (item: FurnitureInstance) => void) => selected ? applyWithError((next) => { const item = next.instances.find((entry) => entry.id === selected.id); if (item) update(item) }) : 'Select a piece first.'
  function showRenameToast() {
    const message = 'Project successfully renamed.'
    if (renameToastTimer.current !== null) window.clearTimeout(renameToastTimer.current)
    state.report(message, 'success')
    setRenameToast({ id: ++renameToastId.current, message })
    renameToastTimer.current = window.setTimeout(() => {
      setRenameToast(null)
      const current = useEditor.getState()
      if (current.message === message && current.messageKind === 'success') current.report('', 'info')
      renameToastTimer.current = null
    }, 1000)
  }
  function renameProject(name: string) {
    if (!name) return 'Enter a project name.'
    const error = applyWithError((next) => { next.name = name })
    if (!error) showRenameToast()
    return error
  }
  const ActiveViewport = view === 'top' ? PlanViewport : RoomViewport
  const feedbackIcon: IconName = state.messageKind === 'error' ? 'error' : state.messageKind === 'warning' ? 'warning' : state.messageKind === 'success' ? 'check' : 'info'
  const wheelItem=wheelSelection?project.instances.find((item)=>item.id===wheelSelection.id):undefined
  const wheelWallObject=wheelSelection?project.wallObjects?.find((item)=>item.id===wheelSelection.id):undefined
  const wheelWindow=wheelSelection?project.room.openings.find((item):item is WindowOpening=>item.id===wheelSelection.id&&item.type==='window'):undefined
  const wheelDoorway=wheelSelection?project.room.openings.find((item):item is Door|ArchwayOpening=>item.id===wheelSelection.id&&(item.type==='door'||item.type==='archway')):undefined
  const wheelConcept=wheelItem?getConcept(2,wheelItem.conceptId):undefined
  const wheelWallConcept=wheelWallObject?getWallConcept(wheelWallObject.conceptId):undefined
  const wheelWindowStyle=wheelWindow?getWindowStyle(wheelWindow.styleId??''):undefined
  const wheelDoorStyle=wheelDoorway?getDoorStyle(wheelDoorway.styleId??''):undefined
  const wheelCanCopy=!!(wheelItem||wheelWallObject||wheelWindow||wheelDoorway)&&(wheelWindow?project.room.openings.length<MAX_OPENINGS&&project.room.openings.filter((item)=>item.type==='window').length<MAX_WINDOWS:wheelDoorway?project.room.openings.length<MAX_OPENINGS&&project.room.openings.filter((item)=>item.type!=='window').length<MAX_DOORWAYS:objectCount<MAX_INSTANCES)
  const wheelLampOn=wheelItem?.lampOn===true||wheelWallObject?.lampOn===true
  const wheelActions: ObjectAction[] = wheelItem ? wheelItem.conceptId.startsWith('LMP-') ? ['info','light','lampConfig','comment','delete','rotate','height','saveStyle','paint','copy'] : wheelItem.conceptId.startsWith('PLT-') ? ['info','comment','delete','rotate','height','saveStyle','paint','copy','breeze'] : ['info','flipVertical','flipHorizontal','comment','delete','rotate','height','saveStyle','paint','copy'] : wheelWindow ? ['info','comment','delete','height','copy','treatment',...(wheelWindow.treatment==='curtains'?['breeze' as const]:[])] : wheelDoorway ? ['info','comment','delete','copy','paint',...(wheelDoorway.type==='door'?['flipHorizontal' as const]:[])] : wheelWallObject ? wheelWallConcept?.category==='sconce' ? ['info','light','lampConfig','comment','delete','height','saveStyle','paint','copy'] : ['info','comment','delete','height','saveStyle','paint','copy'] : []
  const reusableStyles=(wheelItem||wheelWallObject)?savedStyles.filter((style)=>style.conceptId===(wheelItem?.conceptId??wheelWallObject?.conceptId)):[]
  const wheelCardStyle=(panel:WheelPanel):CSSProperties=>{
    const rect=viewportElement.current?.getBoundingClientRect()
    if(!wheelSelection||!rect)return {display:'none'}
    const width=Math.max(0,Math.min(304,rect.width-24)),estimatedHeight=panel==='info'?(wheelWindow?500:430):panel==='paint'?520:panel==='height'?250:panel==='treatment'?340:panel==='lampConfig'?380:310
    const maxHeight=Math.max(0,rect.height-24)
    const height=Math.min(maxHeight,wheelCardMeasure?.id===wheelSelection.id&&wheelCardMeasure.panel===panel?wheelCardMeasure.height:estimatedHeight)
    const beside=wheelSelection.x<rect.width/2?wheelSelection.x+124:wheelSelection.x-width-124
    return {left:Math.max(12,Math.min(rect.width-width-12,beside)),top:Math.max(12,Math.min(rect.height-height-12,wheelSelection.y-height/2)),width}
  }

  return <>
    <a className="skip-link" href="#room-workspace">Skip to room workspace</a>
    <div className="app" data-theme={nightMode ? 'night' : 'light'}>
      <div className="home-nav-control"><a className="header-tool home-nav-button with-tooltip" href="/" aria-label="Go to Nook homepage"><Icon name="home" size={23} /><span className="pill-tooltip">Home</span></a></div>
      <header className="topbar" aria-label="Project toolbar">
        <div className="project-control"><ProjectNameEditor key={project.id} name={project.name} onRename={renameProject} /></div>
        <div className="header-actions">
          <button ref={savedTrigger} data-open-projects className="header-tool with-tooltip" aria-label="Open saved projects" aria-expanded={popover === 'saved'} aria-controls="saved-project-popover" onClick={() => togglePopover('saved')}><Icon name="folder" size={20} /><span className="pill-tooltip">Open saved projects</span></button>
          <button ref={exportTrigger} className="header-tool with-tooltip" aria-label="Export room" aria-expanded={popover === 'exports'} aria-controls="export-popover" onClick={() => togglePopover('exports')}><Icon name="export" size={20} /><span className="pill-tooltip">Export</span></button>
          <button className="header-tool save-tool with-tooltip" aria-label={saving ? 'Saving project' : saveError ? 'Retry saving project' : 'Save project'} title={saving ? 'Saving on this device' : saveError ? 'Retry save' : 'Save on this device'} onClick={() => void save()} disabled={saving}><Icon name="save" size={20} /><span className="pill-tooltip">{saving ? 'Saving…' : saveError ? 'Retry save' : 'Save'}</span></button>
          <button ref={commentsTrigger} className="header-tool with-tooltip comment-tool" aria-label="View comments" aria-expanded={popover === 'comments'} aria-controls="comments-popover" onClick={() => { setCommentMode(false); togglePopover('comments') }}><Icon name="comment" size={20} />{commentCount > 0 && <span className="comment-badge" aria-hidden="true">{commentCount}</span>}<span className="pill-tooltip">View object comments</span></button>
        </div>
        <span className="topbar-divider view-divider" aria-hidden="true" />
        <div className="top-view-switch" role="group" aria-label="View mode">
          <button className="with-tooltip" aria-label="2D top view" aria-pressed={view === 'top'} title={viewLocked ? 'Unlock the view to switch modes' : 'Switch to 2D top view'} disabled={viewLocked} onClick={() => setView('top')}>2D<span className="pill-tooltip">Plan view</span></button>
          <button className="with-tooltip" aria-label="3D room view" aria-pressed={view === 'isometric'} title={viewLocked ? 'Unlock the view to switch modes' : 'Switch to 3D room view'} disabled={viewLocked} onClick={() => { if (view === 'top') { setZoom((current) => Math.max(0.75, current)); setCameraCommand((current) => ({ token: (current?.token ?? 0) + 1, pose: canonicalPose() })) } setView('isometric') }}>3D<span className="pill-tooltip">3D view</span></button>
        </div>
        {popover === 'saved' && <Popover id="saved-project-popover" title="Open a saved project" triggerRef={savedTrigger} onClose={closePopover}>
          <div className="section-heading saved-project-heading"><h3 data-saved-project-heading tabIndex={-1}>Saved projects</h3><button className="button compact" onClick={() => void refreshSaved()} disabled={savedLoading}>{savedLoading ? 'Loading…' : 'Refresh'}</button></div>
          <p className="muted">Saved in this browser on this device. Clearing site data can remove them.</p>
          {savedActionError && <p className="field-error" role="alert">{savedActionError}</p>}
          {savedError ? <p className="field-error" role="alert">{savedError}</p> : savedLoading && !savedList.length ? <p role="status">Loading saved projects…</p> : !savedList.length ? <p className="empty-state">No saved projects yet. Choose Save to keep your current room.</p> : <ul className="saved-list">{savedList.map((record) => {
            const projectName = record.envelope.project.name
            return <li key={record.id} className="saved-project-row">
              <span className="saved-project-name">{projectName}</span>
              <div className="saved-project-actions">
                <button type="button" className={'saved-project-action' + (record.pinned ? ' is-pinned' : '')} aria-label={record.pinned ? `Unpin ${projectName}` : `Pin ${projectName} to top`} aria-pressed={!!record.pinned} title={record.pinned ? 'Unpin from top' : 'Pin to top'} disabled={opening || savedActionBusy} onClick={() => void toggleSavedPinned(record)}><Icon name="pin" size={18} /></button>
                <button type="button" className="saved-project-action" aria-label={`Open ${projectName}`} title="Open project" disabled={opening || savedActionBusy} onClick={() => requestOpen(record.id)}><Icon name="openExternal" size={19} /></button>
                <button type="button" className="saved-project-action saved-project-delete" aria-label={`Delete ${projectName}`} title="Delete project" disabled={opening || savedActionBusy} onClick={() => { setSavedDeleteError(null); setSavedDeleteTarget(record) }}><Icon name="trash" size={18} /></button>
              </div>
            </li>
          })}</ul>}
          {openError && !pendingOpen && <p className="field-error" role="alert">{openError}</p>}
        </Popover>}
        {popover === 'comments' && <Popover id="comments-popover" title="Comments" triggerRef={commentsTrigger} onClose={closePopover} className="comments-popover">
          <button type="button" className="button compact comment-mode-start" onClick={() => { closePopover(false); toggleCommentMode() }}><Icon name="comment" size={17} />Comment on an object</button>
          {commentGroups.length === 0 ? <p className="empty-state">No comments yet. Add a note to an object in the room.</p> : <div className="comment-groups">{commentGroups.map((group) => <details key={group.id} className="comment-group">
            <summary className="comment-object-open" aria-controls={`comments-for-${group.id}`}>
              <span className="comment-object-name">{group.objectName}</span>
              <span className="comment-object-count" aria-label={`${group.comments.length} ${group.comments.length === 1 ? 'comment' : 'comments'}`}>{group.comments.length}</span>
              <Icon name="chevron" size={18} />
            </summary>
            <div id={`comments-for-${group.id}`} className="comment-group-items">
              <CommentItems comments={group.comments} onOpenComment={(commentId) => { closePopover(false); setCommentDetailTarget({ targetId: group.id, commentId }) }} />
            </div>
          </details>)}</div>}
        </Popover>}
        {popover === 'exports' && <Popover id="export-popover" title="Export room" triggerRef={exportTrigger} onClose={closePopover}>
          <p className="export-field-label">File type</p>
          <details className="export-format-dropdown">
            <summary className="export-format-trigger" aria-label={`File type: ${selectedExportFormat.label}`} aria-disabled={exporting || saving} onClick={(event) => { if (exporting || saving) event.preventDefault() }}>
              <Icon name={selectedExportFormat.icon} size={22} />
              <span><strong>{selectedExportFormat.label}</strong><small>{selectedExportFormat.description}</small></span>
              <span className="export-format-chevron"><Icon name="chevron" size={18} /></span>
            </summary>
            <div className="export-format-options" role="group" aria-label="Choose a file type">
              <div className="export-format-options-inner">
                {exportFormats.filter((format) => view !== 'top' || format.id !== 'video').map((format) => <button key={format.id} type="button" className="export-format-option" disabled={exporting || saving} aria-pressed={exportFormat === format.id} onClick={(event) => { setExportFormat(format.id); if (format.id === 'video' && exportFormat !== 'video') setExportView('isometric'); const dropdown = event.currentTarget.closest('details'); if (dropdown) { dropdown.open = false; dropdown.querySelector('summary')?.focus() } }}>
                  <Icon name={format.icon} size={22} />
                  <span><strong>{format.label}</strong><small>{format.description}</small></span>
                  {exportFormat === format.id && <Icon name="check" size={18} />}
                </button>)}
              </div>
            </div>
          </details>
          {(exportFormat === 'png' || exportFormat === 'video') && <div className="export-settings">
            {view !== 'top' && <fieldset className="export-view-picker"><legend className="export-setting-label">Views</legend>
              <div className="export-view-options" role="group" aria-label="Choose export view">{exportViewOptions.map(({ id, label, face }) => <button key={id} type="button" className="export-view-option" aria-label={label} title={label} aria-pressed={exportView === id} disabled={exporting || saving} onClick={() => setExportView(id)}><CubeViewIcon face={face} /><span className="sr-only">{label}</span></button>)}</div>
            </fieldset>}
            {exportFormat === 'video' ? <>
              <fieldset className="export-duration"><legend>Duration</legend>{([5, 10] as const).map((seconds) => <label key={seconds}><input type="radio" name="export-duration" value={seconds} checked={exportDuration === seconds} disabled={exporting || saving} onChange={() => setExportDuration(seconds)} /> {seconds} seconds</label>)}</fieldset>
              <fieldset className="export-quality"><legend>Quality</legend><div className="export-quality-options">{([{ id: 'low', label: 'Low', detail: '720p' }, { id: 'high', label: 'High', detail: '1080p' }] as const).map((option) => <label key={option.id} className={'export-quality-option' + (exportQuality === option.id ? ' is-selected' : '')}><input type="radio" name="export-quality" value={option.id} checked={exportQuality === option.id} disabled={exporting || saving} onChange={() => setExportQuality(option.id)} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></label>)}</div></fieldset>
            </> : <>
              <label className="export-check"><input type="checkbox" checked={exportDimensions} disabled={exporting || saving} onChange={(event) => setExportDimensions(event.target.checked)} /> Show room measurements</label>
              {view === 'top' && <label className="export-check"><input type="checkbox" checked={exportPlan} disabled={exporting || saving} onChange={(event) => setExportPlan(event.target.checked)} /> Architectural floor plan</label>}
            </>}
          </div>}
          <p className="export-save-note">Save before exporting to include your latest changes.</p>
          {exporting && <p className="export-progress" role="status">Preparing {selectedExportFormat.label}…</p>}
          {exportError && <p className="field-error" role="alert">{exportError}</p>}
          <button className="button primary full-width export-submit" disabled={exporting || saving} onClick={() => void exportSelectedFormat()}>{saving ? 'Saving…' : exporting ? 'Preparing…' : dirty || state.recordVersion === null ? 'Save & export' : `Export ${selectedExportFormat.label}`}</button>
        </Popover>}

      </header>
      <div className={'canvas-brand' + (nightMode ? ' is-night' : '')} aria-label="Nook room planner"><img className="brand-mark" src={nightMode ? '/site/images/logos/nook-icon-lime-transparent.svg' : '/site/images/logos/nook-icon-blue-transparent.svg'} alt="" aria-hidden="true"/><strong>NOOK</strong></div>
      <div className={'workbench' + (panel ? ' has-panel has-furniture-panel' : '')}>
        <nav className="tool-rail" aria-label="Room tools">
          <div className="rail-mode-tools" role="group" aria-label="Pointer tool">
            <button type="button" className="rail-button rail-mode-button with-tooltip" aria-label="Select tool" aria-pressed={interactionMode === 'select'} title="Select furniture" onClick={() => chooseInteractionMode('select')}><Icon name="cursor" size={22} /><span className="sr-only">Select</span><span className="rail-tooltip" aria-hidden="true">Select</span></button>
            <button type="button" className="rail-button rail-mode-button with-tooltip" aria-label="Pan tool" aria-pressed={interactionMode === 'pan'} title={viewLocked ? 'Unlock the view to pan' : 'Pan the view'} disabled={viewLocked} onClick={() => chooseInteractionMode('pan')}><Icon name="hand" size={22} /><span className="sr-only">Pan</span><span className="rail-tooltip" aria-hidden="true">Pan{viewLocked ? ' · unlock view first' : ''}</span></button>
          </div>
          <span className="rail-separator" aria-hidden="true" />
          {([{ key: 'room', name: 'Room', icon: 'room' }, { key: 'furniture', name: 'Object', icon: 'furniture' }, { key: 'wall', name: 'Walls', icon: 'brickWall' }, { key: 'doors', name: 'Doors & entryways', icon: 'door' }, { key: 'placed', name: 'In room', icon: 'items' }] as const).map((tool) => <button key={tool.key} data-rail={tool.key} className="rail-button with-tooltip" aria-label={tool.key === 'placed' ? `In room, ${objectCount} pieces` : tool.name} aria-expanded={panel === tool.key} aria-controls="task-panel" onClick={(event) => { if (panel === tool.key) closePanel(); else showPanel(tool.key, event.currentTarget) }}><Icon name={tool.icon} size={23} /><span className="sr-only">{tool.name}</span><span className="rail-tooltip" aria-hidden="true">{tool.name}{tool.key === 'placed' ? ` · ${objectCount}` : ''}</span></button>)}
          <span className="rail-separator" aria-hidden="true" />
          <div className="rail-history" role="group" aria-label="Edit history">
            <button className="rail-button with-tooltip" aria-label="Undo" aria-keyshortcuts="Control+Z Meta+Z" onClick={state.undo} disabled={!state.past.length}><Icon name="undo" size={20} /><span className="rail-tooltip" aria-hidden="true">Undo · ⌘Z / Ctrl+Z</span></button>
            <button className="rail-button with-tooltip" aria-label="Redo" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z" onClick={state.redo} disabled={!state.future.length}><Icon name="redo" size={20} /><span className="rail-tooltip" aria-hidden="true">Redo · ⌘⇧Z / Ctrl+Shift+Z</span></button>
          </div>
        </nav>
        {panel && <aside key={panel} className={'task-panel'+(panel==='furniture'||panel==='wall'||panel==='doors'?' furniture-panel':'')+(panel==='placed'?' placed-panel':'')} id="task-panel" aria-labelledby="task-heading" onKeyDown={(event) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); closePanel() } }}>
          <div className="task-heading"><h2 id="task-heading" ref={panelHeading} tabIndex={-1}>{panelTitles[panel]}</h2><button className="icon-button" aria-label="Close task panel" onClick={closePanel}><Icon name="close" /></button></div>
          <div className="catalog-room-meta"><span><Icon name="room" size={15} />{project.room.widthMm / 1000} × {project.room.depthMm / 1000} m</span><span>{objectCount} {objectCount === 1 ? 'object' : 'objects'} placed</span></div>
          <div ref={taskScroll} className="task-content" onScroll={(event) => { scrollOffsets.current[scrollKey] = event.currentTarget.scrollTop }}>
            {panel === 'wall' && <WallPanel project={project} select={state.select} addObject={(item) => applyWithError((next) => { (next.wallObjects ??= []).push(item) })} addWindow={(item) => applyWithError((next) => { next.room.openings.push(item) })} report={(message) => state.report(message, 'error')} />}
            {panel === 'doors' && <DoorsPanel disabled={project.room.openings.length >= MAX_OPENINGS || project.room.openings.filter((opening) => opening.type !== 'window').length >= MAX_DOORWAYS} onAdd={addDoorwayByStyle} />}
            {panel === 'room' && <><p className="muted">Set the inside dimensions of your room.</p><div className="room-fields">{([{ key: 'widthMm', label: 'Width' }, { key: 'depthMm', label: 'Depth' }, { key: 'heightMm', label: 'Wall height' }] as const).map(({ key, label }) => <RoomDimensionControl key={key} dimension={key} label={label} value={roomPreview?.[key] ?? project.room[key]} limits={roomDimensionLimits(key, roomPreview ?? project.room)} onPreview={(value) => previewRoomDimension(key, value)} onCommit={(value) => commitRoomDimension(key, value)} onCancel={cancelRoomDimension} />)}</div></>}
            {panel === 'furniture' && <>{category === 'ELC' ? <ElectronicsPanel disabled={objectCount >= MAX_INSTANCES} onBack={() => { setCategory(null); setFocusRequest((value) => value + 1) }} onAddFloor={addElectronicsFloor} onAddWall={addWallAppliance} /> : category === 'VNT' ? <AppliancePanel disabled={objectCount >= MAX_INSTANCES} onBack={() => { setCategory(null); setFocusRequest((value) => value + 1) }} onAddFloor={add} onAddWall={addWallAppliance} /> : category ? <><button className="button back-button" onClick={() => { setCategory(null); setFocusRequest((value) => value + 1) }}><Icon name="back" size={17} />All objects</button><div className="catalog-items">{availableCatalog.filter((entry) => entry.category === category).map((entry) => <button className="catalog-tile" key={entry.id} type="button" disabled={objectCount >= MAX_INSTANCES} aria-label={'Add ' + entry.name + ' to room'} title={'Add ' + entry.name + ' to room'} draggable={objectCount < MAX_INSTANCES} onDragStart={(event)=>{setActiveFurnitureDrag(entry.id);event.dataTransfer.setData(FURNITURE_DRAG_TYPE,entry.id);event.dataTransfer.effectAllowed='copy';hideFurnitureDragImage(event.dataTransfer)}} onDragEnd={()=>{setActiveFurnitureDrag(null);setPlacementWarning(null)}} onClick={() => add(entry.id)}><FurnitureThumbnail concept={entry} fallback={categories[category].icon} /></button>)}</div></> : <div className="category-list">{Object.entries(categories).map(([id, definition]) => <button key={id} className="category-button" aria-label={definition.name} title={definition.name} onClick={() => { setCategory(id); setFocusRequest((value) => value + 1) }}><Icon name={definition.icon} size={25} /><span>{definition.name}</span></button>)}</div>}{objectCount >= MAX_INSTANCES && <p className="advice">This room has 24 pieces. Remove one to add another.</p>}</>}
            {panel === 'placed' && <>
              {!objectCount && !wallEntryCount ? <div className="empty-state"><p>Your room is empty.</p><button className="button primary" onClick={(event) => showPanel('furniture', event.currentTarget)}>Add furniture</button></div> : <div className="placed-categories">
                <details className="placed-category">
                  <summary className="placed-category-trigger" aria-label={`Floor Objects, ${project.instances.length} placed`}><Icon name="furniture" size={25} /><span className="placed-category-name">Floor Objects</span><span className="placed-count">{project.instances.length}</span></summary>
                  <div className="placed-object-grid">{Array.from(placedFurnitureGroups, ([conceptId, items]) => {
                    const itemConcept = getConcept(2, conceptId)
                    if (!itemConcept) return null
                    const target = items.find((item) => item.id === state.selectedId) ?? items[0]
                    return <button key={conceptId} type="button" className="placed-object-tile" aria-label={`Select ${itemConcept.name} (${items.length} in room)`} aria-current={items.some((item) => item.id === selected?.id) ? 'true' : undefined} onClick={(event) => inspect(target.id, event.currentTarget)}>
                      <FurnitureThumbnail concept={itemConcept} fallback={categories[itemConcept.category]?.icon ?? 'furniture'} />
                      <span className="placed-object-count" aria-hidden="true">{items.length}</span>
                    </button>
                  })}</div>
                </details>
                {!!project.wallObjects?.length && <details className="placed-category">
                  <summary className="placed-category-trigger" aria-label={`Wall Objects, ${project.wallObjects?.length ?? 0} placed`}><Icon name="brickWall" size={25} /><span className="placed-category-name">Wall Objects</span><span className="placed-count">{project.wallObjects?.length ?? 0}</span></summary>
                  <ul className="placed-list">
                    {(project.wallObjects ?? []).map((item) => <li key={item.id}><button className="placed-item" aria-label={'Select ' + (getWallConcept(item.conceptId)?.name ?? 'wall object')} aria-current={item.id === state.selectedId ? 'true' : undefined} onClick={() => openObjectWheel(item.id)}><span>{getWallConcept(item.conceptId)?.name ?? item.conceptId}</span><Icon name="chevron" size={17} /></button></li>)}
                  </ul>
                </details>}
                {!!project.room.openings.filter((item) => item.type !== 'window').length && <details className="placed-category" open>
                  <summary className="placed-category-trigger" aria-label={`Doors and openings, ${project.room.openings.filter((item) => item.type !== 'window').length} placed`}><Icon name="door" size={25} /><span className="placed-category-name">Doors & openings</span><span className="placed-count">{project.room.openings.filter((item) => item.type !== 'window').length}</span></summary>
                  <ul className="placed-list">{project.room.openings.filter((item): item is Door | ArchwayOpening => item.type === 'door' || item.type === 'archway').map((item) => {
                    const label = getDoorStyle(item.styleId ?? '')?.name ?? (item.type === 'archway' ? 'Archway' : 'Door')
                    return <li key={item.id}><button className="placed-item" aria-label={'Select ' + label} aria-current={item.id === state.selectedId ? 'true' : undefined} onClick={() => openObjectWheel(item.id)}><span>{label}</span><Icon name="chevron" size={17} /></button></li>
                  })}</ul>
                </details>}
                {!!project.room.openings.filter((item) => item.type === 'window').length && <details className="placed-category">
                  <summary className="placed-category-trigger" aria-label={`Windows, ${project.room.openings.filter((item) => item.type === 'window').length} placed`}><Icon name="window" size={25} /><span className="placed-category-name">Windows</span><span className="placed-count">{project.room.openings.filter((item) => item.type === 'window').length}</span></summary>
                  <ul className="placed-list">{project.room.openings.filter((item): item is WindowOpening => item.type === 'window').map((item) => <li key={item.id}><button className="placed-item" aria-label={'Select ' + (getWindowStyle(item.styleId ?? '')?.name ?? 'window')} aria-current={item.id === state.selectedId ? 'true' : undefined} onClick={() => openObjectWheel(item.id)}><span>{getWindowStyle(item.styleId ?? '')?.name ?? 'Window'}</span><Icon name="chevron" size={17} /></button></li>)}</ul>
                </details>}
              </div>}
            </>}
            {panel === 'edit' && <><button className="button back-button" onClick={(event) => showPanel(previousPanel.current === 'edit' ? 'furniture' : previousPanel.current, event.currentTarget)}><Icon name="back" size={17} />{previousPanel.current === 'placed' ? 'In your room' : previousPanel.current === 'room' ? 'Room details' : 'Furniture'}</button>{selected && concept ? <div key={selected.id} className="piece-editor"><h3 className="piece-name">{concept.name}</h3><p className="muted">{concept.dimensions.widthMm / 10} × {concept.dimensions.depthMm / 10} × {concept.dimensions.heightMm / 10} cm</p><button className="button full-width" onClick={() => rotate(selected.id)}><Icon name="rotate" size={18} />Rotate 90°<span className="button-end">{selected.rotationDegrees ?? selected.quarterTurn * 90}°</span></button>
              <h3>Materials</h3>{concept.category === 'RUG' ? <>
                <FinishSwatches region="Ground" options={concept.finishes?.TextileGround.allowed ?? []} value={selected.finishes.TextileGround} onChange={(color) => setItem((item) => { item.finishes.TextileGround = color })} />
                <FinishSwatches region={selected.conceptId === 'RUG-MCM-01' ? 'Pattern' : 'Border'} options={concept.finishes?.TextileMotif.allowed ?? []} value={selected.finishes.TextileMotif} onChange={(color) => setItem((item) => { item.finishes.TextileMotif = color })} />
                <button className="button full-width" onClick={() => setItem((item) => { [item.finishes.TextileGround, item.finishes.TextileMotif] = [item.finishes.TextileMotif, item.finishes.TextileGround] })}>Swap rug colors</button>
              </> : Object.entries(concept.finishes ?? {}).map(([region, rule]) => <FinishSwatches key={region} region={region} options={rule.allowed} value={selected.finishes[region]} onChange={(color) => setItem((item) => { item.finishes[region] = color })} />)}
              <button className="button danger-text full-width remove-button" onClick={() => deleteObject(selected.id)}><Icon name="trash" size={18} />Remove piece</button>
            </div> : <div className="empty-state"><p>Select a piece to edit it.</p><button className="button" onClick={(event) => showPanel('placed', event.currentTarget)}>Find a piece in your room</button></div>}</>}
          </div>
        </aside>}
        <main ref={canvasArea} className={'canvas-area' + (interactionMode === 'pan' ? ' pan-mode' : '') + (nightMode ? ' is-night' : '')} id="room-workspace" tabIndex={-1} aria-label="Room workspace">
          <h1 className="sr-only">Living room planner</h1>
          <div className="canvas-meta"><div className="canvas-meta-summary"><span><Icon name="room" size={15} />{viewportProject.room.widthMm / 1000} × {viewportProject.room.depthMm / 1000} m</span><span>{objectCount} {objectCount === 1 ? 'object' : 'objects'} placed</span></div></div>
          <div className="viewport" ref={viewportElement}><ViewportBoundary><ActiveViewport project={viewportProject} sessionToken={state.session} selectedId={state.selectedId} view={view} zoom={zoom} wallsUp={wallsUp} animationsEnabled={animationsEnabled} nightMode={nightMode} interactionMode={interactionMode} viewLocked={viewLocked} commentMode={commentMode} onCommentTarget={openObjectComments} resetToken={resetToken} cameraCommand={cameraCommand} onAxisSelect={selectAxisView} rotationPreview={rotationPreview} onZoomChange={cameraZoomChanged}
            onSelect={(id) => {state.select(id);if(!id){setPanel(null);setCategory(null);closeObjectWheel()}}} onInspect={(id,point)=>openObjectWheel(id,point)} onMoveCommit={move} onAddAt={add} onWallMoveCommit={moveWallItem} onWallAddAt={addWallCatalogItem} onPlacementWarning={setPlacementWarning} onStatus={state.report} diagnostics={diagnostics} benchmarkToken={benchmarkToken || undefined} onMetrics={(next) => setMetrics((current) => ({ ...current, ...next }))} /></ViewportBoundary></div>
          <div className="settings-picker" ref={settingsPicker}>
            <button ref={settingsTrigger} type="button" className="settings-trigger" aria-label="Settings" aria-expanded={settingsMenuOpen} aria-controls="settings-options" title="Settings" onClick={() => setSettingsMenuOpen((open) => !open)}>
              <Icon name="settings" size={23} /><span className="settings-tooltip" aria-hidden="true">Settings</span>
            </button>
            <div id="settings-options" className={'settings-options' + (settingsMenuOpen ? ' is-open' : '')} role="group" aria-label="Room settings" aria-hidden={!settingsMenuOpen}>
              <button type="button" className="settings-option" aria-label={animationsEnabled ? 'Turn animations off' : 'Turn animations on'} aria-pressed={animationsEnabled} title={animationsEnabled ? 'Animations on' : 'Animations off'} tabIndex={settingsMenuOpen ? 0 : -1} onClick={() => setAnimationsEnabled((enabled) => !enabled)}>
                <Icon name="wind" size={21} /><span className="settings-tooltip" aria-hidden="true">Animations {animationsEnabled ? 'on' : 'off'}</span>
              </button>
              <button type="button" className="settings-option" aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'} aria-pressed={isFullscreen} title={isFullscreen ? 'Exit full screen' : 'Full screen'} tabIndex={settingsMenuOpen ? 0 : -1} onClick={() => void toggleFullscreen()}>
                <Icon name={isFullscreen ? 'minimize' : 'expand'} size={21} /><span className="settings-tooltip" aria-hidden="true">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
              </button>
              <button type="button" className="settings-option" aria-label={nightMode ? 'Switch to day mode' : 'Switch to night mode'} aria-pressed={nightMode} title={nightMode ? 'Night mode · switch to day' : 'Day mode · switch to night'} tabIndex={settingsMenuOpen ? 0 : -1} onClick={() => setNightMode((enabled) => !enabled)}>
                <Icon name={nightMode ? 'moon' : 'sun'} size={21} /><span className="settings-tooltip" aria-hidden="true">{nightMode ? 'Switch to day mode' : 'Switch to night mode'}</span>
              </button>
              <button ref={helpTrigger} type="button" className="settings-option" aria-label={helpVisible ? 'Hide help' : 'Show help'} aria-keyshortcuts="/ ?" title="Show/Hide help · ? or /" aria-expanded={helpVisible} aria-controls="help-popover" tabIndex={settingsMenuOpen ? 0 : -1} onClick={toggleHelp}>
                <Icon name="info" size={21} /><span className="settings-tooltip" aria-hidden="true">Show/Hide help · ? or /</span>
              </button>
            </div>
          </div>
          <div className="room-shape-picker" ref={roomShapePicker}>
            <button ref={roomShapeTrigger} data-room-shape-trigger type="button" className="room-shape-trigger" aria-label="Room Shape" aria-expanded={shapeMenuOpen} aria-controls="room-shape-options" title="Room Shape" onClick={() => setShapeMenuOpen((open) => !open)}>
              <Icon name="roomShape" size={23} />
              <span className="room-shape-tooltip" aria-hidden="true">Room Shape</span>
            </button>
            <div id="room-shape-options" className={'room-shape-options' + (shapeMenuOpen ? ' is-open' : '')} role="group" aria-label="Choose a room shape" aria-hidden={!shapeMenuOpen}>
              {roomShapeOptions.map((option) => <button key={option.id} type="button" className="room-shape-option" aria-label={option.label} aria-pressed={(project.room.shape ?? 'rectangle') === option.id} title={option.label} tabIndex={shapeMenuOpen ? 0 : -1} onClick={() => requestRoomShape(option.id)}>
                <Icon name={option.icon} size={22} /><span className="room-shape-tooltip" aria-hidden="true">{option.label}</span>
              </button>)}
            </div>
          </div>
          {wheelSelection && <div className="object-action-layer">
            <ObjectActionWheel x={wheelSelection.x} y={wheelSelection.y} canCopy={wheelCanCopy} actions={wheelActions} breezeEnabled={wheelItem?.breezeEnabled===true||wheelWindow?.breezeEnabled===true} lampOn={wheelLampOn} closing={!!wheelSelection.closing} onCloseComplete={()=>setWheelSelection(null)} onAction={(action)=>handleWheelAction(wheelSelection.id,action)} onRotateStart={(event)=>{if(wheelItem)rotationStart(wheelItem.id,event)}} onRotateMove={(event)=>{if(wheelItem)rotationMove(wheelItem.id,event)}} onRotateEnd={()=>{if(wheelItem)rotationEnd(wheelItem.id)}} onRotateCancel={rotationCancel} />
            {wheelSelection.panel && (wheelItem&&wheelConcept||wheelWallObject&&wheelWallConcept||wheelWindow||wheelDoorway) && <section ref={wheelCardElement} className={'object-action-card'+(wheelSelection.panel==='info'?' object-info-card':'')} aria-labelledby="object-action-heading" style={wheelCardStyle(wheelSelection.panel)}>
              <header className="object-action-card-heading"><div><h2 id="object-action-heading">{{info:'Object info',paint:'Color',height:'Height',styles:'Saved styles',treatment:'Window treatment',lampConfig:'Lamp Configuration'}[wheelSelection.panel]}</h2><p>{wheelConcept?.name??wheelWallConcept?.name??wheelWindowStyle?.name??(wheelWindow?'Window':wheelDoorStyle?.name??(wheelDoorway?.type==='archway'?'Archway':'Door'))}</p></div><button className="icon-button" aria-label="Close object details" onClick={()=>setWheelSelection((current)=>current?{...current,panel:null}:null)}><Icon name="close" size={18} /></button></header>
              {wheelSelection.panel==='info'&&wheelItem&&wheelConcept&&<ObjectInfoDetails description={wheelConcept.description} inspiration={catalogDesignInspiration(wheelConcept)} dimensions={`${wheelConcept.dimensions.widthMm/10} × ${wheelConcept.dimensions.depthMm/10} × ${wheelConcept.dimensions.heightMm/10} cm (W × D × H)`} materials={catalogMaterialsDescription(wheelConcept)} />}
              {wheelSelection.panel==='info'&&wheelWallObject&&wheelWallConcept&&<ObjectInfoDetails description={wheelWallConcept.description} inspiration={wheelWallConcept.designInspiration} dimensions={`${wheelWallConcept.widthMm/10} × ${wheelWallConcept.heightMm/10} × ${wheelWallConcept.depthMm/10} cm (W × H × projection)`} materials={wallMaterialsDescription(wheelWallConcept)} />}
              {wheelSelection.panel==='info'&&wheelWindow&&<ObjectInfoDetails description={wheelWindowStyle?.description??'A glazed window set into the room wall.'} inspiration={wheelWindowStyle?.designInspiration??'A contemporary window design.'} dimensions={`Opening ${wheelWindow.widthMm/10} × ${wheelWindow.heightMm/10} cm`} materials={wheelWindowStyle?.materialsDescription??'A frame and glazing-look panels.'}>
                <div className="object-size-fields"><NumberField label="Width" value={wheelWindow.widthMm} scale={10} unit="cm" limits={[300,3000]} onCommit={(value)=>updateWindowFor(wheelWindow.id,(item)=>{item.widthMm=value})} /><NumberField label="Height" value={wheelWindow.heightMm} scale={10} unit="cm" limits={[300,2500]} onCommit={(value)=>updateWindowFor(wheelWindow.id,(item)=>{item.heightMm=value})} /></div>
              </ObjectInfoDetails>}
              {wheelSelection.panel==='info'&&wheelDoorway&&<ObjectInfoDetails description={wheelDoorStyle?.description??(wheelDoorway.type==='archway'?'An open passage through the wall, with no door leaf.':'A door fitted into the wall opening.')} inspiration={wheelDoorStyle?.inspiration??'A simple, practical doorway.'} dimensions={`Opening ${wheelDoorway.widthMm/10} × ${wheelDoorway.heightMm/10} cm · ${wheelDoorway.wall} wall`} materials={doorMaterialsDescription(wheelDoorStyle)} />}
              {wheelSelection.panel==='treatment'&&wheelWindow&&<div className="window-treatment-options" role="group" aria-label="Window treatments"><p>Each treatment follows the window’s full width.</p><div className="window-treatment-choices">
                {([{id:'none',label:'None',icon:'window'},{id:'blinds',label:'Blinds',icon:'blinds'},{id:'curtains',label:'Curtains',icon:'curtains'}] as const).map((option)=><button key={option.id} type="button" className="window-treatment-choice" aria-pressed={(wheelWindow.treatment??'none')===option.id} onClick={()=>updateWindowFor(wheelWindow.id,(item)=>{if(option.id==='none'){delete item.treatment;delete item.breezeEnabled;delete item.treatmentColor}else{item.treatment=option.id;item.treatmentColor??=option.id==='curtains'?'OFF':'OAT';if(option.id!=='curtains')delete item.breezeEnabled}})}><Icon name={option.icon} size={20} /><span>{option.label}</span></button>)}
              </div>{wheelWindow.treatment&&<fieldset className="treatment-color-fieldset"><legend>Treatment color</legend><div className="treatment-color-swatches color-swatches">{treatmentColorOptions.map((option)=><button key={option.id} type="button" className="color-swatch-button" aria-label={option.label} aria-pressed={(wheelWindow.treatmentColor??(wheelWindow.treatment==='curtains'?'OFF':'OAT'))===option.id} onClick={()=>updateWindowFor(wheelWindow.id,(item)=>{item.treatmentColor=option.id})}><span className="color-swatch-dot" aria-hidden="true" style={{background:option.color}} /></button>)}</div></fieldset>}</div>}
              {wheelSelection.panel==='lampConfig'&&((wheelItem&&wheelConcept?.category==='LMP')||(wheelWallObject&&wheelWallConcept?.category==='sconce'))&&<><div className="lamp-light-options" role="group" aria-label="Lamp light color">{lampLightOptions.map((option)=><button key={option.id} type="button" className="lamp-light-choice" aria-pressed={(wheelItem?.lampLight??wheelWallObject?.lampLight??'white')===option.id} onClick={()=>{if(wheelItem)updateItemFor(wheelItem.id,(item)=>{item.lampLight=option.id});else if(wheelWallObject)updateWallObjectFor(wheelWallObject.id,(item)=>{item.lampLight=option.id})}}><span className="lamp-light-swatch" style={{background:option.color}} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></button>)}</div><LampIntensitySlider value={wheelItem?.lampIntensity??wheelWallObject?.lampIntensity??75} onCommit={(value)=>{if(wheelItem)updateItemFor(wheelItem.id,(item)=>{item.lampIntensity=value});else if(wheelWallObject)updateWallObjectFor(wheelWallObject.id,(item)=>{item.lampIntensity=value})}} /></>}
              {wheelSelection.panel==='paint'&&wheelItem&&wheelConcept&&(wheelConcept.category==='RUG'?<>
                <FinishSwatches compact region="Ground" options={wheelConcept.finishes?.TextileGround.allowed??[]} value={wheelItem.finishes.TextileGround} onChange={(color)=>updateItemFor(wheelItem.id,(item)=>{item.finishes.TextileGround=color})} />
                <FinishSwatches compact region="Pattern" options={wheelConcept.finishes?.TextileMotif.allowed??[]} value={wheelItem.finishes.TextileMotif} onChange={(color)=>updateItemFor(wheelItem.id,(item)=>{item.finishes.TextileMotif=color})} />
                <button className="button full-width" onClick={()=>updateItemFor(wheelItem.id,(item)=>{[item.finishes.TextileGround,item.finishes.TextileMotif]=[item.finishes.TextileMotif,item.finishes.TextileGround]})}>Swap rug colors</button>
              </>:Object.entries(wheelConcept.finishes??{}).map(([region,rule])=><FinishSwatches compact key={region} region={region} options={rule.allowed} value={wheelItem.finishes[region]} onChange={(color)=>updateItemFor(wheelItem.id,(item)=>{item.finishes[region]=color})} />))}
              {wheelSelection.panel==='paint'&&wheelDoorway&&<FinishSwatches compact region="Door color" options={[...WINDOW_TREATMENT_COLORS, 'ESP']} value={wheelDoorway.finish??wheelDoorStyle?.leafFinish??'OFF'} onChange={(color)=>applyWithError((next)=>{const opening=next.room.openings.find((item)=>item.id===wheelDoorway.id);if(opening&&opening.type!=='window')opening.finish=color as typeof WINDOW_TREATMENT_COLORS[number] | 'ESP'})} />}
              {wheelSelection.panel==='paint'&&wheelWallObject&&wheelWallConcept&&Object.entries(wheelWallConcept.finishes).map(([region,allowed])=><FinishSwatches compact key={region} region={region} options={allowed} value={wheelWallObject.finishes[region]} onChange={(color)=>updateWallObjectFor(wheelWallObject.id,(item)=>{item.finishes[region]=color})} />)}
              {wheelSelection.panel==='height'&&wheelItem&&wheelConcept&&<><ElevationSlider value={wheelItem.elevationMm??0} max={Math.max(0,project.room.heightMm-wheelConcept.dimensions.heightMm)} onCommit={(value)=>updateItemFor(wheelItem.id,(item)=>{item.elevationMm=value})} /><NumberField label="Enter exact height" value={wheelItem.elevationMm??0} scale={10} unit="cm" limits={[0,Math.max(0,project.room.heightMm-wheelConcept.dimensions.heightMm)]} onCommit={(value)=>updateItemFor(wheelItem.id,(item)=>{item.elevationMm=value})} /></>}
              {wheelSelection.panel==='height'&&wheelWallObject&&wheelWallConcept&&<><ElevationSlider value={wheelWallObject.bottomMm} max={Math.max(0,project.room.heightMm-wheelWallConcept.heightMm)} onCommit={(value)=>updateWallObjectFor(wheelWallObject.id,(item)=>{item.bottomMm=value})} /><NumberField label="Enter exact bottom height" value={wheelWallObject.bottomMm} scale={10} unit="cm" limits={[0,Math.max(0,project.room.heightMm-wheelWallConcept.heightMm)]} onCommit={(value)=>updateWallObjectFor(wheelWallObject.id,(item)=>{item.bottomMm=value})} /></>}
              {wheelSelection.panel==='height'&&wheelWindow&&<><ElevationSlider value={wheelWindow.sillMm} max={Math.max(0,project.room.heightMm-wheelWindow.heightMm)} onCommit={(value)=>updateWindowFor(wheelWindow.id,(item)=>{item.sillMm=value})} /><NumberField label="Enter exact sill height" value={wheelWindow.sillMm} scale={10} unit="cm" limits={[0,Math.max(0,project.room.heightMm-wheelWindow.heightMm)]} onCommit={(value)=>updateWindowFor(wheelWindow.id,(item)=>{item.sillMm=value})} /></>}
              {wheelSelection.panel==='styles'&&(wheelItem||wheelWallObject)&&<><button className="button primary full-width" onClick={()=>saveStyle(wheelSelection.id)}><Icon name="save" size={17} />Save current style</button>{reusableStyles.length?<ul className="object-style-list">{reusableStyles.map((style)=><li key={style.id}><button className="object-style-option" onClick={()=>applySavedStyle(wheelSelection.id,style)}><span className="style-swatches">{Object.values(style.finishes).map((color,index)=><i key={index} style={{background:FINISH_COLORS[color as keyof typeof FINISH_COLORS]??'#ccc'}} />)}</span><span>{style.name}</span></button></li>)}</ul>:<p className="object-description">Saved styles for this item will appear here.</p>}</>}
            </section>}
          </div>}
          {placementWarning ? <div className="canvas-feedback placement-warning status-warning" role="status"><Icon name="warning" size={16} /><span>{placementWarning}</span></div> : renameToast ? <div key={renameToast.id} className="canvas-feedback status-success rename-toast"><Icon name="check" size={16} /><span>{renameToast.message}</span></div> : feedbackVisible && state.messageKind !== 'info' && state.message !== 'Change applied.' && <div key={state.message + state.token} className={'canvas-feedback notification-toast status-' + state.messageKind}><Icon name={feedbackIcon} size={16} /><span>{state.message}</span></div>}
          <ViewControls locked={viewLocked} zoom={zoom} view={view} wallsUp={wallsUp} onZoom={setZoom} onReset={resetView} onToggleLock={toggleViewLock} onToggleWalls={() => setWallsUp((current) => !current)} onPreset={selectViewPreset} />
        </main>
      </div>
      {helpVisible && <Popover id="help-popover" title="Keyboard shortcuts" className={'shortcut-popover' + (nightMode ? ' is-night' : '')} triggerRef={helpTrigger} onClose={() => setHelpVisible(false)} initialFocus="none" showClose={false} dismissOnOutside={false} dismissOnEscape={false}>
        <dl className="shortcut-list" aria-label="Keyboard controls">
          <div className="shortcut-entry"><dt><kbd>?</kbd><span>or</span><kbd>/</kbd></dt><dd>Show/Hide help</dd></div>
          <div className="shortcut-entry"><dt><kbd>W</kbd></dt><dd>Move view up</dd></div>
          <div className="shortcut-entry"><dt><kbd>A</kbd></dt><dd>Move view left</dd></div>
          <div className="shortcut-entry"><dt><kbd>S</kbd></dt><dd>Move view down</dd></div>
          <div className="shortcut-entry"><dt><kbd>D</kbd></dt><dd>Move view right</dd></div>
          {view !== 'top' && <><div className="shortcut-entry"><dt><kbd>Q</kbd></dt><dd>Rotate Counterclockwise</dd></div><div className="shortcut-entry"><dt><kbd>E</kbd></dt><dd>Rotate Clockwise</dd></div></>}
          <div className="shortcut-entry"><dt><kbd>+</kbd></dt><dd>Zoom in</dd></div>
          <div className="shortcut-entry"><dt><kbd>-</kbd></dt><dd>Zoom out</dd></div>
          <div className="shortcut-entry"><dt><kbd>R</kbd></dt><dd>Rotate object</dd></div>
          <div className="shortcut-entry"><dt><kbd>Ctrl + Z</kbd></dt><dd>Undo</dd></div>
          <div className="shortcut-entry"><dt><kbd>Ctrl + Shift + Z</kbd></dt><dd>Redo</dd></div>
        </dl>
      </Popover>}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div><div className="sr-only" role="alert" aria-atomic="true">{state.messageKind === 'error' ? state.message : ''}</div>
    </div>
    {commentTarget && <CommentDialog objectName={commentTargetName} comments={commentTarget.comments ?? []} onClose={() => setCommentTargetId(null)} onSubmit={addObjectComment} onOpenComment={(commentId) => setCommentDetailTarget({ targetId: commentTarget.id, commentId })} />}
    {commentDetailTarget && commentDetailRecord && <CommentDetailDialog objectName={commentDetailObjectName} comment={commentDetailRecord} onClose={() => setCommentDetailTarget(null)} onToggleResolved={() => toggleCommentResolved(commentDetailTarget.targetId, commentDetailTarget.commentId)} onDelete={() => deleteComment(commentDetailTarget.targetId, commentDetailTarget.commentId)} />}
    {pendingOpen && <UnsavedDialog busy={saving || opening} error={openError ?? saveError} onCancel={cancelOpen} onDiscard={() => void open(pendingOpen, pendingOpen)} onSave={() => void saveAndOpen()} />}
    {savedDeleteTarget && <SavedProjectDeleteDialog projectName={savedDeleteTarget.envelope.project.name} busy={savedActionBusy} error={savedDeleteError} onCancel={() => { setSavedDeleteTarget(null); setSavedDeleteError(null) }} onConfirm={() => void confirmDeleteSavedProject()} />}
    {pendingRoomShape && <RoomShapeDialog key={pendingRoomShape} shape={pendingRoomShape} onCancel={() => setPendingRoomShape(null)} onApply={(keepFurniture) => applyRoomShape(pendingRoomShape, keepFurniture)} />}
    {diagnostics && <div className="diagnostics"><button onClick={() => setBenchmarkToken((value) => value + 1)}>Measure 30 seconds</button><output data-testid="scene-metrics">{JSON.stringify({ ...metrics, environment: { browser: navigator.userAgent, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio, visibility: document.visibilityState } })}</output></div>}
  </>
}
