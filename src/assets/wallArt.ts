import * as THREE from 'three'

type ArtId = 'ART-GEN-02' | 'ART-GEN-03' | 'ART-GEN-04' | 'ART-GEN-05'

function paperTexture(id: ArtId) {
  const portrait = id === 'ART-GEN-03' || id === 'ART-GEN-04'
  const landscape = id === 'ART-GEN-05'
  const canvas = document.createElement('canvas')
  canvas.width = landscape ? 768 : portrait ? 512 : 640
  canvas.height = portrait ? 768 : landscape ? 512 : 640
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined
  const w = canvas.width, h = canvas.height
  ctx.scale(w, h)

  if (id === 'ART-GEN-02') {
    // A quiet geometric study of overlapping arches and offset color fields.
    ctx.fillStyle = '#eee8d9'; ctx.fillRect(0, 0, 1, 1)
    ctx.fillStyle = '#24463e'; ctx.beginPath(); ctx.moveTo(.12, .83); ctx.lineTo(.12, .48); ctx.bezierCurveTo(.12, .28, .24, .16, .42, .16); ctx.bezierCurveTo(.60, .16, .70, .29, .70, .48); ctx.lineTo(.70, .83); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#cd7653'; ctx.beginPath(); ctx.moveTo(.42, .83); ctx.bezierCurveTo(.39, .67, .52, .55, .66, .55); ctx.bezierCurveTo(.81, .55, .88, .68, .88, .83); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#d7bb7a'; ctx.beginPath(); ctx.ellipse(.76, .27, .105, .105, -.22, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#293b37'; ctx.lineWidth = .008; ctx.beginPath(); ctx.moveTo(.16, .88); ctx.bezierCurveTo(.38, .78, .58, .94, .84, .86); ctx.stroke()
    ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.arc(.31, .45, .018, 0, Math.PI * 2); ctx.fill()
  } else if (id === 'ART-GEN-03') {
    // A dark botanical screen print with an original fern and broad-leaf arrangement.
    ctx.fillStyle = '#18352e'; ctx.fillRect(0, 0, 1, 1)
    ctx.fillStyle = '#294b3d'; ctx.beginPath(); ctx.ellipse(.52, .48, .39, .34, -.18, 0, Math.PI * 2); ctx.fill()
    const leaf = (x: number, y: number, angle: number, length: number, color: string) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(length * .17, -length * .3, length * .58, -length * .23, length, 0); ctx.bezierCurveTo(length * .58, length * .25, length * .18, length * .29, 0, 0); ctx.fill()
      ctx.strokeStyle = '#d4c38e'; ctx.lineWidth = .003; ctx.beginPath(); ctx.moveTo(.005, 0); ctx.quadraticCurveTo(length * .45, -.006, length * .96, 0); ctx.stroke()
      ctx.restore()
    }
    ctx.strokeStyle = '#d6bd83'; ctx.lineWidth = .009; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(.22, .88); ctx.bezierCurveTo(.29, .62, .46, .36, .72, .12); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(.45, .67); ctx.bezierCurveTo(.62, .56, .73, .42, .83, .25); ctx.stroke()
    leaf(.34,.65,-2.55,.30,'#c7a95f'); leaf(.43,.53,-.78,.32,'#91a96c'); leaf(.52,.43,2.45,.34,'#d1b86e'); leaf(.61,.32,-.72,.31,'#a9ba80')
    leaf(.60,.52,-2.65,.27,'#d5c184'); leaf(.72,.41,-.74,.28,'#77996b'); leaf(.76,.30,2.20,.24,'#c4a75f'); leaf(.27,.78,-2.9,.22,'#8ca274')
    ctx.fillStyle = '#ede1c5'; ctx.beginPath(); ctx.arc(.76, .79, .045, 0, Math.PI * 2); ctx.fill()
  } else if (id === 'ART-GEN-04') {
    // A contemporary, anonymous figure study in layered clay, plum and pale blue.
    ctx.fillStyle = '#d8d0c2'; ctx.fillRect(0, 0, 1, 1)
    ctx.fillStyle = '#526b77'; ctx.beginPath(); ctx.moveTo(.06,.12); ctx.lineTo(.94,.12); ctx.lineTo(.94,.88); ctx.lineTo(.06,.88); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#9b5747'; ctx.beginPath(); ctx.moveTo(.13,.88); ctx.bezierCurveTo(.16,.67,.31,.59,.45,.58); ctx.lineTo(.68,.58); ctx.bezierCurveTo(.82,.62,.89,.73,.90,.88); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#c58b6a'; ctx.beginPath(); ctx.moveTo(.43,.51); ctx.lineTo(.57,.51); ctx.lineTo(.61,.65); ctx.lineTo(.39,.65); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#bc8064'; ctx.beginPath(); ctx.moveTo(.41,.24); ctx.bezierCurveTo(.42,.12,.60,.12,.64,.26); ctx.lineTo(.63,.43); ctx.bezierCurveTo(.61,.54,.45,.57,.39,.45); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#302d34'; ctx.beginPath(); ctx.moveTo(.38,.34); ctx.bezierCurveTo(.34,.16,.44,.12,.54,.12); ctx.bezierCurveTo(.68,.12,.70,.24,.65,.35); ctx.lineTo(.60,.27); ctx.bezierCurveTo(.54,.34,.47,.35,.38,.34); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#302d34'; ctx.beginPath(); ctx.ellipse(.50,.39,.018,.008,0,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle = '#754638'; ctx.lineWidth = .007; ctx.beginPath(); ctx.moveTo(.47,.47); ctx.quadraticCurveTo(.51,.49,.55,.46); ctx.stroke()
    ctx.fillStyle = '#e1b66e'; ctx.beginPath(); ctx.arc(.26,.73,.09,0,Math.PI*2); ctx.fill()
    ctx.fillStyle = '#d6d2c7'; ctx.beginPath(); ctx.moveTo(.17,.88); ctx.lineTo(.33,.65); ctx.lineTo(.40,.88); ctx.closePath(); ctx.fill()
  } else {
    // A wide, layered color-field abstraction with moss, ink and muted apricot.
    ctx.fillStyle = '#e6e0d3'; ctx.fillRect(0, 0, 1, 1)
    ctx.fillStyle = '#a5ad91'; ctx.beginPath(); ctx.moveTo(0,.62); ctx.bezierCurveTo(.18,.35,.34,.39,.54,.55); ctx.bezierCurveTo(.73,.70,.83,.29,1,.22); ctx.lineTo(1,1); ctx.lineTo(0,1); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#394c45'; ctx.beginPath(); ctx.moveTo(0,.77); ctx.bezierCurveTo(.20,.54,.37,.62,.58,.72); ctx.bezierCurveTo(.76,.80,.88,.55,1,.48); ctx.lineTo(1,.84); ctx.bezierCurveTo(.75,.99,.49,.80,.26,.91); ctx.bezierCurveTo(.15,.96,.06,.96,0,1); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#c97856'; ctx.beginPath(); ctx.ellipse(.77,.28,.13,.18,-.4,0,Math.PI*2); ctx.fill()
    ctx.fillStyle = '#d7bd80'; ctx.beginPath(); ctx.moveTo(.08,.28); ctx.bezierCurveTo(.23,.18,.38,.15,.55,.20); ctx.lineTo(.49,.29); ctx.bezierCurveTo(.34,.26,.20,.33,.10,.40); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#f2eee5'; ctx.lineWidth = .012; ctx.beginPath(); ctx.moveTo(.12,.65); ctx.bezierCurveTo(.31,.48,.48,.55,.63,.67); ctx.stroke()
    ctx.strokeStyle = '#d8c58d'; ctx.lineWidth = .006; ctx.beginPath(); ctx.moveTo(.56,.14); ctx.bezierCurveTo(.68,.04,.82,.06,.91,.16); ctx.stroke()
  }

  // Fine paper grain keeps the vector artwork from feeling like a flat UI icon.
  let seed = id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0)
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  ctx.save(); ctx.scale(1 / w, 1 / h)
  for (let i = 0; i < 1200; i++) {
    const light = random() > .48
    ctx.fillStyle = light ? 'rgba(255,246,226,0.16)' : 'rgba(28,32,27,0.11)'
    const size = 0.35 + random() * 1.1
    ctx.fillRect(random() * w, random() * h, size, size)
  }
  ctx.restore()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function createWallArtTexture(id: string) {
  if (!['ART-GEN-02', 'ART-GEN-03', 'ART-GEN-04', 'ART-GEN-05'].includes(id)) return undefined
  if (typeof document === 'undefined') return undefined
  return paperTexture(id as ArtId)
}
