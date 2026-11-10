/** Canonicalize the editor directory without changing other paths or query strings. */
export function editorRedirectPath(url: string): string | null {
  const match = /^\/editor(\?.*)?$/.exec(url)
  return match ? '/editor/' + (match[1] ?? '') : null
}
