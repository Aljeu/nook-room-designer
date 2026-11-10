/** Load the editor before replacing its entry status; failed loads can be retried. */
export async function loadEditor<T>(load: () => Promise<T>, mount: (loaded: T) => void, failed: () => void): Promise<void> {
  try {
    const loaded = await load()
    mount(loaded)
  } catch {
    failed()
  }
}
