import { z } from 'zod'
import { getConcept } from '../catalog'
import { getWallConcept, getWindowStyle } from '../catalog/wall'
import { getDoorStyle } from '../catalog/doors'
import { MAX_DOORWAYS, MAX_INSTANCES, MAX_OPENINGS, MAX_WINDOWS } from '../domain/constants'
import { WINDOW_TREATMENT_COLORS, type ProjectEnvelope } from '../domain/types'

const id = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, 'Expected lowercase UUID v4')
const mm = z.number().int().min(0).max(12000)
const wall = z.enum(['N', 'E', 'S', 'W'])
const commentText = z.string().refine((comment) => comment === comment.trim() && comment.length > 0 && comment.length <= 500, 'Comments must be trimmed and contain 1–500 characters')
const commentRecord = z.strictObject({ id, text: commentText, createdAt: z.string().datetime().optional(), resolvedAt: z.string().datetime().optional() })
const commentEntry = z.union([commentText, commentRecord])
const comments = z.array(commentEntry).max(50).optional()
const openingBase = { id, wall, offsetMm: mm, comments }
const windowTreatmentColor = z.enum(WINDOW_TREATMENT_COLORS).optional()
const door = z.strictObject({ ...openingBase, type: z.literal('door'), widthMm: z.number().int().min(400).max(2000), heightMm: z.number().int().min(1000).max(3000), sillMm: z.literal(0), hinge: z.enum(['min', 'max']), styleId: z.string().optional(), finish: z.enum([...WINDOW_TREATMENT_COLORS, 'ESP']).optional() })
const archway = z.strictObject({ ...openingBase, type: z.literal('archway'), widthMm: z.number().int().min(500).max(3000), heightMm: z.number().int().min(1000).max(3000), sillMm: z.literal(0), styleId: z.string().min(1).max(32), finish: z.enum([...WINDOW_TREATMENT_COLORS, 'ESP']).optional() })
const lampIntensity = z.number().int().min(0).max(100).optional()
const lampLight = z.enum(['daylight', 'white', 'warm']).optional()
const windowOpening = z.strictObject({ ...openingBase, type: z.literal('window'), widthMm: z.number().int().min(300).max(3000), heightMm: z.number().int().min(300).max(2500), sillMm: mm, styleId: z.string().optional(), treatment: z.enum(['blinds', 'curtains']).optional(), treatmentColor: windowTreatmentColor, breezeEnabled: z.boolean().optional() })
const instance = z.strictObject({ id, conceptId: z.string().min(1).max(32), centerXMm: mm, centerZMm: mm, quarterTurn: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), rotationDegrees: z.number().int().min(0).max(359).optional(), flipHorizontal: z.boolean().optional(), flipVertical: z.boolean().optional(), elevationMm: mm.optional(), breezeEnabled: z.boolean().optional(), lampOn: z.boolean().optional(), lampLight, lampIntensity, finishes: z.record(z.string(), z.string()), comments })
const wallObject = z.strictObject({ id, conceptId: z.string().min(1).max(32), wall, offsetMm: mm, bottomMm: mm, lampOn: z.boolean().optional(), lampLight, lampIntensity, finishes: z.record(z.string(), z.string()), comments })
const room = z.strictObject({ id, widthMm: z.number().int().min(1000).max(12000), depthMm: z.number().int().min(1000).max(12000), heightMm: z.number().int().min(2000).max(5000), openings: z.array(z.discriminatedUnion('type', [door, archway, windowOpening])).max(MAX_OPENINGS), shape: z.enum(['rectangle', 'square', 'l-shape', 'd-shape']).optional() })
const schema = z.strictObject({
  format: z.literal('nook-project'), formatVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]), catalogRevision: z.literal(2),
  project: z.strictObject({
    id,
    name: z.string().refine((name) => name === name.trim() && Array.from(name).length >= 1 && Array.from(name).length <= 80 && !/[\u0000-\u001f\u007f-\u009f]/u.test(name), 'Name must be trimmed, 1–80 characters and contain no controls'),
    room, instances: z.array(instance).max(MAX_INSTANCES), wallObjects: z.array(wallObject).max(MAX_INSTANCES).optional(),
  }),
}).superRefine((envelope, ctx) => {
  const project = envelope.project
  if (project.room.shape === 'square' && project.room.widthMm !== project.room.depthMm) ctx.addIssue({ code: 'custom', path: ['project', 'room', 'shape'], message: 'A square room must have equal width and depth.' })
  if (project.room.shape === 'd-shape' && project.room.depthMm < project.room.widthMm / 2) ctx.addIssue({ code: 'custom', path: ['project', 'room', 'depthMm'], message: 'A D-shaped room needs enough depth for its semicircular front.' })
  const ids = new Set<string>()
  const checkId = (value: string, path: (string | number)[]) => {
    if (ids.has(value)) ctx.addIssue({ code: 'custom', path, message: 'Duplicate ID within project' })
    ids.add(value)
  }
  checkId(project.id, ['project', 'id'])
  checkId(project.room.id, ['project', 'room', 'id'])
  if (envelope.formatVersion === 1 && (project.room.shape !== undefined && project.room.shape !== 'rectangle' || project.wallObjects !== undefined || project.instances.some((item) => item.breezeEnabled !== undefined || item.lampOn !== undefined || item.lampLight !== undefined || item.lampIntensity !== undefined) || project.room.openings.some((o) => o.type === 'window' && (o.styleId !== undefined || o.treatment !== undefined || o.treatmentColor !== undefined || o.breezeEnabled !== undefined)))) ctx.addIssue({ code: 'custom', path: ['formatVersion'], message: 'Room shapes, wall features and object settings require project format 2' })
  if (envelope.formatVersion < 3 && project.room.openings.some((opening) => opening.type === 'archway' || opening.type === 'door' && (opening.styleId !== undefined || opening.finish !== undefined))) ctx.addIssue({ code: 'custom', path: ['formatVersion'], message: 'Door styles and archways require project format 3' })
  if (project.instances.length + (project.wallObjects?.length ?? 0) > MAX_INSTANCES) ctx.addIssue({ code: 'custom', path: ['project', 'wallObjects'], message: 'A room can contain at most 24 objects' })
  let doorways = 0
  let windows = 0
  project.room.openings.forEach((opening, i) => {
    checkId(opening.id, ['project', 'room', 'openings', i, 'id'])
    if (opening.type === 'door' || opening.type === 'archway') {
      doorways++
      if (opening.styleId !== undefined) {
        const style = getDoorStyle(opening.styleId)
        if (!style || (opening.type === 'archway') !== (style.category === 'archways')) ctx.addIssue({ code: 'custom', path: ['project', 'room', 'openings', i, 'styleId'], message: 'Unknown or incompatible door style' })
      }
    } else { windows++; if (opening.styleId !== undefined && !getWindowStyle(opening.styleId)) ctx.addIssue({ code: 'custom', path: ['project', 'room', 'openings', i, 'styleId'], message: 'Unknown window style' }) }
  })
  if (doorways > MAX_DOORWAYS || windows > MAX_WINDOWS || project.room.openings.length > MAX_OPENINGS) ctx.addIssue({ code: 'custom', path: ['project', 'room', 'openings'], message: `Maximum ${MAX_DOORWAYS} doors or archways and ${MAX_WINDOWS} windows` })
  project.wallObjects?.forEach((item, i) => {
    const path = ['project', 'wallObjects', i] as (string | number)[]
    checkId(item.id, [...path, 'id'])
    const concept = getWallConcept(item.conceptId)
    if (!concept) { ctx.addIssue({ code: 'custom', path: [...path, 'conceptId'], message: 'Unknown wall design' }); return }
    const keys = Object.keys(item.finishes), expected = Object.keys(concept.finishes)
    if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) { ctx.addIssue({ code: 'custom', path: [...path, 'finishes'], message: 'Finish regions do not match design' }); return }
    for (const [region, allowed] of Object.entries(concept.finishes)) if (!allowed.includes(item.finishes[region])) ctx.addIssue({ code: 'custom', path: [...path, 'finishes', region], message: 'Finish is not allowed for this region' })
  })
  project.instances.forEach((item, i) => {
    const path = ['project', 'instances', i] as (string | number)[]
    checkId(item.id, [...path, 'id'])
    const concept = getConcept(envelope.catalogRevision, item.conceptId)
    if (!concept) {
      ctx.addIssue({ code: 'custom', path: [...path, 'conceptId'], message: 'Unknown catalog concept' })
      return
    }
    if (!concept.available || !concept.finishes) {
      ctx.addIssue({ code: 'custom', path: [...path, 'conceptId'], message: `Design ${item.conceptId} is not yet available` })
      return
    }
    const keys = Object.keys(item.finishes)
    const expected = Object.keys(concept.finishes)
    if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
      ctx.addIssue({ code: 'custom', path: [...path, 'finishes'], message: 'Finish regions do not match design' })
      return
    }
    for (const [region, rule] of Object.entries(concept.finishes)) {
      if (!rule.allowed.includes(item.finishes[region])) ctx.addIssue({ code: 'custom', path: [...path, 'finishes', region], message: 'Finish is not allowed for this region' })
    }
    if (concept.category === 'RUG' && item.finishes.TextileGround === item.finishes.TextileMotif) {
      ctx.addIssue({ code: 'custom', path: [...path, 'finishes'], message: 'Rug ground and motif must use different colors' })
    }
  })
})

/** Structural acceptance alone is NOT spatial validity; call the 3D geometry boundary separately. */
export function validateStructure(input: unknown): z.ZodSafeParseResult<ProjectEnvelope> {
  return schema.safeParse(input)
}
