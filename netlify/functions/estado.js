/* =========================================================================
   El navegador pregunta aquí cada dos segundos: ¿ya está mi consulta?
   No cuesta nada: solo lee lo que dejó la función de segundo plano.
   ========================================================================= */
import { leer, respuesta } from './_control.js'

const ESPERA_MAXIMA = 5 * 60 * 1000

export default async (req) => {
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!/^[a-f0-9]{8,64}$/i.test(id)) return respuesta({ error: 'Identificador no válido' }, 400)

  const t = await leer('trab:' + id)
  /* Si todavía no aparece el registro, se asume que va en camino: el almacén
     tarda un instante en propagar lo que se escribe, y lo que de verdad importa
     es el resultado, que lo escribe la función de segundo plano. */
  if (!t) {
    const paso = await leer('paso:' + id)
    return respuesta({ estado: 'encurso', segundos: 0, paso })
  }
  if (t.estado === 'listo') return respuesta({ estado: 'listo', datos: t.d })
  if (t.estado === 'error') return respuesta({ estado: 'error', error: t.mensaje })

  const transcurrido = Date.now() - (t.t || 0)
  if (transcurrido > ESPERA_MAXIMA) {
    return respuesta({
      estado: 'error',
      error: 'La consulta se quedó sin respuesta. Vuelve a presionar el botón; ' +
             'si se repite, trabaja con menos grados a la vez.',
    })
  }
  /* La miga dice por donde va la funcion de segundo plano. */
  const paso = await leer('paso:' + id)
  return respuesta({ estado: 'encurso', segundos: Math.round(transcurrido / 1000), paso })
}

export const config = { path: '/api/estado' }
