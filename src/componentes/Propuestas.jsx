import { useState } from 'react'
import { CL } from '../nivel.js'

export default function Propuestas({ lista, sel, alterna }) {
  if (!lista.length) return <div className="nota">No hay propuestas con ese filtro.</div>
  return <>{lista.map(p => <Ficha key={p.id} p={p} on={sel.includes(p.id)} alterna={alterna} />)}</>
}

function Ficha({ p, on, alterna }) {
  const [abierta, setAbierta] = useState(true)
  return (
    <div className={'prop' + (on ? ' on' : '')}>
      <div className="prop-h" onClick={() => setAbierta(v => !v)}>
        <span className="tick" onClick={(e) => { e.stopPropagation(); alterna(p.id) }}>✓</span>
        <div className="prop-t">
          <b>{p.contenido}</b>
          <div className="meta">
            <span className={'tag t-' + CL[p.campo]}>{p.campo}</span>
            {p.subarea && <span className="tag t-gris">{p.subarea}</span>}
            <span className="tag t-gris">{p.grados.join(', ')}</span>
            {p.porEje && <span className="tag t-eje">sugerido por el eje</span>}
            <small>{p.fase} · p. {p.pagina}</small>
          </div>
        </div>
      </div>
      {abierta && (
        <div className="prop-b">
          {p.porque && <div className="bloque bq"><b>Por qué se vincula</b>{p.porque}</div>}
          {p.como && <div className="bloque bc"><b>Cómo podrías abordarlo</b>{p.como}</div>}
          <div className="pda">
            {p.grados.map(g => (
              <div key={g}>
                <div className="g">Procesos de desarrollo de aprendizaje · {g}</div>
                <ul>{(p.pda[g] || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
