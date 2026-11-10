import { describe, expect, it } from 'vitest'
import { conservativeFootprintPolygon, polygonPath, polygonsOverlap, transformPoint, validatePolygonFootprint } from './index'
import type { Footprint } from '../domain/types'

// A generic concave test shape; not the unapproved W2 kidney design.
const vertices=[{xMm:-50,zMm:-50},{xMm:50,zMm:-50},{xMm:50,zMm:50},{xMm:15,zMm:50},{xMm:15,zMm:0},{xMm:-15,zMm:0},{xMm:-15,zMm:50},{xMm:-50,zMm:50}]
const footprint:Footprint={kind:'polygon',vertices}
const item={centerXMm:1000,centerZMm:1000,quarterTurn:0 as const}
const rectangle=(x:number,z:number,w:number,h:number)=>[{x:x-w/2,z:z-h/2},{x:x+w/2,z:z-h/2},{x:x+w/2,z:z+h/2},{x:x-w/2,z:z+h/2}]

describe('bounded simple polygon footprints',()=>{
 it('validates the implicit closed ring and produces the same authored SVG vertices',()=>{
  expect(validatePolygonFootprint(vertices,100,100)).toBeNull()
  expect(polygonPath(vertices)).toBe('M -50 -50 L 50 -50 L 50 50 L 15 50 L 15 0 L -15 0 L -15 50 L -50 50 Z')
  expect(validatePolygonFootprint([...vertices,vertices[0]],100,100)).not.toBeNull()
  expect(validatePolygonFootprint([{xMm:0,zMm:0},{xMm:20,zMm:20},{xMm:0,zMm:20},{xMm:20,zMm:0}],100,100)).not.toBeNull()
  expect(validatePolygonFootprint([{xMm:0,zMm:0},{xMm:1,zMm:1},{xMm:2,zMm:2}],100,100)).not.toBeNull()
  expect(validatePolygonFootprint([{xMm:0,zMm:0},{xMm:60,zMm:0},{xMm:0,zMm:1}],100,100)).not.toBeNull()
  expect(validatePolygonFootprint([{xMm:0,zMm:0},{xMm:NaN,zMm:0},{xMm:0,zMm:1}],100,100)).not.toBeNull()
  expect(validatePolygonFootprint(Array.from({length:129},(_,i)=>({xMm:i/10,zMm:i/10})),100,100)).not.toBeNull()
 })
 it('does not fill the notch and detects actual positive-area overlap',()=>{
  const shape=conservativeFootprintPolygon(footprint,100,100,item)
  expect(polygonsOverlap(shape,rectangle(1000,1030,20,20))).toBe(false)
  expect(polygonsOverlap(shape,rectangle(1020,1030,20,20))).toBe(true)
  expect(polygonsOverlap(shape,shape)).toBe(true)
  expect(polygonsOverlap(shape,rectangle(1060,1000,20,20))).toBe(false)
 })
 it('keeps overlap and the open notch correct after flips and rotations',()=>{
  for(const transform of [{...item,quarterTurn:1 as const},{...item,rotationDegrees:37,flipHorizontal:true},{...item,quarterTurn:3 as const,flipVertical:true}]){
   const shape=conservativeFootprintPolygon(footprint,100,100,transform)
   const map=(poly:ReturnType<typeof rectangle>)=>poly.map(p=>transformPoint(p.x-1000,p.z-1000,transform))
   expect(polygonsOverlap(shape,map(rectangle(1000,1030,20,20)))).toBe(false)
   expect(polygonsOverlap(shape,map(rectangle(1020,1030,20,20)))).toBe(true)
  }
 })
})

import { getConcept } from '../catalog'
import { KIDNEY_CONTOUR } from '../catalog/mcm'
it('uses the authored kidney notch in the transformed planning outline',()=>{
 const shape=getConcept(2,'CFT-MCM-01')!.footprint!
 expect(shape.kind).toBe('polygon')
 if(shape.kind!=='polygon')return
 expect(shape.vertices).toEqual(KIDNEY_CONTOUR.map(([xMm,zMm])=>({xMm,zMm})))
 const projection=conservativeFootprintPolygon(shape,1120,620,{centerXMm:1000,centerZMm:1000,quarterTurn:0})
 expect(polygonsOverlap(projection,rectangle(700,1130,10,10))).toBe(false)
 expect(polygonsOverlap(projection,rectangle(700,1050,10,10))).toBe(true)
})
