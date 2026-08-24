import { INFO } from '../nivel.js'

export default function Documento({ escuela, grados, guardadas }) {
  return (
    <div className="card">
      <h1 style={{ fontSize: '1.55rem' }}>Programa Analítico · Contextualización</h1>
      <p className="sub">{INFO.nombre} · Grados {grados.join(', ')}</p>
      <div className="twrap">
        <table><tbody>
          <tr><th style={{ width: 170 }}>Escuela</th>
            <td>{escuela.escuela || '—'}{escuela.cct ? ' · CCT ' + escuela.cct : ''}</td></tr>
          <tr><th>Localidad y municipio</th><td>{escuela.loc || '—'}</td></tr>
          <tr><th>Ciclo escolar</th><td>{escuela.ciclo || '—'}</td></tr>
          <tr><th>Problemáticas trabajadas</th><td>{guardadas.length}</td></tr>
        </tbody></table>
      </div>

      {guardadas.map((g, i) => {
        const p = g.proy?.proyecto
        return (
          <div key={i} style={{ marginTop: 26 }}>
            <div className="sep" />
            <h2>Problemática {i + 1}</h2>
            <div className="nota">{g.texto}</div>

            <div className="twrap" style={{ marginTop: 12 }}>
              <table>
                <thead><tr>
                  <th>Campo formativo</th><th>Contenido</th><th>Grados</th>
                  <th>Procesos de desarrollo de aprendizaje</th><th>Cómo se aborda</th>
                </tr></thead>
                <tbody>
                  {g.elegidos.map(c => (
                    <tr key={c.id}>
                      <td>{c.campo}{c.subarea && <><br /><small>{c.subarea}</small></>}</td>
                      <td>{c.contenido}<br /><small>{c.fase} · p. {c.pagina}</small></td>
                      <td>{c.grados.join(', ')}</td>
                      <td>{c.grados.map(gr => (c.pda[gr] || []).map((x, j) =>
                        <div key={gr + j}>• {x}</div>))}</td>
                      <td>{c.como}</td>
                    </tr>
                  ))}
                  {g.nuevo?.res && (
                    <tr>
                      <td>Codiseño</td>
                      <td><b>{g.nuevo.texto}</b><br /><small>Contenido nuevo</small></td>
                      <td>{Object.keys(g.nuevo.res.pda || {}).join(', ')}</td>
                      <td>{Object.keys(g.nuevo.res.pda || {}).map(gr =>
                        (g.nuevo.res.pda[gr] || []).map((x, j) => <div key={gr + j}>• {x}</div>))}</td>
                      <td>{g.nuevo.res.valoracion}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <dl className="dl" style={{ marginTop: 14 }}>
              <dt>Ejes articuladores</dt><dd>{g.ejesNombres.join('; ') || '—'}</dd>
              {g.reo?.orientacion && <><dt>Orientación</dt><dd>{g.reo.orientacion}</dd></>}
              {p && <><dt>Proyecto</dt><dd>{p.titulo} · {p.nombreMetodologia}</dd></>}
              {p?.pregunta && <><dt>Pregunta</dt><dd>{p.pregunta}</dd></>}
              {p?.producto && <><dt>Producto</dt><dd>{p.producto}</dd></>}
              {(g.proy?.finalidades || []).length > 0 && (
                <><dt>Finalidades</dt><dd>{g.proy.finalidades.map((f, j) => (
                  <div key={j}><b>{f.campo} · {f.fase}</b>
                    <ul style={{ margin: '2px 0 6px', paddingLeft: 18 }}>
                      {f.finalidades.map((x, k) => <li key={k}>{x}</li>)}</ul></div>))}</dd></>
              )}
              {(g.proy?.rasgos || []).length > 0 && (
                <><dt>Perfil de egreso</dt><dd>{g.proy.rasgos.map((r, j) => (
                  <div key={j} style={{ marginBottom: 5 }}><b>Rasgo {r.num}. </b>{r.texto}</div>))}</dd></>
              )}
            </dl>
          </div>
        )
      })}
    </div>
  )
}
