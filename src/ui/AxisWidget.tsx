import type { KeyboardEvent } from 'react'
import type { CameraPose } from '../scene/camera'

type Axis = 'x' | 'y' | 'z'
type Props = {
  mode: '3d' | '2d'
  pose?: CameraPose
  locked?: boolean
  onSelect?: (axis: Axis, sign: 1 | -1) => void
}

const axisColors: Record<Axis, string> = { x: '#c8424b', y: '#498b39', z: '#3479a7' }
const axes: Axis[] = ['x', 'y', 'z']

function activateFromKeyboard(event: KeyboardEvent<SVGGElement>, activate: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    activate()
  }
}

/** A compact view orientation control and fixed plan-axis marker. */
export function AxisWidget({ mode, pose, locked = false, onSelect }: Props) {
  if (mode === '2d') return <div className="coordinate-widget coordinate-widget-2d" role="img" aria-label="Plan axes: positive X points right and positive Z points down">
    <svg viewBox="0 0 100 100" role="presentation">
      <circle cx="31" cy="31" r="3" fill="#24302b" />
      <path d="M31 31H76 M31 31V76" fill="none" stroke="#56665b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m70 26 7 5-7 5M26 70l5 7 5-7" fill="none" stroke="#56665b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="82" y="35">X</text><text x="26" y="91">Z</text>
    </svg>
  </div>

  const azimuth = pose?.azimuth ?? Math.PI / 4
  const elevation = pose?.elevation ?? Math.asin(1 / Math.sqrt(3))
  const origin = { x: 50, y: 50 }
  const length = 31
  const projected = (axis: Axis, sign: 1 | -1) => {
    const vector = axis === 'x'
      ? { x: Math.cos(azimuth), y: Math.sin(azimuth) * Math.sin(elevation) }
      : axis === 'y'
        ? { x: 0, y: -Math.cos(elevation) }
        : { x: -Math.sin(azimuth), y: Math.cos(azimuth) * Math.sin(elevation) }
    return { x: origin.x + vector.x * length * sign, y: origin.y + vector.y * length * sign }
  }

  return <div className="coordinate-widget coordinate-widget-3d" role="group" aria-label="3D view orientation. Select an axis to align the camera">
    <svg viewBox="0 0 100 100" role="presentation">
      {axes.map((axis) => {
        const end = projected(axis, -1)
        return <line key={`${axis}-negative-line`} x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} stroke={axisColors[axis]} strokeOpacity=".62" strokeWidth="2" strokeLinecap="round" />
      })}
      {axes.map((axis) => {
        const end = projected(axis, 1)
        return <line key={`${axis}-positive-line`} x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} stroke={axisColors[axis]} strokeWidth="2.5" strokeLinecap="round" />
      })}
      <circle className="coordinate-origin" cx={origin.x} cy={origin.y} r="3.2" />
      {axes.flatMap((axis) => ([-1, 1] as const).map((sign) => {
        // A camera-aligned axis projects to the origin; preserve a small visible hit target there.
        const end = projected(axis, sign)
        const label = `${sign > 0 ? 'positive' : 'negative'} ${axis.toUpperCase()}`
        const supported = axis !== 'y' || sign > 0
        const disabled = locked || !supported || !onSelect
        const radius = sign > 0 ? 8.5 : 7
        const activate = () => { if (!disabled) onSelect?.(axis, sign) }
        return <g key={`${axis}-${sign}`} className="coordinate-axis-hit" role="button" tabIndex={disabled ? -1 : 0} aria-label={`View from ${label} direction`} aria-disabled={disabled} onClick={activate} onKeyDown={(event) => activateFromKeyboard(event, activate)}>
          <title>{supported ? `View from ${label} direction${locked ? ' · unlock view first' : ''}` : `${label} view unavailable`}</title>
          <circle cx={end.x} cy={end.y} r={radius} fill={sign > 0 ? axisColors[axis] : 'var(--surface)'} stroke={axisColors[axis]} strokeWidth="2" />
          <text x={end.x} y={end.y + 3} className={sign > 0 ? 'coordinate-axis-label coordinate-axis-label-positive' : 'coordinate-axis-label'}>{axis.toUpperCase()}</text>
          {sign < 0 && <path d={`M${end.x - 2.5} ${end.y - 5.5}h5`} className="coordinate-minus-mark" />}
        </g>
      }))}
    </svg>
  </div>
}
