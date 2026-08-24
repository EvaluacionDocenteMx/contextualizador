/* Cliente de la función. Tres capas de ahorro antes de tocar el servidor:
   1. una llamada en vuelo bloquea las demás (adiós al doble clic),
   2. caché local por firma exacta de la petición,
   3. el servidor tiene su propio caché compartido.
   Nada de esto sustituye a los topes del servidor: son los que mandan. */

const SESION_CLAVE = 'ctx_sesion'
const enVuelo = new Map()
const cacheLocal = new Map()

export function sesionId() {
  try {
    let s = sessionStorage.getItem(SESION_CLAVE)
    if (!s) {
      s = 'ses-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
      sessionStorage.setItem(SESION_CLAVE, s)
    }
    return s
  } catch {
    return 'ses-' + Math.random().toString(36).slice(2, 12)
  }
}
export function nuevaSesion() {
  try { sessionStorage.removeItem(SESION_CLAVE) } catch {}
  cacheLocal.clear()
  return sesionId()
}

const firma = (cuerpo) => JSON.stringify(cuerpo)

export async function pide(cuerpo) {
  const c = { ...cuerpo, sesion: sesionId() }
  const f = firma(c)
  if (cacheLocal.has(f)) return { ...cacheLocal.get(f), deCacheLocal: true }
  if (enVuelo.has(f)) return enVuelo.get(f)

  const p = (async () => {
    /* La función responde en vivo para no morir en el tope de tiempo de
       Netlify: mientras el modelo trabaja llegan saltos de línea y al final el
       JSON. Por eso el estado siempre es 200 y el error viaja en el cuerpo. */
    const corta = new AbortController()
    const reloj = setTimeout(() => corta.abort(), 75000)
    let r
    try {
      r = await fetch('/api/ia', {
        method: 'POST',
        signal: corta.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(c),
      })
    } catch (err) {
      clearTimeout(reloj)
      throw new Error(err && err.name === 'AbortError'
        ? 'La consulta tardó demasiado y se canceló. Vuelve a presionar el botón; si insiste, trabaja con menos grados a la vez.'
        : 'No hubo conexión con el servidor. Revisa tu internet y vuelve a intentar.')
    }
    let j
    try { j = await r.json() } catch { j = { error: 'Respuesta ilegible del servidor' } }
    finally { clearTimeout(reloj) }
    if (!r.ok || (j && j.error)) {
      const e = new Error(j.mensaje || j.error || `Error ${r.status}`)
      e.codigo = j.codigo
      e.datos = j
      throw e
    }
    cacheLocal.set(f, j)
    return j
  })()

  enVuelo.set(f, p)
  try { return await p } finally { enVuelo.delete(f) }
}
