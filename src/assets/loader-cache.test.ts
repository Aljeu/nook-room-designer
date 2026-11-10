import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { CATALOG,defaultFinishes,getAvailableConcepts } from '../catalog'
import { buildFurniture,clearUnusedFurnitureGeometry,createFamilyPreparer,disposeFurniture,furnitureResourceLedger,prepareFurniture,updateFurniture } from './models'
import type { FurnitureInstance } from '../domain/types'

const dummy=()=>new THREE.Group()
beforeAll(()=>prepareFurniture(getAvailableConcepts().map(concept=>concept.id)))
const item=(conceptId:string):FurnitureInstance=>({id:conceptId,conceptId,centerXMm:1000,centerZMm:1000,quarterTurn:0,finishes:defaultFinishes(CATALOG.find(c=>c.id===conceptId)!)})
describe('family loading and geometry ownership',()=>{
 it('deduplicates pending loads and retries after failure',async()=>{
  const sca=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({buildFamily:dummy}),mcm=vi.fn().mockResolvedValue({buildFamily:dummy})
  const loader=createFamilyPreparer({SCA:sca,MCM:mcm,FIL:vi.fn().mockResolvedValue({buildFamily:dummy}),PLT:vi.fn().mockResolvedValue({buildFamily:dummy})})
  const [a,b]=await Promise.allSettled([loader.prepare('SCA'),loader.prepare('SCA')]);expect(a.status).toBe('rejected');expect(b.status).toBe('rejected');expect(sca).toHaveBeenCalledTimes(1)
  await loader.prepare('SCA');await loader.prepare('SCA');expect(sca).toHaveBeenCalledTimes(2);expect(loader.get('SCA')).toBeDefined();expect(mcm).not.toHaveBeenCalled()
 })
 it('shares geometry and releases only after the final owner',()=>{
  clearUnusedFurnitureGeometry();const a=buildFurniture(item('SOF-SCA-01')),b=buildFurniture(item('SOF-SCA-01'))
  const ga=(a.children[0] as THREE.Mesh).geometry,gb=(b.children[0] as THREE.Mesh).geometry;expect(ga).toBe(gb)
  const disposed=vi.fn();ga.addEventListener('dispose',disposed);expect(furnitureResourceLedger().geometryReferences).toBe(2)
  disposeFurniture(a);clearUnusedFurnitureGeometry();expect(disposed).not.toHaveBeenCalled();expect(furnitureResourceLedger().geometryReferences).toBe(1)
  disposeFurniture(b);disposeFurniture(b);clearUnusedFurnitureGeometry();expect(disposed).toHaveBeenCalledTimes(1);expect(furnitureResourceLedger().geometryReferences).toBe(0)
 })
 it('reuses a root across transform and material edits and safely changes rug attributes',()=>{
  const sofa=item('SOF-SCA-01'),object=buildFurniture(sofa),geometry=(object.children[0] as THREE.Mesh).geometry
  updateFurniture(object,{...sofa,centerXMm:1200,finishes:{...sofa.finishes,Upholstery:'BLU'}})
  expect((object.children[0] as THREE.Mesh).geometry).toBe(geometry);expect(object.position.x).toBe(1.2)
  const rug=item('RUG-SCA-01'),r=buildFurniture(rug),a=(r.children[0] as THREE.Mesh).geometry
  updateFurniture(r,{...rug,finishes:{TextileGround:'RBL',TextileMotif:'OAT'}});expect((r.children[0] as THREE.Mesh).geometry).not.toBe(a);expect((r.children[0] as THREE.Mesh).geometry.getAttribute('rugSwap').getX(0)).toBe(1)
  disposeFurniture(object);disposeFurniture(r);clearUnusedFurnitureGeometry()
 })
 it('keeps the complete palette and both rug orders with the explicit one-material pilot exception',()=>{
  clearUnusedFurnitureGeometry();const owners:THREE.Group[]=[]
  for(const concept of CATALOG.filter(c=>c.available)){
   const value=item(concept.id),object=buildFurniture(value);owners.push(object)
   for(const [region,rule] of Object.entries(concept.finishes??{}))if(region!=='TextileGround'&&region!=='TextileMotif')for(const code of rule.allowed)updateFurniture(object,{...value,finishes:{...value.finishes,[region]:code}})
   if(concept.id.startsWith('RUG-'))updateFurniture(object,{...value,finishes:{TextileGround:'RBL',TextileMotif:'OAT'}})
  }
  // Expanded appliance, nightstand, and electronics finishes are included; shadow materials are excluded.
  expect(furnitureResourceLedger().allocatedFurnitureMaterials).toBe(26)
  expect(furnitureResourceLedger().allocatedFurnitureMaterials+6).toBe(32)
  owners.forEach(disposeFurniture);clearUnusedFurnitureGeometry();expect(furnitureResourceLedger().geometryReferences).toBe(0)
 })
})
