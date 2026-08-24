/* =========================================================================
   Revisión rápida: dice en una pantalla si la llave sirve, si el modelo
   contesta y cuánto tarda. Cuesta menos de un centavo de dólar.
   Se abre con:  /api/prueba?clave=LA_DE_CLAVE_PANEL
   ========================================================================= */
import { MODELOS, respuesta, estadoAlmacen } from './_control.js'
import { D, DEMO, diagnosticoProfundo } from './_nucleo.js'

export default async (req) => {
  const clave = new URL(req.url).searchParams.get('clave') || ''
  const esperada = process.env.CLAVE_PANEL || ''
  if (!esperada || clave !== esperada) return respuesta({ error: 'Clave incorrecta' }, 403)

  const llave = process.env.ANTHROPIC_API_KEY || ''
  const informe = {
    versionDelServidor: '4 · diagnóstico',
    nivel: D.nivel,
    contenidosCargados: D.contenidos.length,
    modoDemo: DEMO(),
    llaveConfigurada: !!llave,
    llaveEmpiezaCon: llave ? llave.slice(0, 7) + '…' : '(vacía)',
    llaveConEspacios: llave !== llave.trim(),
    modeloDePropuestas: MODELOS.propuesta,
  }

  /* Sin almacén compartido, la función de segundo plano no tiene dónde dejar
     el resultado y la aplicación se quedaría esperando para siempre. */
  const alm = await estadoAlmacen()
  informe.almacenCompartido = alm.compartido
  informe.almacenDetalle = alm.detalle

  if (!llave) {
    informe.resultado = 'No hay ANTHROPIC_API_KEY. La aplicación solo puede dar respuestas de ejemplo.'
    return respuesta(informe)
  }

  const t0 = Date.now()
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': llave.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELOS.propuesta,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Responde solamente: listo' }],
      }),
    })
    informe.estadoHttp = r.status
    informe.segundos = +((Date.now() - t0) / 1000).toFixed(2)
    const texto = await r.text()
    if (r.ok) {
      informe.resultado = 'La llave sirve y el modelo contesta.'
      try { informe.respuestaDelModelo = JSON.parse(texto).content[0].text } catch {}
    } else {
      informe.resultado = 'El modelo rechazó la petición. Este es el mensaje tal cual:'
      informe.mensajeDeAnthropic = texto.slice(0, 600)
    }
  } catch (err) {
    informe.segundos = +((Date.now() - t0) / 1000).toFixed(2)
    informe.resultado = 'No se pudo ni siquiera conectar con Anthropic.'
    informe.mensajeDeAnthropic = err && err.message ? err.message : String(err)
  }

  /* Con &real=1 hace una consulta de propuestas de verdad y reporta cada paso.
     Cuesta lo mismo que una consulta normal. Con &real=todos usa todos los grados. */
  const real = new URL(req.url).searchParams.get('real')
  if (real && informe.estadoHttp === 200) {
    informe.consultaReal = await diagnosticoProfundo(real === 'todos' ? D.grados : [D.grados[0]])
  }

  return respuesta(informe)
}

export const config = { path: '/api/prueba' }
