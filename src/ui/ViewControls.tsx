import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'

type Preset = 'front' | 'top' | 'side-left' | 'side-right'
export type CubeFace = Preset | 'walls' | 'none'

export function CubeViewIcon({ face }: { face: CubeFace }) {
  const highlightTop = face === 'top' || face === 'walls'
  const highlightLeft = face === 'front' || face === 'side-left' || face === 'walls'
  const highlightRight = face === 'front' || face === 'side-right' || face === 'walls'
  const fill = 'currentColor'
  return <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {highlightTop && <path d="m4.5 7.3 7.5-4.4 7.5 4.4-7.5 4.6-7.5-4.6Z" fill={fill} fillOpacity=".3" stroke="none" />}
    {highlightLeft && <path d="m4.5 7.3 7.5 4.6v9.1l-7.5-4.5V7.3Z" fill={fill} fillOpacity=".3" stroke="none" />}
    {highlightRight && <path d="m19.5 7.3-7.5 4.6V21l7.5-4.5V7.3Z" fill={fill} fillOpacity=".3" stroke="none" />}
    <path d="m12 3 7.5 4.3v9.2L12 21l-7.5-4.5V7.3L12 3Z" />
    <path d="m4.5 7.3 7.5 4.6 7.5-4.6M12 11.9V21" />
  </svg>
}

type ViewControlsProps = {
  locked: boolean
  zoom: number
  view: 'isometric' | 'top'
  wallsUp: boolean
  onZoom: (zoom: number) => void
  onReset: () => void
  onToggleLock: () => void
  onToggleWalls: () => void
  onPreset: (preset: Preset) => void
}

export function ViewControls({ locked, zoom, view, wallsUp, onZoom, onReset, onToggleLock, onToggleWalls, onPreset }: ViewControlsProps) {
  const [angleOpen, setAngleOpen] = useState(false)
  const angleRoot = useRef<HTMLDivElement>(null)
  const angleTrigger = useRef<HTMLButtonElement>(null)
  const angleOptionsId = useId()
  const viewsHeadingId = useId()
  const minZoom = view === 'top' ? 0.25 : 0.75
  const lockedTitle = 'Unlock the view to change the camera'
  const angleTitle = view === 'top' ? 'Angle controls are available in 3D' : locked ? lockedTitle : 'Angle'
  const wallsLabel = view === 'top' ? 'Switch to 3D to change walls' : wallsUp ? 'Lower walls' : 'Raise walls'
  const presets: { key: Preset; label: string; face: CubeFace }[] = [
    { key: 'front', label: 'Front view', face: 'front' },
    { key: 'top', label: 'Top view', face: 'top' },
    { key: 'side-left', label: 'Side left view', face: 'side-left' },
    { key: 'side-right', label: 'Side right view', face: 'side-right' },
  ]
  useEffect(() => {
    if (!angleOpen || locked || view === 'top') {
      setAngleOpen(false)
      return
    }
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !angleRoot.current?.contains(event.target)) setAngleOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setAngleOpen(false)
      angleTrigger.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [angleOpen, locked, view])
  return <section className="view-controls" aria-label="Camera controls">
    <div className="view-main" role="group" aria-label="Zoom">
      <button className="camera-tool with-camera-tooltip" aria-label="Zoom out" title={locked ? lockedTitle : 'Zoom out'} disabled={locked || zoom <= minZoom} onClick={() => onZoom(Math.max(minZoom, Math.round((zoom - .25) * 100) / 100))}><Icon name="minus" /><span className="camera-tooltip">Zoom out</span></button>
      <button className="camera-tool with-camera-tooltip" aria-label="Zoom in" title={locked ? lockedTitle : 'Zoom in'} disabled={locked || zoom >= 3} onClick={() => onZoom(Math.min(3, Math.round((zoom + .25) * 100) / 100))}><Icon name="plus" /><span className="camera-tooltip">Zoom in</span></button>
    </div>
    <div className="view-secondary" role="group" aria-label="View controls">
      <button className="camera-tool with-camera-tooltip" aria-label="Reset view" title={locked ? lockedTitle : 'Reset view'} disabled={locked} onClick={onReset}><Icon name="reset" /><span className="camera-tooltip">Reset view</span></button>
      <button className="camera-tool with-camera-tooltip" aria-label={locked ? 'Unlock view' : 'Lock view'} aria-pressed={locked} title={locked ? 'Unlock view' : 'Lock view'} onClick={onToggleLock}><Icon name={locked ? 'lock' : 'unlock'} /><span className="camera-tooltip">{locked ? 'Unlock view' : 'Lock view'}</span></button>
      <div className="angle-controls" ref={angleRoot}>
        <button ref={angleTrigger} type="button" className="camera-tool angle-trigger with-camera-tooltip" aria-label="Angle" aria-expanded={angleOpen} aria-controls={angleOptionsId} title={angleTitle} disabled={locked || view === 'top'} onClick={() => setAngleOpen((open) => !open)}><CubeViewIcon face="none" /><span className="camera-tooltip">{view === 'top' ? 'Angle controls are available in 3D' : 'Angle'}</span></button>
        <div id={angleOptionsId} className="angle-options" role="group" aria-labelledby={viewsHeadingId} hidden={!angleOpen}>
          <h2 id={viewsHeadingId}>Views</h2>
          <div className="view-presets">{presets.map(({ key, label, face }) => <button key={key} type="button" className="camera-tool view-preset with-camera-tooltip" aria-label={label} title={label} disabled={locked} onClick={() => { onPreset(key); setAngleOpen(false); angleTrigger.current?.focus() }}><CubeViewIcon face={face} /><span className="sr-only">{label}</span><span className="camera-tooltip">{label}</span></button>)}</div>
        </div>
      </div>
      <button className="camera-tool with-camera-tooltip" aria-label={wallsLabel} aria-pressed={wallsUp} title={wallsLabel} disabled={view === 'top'} onClick={onToggleWalls}><CubeViewIcon face="walls" /><span className="camera-tooltip">{wallsLabel}</span></button>
    </div>
  </section>
}
