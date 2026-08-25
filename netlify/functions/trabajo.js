/* =========================================================================
   Funcion de segundo plano: aqui se habla con el modelo.
   Tiene quince minutos. No devuelve nada al navegador: deja el resultado
   guardado y /api/estado lo entrega. Va dejando migas de por donde paso,
   para que un fallo silencioso no vuelva a costar una tarde.
   ========================================================================= */
import { escribir, leer, hash } from './_control.js'
import { procesa } from './_nucleo.js'

export default async (req) => {
  let p, hReq
  const miga = async (paso, extra) => {
    try { await escribir('paso:' + hReq, { paso, t: Date.now(), ...(extra || {}) }) } catch {}
  }
  try { p = await req.json() } catch { return }

  const firma = p && p.firma
  hReq = p && p.hReq
  if (!hReq) return
  await miga('entro')

  const esperada = await hash((process.env.ANTHROPIC_API_KEY || 'sin-llave') + '|' + hReq)
  if (firma !== esperada) { await miga('firma no coincide'); return }
  await miga('firma ok')

  let t = await leer('trab:' + hReq)
  await miga('lei el trabajo', { hayRegistro: !!t, hayCarga: !!(t && t.carga), estado: t && t.estado })

  /* Si el almacen todavia no propago la escritura, sirve la carga que manda el
     navegador, que es exactamente la que el servidor le entrego. */
  const carga = (t && t.carga) || p.carga
  if (!carga) { await miga('sin carga'); return }
  if (t && (t.estado === 'listo' || t.estado === 'error')) { await miga('ya estaba hecho'); return }

  try {
    await miga('llamando al modelo')
    const salida = await procesa(carga.op, carga.e, false, hReq)
    await escribir('trab:' + hReq, { estado: 'listo', t: Date.now(), d: salida })
    await miga('listo')
  } catch (err) {
    const mensaje = err && err.message ? err.message : String(err)
    await escribir('trab:' + hReq, { estado: 'error', t: Date.now(), mensaje })
    await miga('fallo', { mensaje: mensaje.slice(0, 300) })
  }
}

export const config = { path: '/api/trabajo', background: true }
