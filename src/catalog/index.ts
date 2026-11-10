import type { CatalogConcept, FinishRule, Footprint } from '../domain/types'
import { nominalConcepts } from './nominal'
import { plantConcepts } from './plants'
import { filipinoPilotConcept, filipinoCoreConcepts, FIL_CHAIR_CONTOUR } from './filipino'
import { CHAIR_CONTOUR, KIDNEY_CONTOUR, TRIPOD_CONTOUR, polygonVertices } from './mcm'
import { standFanConcept, towerAcConcept } from './appliances'
import { nightstandConcepts } from './nightstands'
import { electronicsConcepts } from './electronics'
import { organicRugOutline } from './rugShapes'

const semiCircleSofaFootprint = (outerRadiusMm: number, innerRadiusMm: number) => {
  const centerZ = outerRadiusMm / 2
  const points: [number, number][] = []
  for (let step = 0; step <= 16; step++) {
    const angle = Math.PI * step / 16
    points.push([Math.round(outerRadiusMm * Math.cos(angle)), Math.round(centerZ - outerRadiusMm * Math.sin(angle))])
  }
  for (let step = 16; step >= 0; step--) {
    const angle = Math.PI * step / 16
    points.push([Math.round(innerRadiusMm * Math.cos(angle)), Math.round(centerZ - innerRadiusMm * Math.sin(angle))])
  }
  return polygonVertices(points)
}

const proofDefinitions: Record<string, { footprint: Footprint; finishes: Record<string, FinishRule> }> = {
  'SOF-SCA-02': {footprint:{kind:'polygon',vertices:polygonVertices([[-1250,-775],[1250,-775],[1250,0],[-350,0],[-350,775],[-1250,775]])},finishes:{Upholstery:{allowed:['LIN','SAG','BLU'],default:'LIN'},Frame:{allowed:['OAK','WAL'],default:'OAK'}}},
  'SOF-SCA-03': {footprint:{kind:'roundedRectangle',radiusMm:65},finishes:{Upholstery:{allowed:['LIN','SAG','BLU'],default:'SAG'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'SOF-MCM-02': {footprint:{kind:'rectangle'},finishes:{Upholstery:{allowed:['CRM','OAT','LIN','SAG'],default:'CRM'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'SOF-MCM-03': {footprint:{kind:'polygon',vertices:semiCircleSofaFootprint(1100,360)},finishes:{Upholstery:{allowed:['OAT','CRM','LIN','SAG'],default:'OAT'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'SOF-MCM-04': {footprint:{kind:'rectangle'},finishes:{Upholstery:{allowed:['LIN','SAG','BLU'],default:'LIN'},Frame:{allowed:['OAK','WAL'],default:'OAK'}}},
  'SOF-FIL-02': {footprint:{kind:'rectangle'},finishes:{Upholstery:{allowed:['CRM','OAT','LIN','RUST'],default:'CRM'},Frame:{allowed:['WAL','OAK','ESP'],default:'WAL'},Weave:{allowed:['CAN'],default:'CAN'}}},
  'SOF-FIL-03': {footprint:{kind:'polygon',vertices:semiCircleSofaFootprint(950,330)},finishes:{Upholstery:{allowed:['CHA','SAG','LIN','OAT'],default:'CHA'},Frame:{allowed:['OAK','WAL'],default:'OAK'},Weave:{allowed:['CAN'],default:'CAN'}}},
  'SOF-FIL-01': {footprint:{kind:'rectangle'},finishes:{Upholstery:{allowed:['LIN','SAG','BLU'],default:'LIN'},Frame:{allowed:['OAK','WAL'],default:'OAK'},Weave:{allowed:['CAN'],default:'CAN'}}},
  'CFT-FIL-01': {footprint:{kind:'roundedRectangle',radiusMm:45},finishes:{Top:{allowed:['OAK','WAL','OFF'],default:'OAK'},Frame:{allowed:['OAK','WAL'],default:'OAK'}}},
  'SFT-FIL-01': {footprint:{kind:'roundedRectangle',radiusMm:30},finishes:{Frame:{allowed:['OAK','WAL'],default:'OAK'},Weave:{allowed:['CAN'],default:'CAN'}}},
  'MED-FIL-01': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['OAK','WAL','OFF'],default:'OAK'},Frame:{allowed:['OAK','WAL'],default:'OAK'},Weave:{allowed:['CAN'],default:'CAN'}}},
  'BKC-FIL-01': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['OAK','WAL','OFF'],default:'OAK'},Weave:{allowed:['CAN'],default:'CAN'}}},
  'RUG-FIL-01': {footprint:{kind:'roundedRectangle',radiusMm:12},finishes:{TextileGround:{allowed:['OAT','RBL'],default:'OAT'},TextileMotif:{allowed:['OAT','RBL'],default:'RBL'}}},
  'LMP-FIL-01': {footprint:{kind:'circle',radiusMm:225},finishes:{Frame:{allowed:['OAK','WAL'],default:'OAK'},Metalwork:{allowed:['CHA','BRZ'],default:'CHA'},Weave:{allowed:['CAN'],default:'CAN'}}},
  'PLT-PLT-01': {footprint:{kind:'circle',radiusMm:440},finishes:{Leaves:{allowed:['PLANT_LEAF','PLANT_LEAF_LIGHT'],default:'PLANT_LEAF'},'Leaf accents':{allowed:['PLANT_LEAF_LIGHT','PLANT_LEAF'],default:'PLANT_LEAF_LIGHT'},Trunk:{allowed:['PLANT_TRUNK'],default:'PLANT_TRUNK'},Planter:{allowed:['CRM','OFF'],default:'CRM'},Soil:{allowed:['PLANT_SOIL'],default:'PLANT_SOIL'}}},
  'PLT-PLT-02': {footprint:{kind:'circle',radiusMm:490},finishes:{Fronds:{allowed:['PLANT_LEAF','PLANT_LEAF_LIGHT'],default:'PLANT_LEAF'},'Frond accents':{allowed:['PLANT_LEAF_LIGHT','PLANT_LEAF'],default:'PLANT_LEAF_LIGHT'},Trunk:{allowed:['PLANT_TRUNK'],default:'PLANT_TRUNK'},Planter:{allowed:['OFF','CRM'],default:'OFF'},Soil:{allowed:['PLANT_SOIL'],default:'PLANT_SOIL'}}},
  'PLT-PLT-03': {footprint:{kind:'circle',radiusMm:365},finishes:{Leaves:{allowed:['PLANT_LEAF','PLANT_LEAF_LIGHT'],default:'PLANT_LEAF'},'Leaf accents':{allowed:['PLANT_LEAF_LIGHT','PLANT_LEAF'],default:'PLANT_LEAF_LIGHT'},Trunk:{allowed:['PLANT_TRUNK'],default:'PLANT_TRUNK'},Planter:{allowed:['CHA','OFF'],default:'CHA'},Soil:{allowed:['PLANT_SOIL'],default:'PLANT_SOIL'},Stand:{allowed:['PLANT_METAL','CHA'],default:'PLANT_METAL'}}},
  'VNT-APP-01': {footprint:{kind:'rectangle'},finishes:{Shell:{allowed:['OFF','SWH','CHA'],default:'OFF'},Grille:{allowed:['OFF','SIL','CHA'],default:'SIL'},Display:{allowed:['CHA','SIL','OFF'],default:'CHA'},Indicator:{allowed:['SIL','GLD','OFF'],default:'SIL'}}},
  'VNT-APP-02': {footprint:{kind:'rectangle'},finishes:{Shell:{allowed:['OFF','SWH','CHA'],default:'OFF'},Grille:{allowed:['OFF','SIL','CHA'],default:'SIL'},Blade:{allowed:['OFF','SWH','SIL'],default:'OFF'},Indicator:{allowed:['SIL','GLD','OFF'],default:'SIL'}}},
  'NST-NSD-01': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['WAL','OAK','ASH','ESP'],default:'WAL'},Fronts:{allowed:['WAL','OAK','ASH','ESP'],default:'WAL'},Frame:{allowed:['WAL','OAK','ASH','ESP'],default:'WAL'},Hardware:{allowed:['CHA','BRZ','SIL','GLD'],default:'CHA'}}},
  'NST-NSD-02': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['OFF','OAK','WAL','ASH'],default:'OFF'},Fronts:{allowed:['OFF','OAK','WAL','ASH'],default:'OFF'},Frame:{allowed:['OFF','OAK','WAL','ASH'],default:'OFF'},Hardware:{allowed:['SIL','BRZ','GLD','CHA'],default:'SIL'}}},
  'NST-NSD-03': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['ASH','OAK','WAL'],default:'ASH'},Fronts:{allowed:['ASH','OAK','WAL'],default:'ASH'},Frame:{allowed:['ASH','OAK','WAL'],default:'ASH'},Weave:{allowed:['CAN'],default:'CAN'},Hardware:{allowed:['GLD','BRZ','CHA'],default:'GLD'}}},
  'NST-NSD-04': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['OFF','OAK','WAL','ASH'],default:'OFF'},Fronts:{allowed:['OFF','OAK','WAL','ASH'],default:'OFF'},Frame:{allowed:['OFF','OAK','WAL','ASH'],default:'OFF'},Hardware:{allowed:['OFF','SIL','BRZ','CHA'],default:'OFF'}}},
  'ELC-ELC-01': {footprint:{kind:'rectangle'},finishes:{Frame:{allowed:['CHA','SIL','OFF'],default:'CHA'},Screen:{allowed:['SCREEN'],default:'SCREEN'},Stand:{allowed:['CHA','SIL'],default:'CHA'}}},
  'ELC-ELC-02': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['SIL','CHA','OFF'],default:'SIL'},Screen:{allowed:['SCREEN'],default:'SCREEN'},Keyboard:{allowed:['CHA','SIL','OFF'],default:'CHA'},Trackpad:{allowed:['SIL','CHA','OFF'],default:'SIL'}}},
  'CHR-FIL-01': {footprint:{kind:'polygon',vertices:polygonVertices(FIL_CHAIR_CONTOUR)},finishes:{Upholstery:{allowed:['LIN','SAG','BLU'],default:'LIN'},Frame:{allowed:['OAK','WAL'],default:'OAK'},Weave:{allowed:['CAN'],default:'CAN'}}},
  'SOF-SCA-01': {
    footprint: { kind: 'rectangle' },
    finishes: { Upholstery: { allowed: ['LIN', 'SAG', 'BLU'], default: 'LIN' }, Frame: { allowed: ['OAK', 'WAL'], default: 'OAK' } },
  },
  'CFT-SCA-01': {
    footprint: { kind: 'roundedRectangle', radiusMm: 60 },
    finishes: { Top: { allowed: ['OAK', 'WAL', 'OFF'], default: 'OAK' }, Frame: { allowed: ['OAK', 'WAL'], default: 'OAK' } },
  },
  'RUG-SCA-01': {
    footprint: { kind: 'roundedRectangle', radiusMm: 12 },
    finishes: { TextileGround: { allowed: ['OAT', 'RBL'], default: 'OAT' }, TextileMotif: { allowed: ['OAT', 'RBL'], default: 'RBL' } },
  },
  'CHR-SCA-01': { footprint: { kind: 'rectangle' }, finishes: { Upholstery: { allowed: ['LIN','SAG','BLU'], default: 'LIN' }, Frame: { allowed: ['OAK','WAL'], default: 'OAK' } } },
  'SFT-SCA-01': { footprint: { kind: 'roundedRectangle', radiusMm: 24 }, finishes: { Top: { allowed: ['OAK','WAL','OFF'], default: 'OAK' }, Frame: { allowed: ['OAK','WAL'], default: 'OAK' } } },
  'MED-SCA-01': { footprint: { kind: 'rectangle' }, finishes: { Body: { allowed: ['OAK','WAL','OFF'], default: 'OAK' }, Fronts: { allowed: ['OAK','WAL','OFF'], default: 'OFF' }, Frame: { allowed: ['CHA','BRZ'], default: 'CHA' } } },
  'BKC-SCA-01': { footprint: { kind: 'rectangle' }, finishes: { Body: { allowed: ['OAK','WAL','OFF'], default: 'OAK' } } },
  'LMP-SCA-01': { footprint: { kind: 'circle', radiusMm: 210 }, finishes: { Metalwork: { allowed: ['CHA','BRZ'], default: 'CHA' }, Shade: { allowed: ['CRM','SWH'], default: 'CRM' } } },
  'SOF-MCM-01': {footprint:{kind:'rectangle'},finishes:{Upholstery:{allowed:['LIN','SAG','BLU'],default:'SAG'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'CHR-MCM-01': {footprint:{kind:'polygon',vertices:polygonVertices(CHAIR_CONTOUR)},finishes:{Upholstery:{allowed:['LIN','SAG','BLU'],default:'SAG'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'CFT-MCM-01': {footprint:{kind:'polygon',vertices:polygonVertices(KIDNEY_CONTOUR)},finishes:{Top:{allowed:['OAK','WAL','OFF'],default:'WAL'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'SFT-MCM-01': {footprint:{kind:'circle',radiusMm:230},finishes:{Top:{allowed:['OAK','WAL','OFF'],default:'WAL'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'MED-MCM-01': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['OAK','WAL','OFF'],default:'WAL'},Fronts:{allowed:['OAK','WAL','OFF'],default:'WAL'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'BKC-MCM-01': {footprint:{kind:'rectangle'},finishes:{Body:{allowed:['OAK','WAL','OFF'],default:'WAL'},Frame:{allowed:['OAK','WAL'],default:'WAL'}}},
  'RUG-MCM-01': {footprint:{kind:'roundedRectangle',radiusMm:12},finishes:{TextileGround:{allowed:['OAT','RBL'],default:'OAT'},TextileMotif:{allowed:['OAT','RBL'],default:'RBL'}}},
  'RUG-MCM-02': {footprint:{kind:'circle',radiusMm:1050},finishes:{TextileGround:{allowed:['OAT','CRM','OFF'],default:'OAT'},TextileMotif:{allowed:['OCHR','RUST','WAL'],default:'OCHR'}}},
  'RUG-MCM-03': {footprint:{kind:'polygon',vertices:organicRugOutline(2300,1800)},finishes:{TextileGround:{allowed:['CRM','OAT','OFF'],default:'CRM'},TextileMotif:{allowed:['CHA','WAL','ESP'],default:'CHA'}}},
  'RUG-MCM-04': {footprint:{kind:'rectangle'},finishes:{TextileGround:{allowed:['CRM','OFF','OAT'],default:'CRM'},TextileMotif:{allowed:['CHA','WAL','ESP'],default:'CHA'}}},
  'RUG-MCM-05': {footprint:{kind:'rectangle'},finishes:{TextileGround:{allowed:['CHA','ESP','WAL'],default:'CHA'},TextileMotif:{allowed:['OFF','CRM','SWH'],default:'OFF'}}},
  'LMP-MCM-01': {footprint:{kind:'polygon',vertices:polygonVertices(TRIPOD_CONTOUR)},finishes:{Frame:{allowed:['OAK','WAL'],default:'WAL'},Metalwork:{allowed:['CHA','BRZ'],default:'BRZ'},Shade:{allowed:['CRM','SWH'],default:'SWH'}}},
}

export const FINISH_COLORS = Object.freeze({ LIN: '#DFD4C3', SAG: '#728677', BLU: '#536E7E', OAK: '#B58A60', WAL: '#765740', OFF: '#E7E5DF', CHA: '#303833', BRZ: '#8A7561', OAT: '#CCC3B5', RBL: '#536E7E', CRM: '#F0E5D3', SWH: '#E7E5DF', CAN: '#C7A675', ROSE: '#B98282', RUST: '#AC6048', OCHR: '#C5964B', FOREST: '#3F6650', ASH: '#D6C6AB', ESP: '#49382F', SIL: '#B9BEB7', GLD: '#B58B49', SCREEN: '#101519', PLANT_LEAF: '#2F6B35', PLANT_LEAF_LIGHT: '#5B934B', PLANT_TRUNK: '#65482F', PLANT_SOIL: '#44372D', PLANT_METAL: '#292D2B', CURTAIN: '#E8E2D5', BLINDS: '#D8D2C7' })

const expandedFinishPalettes: Readonly<Record<string, readonly string[]>> = {
  Upholstery: ['LIN', 'SAG', 'BLU', 'CRM', 'OAT', 'OFF', 'CHA', 'ROSE', 'RUST', 'OCHR', 'FOREST'],
  Frame: ['OAK', 'WAL', 'ASH', 'ESP', 'OFF'],
  Top: ['OAK', 'WAL', 'ASH', 'ESP', 'OFF'],
  Body: ['OAK', 'WAL', 'ASH', 'ESP', 'OFF'],
  Fronts: ['OAK', 'WAL', 'ASH', 'ESP', 'OFF'],
  Hardware: ['CHA', 'BRZ', 'SIL', 'GLD', 'OFF'],
  Screen: ['SCREEN'],
  Stand: ['CHA', 'SIL', 'OAK', 'WAL'],
  Keyboard: ['CHA', 'SIL', 'OFF'],
  Trackpad: ['SIL', 'CHA', 'OFF'],
  Metalwork: ['CHA', 'BRZ', 'SIL', 'GLD'],
  Shade: ['CRM', 'SWH', 'LIN', 'SAG', 'BLU', 'OAT', 'OFF', 'CHA', 'ROSE', 'RUST', 'OCHR', 'FOREST'],
  TextileGround: ['OAT', 'RBL', 'LIN', 'SAG', 'BLU', 'CRM', 'OFF', 'CHA', 'ROSE', 'RUST', 'OCHR', 'FOREST'],
  TextileMotif: ['OAT', 'RBL', 'LIN', 'SAG', 'BLU', 'CRM', 'OFF', 'CHA', 'ROSE', 'RUST', 'OCHR', 'FOREST'],
  Planter: ['CRM', 'OFF', 'CHA', 'SAG', 'RUST', 'OCHR', 'FOREST'],
  Shell: ['OFF', 'SWH', 'CHA', 'SAG'],
  Grille: ['OFF', 'SIL', 'CHA'],
  Display: ['CHA', 'SIL', 'OFF'],
  Indicator: ['SIL', 'GLD', 'OFF'],
  Blade: ['OFF', 'SWH', 'SIL', 'CHA'],
}
function withExpandedFinishes(finishes: Record<string, FinishRule>) {
  return Object.fromEntries(Object.entries(finishes).map(([region, rule]) => [region, {
    ...rule,
    allowed: [...new Set([...rule.allowed, ...(expandedFinishPalettes[region] ?? [])])],
  }]))
}

// Clone and recursively freeze the registry so a renderer cannot alter catalog revision 2.
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
export const CATALOG: readonly CatalogConcept[] = deepFreeze([...nominalConcepts,...plantConcepts,filipinoPilotConcept,...filipinoCoreConcepts,towerAcConcept,standFanConcept,...nightstandConcepts,...electronicsConcepts].map((concept) => {
  const proof = proofDefinitions[concept.id]
  return { ...concept, available: Boolean(proof), ...(proof ? { ...proof, finishes: withExpandedFinishes(proof.finishes) } : {}) }
}))
const byId = new Map(CATALOG.map((concept) => [concept.id, concept]))
export function getConcept(revision: number, id: string): CatalogConcept | undefined {
  return revision === 2 ? byId.get(id) : undefined
}
export function getAvailableConcepts(): readonly CatalogConcept[] {
  return CATALOG.filter((concept) => concept.available)
}
export function defaultFinishes(concept: CatalogConcept): Record<string, string> {
  if (!concept.available || !concept.finishes) throw new Error(`Design ${concept.id} is not available`)
  return Object.fromEntries(Object.entries(concept.finishes).map(([region, rule]) => [region, rule.default]))
}
