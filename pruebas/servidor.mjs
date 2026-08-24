/* Servidor local de prueba.
   Sirve el build y responde /api/ia con la función real, pero sustituyendo la
   llamada al modelo por respuestas simuladas de calidad realista. Sirve para
   recorrer la aplicación completa sin gastar un centavo.

   Uso:  node pruebas/servidor.mjs [nivel] [puerto] */
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

const NIVEL = process.argv[2] || 'primaria'
const PUERTO = +(process.argv[3] || 8899)
process.env.NIVEL = NIVEL
process.env.ANTHROPIC_API_KEY = 'sk-simulada'
process.env.TOPE_MENSUAL_USD = '999'
process.env.TOPE_PROBLEMATICAS = process.env.TOPE_PROBLEMATICAS || '20'

const datos = JSON.parse(await fs.readFile(new URL(`../datos/${NIVEL}.json`, import.meta.url), 'utf8'))
const porCampo = {}
for (const c of datos.contenidos) (porCampo[c.campo] = porCampo[c.campo] || []).push(c)

let llamadas = 0
globalThis.fetch = async (url, opciones) => {
  llamadas++
  const cuerpo = JSON.parse(opciones.body)
  const texto = cuerpo.messages[0].content
  let salida

  if (texto.includes('Revisa el catálogo completo')) {
    /* La simulación respeta los grados que pidió el colectivo, igual que haría
       el modelo: solo elige contenidos con PDA en esos grados. */
    const mg = texto.match(/Grados con los que trabaja el colectivo: ([^.]+)\./)
    const gs = mg ? mg[1].split(',').map(x => x.trim()) : datos.grados
    const props = []
    for (const campo of Object.keys(porCampo)) {
      const aptos = porCampo[campo].filter(c => gs.some(g => c.pda[g] && c.pda[g].length))
      for (const c of aptos.slice(2, 5)) {
        props.push({
          id: c.id,
          porque: `Este contenido toca la problemática por la vía de ${campo.toLowerCase()}: lo que el colectivo describe no es un pretexto para abordarlo, es su materia. Los procesos de desarrollo de aprendizaje piden justo el tipo de indagación que la situación exige.`,
          como: `Empiecen por el dato, no por la teoría: una semana de registro de lo que ocurre da la evidencia con la que después se contrasta lo que dice el contenido. Involucren a quienes en la comunidad conocen el asunto de primera mano.`,
        })
      }
    }
    props.push({ id: 'c9999', porque: 'inventado', como: 'inventado' })
    salida = {
      lectura: 'La problemática que describes es trabajable desde la escuela porque tiene actores concretos, ocurre en un espacio al que el grupo tiene acceso y admite una intervención acotada y medible.',
      propuestas: props,
      sinAporte: [],
    }
  } else if (texto.includes('EJES ARTICULADORES QUE ELIGIÓ')) {
    /* Los contenidos que suma el eje también deben existir en los grados
       elegidos; si no, el servidor los descartaría con razón. */
    const mg2 = texto.match(/grados ([^\n|]+)/)
    const gs2 = mg2 ? mg2[1].split(',').map(x => x.trim()) : datos.grados
    const extra = datos.contenidos.filter(c => gs2.some(g => c.pda[g] && c.pda[g].length)).slice(20, 22).map(c => ({
      id: c.id,
      porque: 'El eje no se cumple nombrándolo: necesita un contenido que lo sostenga. Este es el vehículo.',
      como: 'Que la evidencia con la que trabajen sea la que ellos mismos levantaron, no la de un libro.',
    }))
    salida = {
      orientacion: 'Con estos ejes el proyecto deja de ser una campaña de buenas intenciones y se vuelve una indagación con postura. Orienta el trabajo hacia tres cosas: la reflexión sobre lo que ocurre realmente —no lo que debería ocurrir—, el análisis de por qué las condiciones son las que son, y la desigualdad que explica esas condiciones. El asunto deja de tratarse como responsabilidad individual y se entiende como un hecho comunitario.',
      adicionales: extra,
      preguntasParaElColectivo: [
        '¿Con qué evidencia van a sostener lo que afirmen ante la comunidad escolar?',
        '¿Quién queda fuera de la solución que están proponiendo?',
      ],
    }
  } else if (texto.includes('Sugiere UNA ruta de proyecto')) {
    salida = {
      metodologia: 'abpc',
      nombreMetodologia: datos.metodologias.abpc.nombre,
      porQueEsa: 'La problemática es un asunto de la comunidad escolar que puede transformarse con participación colectiva, y hay actores concretos que pueden involucrarse. Además convergen varios campos formativos, que es cuando esta metodología rinde más.',
      titulo: '¿Qué está pasando y quién lo decide?',
      pregunta: '¿Qué ocurre en nuestra comunidad con este asunto, por qué ocurre así y qué podemos cambiar entre todas y todos?',
      producto: 'Acuerdo comunitario sustentado en los datos que el grupo levantó, presentado ante la comunidad escolar.',
      participacionComunidad: 'Las familias, quienes conocen el asunto de cerca y las autoridades locales, desde el momento de la identificación y hasta la difusión.',
      fases: [
        { nombre: 'Fase 1. Planeación', momentos: ['Momento 1. Identificación', 'Momento 2. Recuperación', 'Momento 3. Planificación'], queSeHace: 'Se identifica la problemática con el grupo y se negocia la ruta.' },
        { nombre: 'Fase 2. Acción', momentos: ['Momento 4. Acercamiento', 'Momento 5. Comprensión y producción', 'Momento 6. Reconocimiento', 'Momento 7. Concreción'], queSeHace: 'Se levanta la evidencia y se elaboran las producciones.' },
        { nombre: 'Fase 3. Intervención', momentos: ['Momento 8. Integración', 'Momento 9. Difusión', 'Momento 10. Consideraciones', 'Momento 11. Avances'], queSeHace: 'Se presenta ante la comunidad y se da seguimiento al acuerdo.' },
      ],
      rasgosPerfil: [{ num: 'X', porque: 'El grupo examina críticamente sus propias ideas y propone transformaciones.' },
                     { num: 'VII', porque: 'Indaga y explica con datos y saberes comunitarios.' }],
    }
  } else {
    salida = {
      valoracion: 'El contenido se justifica como codiseño: nombra un espacio de decisión propio de esta escuela que el currículo nacional no contempla.',
      pda: { [datos.grados[0]]: [
        'Reconoce quiénes toman las decisiones sobre este asunto en su escuela y con qué criterios, a partir de entrevistas.',
        'Analiza, con los datos levantados por el grupo, la relación entre lo que se decide y lo que ocurre.',
        'Participa en la construcción de un acuerdo colectivo, sustentando su postura con evidencia.',
        'Da seguimiento al acuerdo y valora si produjo los cambios esperados.',
      ] },
      sugerenciaRedaccion: '',
    }
  }

  return { ok: true, json: async () => ({
    content: [{ type: 'text', text: JSON.stringify(salida) }],
    usage: { input_tokens: 480, output_tokens: 1600, cache_read_input_tokens: 110000, cache_creation_input_tokens: 0 },
  }) }
}

const { default: ia } = await import('../netlify/functions/ia.js')

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml' }
const RAIZ = new URL('../dist/', import.meta.url)

http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/ia')) {
    const trozos = []
    for await (const t of req) trozos.push(t)
    const r = await ia(new Request('http://local/api/ia', {
      method: req.method, headers: { 'x-nf-client-connection-ip': '127.0.0.1' },
      body: Buffer.concat(trozos).toString() || '{}',
    }))
    res.writeHead(r.status, { 'content-type': 'application/json; charset=utf-8' })
    res.end(await r.text())
    return
  }
  let ruta = req.url.split('?')[0]
  if (ruta === '/' || !path.extname(ruta)) ruta = '/index.html'
  try {
    const buf = await fs.readFile(new URL('.' + ruta, RAIZ))
    res.writeHead(200, { 'content-type': TIPOS[path.extname(ruta)] || 'application/octet-stream' })
    res.end(buf)
  } catch { res.writeHead(404); res.end('no encontrado') }
}).listen(PUERTO, () => console.log(`servidor de prueba en http://127.0.0.1:${PUERTO} · nivel ${NIVEL}`))

process.on('SIGTERM', () => { console.log('llamadas simuladas al modelo:', llamadas); process.exit(0) })
