/* =========================================================================
   Puerta de entrada. Hace las revisiones baratas —código, presupuesto, ritmo,
   sesión, caché— y despacha el trabajo pesado a la función de segundo plano.

   Por qué así: Netlify corta las funciones normales a los treinta segundos, y
   leer el programa sintético completo y redactar las propuestas le toma al
   modelo más que eso. Las funciones de segundo plano tienen quince minutos.
   El navegador se lleva un número de trabajo y pregunta por él cada dos
   segundos hasta que está listo.
   ========================================================================= */
import {
  MODELOS, LIMITES, respuesta, hash, leer, escribir,
  revisaPresupuesto, revisaSesion, anotaProblematica,
  revisaIp, revisaCodigo, respuestaEnCache,
} from './_control.js'
import { D, DEMO, PorId, procesa, VERSION_ENCARGO } from './_nucleo.js'

export default async (req) => {
  if (req.method !== 'POST') return respuesta({ error: 'Método no permitido' }, 405)

  let e
  try { e = await req.json() } catch { return respuesta({ error: 'Petición ilegible' }, 400) }

  const op = String(e.op || '')
  if (!MODELOS[op]) return respuesta({ error: 'Operación desconocida' }, 400)

  const acc = revisaCodigo(e.codigo)
  if (!acc.ok) return respuesta(acc, 403)

  e.problematica = String(e.problematica || '').slice(0, LIMITES.maxCaracteresProblema).trim()
  e.grados = Array.isArray(e.grados) ? e.grados.filter(g => D.grados.includes(g)) : D.grados
  e.ejes = Array.isArray(e.ejes) ? e.ejes.slice(0, 7) : []
  if (!e.problematica) return respuesta({ error: 'Falta la problemática' }, 400)

  /* 1 · presupuesto del periodo */
  const pres = await revisaPresupuesto()
  if (!pres.ok) return respuesta(pres, 429)

  /* 2 · ritmo por conexión */
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || ''
  const rit = await revisaIp(ip.split(',')[0].trim())
  if (!rit.ok) return respuesta(rit, 429)

  /* 3 · tope de problemáticas por sesión */
  const hProb = await hash(D.nivel + '|' + e.problematica)
  const ses = await revisaSesion(e.sesion, hProb)
  if (!ses.ok) return respuesta(ses, 429)

  /* 4 · caché de respuestas: la misma pregunta no se paga dos veces.
     El modo entra en la firma: una respuesta de ejemplo y una del modelo nunca
     pueden confundirse, ni siquiera para la misma problemática. */
  const enDemo = DEMO() || !process.env.ANTHROPIC_API_KEY
  const hReq = await hash(JSON.stringify({
    op, n: D.nivel, p: e.problematica, g: e.grados, ej: e.ejes,
    el: (e.elegidos || []).map(String).sort(), cn: e.contenidoNuevo || '',
    modo: enDemo ? 'demo' : 'ia', v: VERSION_ENCARGO,
  }))
  const cacheada = await respuestaEnCache(hReq)
  if (cacheada) {
    await anotaProblematica(ses.clave, ses.estado, hProb)
    return respuesta({ ...cacheada, deCache: true })
  }

  /* 5 · los contenidos elegidos se resuelven en el servidor, no se confía en el cliente */
  if (op === 'ejes' || op === 'proyecto') {
    e.elegidos = (e.elegidos || []).map(id => PorId.get(String(id))).filter(Boolean)
    if (!e.elegidos.length) return respuesta({ error: 'No hay contenidos elegidos' }, 400)
  }

  /* 6 · el modo demo no llama a nadie: responde al instante */
  if (enDemo) {
    await anotaProblematica(ses.clave, ses.estado, hProb)
    try { return respuesta(await procesa(op, e, true, hReq)) }
    catch (err) { return respuesta({ error: err.message }, 502) }
  }

  /* 7 · la tarea viaja firmada por el navegador.
     El almacén compartido tarda un instante en propagar lo que se escribe, y la
     función de segundo plano arranca antes de eso: por eso la carga va también
     en la respuesta, y la firma cubre el texto exacto de esa carga. Así el
     navegador no puede alterar lo que se le va a pedir al modelo. */
  const cargaTexto = JSON.stringify({ op, e })
  const firma = await hash((process.env.ANTHROPIC_API_KEY || 'sin-llave') + '|' + hReq + '|' + cargaTexto)

  /* ¿ya hay un trabajo idéntico en curso? Entonces no se paga otra vez. */
  const previo = await leer('trab:' + hReq)
  if (previo && previo.estado === 'encurso' && Date.now() - (previo.t || 0) < 5 * 60 * 1000) {
    return respuesta({ enCurso: true, trabajo: hReq, firma, carga: cargaTexto })
  }

  /* 8 · se deja la tarea anotada y se le entrega al navegador, que es quien
     despierta a la función de segundo plano: así el colectivo no espera a que
     esa función arranque, que la primera vez del día puede tardar. */
  await escribir('trab:' + hReq, { estado: 'encurso', t: Date.now(), cargaTexto })
  await anotaProblematica(ses.clave, ses.estado, hProb)
  if (rit.sube) await rit.sube()

  return respuesta({ enCurso: true, trabajo: hReq, firma, carga: cargaTexto })
}

export const config = { path: '/api/ia' }
