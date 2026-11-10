import { beforeAll, expect, it } from 'vitest'
import { prepareFurniture } from '../assets/models'
import { prepareWallModels } from '../assets/wallModels'
import { createSampleProject } from '../domain/sample'
import { getPlanPrimitives } from '../geometry'
import { createWorld } from './world'
beforeAll(async()=>{await Promise.all([prepareFurniture(['SOF-SCA-01']),prepareWallModels()])})
it('renders selectable attached objects and reveals their cutaway wall',()=>{
 const project=createSampleProject((()=>{let i=0;return()=>String(++i)})()).project
 project.wallObjects=[{id:'panel',conceptId:'PAN-FIL-01',wall:'S',offsetMm:500,bottomMm:300,finishes:{Frame:'OAK',Weave:'CAN'}}]
 project.room.openings=[{id:'window',type:'window',wall:'N',offsetMm:500,widthMm:1200,heightMm:1200,sillMm:900,styleId:'WIN-FIL-02'}]
 const world=createWorld(project,'isometric',1,800,600,'panel');try{
  const panel=world.objects.get('panel')!;expect(panel.visible).toBe(true);expect(panel.userData.wallObject).toBe(true);expect(world.objects.get('window')?.userData.opening).toBe(true)
  expect(world.scene.getObjectByName('wall-selection-reveal')?.visible).toBe(true)
  const plan=getPlanPrimitives(project);expect(plan.wallObjects).toHaveLength(1);expect(plan.wallObjects[0].wall).toBe('S');expect(plan.wallObjects[0].minYmm).toBe(300)
  world.updateProject({...project,wallObjects:[{...project.wallObjects![0],offsetMm:800}]},'panel');expect(world.objects.get('panel')).toBe(panel)
 }finally{world.dispose()}
})
