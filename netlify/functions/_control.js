/* =========================================================================
   Capa de control de costo y abuso.
   Todo lo que evita que la cuenta se dispare vive aquí, del lado del
   servidor: nada de esto se puede saltar desde el navegador.
   ========================================================================= */

/* Precios por millón de tokens. Si Anthropic los cambia, se ajusta aquí. */
export const PRECIOS = {
  'claude-sonnet-5':            { ent: 2,  sal: 10, escrituraCache: 4, lecturaCache: 0.20 },
  'claude-haiku-4-5-20251001':  { ent: 1,  sal: 5,  escrituraCache: 2, lecturaCache: 0.10 },
}

export const MODELOS = {
  /* El razonamiento pesado —encontrar los contenidos y explicar por qué y
     cómo— va con Sonnet. Lo demás, con Haiku. */
  propuesta:  'claude-sonnet-5',
  ejes:       'claude-sonnet-5',
  proyecto:   'claude-haiku-4-5-20251001',
  pdaNuevo:   'claude-haiku-4-5-20251001',
}

/* Techos de salida por tipo de llamada: ninguna respuesta puede desbordarse. */
export const MAX_SALIDA = { propuesta: 8000, ejes: 6000, proyecto: 3000, pdaNuevo: 1500 }

export const LIMITES = {
  problematicasPorSesion: num(process.env.TOPE_PROBLEMATICAS, 20),
  llamadasPorIpHora:      num(process.env.TOPE_IP_HORA, 120),
  llamadasPorIpDia:       num(process.env.TOPE_IP_DIA, 500),
  topeMensualUsd:         num(process.env.TOPE_MENSUAL_USD, 60),
  maxCaracteresProblema:  1800,
}
function num(v, d) { const n = parseFloat(v); return Number.isFinite(n) ? n : d }

/* ---------------------------------------------------------------------
   Almacén. Usa Netlify Blobs cuando está disponible; si no, memoria del
   proceso (suficiente para desarrollo, se pierde entre invocaciones).
   --------------------------------------------------------------------- */
let modulo = null
let fallo = ''
const memoria = new Map()

/* El permiso de acceso al almacén CADUCA. La función de segundo plano tarda
   noventa segundos hablando con el modelo, y si se guarda el acceso desde el
   arranque, al momento de escribir el resultado ya venció: la consulta se
   calcula, se paga, y se pierde. Por eso el acceso se pide fresco cada vez.
   Lo único que se guarda es el módulo, que no caduca. */
async function store() {
  if (modulo === false) return false
  try {
    if (!modulo) modulo = await import('@netlify/blobs')
    return modulo.getStore('ctx-v2')
  } catch (err) {
    fallo = err && err.message ? err.message : String(err)
    modulo = false
    return false
  }
}

export async function estadoAlmacen() {
  const s = await store()
  if (!s) return { compartido: false, detalle: fallo || 'no se pudo cargar @netlify/blobs' }
  try {
    await s.setJSON('diagnostico', { t: Date.now() })
    const v = await s.get('diagnostico', { type: 'json' })
    return { compartido: !!v, detalle: 'Netlify Blobs responde' }
  } catch (err) {
    return { compartido: false, detalle: 'Netlify Blobs falló: ' + (err && err.message ? err.message : err) }
  }
}

export async function leer(clave) {
  const s = await store()
  if (!s) return memoria.get(clave) ?? null
  try { return await s.get(clave, { type: 'json' }) } catch { return memoria.get(clave) ?? null }
}

export async function escribir(clave, valor) {
  const s = await store()
  if (!s) { memoria.set(clave, valor); return }
  try {
    await s.setJSON(clave, valor)
  } catch (err) {
    /* Un segundo intento con acceso recién pedido: cubre el caso de que el
       permiso haya caducado justo durante la escritura. */
    try {
      const s2 = await store()
      if (s2) { await s2.setJSON(clave, valor); return }
      throw err
    } catch (err2) {
      console.error('[almacen] no se pudo escribir', clave, err2 && err2.message)
      memoria.set(clave, valor)
    }
  }
}

/* ---------------------------------------------------------------------
   Claves de periodo
   --------------------------------------------------------------------- */
const periodoMes  = (t) => 'gasto:' + new Date(t).toISOString().slice(0, 7)
const periodoHora = (t) => new Date(t).toISOString().slice(0, 13)
const periodoDia  = (t) => new Date(t).toISOString().slice(0, 10)

/* ---------------------------------------------------------------------
   1. Tope de gasto del periodo. Es la red de seguridad definitiva:
      cuando el mes alcanza el techo, la función deja de llamar al modelo.
   --------------------------------------------------------------------- */
export async function gastoDelMes(ahora = Date.now()) {
  return (await leer(periodoMes(ahora))) || { usd: 0, llamadas: 0, entrada: 0, salida: 0, cache: 0 }
}
export async function revisaPresupuesto(ahora = Date.now()) {
  const g = await gastoDelMes(ahora)
  if (g.usd >= LIMITES.topeMensualUsd) {
    return {
      ok: false, codigo: 'presupuesto',
      mensaje: 'Se alcanzó el límite de consumo definido para este periodo. ' +
               'La herramienta vuelve a habilitarse el próximo mes o cuando la persona ' +
               'responsable amplíe el tope.',
      gasto: g,
    }
  }
  return { ok: true, gasto: g }
}
export async function registraGasto(modelo, uso, ahora = Date.now()) {
  const p = PRECIOS[modelo] || PRECIOS['claude-sonnet-5']
  const ent   = uso.input_tokens || 0
  const sal   = uso.output_tokens || 0
  const cw    = uso.cache_creation_input_tokens || 0
  const cr    = uso.cache_read_input_tokens || 0
  const usd = (ent * p.ent + sal * p.sal + cw * p.escrituraCache + cr * p.lecturaCache) / 1e6
  const k = periodoMes(ahora)
  const g = (await leer(k)) || { usd: 0, llamadas: 0, entrada: 0, salida: 0, cache: 0 }
  g.usd      += usd
  g.llamadas += 1
  g.entrada  += ent
  g.salida   += sal
  g.cache    += cw + cr
  g.actualizado = new Date(ahora).toISOString()
  await escribir(k, g)
  return { usd, acumulado: g.usd }
}

/* ---------------------------------------------------------------------
   2. Tope de problemáticas por sesión.
      La sesión la crea el navegador, pero el conteo lo lleva el servidor.
   --------------------------------------------------------------------- */
export async function revisaSesion(sesion, problematicaHash) {
  if (!sesion || !/^[a-z0-9_-]{8,64}$/i.test(sesion)) {
    return { ok: false, codigo: 'sesion', mensaje: 'Sesión no válida.' }
  }
  const k = 'sesion:' + sesion
  const s = (await leer(k)) || { problematicas: [], creada: Date.now() }
  const yaEsta = s.problematicas.includes(problematicaHash)
  if (!yaEsta && s.problematicas.length >= LIMITES.problematicasPorSesion) {
    return {
      ok: false, codigo: 'tope_sesion',
      mensaje: `Esta sesión alcanzó el máximo de ${LIMITES.problematicasPorSesion} problemáticas. ` +
               `Descarga tu documento y abre una sesión nueva para continuar.`,
      usadas: s.problematicas.length,
    }
  }
  return { ok: true, estado: s, clave: k, nueva: !yaEsta }
}
export async function anotaProblematica(clave, estado, hash) {
  if (!estado.problematicas.includes(hash)) {
    estado.problematicas.push(hash)
    estado.actualizada = Date.now()
    await escribir(clave, estado)
  }
}

/* ---------------------------------------------------------------------
   3. Límite por IP: protege si el enlace se filtra.
   --------------------------------------------------------------------- */
export async function revisaIp(ip, ahora = Date.now()) {
  if (!ip) return { ok: true }
  const kh = `ip:${ip}:${periodoHora(ahora)}`
  const kd = `ip:${ip}:${periodoDia(ahora)}`
  const h = (await leer(kh)) || 0
  const d = (await leer(kd)) || 0
  if (h >= LIMITES.llamadasPorIpHora || d >= LIMITES.llamadasPorIpDia) {
    return {
      ok: false, codigo: 'ritmo',
      mensaje: 'Se hicieron demasiadas consultas desde esta conexión en poco tiempo. ' +
               'Espera un momento antes de continuar.',
    }
  }
  return { ok: true, sube: async () => { await escribir(kh, h + 1); await escribir(kd, d + 1) } }
}

/* ---------------------------------------------------------------------
   4. Caché de respuestas: la misma pregunta no se paga dos veces.
      Cubre el caso más común de gasto inútil: volver a presionar el botón,
      recargar la página o retroceder y avanzar.
   --------------------------------------------------------------------- */
export async function hash(texto) {
  const datos = new TextEncoder().encode(String(texto))
  const buf = await crypto.subtle.digest('SHA-256', datos)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}
export async function respuestaEnCache(clave) {
  const v = await leer('resp:' + clave)
  if (!v) return null
  if (Date.now() - (v.t || 0) > 1000 * 60 * 60 * 24 * 30) return null
  return v.d
}
export async function guardaRespuesta(clave, datos) {
  await escribir('resp:' + clave, { t: Date.now(), d: datos })
}

/* ---------------------------------------------------------------------
   5. Código de acceso opcional.
   --------------------------------------------------------------------- */
export function revisaCodigo(codigo) {
  const esperado = process.env.CODIGO_ACCESO
  if (!esperado) return { ok: true }
  if (String(codigo || '').trim() === esperado.trim()) return { ok: true }
  return { ok: false, codigo: 'acceso', mensaje: 'El código de acceso no es correcto.' }
}

export const respuesta = (obj, estado = 200) =>
  new Response(JSON.stringify(obj), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
