/* =========================================================================
   Funcion de segundo plano: aqui se habla con el modelo.
   Tiene quince minutos, asi que ya no hay prisa. No devuelve nada al
   navegador: deja el resultado guardado y /api/estado lo entrega.
   ========================================================================= */
import { escribir, leer, hash } from './_control.js'
import { procesa } from './_nucleo.js'

export default async (req) => {
  let p
  try { p = await req.json() } catch { return }

  const { hReq, firma } = p || {}
  if (!hReq) return

  /* Solo la puerta de entrada sabe calcular la firma, y solo sirve para este
     trabajo: nadie de fuera puede encargar una consulta y gastar por su cuenta. */
  const esperada = await hash((process.env.ANTHROPIC_API_KEY || 'sin-llave') + '|' + hReq)
  if (firma !== esperada) return

  const t = await leer('trab:' + hReq)
  if (!t || !t.carga) return
  if (t.estado === 'listo' || t.estado === 'error') return

  try {
    const salida = await procesa(t.carga.op, t.carga.e, false, hReq)
    await escribir('trab:' + hReq, { estado: 'listo', t: Date.now(), d: salida })
  } catch (err) {
    await escribir('trab:' + hReq, {
      estado: 'error', t: Date.now(),
      mensaje: err && err.message ? err.message : String(err),
    })
  }
}

export const config = { path: '/api/trabajo', background: true }
