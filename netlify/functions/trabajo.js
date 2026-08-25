/* =========================================================================
   Función de segundo plano: aquí se habla con el modelo.
   Tiene quince minutos. No devuelve nada al navegador: deja el resultado
   guardado y /api/estado lo entrega. Va dejando migas de por dónde pasó, para
   que un fallo silencioso no vuelva a costar una tarde.
   ========================================================================= */
import { escribir, leer, hash } from './_control.js'
import { procesa } from './_nucleo.js'

export default async (req) => {
  let p, hReq
  const miga = async (paso, extra) => {
    try { await escribir('paso:' + hReq, { paso, t: Date.now(), ...(extra || {}) }) } catch {}
  }
  try { p = await req.json() } catch { return }

  hReq = p && p.hReq
  if (!hReq) return
  await miga('entró')

  /* La carga llega del navegador, pero firmada: si le cambiaran una coma, la
     firma deja de coincidir. El almacén sirve de respaldo. */
  const guardado = await leer('trab:' + hReq)
  const cargaTexto = p.carga || (guardado && guardado.cargaTexto)
  if (!cargaTexto) { await miga('sin carga') ; return }

  const esperada = await hash((process.env.ANTHROPIC_API_KEY || 'sin-llave') + '|' + hReq + '|' + cargaTexto)
  if (p.firma !== esperada) { await miga('la firma no coincide'); return }

  if (guardado && (guardado.estado === 'listo' || guardado.estado === 'error')) {
    await miga('ya estaba hecho'); return
  }

  let carga
  try { carga = JSON.parse(cargaTexto) } catch { await miga('carga ilegible'); return }

  try {
    await miga('llamando al modelo')
    const salida = await procesa(carga.op, carga.e, false, hReq)
    await escribir('trab:' + hReq, { estado: 'listo', t: Date.now(), d: salida })
    await miga('listo')
  } catch (err) {
    const mensaje = err && err.message ? err.message : String(err)
    await escribir('trab:' + hReq, { estado: 'error', t: Date.now(), mensaje })
    await miga('falló', { mensaje: mensaje.slice(0, 300) })
  }
}

export const config = { path: '/api/trabajo', background: true }
