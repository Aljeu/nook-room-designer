import type { CSSProperties } from 'react'
import { AirVent, BoxesLinked, BrickWall, CheckCheck, DoorClosed, DoorClosedLocked, DoorOpen, DoorStairwell, Expand, House, Info, LampWallDown, LampWallUp, Lightbulb, Minimize, Moon, Pin, Settings, SquareArrowOutUpRight, Sun, Trash, Tv, Wind, X, type LucideIcon } from 'lucide-react'

export type IconName = 'room' | 'roomShape' | 'roomShapeRect' | 'roomShapeSquare' | 'roomShapeL' | 'roomShapeD' | 'walls' | 'brickWall' | 'door' | 'mainDoor' | 'interiorDoor' | 'archDoor' | 'window' | 'panel' | 'wallLamp' | 'wallLampDown' | 'wallArt' | 'mirror' | 'weave' | 'furniture' | 'items' | 'help' | 'home' | 'close' | 'x' | 'chevron' | 'back' | 'plus' | 'minus' | 'undo' | 'redo' | 'save' | 'export' | 'comment' | 'folder' | 'rotate' | 'trash' | 'pin' | 'openExternal' | 'lock' | 'unlock' | 'reset' | 'check' | 'checkCheck' | 'info' | 'warning' | 'error' | 'image' | 'plan' | 'cube' | 'edit' | 'up' | 'down' | 'left' | 'right' | 'cursor' | 'hand' | 'paint' | 'palette' | 'copy' | 'height' | 'style' | 'sofa' | 'chair' | 'table' | 'cabinet' | 'bookcase' | 'rug' | 'lamp' | 'plant' | 'blinds' | 'curtains' | 'breeze' | 'power' | 'lightbulb' | 'wind' | 'settings' | 'sun' | 'moon' | 'expand' | 'minimize' | 'airVent' | 'tv'
const lucideIcons: Partial<Record<IconName, LucideIcon>> = { roomShape: BoxesLinked, brickWall: BrickWall, door: DoorClosed, mainDoor: DoorClosedLocked, interiorDoor: DoorOpen, archDoor: DoorStairwell, wallLamp: LampWallUp, wallLampDown: LampWallDown, lightbulb: Lightbulb, info: Info, home: House, wind: Wind, settings: Settings, sun: Sun, moon: Moon, expand: Expand, minimize: Minimize, airVent: AirVent, tv: Tv, pin: Pin, openExternal: SquareArrowOutUpRight, trash: Trash, x: X, close: X, checkCheck: CheckCheck }
const paths: Record<IconName, string> = {
  room: 'M3 21V3h18v18H3ZM3 15h4v6M21 9h-4V3',
  roomShape: '',
  roomShapeRect: 'M3 7h18v10H3z',
  roomShapeSquare: 'M5 5h14v14H5z',
  roomShapeL: 'M4 4h16v7H11v9H4z',
  roomShapeD: 'M4 4h16v8a8 8 0 0 1-16 0z',
  walls: 'M3 21V3h18v18M3 8h18M8 3v18M16 8v13',
  brickWall: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v6m6 0v6m-6 0v6',
  door: '', mainDoor: '', interiorDoor: '', archDoor: '', wind: '', settings: '', sun: '', moon: '', expand: '', minimize: '', airVent: '', tv: '', pin: '', openExternal: '', home: '', x: '', checkCheck: '',
  window: 'M3 3h18v18H3zM12 3v18M3 12h18',
  panel: 'M4 3h16v18H4zM8 3v18M16 3v18',
  wallLamp: 'M8 4h8v8H8zM12 12v7m-3 0h6M9 7h6',
  wallLampDown: 'M8 4h8v8H8zM12 12v7m-3 0h6M9 7h6',
  wallArt: 'M3 4h18v16H3zM7 16l4-4 3 3 2-2 2 3M16 8h.01',
  mirror: 'M12 2a8 8 0 0 0-8 8v4a8 8 0 0 0 16 0v-4a8 8 0 0 0-8-8Zm0 16v4',
  weave: 'M4 4h16v16H4zM4 8h16M4 12h16M4 16h16M8 4v16m4-16v16m4-16v16',
  furniture: 'M5 11V5h14v6M5 17H3v-6h4v6h10v-6h4v6h-2M5 17v3m14-3v3M7 13h10',
  items: 'M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  close: 'm6 6 12 12M6 18 18 6',
  chevron: 'm9 5 7 7-7 7',
  back: 'm14 5-7 7 7 7M7 12h14',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  undo: 'M8 4 3 9l5 5M3 9h11a7 7 0 0 1 0 14',
  redo: 'm16 4 5 5-5 5M21 9H10a7 7 0 0 0 0 14',
  save: 'M4 3h13l4 4v14H3V3h1ZM7 3v6h10V3M7 21v-8h10v8',
  export: 'M12 15V3m-5 5 5-5 5 5M4 13v8h16v-8',
  comment: 'M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4.1-1.1L3 21l2.1-5.4A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z',
  folder: 'M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm0 4h18',
  rotate: 'M20 8a8 8 0 1 0 0 8M20 3v5h-5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  lock: 'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4V10Zm8 5v2',
  unlock: 'M6 10V7a6 6 0 0 1 11-3M4 10h16v12H4V10Zm8 5v2',
  reset: 'M4 10a8 8 0 1 1 1 8M4 3v7h7',
  check: 'm5 12 4 4L19 6',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3h.01',
  error: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v7m0 4h.01',
  image: 'M3 3h18v18H3V3Zm0 14 6-6 5 5 3-3 4 4M16 7h.01',
  plan: 'M3 3h18v18H3V3Zm8 0v9h10M3 15h5v6',
  cube: 'm12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9',
  edit: 'm4 15 11-11 5 5L9 20l-6 1 1-6Zm9-9 5 5',
  up: 'm5 14 7-7 7 7M12 7v14',
  down: 'm5 10 7 7 7-7M12 17V3',
  left: 'm14 5-7 7 7 7M7 12h14',
  right: 'm10 5 7 7-7 7M17 12H3',
  cursor: 'm5 3 14 11-7 .8-3 6L5 3Z',
  hand: 'M8 12V5.5a1.7 1.7 0 0 1 3.4 0V11 8.5a1.7 1.7 0 0 1 3.4 0V11 9.8a1.7 1.7 0 0 1 3.4 0V12a1.7 1.7 0 0 1 3.4 0v3a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2.7L4.5 14a1.7 1.7 0 0 1 2.6-2.3L8 13',
  paint: 'M3 4h13v6H3zM7 10v11M16 6h5v7h-5',
  palette: 'M12 22a10 10 0 1 1 10-10 2 2 0 0 1-2 2h-2.7a1.3 1.3 0 0 0-1.3 1.3 1.3 1.3 0 0 0 .4.9 1.8 1.8 0 0 1-1.3 3.1Z',
  copy: 'M8 8h12v13H8zM4 16H3V3h13v1',
  height: 'm7 7 5-5 5 5M12 2v7m0 6v7m-5-5 5 5 5-5',
  style: 'M20.8 8.7c0 5.1-8.8 10.3-8.8 10.3S3.2 13.8 3.2 8.7A4.2 4.2 0 0 1 12 6.6a4.2 4.2 0 0 1 8.8 2.1Z',
  sofa: 'M4 10V5h16v5M3 10h4v7h10v-7h4v9H3v-9Zm2 9v2m14-2v2M7 13h10M12 5v8',
  chair: 'M7 12V3h10v9M4 12h16v5H4v-5Zm2 5-1 5m13-5 1 5M4 12V8m16 4V8',
  table: 'M2 7h20v4H2V7Zm3 4v10m14-10v10',
  cabinet: 'M3 7h18v12H3V7Zm2 12v2m14-2v2M10 7v12m4-12v12M6 12h1m10 0h1',
  bookcase: 'M5 2h14v20H5V2Zm0 7h14M5 15h14M9 3v5m4-5v5m-4 2v4m5-4v4',
  rug: 'M4 5h16v14H4V5Zm3 3h10v8H7V8ZM4 3v2m4-2v2m4-2v2m4-2v2m4-2v2M4 19v2m4-2v2m4-2v2m4-2v2m4-2v2',
  lamp: 'm7 3-3 9h16l-3-9H7Zm5 9v9m-5 0h10',
  plant: 'M6 21h12l-1-5H7l-1 5Zm6-5V8m0 3c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6Zm0-2c0-3 2.5-5 6-5 0 3-2.5 5-6 5Z',
  blinds: 'M4 3h16M6 3v18m12-18v18M4 7h16M4 11h16M4 15h16M4 19h16',
  curtains: 'M3 4h18M5 4v17l7-4 7 4V4M12 4v12',
  breeze: 'M3 7h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h8',
  power: 'M12 2v10m6.36-6.36a9 9 0 1 1-12.72 0',
  lightbulb: 'M9 18h6m-5 4h4m-4-7.5a6 6 0 1 1 4 0c-.7.5-1 1.3-1 2.5h-2c0-1.2-.3-2-1-2.5Z',
}

export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  const Lucide = lucideIcons[name]
  if (Lucide) return <Lucide aria-hidden="true" focusable="false" width={size} height={size} strokeWidth={1.65} style={style} />
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={paths[name]} />
    {name === 'palette' && <g><circle cx="7.5" cy="11" r="1" /><circle cx="11" cy="7.5" r="1" /><circle cx="16" cy="9" r="1" /><circle cx="9" cy="15.5" r="1" /></g>}
  </svg>
}
