import { expect, it } from 'vitest'
import { createLatestRequestGate } from './latest'
it('ignores out-of-order scene loads and any result after unmount',()=>{
 const gate=createLatestRequestGate(),first=gate.begin(),second=gate.begin()
 expect(gate.isCurrent(first)).toBe(false);expect(gate.isCurrent(second)).toBe(true)
 gate.invalidate();expect(gate.isCurrent(second)).toBe(false)
 expect(gate.isCurrent(gate.begin())).toBe(true)
})

import { sameEditingScope } from './latest'
it('rejects a pending action after reopening the same project in a new session',()=>{
 const start={projectId:'saved-project',sessionToken:7}
 expect(sameEditingScope(start,{projectId:'saved-project',sessionToken:7})).toBe(true)
 expect(sameEditingScope(start,{projectId:'saved-project',sessionToken:8})).toBe(false)
 expect(sameEditingScope(start,{projectId:'different-project',sessionToken:7})).toBe(false)
 expect(sameEditingScope({projectId:'legacy'},{projectId:'legacy'})).toBe(true)
})
