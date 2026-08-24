/* =========================================================================
   Función de segundo plano: aquí se habla con el modelo.
   Tiene quince minutos, así que ya no hay prisa. No devuelve nada al
   navegador: deja el resultado guardado y /api/estado lo entrega.
   ========================================================================= */
import { escribir, hash } from './_control.js'
import { procesa } from './_nucleo.js'

export default async (req) => {
  let p
  try { p = await req.json() } catch { return }

  const { op, e, hReq, firma } = p || {}
  if (!op || !e || !hReq) return

  /* Solo la puerta de entrada conoce la firma: nadie de fuera puede disparar
     una consulta y gastar por su cuenta. */
  const esperada = await hash((process.env.ANTHROPIC_API_KEY || 'sin-llave') + '|' + hReq)
  if (firma !== esperada) return

  try {
    const salida = await procesa(op, e, false, hReq)
    await escribir('trab:' + hReq, { estado: 'listo', t: Date.now(), d: salida })
  } catch (err) {
    await escribir('trab:' + hReq, {
      estado: 'error', t: Date.now(),
      mensaje: err && err.message ? err.message : String(err),
    })
  }
}

export const config = { path: '/api/trabajo', background: true }
