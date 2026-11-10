/** A softly scalloped organic outline shared by the rug model and its plan footprint. */
export function organicRugOutline(widthMm: number, depthMm: number, count = 96) {
  const raw = Array.from({ length: count }, (_, index) => {
    const angle = index * Math.PI * 2 / count
    const radius = 1 + .055 * Math.sin(7 * angle + .7) + .025 * Math.cos(4 * angle - .5)
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
  })
  const maxX = Math.max(...raw.map((point) => Math.abs(point.x)))
  const maxZ = Math.max(...raw.map((point) => Math.abs(point.z)))
  return raw.map((point) => ({ xMm: point.x / maxX * widthMm / 2, zMm: point.z / maxZ * depthMm / 2 }))
}
