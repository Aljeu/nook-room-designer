import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const output = path.join(root, 'public/thumbnails')
const manifest = path.join(root, 'src/ui/prepared-thumbnails.json')
async function sourceFingerprint() {
  const files = ['package-lock.json','src/ui/thumbnailKeys.ts','scripts/thumbnail-generator/main.ts']
  for (const dir of ['src/assets','src/catalog','src/geometry','src/domain']) for (const file of await readdir(dir)) if (file.endsWith('.ts') && !file.endsWith('.test.ts')) files.push(`${dir}/${file}`)
  const hash = createHash('sha256')
  for (const file of files.sort()) { hash.update(file); hash.update('\0'); hash.update(await readFile(file)); hash.update('\0') }
  return hash.digest('hex')
}
if (process.argv.includes('--check')) {
  try {
    const data = JSON.parse(await readFile(manifest, 'utf8'))
    if (data.sourceHash !== await sourceFingerprint()) throw new Error('Source changed since previews were prepared.')
    const ids = new Set()
    for (const entry of data.entries) {
      if (!['furniture','wall','window','door'].includes(entry.kind) || !/^[A-Z0-9-]+$/.test(entry.id) || ids.has(`${entry.kind}:${entry.id}`)) throw new Error('Invalid preview entry.')
      ids.add(`${entry.kind}:${entry.id}`)
      const bytes = await readFile(path.join(output, entry.kind, `${entry.id}.png`))
      const size = entry.kind === 'furniture' ? 320 : 160
      if (bytes.length < 24 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Invalid or modified preview: ${entry.id}`)
    }
    console.log(`${data.entries.length} preview files match the source fingerprint. Run npm test for catalogue coverage.`)
  } catch (error) { console.error(`Thumbnail check failed: ${error.message}`); process.exitCode = 1 }
} else {
  const startHash = await sourceFingerprint()
  const stage = await mkdtemp(path.join(root, 'public/.thumbnails-'))
  const received = new Map()
  const allowed = new Set(['furniture','wall','window','door'])
  const collect = async (request, max) => {
    const chunks=[];let size=0
    for await (const chunk of request) { size+=chunk.length;if(size>max)throw new Error('Request too large');chunks.push(chunk) }
    return Buffer.concat(chunks)
  }
  const plugin={name:'nook-thumbnail-writer',configureServer(server){server.middlewares.use(async(req,res,next)=>{
    try {
      const url=req.url ?? ''
      if (req.method === 'POST' && url.startsWith('/__nook_thumbnail') && req.headers.origin !== 'http://127.0.0.1:5188') throw new Error('Invalid request origin')
      if(req.method==='POST' && url.startsWith('/__nook_thumbnail/')) {
        const match=/^\/__nook_thumbnail\/(furniture|wall|window|door)\/([A-Z0-9-]+)$/.exec(url)
        if(!match)throw new Error('Invalid preview identity')
        const [,kind,id]=match,bytes=await collect(req,2_000_000)
        if(bytes.length<24 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid PNG')
        await mkdir(path.join(stage,kind),{recursive:true});await writeFile(path.join(stage,kind,`${id}.png`),bytes);received.set(`${kind}:${id}`,createHash('sha256').update(bytes).digest('hex'));res.end('ok');return
      }
      if(req.method==='POST' && url==='/__nook_thumbnail_complete') {
        const entries=JSON.parse((await collect(req,1_000_000)).toString('utf8'))
        if(!Array.isArray(entries)||!entries.length||entries.length!==received.size||entries.some(e=>!allowed.has(e.kind)||!(/^[A-Z0-9-]+$/).test(e.id)||typeof e.key!=='string'||!received.has(`${e.kind}:${e.id}`))||new Set(entries.map(e=>`${e.kind}:${e.id}`)).size!==entries.length)throw new Error('Incomplete or invalid preview set')
        if(await sourceFingerprint()!==startHash)throw new Error('Source changed during preparation; run it again.')
        const manifestTemp=manifest+'.tmp'
        const verified = entries.map(entry => ({...entry, sha256:received.get(`${entry.kind}:${entry.id}`)}))
        await writeFile(manifestTemp,JSON.stringify({sourceHash:startHash,entries:verified},null,2)+'\n')
        const old=output+'-previous'
        await rm(old,{recursive:true,force:true})
        try{await rename(output,old)}catch(error){if(error.code!=='ENOENT')throw error}
        try {await rename(stage,output);await rename(manifestTemp,manifest)} catch(error) {await rm(output,{recursive:true,force:true});await rm(manifestTemp,{force:true});try{await rename(old,output)}catch{};throw error}
        await rm(old,{recursive:true,force:true})
        res.end('ok');console.log(`Prepared ${entries.length} previews.`);return
      }
      next()
    } catch(error) {res.statusCode=500;res.end(error.message)}
  })}}
  const server=await createServer({configFile:false,root,plugins:[plugin],server:{host:'127.0.0.1',port:5188,strictPort:true},appType:'mpa'})
  await server.listen()
  console.log('Open http://127.0.0.1:5188/scripts/thumbnail-generator/ and choose Generate previews. Press Ctrl-C when complete.')
  const stop=async()=>{await server.close();await rm(stage,{recursive:true,force:true});process.exit()}
  process.on('SIGINT',stop);process.on('SIGTERM',stop)
}
