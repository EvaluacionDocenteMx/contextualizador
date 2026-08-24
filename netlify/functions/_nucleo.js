/* =========================================================================
   Núcleo: el único lugar que habla con el modelo.
   La llave nunca sale de aquí. Toda propuesta se coteja contra el catálogo
   antes de devolverse: si el modelo inventa un contenido, no llega al aula.
   ========================================================================= */
import {
  MODELOS, MAX_SALIDA, LIMITES, respuesta, hash,
  revisaPresupuesto, registraGasto, revisaSesion, anotaProblematica,
  revisaIp, revisaCodigo, respuestaEnCache, guardaRespuesta,
} from './_control.js'

import preescolar from '../../datos/preescolar.json' with { type: 'json' }
import primaria from '../../datos/primaria.json' with { type: 'json' }
import secundaria from '../../datos/secundaria.json' with { type: 'json' }

const NIVELES = { preescolar, primaria, secundaria }
export const D = NIVELES[(process.env.NIVEL || 'primaria').toLowerCase()] || primaria
export const DEMO = () => process.env.MODO_DEMO === '1'
export const PorId = new Map(D.contenidos.map(c => [c.id, c]))

/* ---------------- catálogo que ve el modelo ---------------- */
function lineaContenido(c) {
  const pda = Object.keys(c.pda).map(g => `[${g}] ` + c.pda[g].join(' / ')).join(' ')
  return `${c.id}|${c.campo}${c.subarea ? ' » ' + c.subarea : ''}|${c.fase} p.${c.pagina}|` +
         `grados ${Object.keys(c.pda).join(',')}|${c.contenido}|PDA: ${pda}`
}
function catalogo(grados) {
  const lista = grados && grados.length
    ? D.contenidos.filter(c => Object.keys(c.pda).some(g => grados.includes(g)))
    : D.contenidos
  return lista.map(lineaContenido).join('\n')
}
function bloqueCampos() {
  const out = []
  for (const fase of Object.keys(D.campos)) {
    for (const campo of Object.keys(D.campos[fase])) {
      const d = D.campos[fase][campo]
      out.push(`### ${campo} — ${fase}\nFINALIDADES:\n` +
        d.finalidades.map(x => '- ' + x).join('\n') +
        (d.especificidades.length ? `\nESPECIFICIDADES DE LA FASE:\n` + d.especificidades.map(x => '- ' + x).join('\n') : ''))
    }
  }
  return out.join('\n\n')
}
const bloqueEjes = () => D.ejes.map(e => `### ${e.nombre} (${e.id})\n${e.texto}`).join('\n\n')
const bloquePerfil = () => D.perfil.map(r => `Rasgo ${r.num}: ${r.texto}`).join('\n')
const bloqueMetodologias = () =>
  Object.keys(D.metodologias).map(k => `### ${k} — ${D.metodologias[k].nombre}\n${D.metodologias[k].texto}`).join('\n\n')

const ENCARGO = `Eres asesor técnico pedagógico mexicano, experto en el Plan de Estudio para la Educación Preescolar, Primaria y Secundaria 2022 y en la elaboración del Programa Analítico de la Nueva Escuela Mexicana.

Acompañas a colectivos docentes que muchas veces no dominan todo el Programa Sintético. Tu trabajo es que encuentren, dentro del currículo nacional que ya existe, los contenidos que dialogan de verdad con la problemática de su comunidad, y que entiendan por qué y cómo.

Reglas que no se rompen:
- Solo puedes proponer contenidos que estén en el CATÁLOGO, citándolos por su identificador. Nunca inventes un contenido, un Proceso de Desarrollo de Aprendizaje ni una página.
- Escribes en español de México, en el registro de los materiales de Consejo Técnico Escolar de la SEP. Tuteas al colectivo.
- No desarrollas planeación didáctica: el Programa Analítico no la incluye.
- Prefieres pocas propuestas buenas a muchas forzadas. Si un campo formativo no tiene nada pertinente, dilo en vez de rellenar.
- Cuando expliques el "cómo", sé concreto y situado: di con qué se empieza, con qué evidencia se trabaja y quién de la comunidad participa. Nada de fórmulas genéricas.
- Responde SIEMPRE con un único objeto JSON válido, sin texto antes ni después, sin bloques de código.`

/* ---------------- prompts por operación ---------------- */
function prompt(op, e) {
  if (op === 'propuesta') return `PROBLEMÁTICA DE LA LECTURA DE LA REALIDAD:
"""${e.problematica}"""

Grados con los que trabaja el colectivo: ${e.grados.join(', ')}.

Revisa el catálogo completo y elige los contenidos que se vinculan de verdad con esta problemática. Busca en los cuatro campos formativos: el valor de esto es que el colectivo vea vínculos que no había considerado. Propón entre 2 y 4 por campo formativo, ordenados del más pertinente al menos. Si un campo no aporta nada honesto, devuelve una lista vacía para ese campo y explica por qué en "sinAporte".

Devuelve este JSON:
{
 "lectura": "2 o 3 líneas: qué entendiste de la problemática y qué la hace trabajable desde la escuela",
 "propuestas": [
   {"id":"cXXXX",
    "porque":"por qué este contenido se vincula con ESTA problemática, no con el tema en general. 2 a 4 líneas.",
    "como":"cómo podría abordarse: con qué se empieza, con qué evidencia, quién de la comunidad participa. 2 a 4 líneas."}
 ],
 "sinAporte": [{"campo":"nombre del campo","razon":"por qué no hay nada pertinente"}]
}`

  if (op === 'ejes') return `PROBLEMÁTICA:
"""${e.problematica}"""

CONTENIDOS QUE EL COLECTIVO YA ELIGIÓ:
${e.elegidos.map(c => `- ${c.id} | ${c.campo} | ${c.contenido}`).join('\n')}

EJES ARTICULADORES QUE ELIGIÓ EL COLECTIVO: ${e.ejes.join(', ')}.

Elegir un eje no es ponerle una etiqueta al proyecto: cambia hacia dónde se orienta el trabajo. Explica esa reorientación y, si hace falta, suma del catálogo los contenidos que ese enfoque necesita para sostenerse y que el colectivo no había elegido. Si con lo que ya tiene basta, devuelve "adicionales" vacío.

Devuelve este JSON:
{
 "orientacion":"5 a 8 líneas: cómo cambia el trabajo al mirarlo desde estos ejes, con ejemplos concretos de hacia dónde llevar la reflexión en esta problemática",
 "adicionales":[{"id":"cXXXX","porque":"por qué este eje exige este contenido","como":"cómo se aborda"}],
 "preguntasParaElColectivo":["2 o 3 preguntas que el colectivo debería hacerse para que el eje no quede en discurso"]
}`

  if (op === 'proyecto') return `PROBLEMÁTICA:
"""${e.problematica}"""

CONTENIDOS ELEGIDOS:
${e.elegidos.map(c => `- ${c.campo} | ${c.contenido} | grados ${Object.keys(c.pda).join(',')}`).join('\n')}

EJES: ${e.ejes.join(', ') || 'sin definir'}.

Sugiere UNA ruta de proyecto usando la metodología sociocrítica que mejor corresponda, de las cuatro del documento oficial. No desarrolles planeación didáctica: solo la ruta.

Devuelve este JSON:
{
 "metodologia":"abpc | abi | abp | aps",
 "nombreMetodologia":"nombre completo tal como aparece en el documento",
 "porQueEsa":"2 a 3 líneas de por qué esta metodología y no otra, para esta problemática",
 "titulo":"nombre del proyecto, en el habla del colectivo",
 "pregunta":"pregunta problematizadora que abre el proyecto",
 "producto":"qué se produce y ante quién se presenta",
 "participacionComunidad":"quiénes de la comunidad participan y en qué momento",
 "fases":[{"nombre":"nombre literal de la fase del documento","momentos":["nombres literales de los momentos"],"queSeHace":"1 o 2 líneas situadas en esta problemática"}],
 "rasgosPerfil":[{"num":"número romano del rasgo, tal como aparece en el perfil de egreso","porque":"1 línea de por qué este trabajo lo toca"}]
}`

  if (op === 'pdaNuevo') return `PROBLEMÁTICA:
"""${e.problematica}"""

El colectivo decidió incorporar un CONTENIDO NUEVO por codiseño, porque considera que el currículo nacional no lo cubre:
"""${e.contenidoNuevo}"""

Grados: ${e.grados.join(', ')}.

Redacta sus Procesos de Desarrollo de Aprendizaje en el mismo registro que usa el Programa Sintético: empiezan con un verbo en tercera persona del singular, describen un recorrido de apropiación y son observables. Entre 3 y 5.

Antes, valora con honestidad si el contenido realmente no está cubierto por el currículo nacional; si crees que sí lo está, dilo.

Devuelve este JSON:
{
 "valoracion":"2 o 3 líneas: si el contenido se justifica como codiseño o si ya está cubierto, y por qué",
 "pda":{"${e.grados[0]}":["...","..."]},
 "sugerenciaRedaccion":"si el enunciado del contenido podría redactarse mejor, propón la versión mejorada; si está bien, repítelo"
}`

  throw new Error('operación desconocida')
}

/* ---------------- llamada al modelo ---------------- */
async function llamaModelo(op, e) {
  const modelo = MODELOS[op]
  const sistema = [
    { type: 'text', text: ENCARGO },
    /* Estos bloques son idénticos en todas las consultas del nivel, así que
       se cachean una vez y las siguientes las leen a una décima parte del
       precio. El caché se comparte entre todas las escuelas. */
    { type: 'text', text: `CATÁLOGO DE CONTENIDOS Y PDA — ${D.nombre}` +
        (e.grados && e.grados.length < D.grados.length ? ` (grados ${e.grados.join(', ')})` : '') +
        `\nFormato: id|campo|fase y página|grados|contenido|PDA\n\n${catalogo(e.grados)}`,
      cache_control: { type: 'ephemeral', ttl: '1h' } },
    { type: 'text', text: `FINALIDADES Y ESPECIFICIDADES DE LOS CAMPOS FORMATIVOS\n\n${bloqueCampos()}` },
    { type: 'text', text: `EJES ARTICULADORES (Plan de Estudio 2022)\n\n${bloqueEjes()}` },
    { type: 'text', text: `PERFIL DE EGRESO\n\n${bloquePerfil()}` },
    { type: 'text', text: `METODOLOGÍAS SOCIOCRÍTICAS (Sugerencias metodológicas, SEP)\n\n${bloqueMetodologias()}`,
      cache_control: { type: 'ephemeral', ttl: '1h' } },
  ]
  /* Netlify corta a los 60 segundos aunque la respuesta vaya en vivo. Cortamos
     antes nosotros, para alcanzar a devolver un mensaje entendible. */
  const corta = new AbortController()
  const reloj = setTimeout(() => corta.abort(), 240000)
  let r
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: corta.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: MAX_SALIDA[op],
        system: sistema,
        messages: [{ role: 'user', content: prompt(op, e) }],
      }),
    })
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('el modelo tardó demasiado. Intenta con menos grados o vuelve a presionar el botón.')
    }
    throw err
  } finally {
    clearTimeout(reloj)
  }
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`API ${r.status}: ${t.slice(0, 300)}`)
  }
  const j = await r.json()
  const texto = (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('')
  return { texto, uso: j.usage || {}, modelo }
}

function parseaJson(texto) {
  const t = String(texto).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try { return JSON.parse(t) } catch {}
  const i = t.indexOf('{'), f = t.lastIndexOf('}')
  if (i >= 0 && f > i) { try { return JSON.parse(t.slice(i, f + 1)) } catch {} }
  return null
}

/* ---------------- verificación contra el catálogo ---------------- */
function verifica(lista, grados) {
  const vistos = new Set()
  const buenas = [], descartadas = []
  for (const p of lista || []) {
    const c = PorId.get(String(p.id || '').trim())
    if (!c) { descartadas.push(p.id); continue }
    if (vistos.has(c.id)) continue
    const gs = Object.keys(c.pda).filter(g => !grados || !grados.length || grados.includes(g))
    if (!gs.length) { descartadas.push(c.id); continue }
    vistos.add(c.id)
    buenas.push({
      id: c.id, campo: c.campo, subarea: c.subarea, contenido: c.contenido,
      fase: c.fase, pagina: c.pagina, grados: gs,
      pda: Object.fromEntries(gs.map(g => [g, c.pda[g]])),
      porque: String(p.porque || '').trim(), como: String(p.como || '').trim(),
    })
  }
  return { buenas, descartadas }
}

/* Finalidades y especificidades que corresponden a los campos y fases de los
   contenidos elegidos. Búsqueda directa en el documento, sin modelo. */
function finalidadesDe(elegidos) {
  const pares = new Set()
  for (const c of elegidos) {
    const claveFase = 'fase' + (String(c.fase).match(/\d/) || [''])[0]
    if (D.campos[claveFase] && D.campos[claveFase][c.campo]) pares.add(claveFase + '||' + c.campo)
  }
  const out = []
  for (const par of pares) {
    const [fase, campo] = par.split('||')
    const d = D.campos[fase][campo]
    out.push({
      campo, fase: fase.replace('fase', 'Fase '),
      finalidades: d.finalidades.filter(x => !/^Este Campo está orientado/i.test(x)).slice(0, 5),
      especificidades: d.especificidades.slice(0, 2),
    })
  }
  return out
}

/* ---------------- respuestas de ejemplo para MODO_DEMO ---------------- */
function demo(op, e) {
  const pool = D.contenidos.filter(c => e.grados.some(g => c.pda[g]))
  const elige = (campo, n) => pool.filter(c => c.campo === campo).slice(0, n)
  if (op === 'propuesta') {
    const campos = ['Lenguajes', 'Saberes y Pensamiento Científico',
                    'Ética, Naturaleza y Sociedades', 'De lo Humano y lo Comunitario']
    const props = campos.flatMap(c => elige(c, 2).map(x => ({
      id: x.id,
      porque: 'MODO DEMO · Aquí el modelo explicaría por qué este contenido se vincula con la problemática que escribiste, en dos a cuatro líneas.',
      como: 'MODO DEMO · Aquí el modelo diría con qué empezar, con qué evidencia trabajar y quién de la comunidad participa.',
    })))
    return { lectura: 'MODO DEMO · Sin consumo de API. Activa la llave para ver el análisis real.', propuestas: props, sinAporte: [] }
  }
  if (op === 'ejes') return { orientacion: 'MODO DEMO · Aquí iría la reorientación del proyecto según los ejes elegidos.', adicionales: [], preguntasParaElColectivo: ['MODO DEMO'] }
  if (op === 'proyecto') return {
    metodologia: 'abpc', nombreMetodologia: D.metodologias.abpc.nombre,
    porQueEsa: 'MODO DEMO', titulo: 'MODO DEMO · Título del proyecto',
    pregunta: 'MODO DEMO', producto: 'MODO DEMO', participacionComunidad: 'MODO DEMO',
    fases: [{ nombre: 'Fase 1. Planeación', momentos: ['Momento 1. Identificación'], queSeHace: 'MODO DEMO' }],
    rasgosPerfil: [{ num: 'VI', porque: 'MODO DEMO' }, { num: 'X', porque: 'MODO DEMO' }],
  }
  return { valoracion: 'MODO DEMO', pda: { [e.grados[0]]: ['MODO DEMO · PDA de ejemplo.'] }, sugerenciaRedaccion: e.contenidoNuevo || '' }
}

/* Todo lo que puede tardar vive aquí. Devuelve la salida ya verificada o
   lanza un error con el texto que verá el colectivo. */
export async function procesa(op, e, enDemo, hReq) {
  /* 6 · al modelo */
  let datos, gasto = null
  if (enDemo) {
    datos = demo(op, e)
  } else {
    let r
    try { r = await llamaModelo(op, e) }
    catch (err) { throw new Error('No se pudo consultar el modelo: ' + (err && err.message ? err.message : err)) }
    datos = parseaJson(r.texto)
    if (!datos) throw new Error('El modelo devolvió una respuesta que no se pudo leer. Vuelve a intentar.')
    gasto = await registraGasto(r.modelo, r.uso)
  }

  /* 7 · verificación contra el catálogo */
  let salida = { op }
  if (op === 'propuesta') {
    const v = verifica(datos.propuestas, e.grados)
    salida.lectura = String(datos.lectura || '')
    salida.propuestas = v.buenas
    salida.sinAporte = Array.isArray(datos.sinAporte) ? datos.sinAporte : []
    salida.descartadas = v.descartadas.length
  } else if (op === 'ejes') {
    const v = verifica(datos.adicionales, e.grados)
    salida.orientacion = String(datos.orientacion || '')
    salida.adicionales = v.buenas
    salida.preguntas = Array.isArray(datos.preguntasParaElColectivo) ? datos.preguntasParaElColectivo : []
    salida.descartadas = v.descartadas.length
  } else if (op === 'proyecto') {
    const m = D.metodologias[datos.metodologia] ? datos.metodologia : 'abpc'
    salida.proyecto = {
      metodologia: m, nombreMetodologia: D.metodologias[m].nombre,
      porQueEsa: String(datos.porQueEsa || ''), titulo: String(datos.titulo || ''),
      pregunta: String(datos.pregunta || ''), producto: String(datos.producto || ''),
      participacionComunidad: String(datos.participacionComunidad || ''),
      fases: Array.isArray(datos.fases) ? datos.fases.slice(0, 6) : [],
    }
    /* Las finalidades no se le preguntan al modelo: se buscan en el documento
       oficial a partir del campo y la fase de los contenidos elegidos. Salen
       literales y no cuestan nada. */
    salida.finalidades = finalidadesDe(e.elegidos)
    /* Los rasgos del perfil sí requieren criterio, así que los propone el
       modelo, pero el texto que se muestra es el literal del Plan. */
    salida.rasgos = (Array.isArray(datos.rasgosPerfil) ? datos.rasgosPerfil : [])
      .map(r => {
        const encontrado = D.perfil.find(x => x.num === String(r.num || '').trim().toUpperCase())
        return encontrado ? { num: encontrado.num, texto: encontrado.texto, porque: String(r.porque || '') } : null
      }).filter(Boolean)
  } else {
    salida.valoracion = String(datos.valoracion || '')
    salida.pda = datos.pda && typeof datos.pda === 'object' ? datos.pda : {}
    salida.sugerenciaRedaccion = String(datos.sugerenciaRedaccion || '')
  }

  if (gasto) salida.costo = { estaLlamada: +gasto.usd.toFixed(5), acumuladoMes: +gasto.acumulado.toFixed(4) }
  salida.demo = enDemo
  if (enDemo) salida.demoPorque = DEMO() ? 'la variable MODO_DEMO está activa'
    : 'la función no está recibiendo ANTHROPIC_API_KEY'

  /* Las respuestas de ejemplo no se guardan: no valen nada y ensucian el caché. */
  if (!enDemo) await guardaRespuesta(hReq, salida)

  return salida
}

/* ---------------- diagnóstico profundo ----------------
   Hace una consulta real de propuestas, SIN límite de tiempo propio, y reporta
   cada paso con su duración. Así se sabe si el modelo de verdad tarda o si lo
   que estorbaba era nuestro propio corte. Cuesta lo que una consulta normal. */
export async function diagnosticoProfundo(grados) {
  const gs = grados && grados.length ? grados : [D.grados[0]]
  const cat = catalogo(gs)
  const inf = {
    grados: gs,
    contenidosEnElCatalogo: cat ? cat.split('\n').length : 0,
    caracteresDelCatalogo: cat.length,
    techoDeSalida: MAX_SALIDA.propuesta,
    limiteDeCorteSegundos: typeof LIMITE_MODELO_MS !== 'undefined'
      ? LIMITE_MODELO_MS / 1000 : 'sin definir · el archivo es de una versión anterior',
  }
  const e = {
    problematica: 'Afuera de la escuela se venden sobre todo frituras y refrescos, ' +
                  'y a las familias les cuesta trabajo conseguir fruta y verdura fresca.',
    grados: gs, ejes: [],
  }
  const sistema = [
    { type: 'text', text: ENCARGO },
    { type: 'text', text: `CATÁLOGO DE CONTENIDOS Y PDA — ${D.nombre} (grados ${gs.join(', ')})` +
        `\nFormato: id|campo|fase y página|grados|contenido|PDA\n\n${cat}` },
    { type: 'text', text: `FINALIDADES Y ESPECIFICIDADES DE LOS CAMPOS FORMATIVOS\n\n${bloqueCampos()}` },
    { type: 'text', text: `EJES ARTICULADORES (Plan de Estudio 2022)\n\n${bloqueEjes()}` },
    { type: 'text', text: `PERFIL DE EGRESO\n\n${bloquePerfil()}` },
  ]
  const cuerpo = JSON.stringify({
    model: MODELOS.propuesta,
    max_tokens: MAX_SALIDA.propuesta,
    system: sistema,
    messages: [{ role: 'user', content: prompt('propuesta', e) }],
  })
  inf.tamanoDeLaPeticionKb = Math.round(cuerpo.length / 1024)

  const t0 = Date.now()
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': (process.env.ANTHROPIC_API_KEY || '').trim(),
        'anthropic-version': '2023-06-01',
      },
      body: cuerpo,
    })
    inf.segundos = +((Date.now() - t0) / 1000).toFixed(1)
    inf.estadoHttp = r.status
    const texto = await r.text()
    inf.segundosConCuerpoLeido = +((Date.now() - t0) / 1000).toFixed(1)
    if (!r.ok) {
      inf.mensajeDeAnthropic = texto.slice(0, 500)
      inf.resultado = 'Anthropic rechazó la petición. El motivo está en "mensajeDeAnthropic".'
      return inf
    }
    const j = JSON.parse(texto)
    const salida = (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('')
    inf.razonDeParo = j.stop_reason
    inf.tokensDeSalida = (j.usage || {}).output_tokens || 0
    inf.tokensDeEntrada = (j.usage || {}).input_tokens || 0
    const d = parseaJson(salida)
    inf.sePudoLeerElJson = !!d
    inf.propuestasDevueltas = d && Array.isArray(d.propuestas) ? d.propuestas.length : 0
    inf.principioDeLaRespuesta = salida.trim().slice(0, 200)
    const g = await registraGasto(MODELOS.propuesta, j.usage || {})
    inf.costoDeEstaPrueba = +g.usd.toFixed(4)
    inf.resultado = inf.sePudoLeerElJson
      ? `Todo el camino del servidor funciona, en ${inf.segundosConCuerpoLeido} segundos.`
      : 'El modelo contestó pero su respuesta no se pudo leer.'
  } catch (err) {
    inf.segundos = +((Date.now() - t0) / 1000).toFixed(1)
    inf.falla = err && err.message ? err.message : String(err)
    inf.resultado = 'La llamada falló. El detalle está en "falla".'
  }
  return inf
}
