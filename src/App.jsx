import { useEffect, useMemo, useRef, useState } from 'react'
import { INFO, CAMPOS, CL, EJES } from './nivel.js'
import { pide, nuevaSesion } from './api.js'
import { Mascota, LogoMini } from './componentes/Mascota.jsx'
import Propuestas from './componentes/Propuestas.jsx'
import Cierre from './componentes/Cierre.jsx'
import Documento from './componentes/Documento.jsx'
import { exportaWord } from './exportar.js'

const vacia = () => ({
  texto: '', lectura: '', propuestas: [], sinAporte: [], sel: [],
  ejes: [], reo: null, proy: null,
  nuevo: { activo: false, texto: '', res: null },
})

export default function App() {
  const [escuela, setEscuela] = useState({})
  const [grados, setGrados] = useState(INFO.grados.slice())
  const [codigo, setCodigo] = useState('')
  const [act, setAct] = useState(vacia)
  const [guardadas, setGuardadas] = useState([])
  const [cargando, setCargando] = useState('')
  const [error, setError] = useState(null)
  const [sobrio, setSobrio] = useState(false)
  const [demo, setDemo] = useState(null)
  const [filtroCampo, setFiltroCampo] = useState([])
  const [filtroGrado, setFiltroGrado] = useState([])
  const refDoc = useRef(null)

  useEffect(() => { document.body.classList.toggle('sobrio', sobrio) }, [sobrio])

  const upd = (p) => setAct((a) => ({ ...a, ...(typeof p === 'function' ? p(a) : p) }))
  const ocupado = !!cargando

  async function llama(cuerpo, etiqueta) {
    setError(null); setCargando(etiqueta)
    try {
      const r = await pide({ ...cuerpo, grados, codigo })
      setDemo(r.demo ? (r.demoPorque || 'modo demo activo') : null)
      return r
    } catch (e) {
      setError({ mensaje: e.message, codigo: e.codigo })
      return null
    } finally { setCargando('') }
  }

  /* ---------- 1 · analizar la problemática ---------- */
  async function analiza() {
    if (act.texto.trim().length < 30) {
      setError({ mensaje: 'Describe la problemática con un poco más de detalle: al menos un par de renglones.' })
      return
    }
    const r = await llama({ op: 'propuesta', problematica: act.texto.trim() }, 'Leyendo el Programa Sintético completo…')
    if (!r) return
    upd({ lectura: r.lectura, propuestas: r.propuestas, sinAporte: r.sinAporte || [],
          sel: r.propuestas.map(p => p.id), reo: null, proy: null })
    setFiltroCampo([]); setFiltroGrado([])
    setTimeout(() => document.getElementById('p2')?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  /* ---------- 2 · ejes ---------- */
  async function aplicaEjes() {
    if (!act.ejes.length) { setError({ mensaje: 'Elige al menos un eje articulador.' }); return }
    if (!act.sel.length) { setError({ mensaje: 'Marca al menos un contenido antes de continuar.' }); return }
    const nombres = EJES.filter(e => act.ejes.includes(e.id)).map(e => e.nombre)
    const r = await llama({ op: 'ejes', problematica: act.texto.trim(), elegidos: act.sel, ejes: nombres },
                          'Reorientando la propuesta desde los ejes que elegiste…')
    if (!r) return
    upd(a => ({ reo: r, sel: a.sel.concat(r.adicionales.map(x => x.id).filter(id => !a.sel.includes(id))),
                propuestas: a.propuestas.concat(r.adicionales.filter(x => !a.propuestas.some(p => p.id === x.id))
                  .map(x => ({ ...x, porEje: true }))) }))
    setTimeout(() => document.getElementById('p3')?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  /* ---------- 3 · proyecto, finalidades y perfil ---------- */
  async function generaProyecto() {
    const nombres = EJES.filter(e => act.ejes.includes(e.id)).map(e => e.nombre)
    const r = await llama({ op: 'proyecto', problematica: act.texto.trim(), elegidos: act.sel, ejes: nombres },
                          'Armando la ruta de proyecto…')
    if (!r) return
    upd({ proy: r })
    setTimeout(() => document.getElementById('p4')?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  /* ---------- 4 · contenido nuevo ---------- */
  async function generaPda() {
    if (act.nuevo.texto.trim().length < 15) {
      setError({ mensaje: 'Escribe el enunciado del contenido nuevo.' }); return
    }
    const r = await llama({ op: 'pdaNuevo', problematica: act.texto.trim(), contenidoNuevo: act.nuevo.texto.trim() },
                          'Redactando los procesos de desarrollo de aprendizaje…')
    if (!r) return
    upd(a => ({ nuevo: { ...a.nuevo, res: r } }))
  }

  /* ---------- guardar y siguiente ---------- */
  function guarda() {
    const elegidos = act.propuestas.filter(p => act.sel.includes(p.id))
    setGuardadas(g => g.concat([{ ...act, elegidos, ejesNombres: EJES.filter(e => act.ejes.includes(e.id)).map(e => e.nombre) }]))
    setAct(vacia()); setFiltroCampo([]); setFiltroGrado([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const visibles = useMemo(() => act.propuestas.filter(p =>
    (!filtroCampo.length || filtroCampo.includes(p.campo)) &&
    (!filtroGrado.length || p.grados.some(g => filtroGrado.includes(g)))
  ), [act.propuestas, filtroCampo, filtroGrado])

  const alterna = (lista, set, v) => set(lista.includes(v) ? lista.filter(x => x !== v) : lista.concat(v))
  const restantes = 20 - guardadas.length

  return (
    <>
      <header className="bar"><div className="wrap bar-in">
        <div className="logo"><LogoMini />
          <div>Contextualizador<em>Programa Analítico · {INFO.nombre}</em></div></div>
        <div className="bar-acc no-print">
          {demo && <span className="pill demo" title={demo}>Modo demo · sin consumo</span>}
          <span className={'pill' + (restantes <= 3 ? ' alerta' : '')}>
            {guardadas.length} de 20 problemáticas</span>
          <button className="chip mini" aria-pressed={sobrio} onClick={() => setSobrio(v => !v)}>Modo sobrio</button>
        </div>
      </div></header>

      <div className="wrap">
        <section className="hero">
          <div className="hero-t">
            <h1>Escribe una problemática.<br />Yo reviso el Programa Sintético por ti.</h1>
            <p style={{ color: 'var(--tinta2)' }}>
              {INFO.nombre} · {INFO.detalle}. No necesitas saber en qué campo formativo cae:
              para eso está la herramienta.
            </p>
          </div>
          <Mascota />
        </section>

        {demo && (
          <div className="aviso" style={{ marginBottom: 16 }}>
            <b>Estás en modo demo:</b> las respuestas son de ejemplo y no se consume nada.
            Motivo: {demo}.
          </div>
        )}

        {error && (
          <div className="err">
            {error.mensaje}
            {error.codigo === 'tope_sesion' && (
              <div style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => { nuevaSesion(); setGuardadas([]); setError(null) }}>
                  Abrir una sesión nueva
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- datos y grados ---------- */}
        <div className="card">
          <h2><span className="kw">🏫 </span>Tu escuela y los grados</h2>
          <p className="sub">Los grados que marques acotan la búsqueda: solo se propondrán contenidos con
            procesos de desarrollo de aprendizaje en esos grados.</p>
          <div className="row">
            {INFO.grados.map(g => (
              <button key={g} className="chip" aria-pressed={grados.includes(g)}
                onClick={() => alterna(grados, setGrados, g)}>{g}</button>
            ))}
            <button className="chip mini" onClick={() => setGrados(INFO.grados.slice())}>todos</button>
          </div>
          <div className="sep" />
          <div className="row" style={{ gap: 13 }}>
            {[['escuela', 'Escuela'], ['cct', 'CCT'], ['loc', 'Localidad y municipio'], ['ciclo', 'Ciclo escolar']]
              .map(([k, lab]) => (
                <div key={k} style={{ flex: '1 1 190px' }}>
                  <label className="f">{lab}</label>
                  <input type="text" value={escuela[k] || ''}
                    onChange={e => setEscuela(s => ({ ...s, [k]: e.target.value }))} />
                </div>
              ))}
          </div>
        </div>

        {/* ---------- problemáticas ya guardadas ---------- */}
        {guardadas.length > 0 && (
          <div className="card">
            <h2><span className="kw">✅ </span>Problemáticas ya trabajadas</h2>
            <div className="guardadas">
              {guardadas.map((g, i) => (
                <div className="gitem" key={i}>
                  <span className="tag t-gris">{i + 1}</span>
                  <b>{g.texto.slice(0, 120)}{g.texto.length > 120 ? '…' : ''}</b>
                  <span className="sel-info">{g.elegidos.length} contenidos · {g.ejesNombres.length} ejes</span>
                  <button className="btn sec sm" onClick={() => setGuardadas(x => x.filter((_, j) => j !== i))}>Quitar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------- 1 ---------- */}
        <div className="card" id="p1"><div className="num">1</div>
          <h2><span className="kw">✍️ </span>Escribe una problemática de tu lectura de la realidad</h2>
          <p className="sub">Una sola, con tus palabras. Entre más concreta, mejor: qué pasa, a quién afecta,
            desde cuándo, qué han visto.</p>
          <textarea value={act.texto} maxLength={1800} onChange={e => upd({ texto: e.target.value })}
            style={{ minHeight: 120 }}
            placeholder="En la comunidad hay muchos problemas de alimentación. En la tienda de junto a la escuela se venden sobre todo frituras y refrescos…" />
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn xl" onClick={analiza} disabled={ocupado}>
              {cargando === 'Leyendo el Programa Sintético completo…' ? 'Buscando…' : '✨ Buscar en el Programa Sintético'}
            </button>
            <small className="right">{act.texto.length}/1800</small>
          </div>
          {cargando && (
            <div className="pensando"><span className="pt"><i /><i /><i /></span>{cargando}</div>
          )}
        </div>

        {/* ---------- 2 ---------- */}
        {act.propuestas.length > 0 && (
          <div className="card" id="p2"><div className="num">2</div>
            <h2><span className="kw">🔗 </span>Esto es lo que encontré</h2>
            {act.lectura && <div className="nota">{act.lectura}</div>}
            <p className="sub">Cada propuesta dice por qué se vincula y cómo podrías abordarla, y trae su fase y
              su página para que la cotejes en el impreso. Marca las que te sirvan.</p>

            <div className="row" style={{ marginBottom: 6 }}>
              <label className="f" style={{ margin: 0, minWidth: 58 }}>Campos</label>
              <div className="row">
                {CAMPOS.map(c => (
                  <button key={c} className="chip mini" aria-pressed={!filtroCampo.length || filtroCampo.includes(c)}
                    onClick={() => alterna(filtroCampo, setFiltroCampo, c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className="row" style={{ marginBottom: 14 }}>
              <label className="f" style={{ margin: 0, minWidth: 58 }}>Grados</label>
              <div className="row">
                {grados.map(g => (
                  <button key={g} className="chip mini" aria-pressed={!filtroGrado.length || filtroGrado.includes(g)}
                    onClick={() => alterna(filtroGrado, setFiltroGrado, g)}>{g}</button>
                ))}
              </div>
            </div>

            {act.sinAporte.map((s, i) => (
              <div className="campo-vacio" key={i}><b>{s.campo}:</b> {s.razon}</div>
            ))}

            <Propuestas lista={visibles} sel={act.sel}
              alterna={(id) => upd(a => ({ sel: a.sel.includes(id) ? a.sel.filter(x => x !== id) : a.sel.concat(id) }))} />

            <div className="sep" />
            <h3>¿Qué orientación quieres darle?</h3>
            <p className="sub">Elige uno o varios ejes articuladores. Tu elección cambia la propuesta:
              no es una etiqueta al final.</p>
            <div className="row">
              {EJES.map(e => (
                <button key={e.id} className="chip" aria-pressed={act.ejes.includes(e.id)}
                  onClick={() => upd(a => ({ ejes: a.ejes.includes(e.id) ? a.ejes.filter(x => x !== e.id) : a.ejes.concat(e.id) }))}>
                  {e.nombre}
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={aplicaEjes} disabled={ocupado || !act.ejes.length}>
                Aplicar los ejes →
              </button>
              <small className="right">{act.sel.length} contenidos marcados</small>
            </div>
          </div>
        )}

        {/* ---------- 3 ---------- */}
        {act.reo && (
          <div className="card" id="p3"><div className="num">3</div>
            <h2><span className="kw">🧭 </span>Cómo cambia tu proyecto con estos ejes</h2>
            <div className="nota" style={{ whiteSpace: 'pre-wrap' }}>{act.reo.orientacion}</div>
            {act.reo.adicionales.length > 0 && (
              <div className="aviso">
                <b>Sumé {act.reo.adicionales.length} contenido{act.reo.adicionales.length > 1 ? 's' : ''} que este enfoque necesita.</b>
                {' '}Los verás arriba, marcados como sugeridos por el eje.
              </div>
            )}
            {act.reo.preguntas?.length > 0 && (
              <>
                <h4>Preguntas para el colectivo</h4>
                <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: '.9rem', color: 'var(--tinta2)' }}>
                  {act.reo.preguntas.map((q, i) => <li key={i} style={{ marginBottom: 5 }}>{q}</li>)}
                </ul>
              </>
            )}
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn" onClick={generaProyecto} disabled={ocupado}>
                Ver finalidades, perfil de egreso y ruta de proyecto →
              </button>
            </div>
          </div>
        )}

        {/* ---------- 4 ---------- */}
        {act.proy && (
          <Cierre datos={act.proy} nuevo={act.nuevo} ocupado={ocupado}
            onNuevo={(p) => upd(a => ({ nuevo: { ...a.nuevo, ...p } }))}
            onGeneraPda={generaPda} onGuardar={guarda} restantes={restantes} />
        )}

        {/* ---------- documento ---------- */}
        {guardadas.length > 0 && (
          <div className="card no-print">
            <h2><span className="kw">📄 </span>Documento</h2>
            <p className="sub">Reúne todas las problemáticas que llevas trabajadas.</p>
            <div className="row">
              <button className="btn" onClick={() => exportaWord(escuela, refDoc.current?.innerHTML || '')}>Descargar Word</button>
              <button className="btn sec" onClick={() => window.print()}>Descargar PDF</button>
            </div>
          </div>
        )}
        <div ref={refDoc}>
          {guardadas.length > 0 && <Documento escuela={escuela} grados={grados} guardadas={guardadas} />}
        </div>

        <footer>
          Construido sobre los Programas Sintéticos, el Plan de Estudio 2022 y las Sugerencias metodológicas
          para el desarrollo de los proyectos educativos (SEP).<br />
          Cada contenido y cada PDA se muestran con su fase y su página para que puedas cotejarlos.
        </footer>
      </div>
    </>
  )
}
