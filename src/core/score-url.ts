/**
 * The score named by `?score=` in the page address, as an absolute URL —
 * provided it lies on the same site. A link can thus open a score in the
 * piano (`index.html?score=/music/piece.mscz`) but not make it fetch one
 * from elsewhere.
 */
export function scoreFromQuery(search: string, origin: string): string | null {
  const value = new URLSearchParams(search).get('score');
  if (!value) return null;
  try {
    const url = new URL(value, origin + '/');
    return url.origin === origin ? url.href : null;
  } catch {
    return null;
  }
}
