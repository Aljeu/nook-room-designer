import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { FlipHorizontal2, FlipVertical2 } from 'lucide-react'
import { Icon, type IconName } from './Icon'

export type ObjectAction = 'info' | 'flipVertical' | 'flipHorizontal' | 'comment' | 'delete' | 'rotate' | 'height' | 'saveStyle' | 'paint' | 'copy' | 'treatment' | 'breeze' | 'light' | 'lampConfig'
type RotationPointerEvent = ReactPointerEvent<HTMLButtonElement>
type ActionIcon = IconName | 'flipHorizontal2' | 'flipVertical2'
type Props = {
  x: number
  y: number
  onAction: (action: ObjectAction) => void
  onRotateStart: (event: RotationPointerEvent) => void
  onRotateMove: (event: RotationPointerEvent) => void
  onRotateEnd: (event: RotationPointerEvent) => void
  onRotateCancel: () => void
  canCopy: boolean
  closing: boolean
  actions?: ObjectAction[]
  breezeEnabled?: boolean
  lampOn?: boolean
  onCloseComplete: () => void
}

const actions: { id: ObjectAction; icon: ActionIcon; label: string }[] = [
  { id: 'info', icon: 'info', label: 'Object info' },
  { id: 'flipVertical', icon: 'flipHorizontal2', label: 'Flip top to bottom' },
  { id: 'flipHorizontal', icon: 'flipVertical2', label: 'Flip left to right' },
  { id: 'comment', icon: 'comment', label: 'Comments' },
  { id: 'delete', icon: 'trash', label: 'Delete object' },
  { id: 'rotate', icon: 'rotate', label: 'Drag to rotate · click for 15°' },
  { id: 'height', icon: 'height', label: 'Adjust vertical placement' },
  { id: 'saveStyle', icon: 'style', label: 'Save or apply a style' },
  { id: 'paint', icon: 'palette', label: 'Change color or finish' },
  { id: 'copy', icon: 'copy', label: 'Duplicate object' },
  { id: 'treatment', icon: 'blinds', label: 'Choose blinds or curtains' },
  { id: 'breeze', icon: 'breeze', label: 'Toggle light breeze' },
  { id: 'light', icon: 'power', label: 'Turn lamp on' },
  { id: 'lampConfig', icon: 'lightbulb', label: 'Lamp Configuration' },
]

export function ObjectActionWheel({ x, y, onAction, onRotateStart, onRotateMove, onRotateEnd, onRotateCancel, canCopy, closing, actions: visibleActionIds, breezeEnabled = false, lampOn = false, onCloseComplete }: Props) {
  const justDragged=useRef(false)
  const pointerStart=useRef<{x:number;y:number}|null>(null)
  const closeCallback=useRef(onCloseComplete)
  const exitTimer=useRef<number|null>(null)
  useEffect(()=>{closeCallback.current=onCloseComplete},[onCloseComplete])
  useEffect(()=>{
    if(!closing)return
    exitTimer.current=window.setTimeout(()=>closeCallback.current(),460)
    return()=>{if(exitTimer.current!==null)window.clearTimeout(exitTimer.current);exitTimer.current=null}
  },[closing])
  function finishClose(){
    if(exitTimer.current!==null)window.clearTimeout(exitTimer.current)
    exitTimer.current=null
    closeCallback.current()
  }
  const visibleActions = visibleActionIds ? actions.filter((action) => visibleActionIds.includes(action.id)) : actions
  return <div className={'object-wheel'+(closing?' is-closing':'')} role="group" aria-label="Selected object actions" style={{ left: x, top: y }}>
    {visibleActions.map((action,index)=>{
      const angle=(index*360/visibleActions.length-90)*Math.PI/180,offset=88,dx=Math.cos(angle)*offset,dy=Math.sin(angle)*offset
      const isRotate=action.id==='rotate'
      const isBreezeEnabled=action.id==='breeze'&&breezeEnabled
      const isLampOn=action.id==='light'&&lampOn
      const label=action.id==='breeze'?(breezeEnabled?'Turn breeze animation off':'Turn breeze animation on'):action.id==='light'?(lampOn?'Turn lamp off':'Turn lamp on'):action.label
      const tooltipSide=Math.abs(dx)>Math.abs(dy)?(dx>0?'left':'right'):(dy>0?'above':'below')
      const style={left:`calc(50% + ${dx}px)`,top:`calc(50% + ${dy}px)`, '--wheel-from-x':`${-dx}px`, '--wheel-from-y':`${-dy}px`, '--wheel-open-delay':`${index*20}ms`, '--wheel-close-delay':`${(actions.length-1-index)*14}ms`} as CSSProperties
      return <button key={action.id} type="button" className={'object-wheel-action'+(action.id==='delete'?' is-destructive':'')+((isBreezeEnabled||isLampOn)?' is-active':'')} disabled={action.id==='copy'&&!canCopy} tabIndex={closing?-1:undefined} aria-label={label} aria-pressed={action.id==='breeze'?breezeEnabled:action.id==='light'?lampOn:undefined} style={style}
        onAnimationEnd={index===0?event=>{if(closing&&event.animationName==='object-wheel-pop-in')finishClose()}:undefined}
        onPointerDown={isRotate?event=>{justDragged.current=false;pointerStart.current={x:event.clientX,y:event.clientY};onRotateStart(event)}:undefined}
        onPointerMove={isRotate?event=>{const start=pointerStart.current;if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>3)justDragged.current=true;onRotateMove(event)}:undefined}
        onPointerUp={isRotate?event=>{onRotateEnd(event);pointerStart.current=null;if(justDragged.current)window.setTimeout(()=>{justDragged.current=false},0)}:undefined}
        onPointerCancel={isRotate?()=>{pointerStart.current=null;justDragged.current=true;onRotateCancel();window.setTimeout(()=>{justDragged.current=false},0)}:undefined}
        onClick={()=>{if(isRotate){if(!justDragged.current)onAction(action.id)}else onAction(action.id)}}>
        {action.icon==='flipHorizontal2'?<FlipHorizontal2 size={21} strokeWidth={1.65} aria-hidden="true" />:action.icon==='flipVertical2'?<FlipVertical2 size={21} strokeWidth={1.65} aria-hidden="true" />:<Icon name={action.icon} size={21} />}
        <span className={'object-wheel-tooltip tooltip-'+tooltipSide} aria-hidden="true">{label}</span>
      </button>
    })}
  </div>
}
