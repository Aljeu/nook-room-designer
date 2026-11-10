/// <reference types="vite/client" />
import raw from './prepared-thumbnails.json?raw'

type Entry = { kind: 'furniture' | 'wall' | 'window' | 'door'; id: string; key: string }
const manifest = JSON.parse(raw) as { sourceHash: string; entries: Entry[] }
const lookup = new Map(manifest.entries.map((entry) => [entry.key, entry]))

/** Missing or stale signatures fall back without loading models in the browsing path. */
export function preparedThumbnailUrl(key: string, base = import.meta.env.BASE_URL): string | undefined {
  const entry = lookup.get(key)
  if (!entry) return undefined
  // The editor document is one directory below the public root in a relative-base build.
  const prefix = base === './' || base === '' ? '../' : base.endsWith('/') ? base : `${base}/`
  return `${prefix}thumbnails/${entry.kind}/${encodeURIComponent(entry.id)}.png?v=${manifest.sourceHash.slice(0, 12)}`
}
export const preparedThumbnailEntries: readonly Entry[] = manifest.entries
