import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createSampleProject } from '../domain/sample'
import { clearUnusedFurnitureGeometry, furnitureResourceLedger, prepareFurniture } from '../assets/models'
import { createWorld } from './world'
beforeAll(()=>prepareFurniture(['SOF-SCA-01']))
describe('incremental world lifecycle',()=>{
 it('retains object and mesh identity through selection, movement, material and comment changes',()=>{
  const project=createSampleProject((()=>{let i=0;return()=>String(++i)})()).project,world=createWorld(project,'isometric',1,800,600)
  const old=project.instances[0],object=world.objects.get(old.id)!,mesh=object.children[0] as THREE.Mesh,geometry=mesh.geometry,dispose=vi.fn();geometry.addEventListener('dispose',dispose)
  const next={...project,instances:project.instances.map(i=>i.id===old.id?{...i,centerXMm:2200,comments:['A note'],finishes:{...i.finishes,Upholstery:'BLU'}}:i)}
  world.updateProject(next,old.id);expect(world.objects.get(old.id)).toBe(object);expect(object.children[0]).toBe(mesh);expect(mesh.geometry).toBe(geometry);expect(object.position.x).toBe(2.2);expect((mesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('536e7e');expect(dispose).not.toHaveBeenCalled()
  world.updateProject({...next,instances:next.instances.filter(i=>i.id!==old.id)},null);expect(world.objects.has(old.id)).toBe(false);world.dispose();clearUnusedFurnitureGeometry();expect(dispose).toHaveBeenCalledTimes(1);expect(furnitureResourceLedger().geometryReferences).toBe(0)
 })
})

it('keeps shared model geometry alive for concurrent editor and export worlds',()=>{
 const project=createSampleProject((()=>{let i=0;return()=>String(++i)})()).project
 const editor=createWorld(project,'isometric',1,800,600),capture=createWorld(project,'isometric',1,800,600,null,undefined,false)
 const id=project.instances[0].id,editorMesh=editor.objects.get(id)!.children[0] as THREE.Mesh,captureMesh=capture.objects.get(id)!.children[0] as THREE.Mesh,geometry=editorMesh.geometry,disposed=vi.fn()
 geometry.addEventListener('dispose',disposed);expect(captureMesh.geometry).toBe(geometry)
 capture.dispose();clearUnusedFurnitureGeometry();expect(disposed).not.toHaveBeenCalled()
 editor.dispose();clearUnusedFurnitureGeometry();expect(disposed).toHaveBeenCalledTimes(1);expect(furnitureResourceLedger().geometryReferences).toBe(0)
})
