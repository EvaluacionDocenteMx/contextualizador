/* Cliente de la función. Tres capas de ahorro antes de tocar el servidor:
   1. una llamada en vuelo bloquea las demás (adiós al doble clic),
   2. caché local por firma exacta de la petición,
   3. el servidor tiene su propio caché compartido.
   Nada de esto sustituye a los topes del servidor: son los que mandan. */

/* Se muestra en el pie de la aplicación. Sirve para saber de un vistazo si el
   navegador está usando la versión nueva o una guardada de antes. */
export const VERSION = '5 · arranque rápido'

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

/* Una petición cualquiera al servidor, con los errores ya traducidos. */
async function manda(ruta, cuerpo) {
  const corta = new AbortController()
  const reloj = setTimeout(() => corta.abort(), 30000)
  let r
  try {
    r = await fetch(ruta, {
      method: cuerpo ? 'POST' : 'GET',
      signal: corta.signal,
      headers: cuerpo ? { 'content-type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch (err) {
    throw new Error(err && err.name === 'AbortError'
      ? 'El servidor tardó demasiado en contestar. Vuelve a intentar en un momento.'
      : 'No hubo conexión con el servidor. Revisa tu internet y vuelve a intentar.')
  } finally { clearTimeout(reloj) }

  let j
  try { j = await r.json() } catch { j = { error: 'Respuesta ilegible del servidor' } }
  if (!r.ok || (j && j.error)) {
    const e = new Error(j.mensaje || j.error || `Error ${r.status}`)
    e.codigo = j.codigo
    e.datos = j
    throw e
  }
  return j
}

/* El modelo tarda entre veinte y cuarenta segundos, más de lo que aguanta una
   función normal de Netlify. Por eso el trabajo corre en segundo plano y aquí
   se pregunta por él cada dos segundos. */
const duerme = (ms) => new Promise(r => setTimeout(r, ms))
async function espera(trabajo, limiteMs = 5 * 60 * 1000) {
  const arranque = Date.now()
  let fallos = 0
  while (Date.now() - arranque < limiteMs) {
    await duerme(2000)
    let e
    try { e = await manda('/api/estado?id=' + encodeURIComponent(trabajo)) }
    catch (err) {
      /* Un tropiezo de red no debe tirar la espera; varios seguidos, sí. */
      if (err.datos && err.datos.error && !/conexión|ilegible|tardó/i.test(err.message)) throw err
      if (++fallos > 8) throw err
      continue
    }
    fallos = 0
    if (e.estado === 'listo') return e.datos
    if (e.estado === 'desconocido' && Date.now() - arranque > 30000) {
      throw new Error('El servidor perdió el hilo de la consulta. Vuelve a presionar el botón.')
    }
  }
  throw new Error('La consulta tardó más de cinco minutos. Vuelve a presionar el botón; ' +
                  'si se repite, trabaja con menos grados a la vez.')
}

export async function pide(cuerpo) {
  const c = { ...cuerpo, sesion: sesionId() }
  const f = firma(c)
  if (cacheLocal.has(f)) return { ...cacheLocal.get(f), deCacheLocal: true }
  if (enVuelo.has(f)) return enVuelo.get(f)

  const p = (async () => {
    const j = await manda('/api/ia', c)
    /* Si la consulta se fue al segundo plano, aquí solo llegó el número de
       trabajo: hay que esperar preguntando. */
    let fin = j
    if (j && j.enCurso && j.trabajo) {
      /* El navegador despierta a la función de segundo plano sin esperar su
         respuesta: la primera vez del día esa función tarda en arrancar y no
         tiene caso que el colectivo espere por eso. */
      fetch('/api/trabajo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hReq: j.trabajo, firma: j.firma, carga: j.carga }),
      }).catch(() => {})
      fin = await espera(j.trabajo)
    }
    cacheLocal.set(f, fin)
    return fin
  })()

  enVuelo.set(f, p)
  try { return await p } finally { enVuelo.delete(f) }
}
