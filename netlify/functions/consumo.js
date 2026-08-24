/* Panel de consumo: cuánto se ha gastado en el periodo y cuánto queda.
   Se protege con la variable CLAVE_PANEL; sin ella, el endpoint no responde. */
import { gastoDelMes, LIMITES, respuesta } from './_control.js'

export default async (req) => {
  const clave = new URL(req.url).searchParams.get('clave') || ''
  const esperada = process.env.CLAVE_PANEL
  if (!esperada || clave !== esperada) return respuesta({ error: 'No autorizado' }, 403)

  const g = await gastoDelMes()
  const tope = LIMITES.topeMensualUsd
  const tc = 16.97 // referencia; ajusta si quieres verlo en pesos con otro tipo de cambio
  return respuesta({
    periodo: new Date().toISOString().slice(0, 7),
    gastoUsd: +g.usd.toFixed(4),
    gastoMxnAprox: +(g.usd * tc).toFixed(2),
    topeUsd: tope,
    restanteUsd: +(tope - g.usd).toFixed(4),
    porcentajeUsado: +((g.usd / tope) * 100).toFixed(1),
    llamadas: g.llamadas,
    tokens: { entrada: g.entrada, salida: g.salida, cache: g.cache },
    limites: LIMITES,
    actualizado: g.actualizado || null,
  })
}

export const config = { path: '/api/consumo' }
