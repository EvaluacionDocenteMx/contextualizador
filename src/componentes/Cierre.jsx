export default function Cierre({ datos, nuevo, ocupado, onNuevo, onGeneraPda, onGuardar, restantes }) {
  const p = datos.proyecto || {}
  return (
    <>
      <div className="card" id="p4"><div className="num">4</div>
        <h2><span className="kw">🎯 </span>Lo que se está favoreciendo</h2>
        <p className="sub">Texto literal de los programas sintéticos y del Plan de Estudio.
          Las finalidades no las escribe el modelo: se buscan en el documento.</p>

        <h4>Finalidades de los campos formativos</h4>
        {(datos.finalidades || []).map((f, i) => (
          <div className="bloque bq" key={i}>
            <b>{f.campo} · {f.fase}</b>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {f.finalidades.map((x, j) => <li key={j} style={{ marginBottom: 4 }}>{x}</li>)}
            </ul>
          </div>
        ))}

        {(datos.rasgos || []).length > 0 && (
          <>
            <div className="sep" />
            <h4>Rasgos del perfil de egreso que se tocan</h4>
            {datos.rasgos.map((r, i) => (
              <div className="bloque bc" key={i}>
                <b>Rasgo {r.num}</b>{r.texto}
                {r.porque && <div style={{ marginTop: 6, fontStyle: 'italic' }}>{r.porque}</div>}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="card"><div className="num">5</div>
        <h2><span className="kw">🚀 </span>Ruta de proyecto</h2>
        <h3>{p.titulo}</h3>
        <div className="row" style={{ margin: '6px 0 14px' }}>
          <span className="tag t-eje">{p.nombreMetodologia}</span>
        </div>
        <dl className="dl">
          <dt>Por qué esta metodología</dt><dd>{p.porQueEsa}</dd>
          <dt>Pregunta</dt><dd>{p.pregunta}</dd>
          <dt>Producto</dt><dd>{p.producto}</dd>
          <dt>Comunidad</dt><dd>{p.participacionComunidad}</dd>
        </dl>
        <div className="sep" />
        {(p.fases || []).map((f, i) => (
          <div key={i} style={{ margin: '0 0 12px' }}>
            <b style={{ fontSize: '.88rem' }}>{f.nombre}</b>
            <div className="mom">{(f.momentos || []).map((m, j) => <span key={j}>{m}</span>)}</div>
            {f.queSeHace && <p style={{ margin: '6px 0 0', fontSize: '.87rem', color: 'var(--tinta2)' }}>{f.queSeHace}</p>}
          </div>
        ))}
        <small>Fases y momentos del documento oficial de Sugerencias metodológicas (SEP).
          Esto es una ruta, no una planeación didáctica.</small>
      </div>

      <div className="card"><div className="num">6</div>
        <h2><span className="kw">➕ </span>¿Incorporas un contenido nuevo?</h2>
        <p className="sub">Solo si detectaste una necesidad formativa que el Programa Sintético no cubre.
          Eso es codiseño.</p>
        {!nuevo.activo ? (
          <div className="row">
            <button className="btn sec" onClick={onGuardar}>No, guardar esta problemática</button>
            <button className="btn" onClick={() => onNuevo({ activo: true })}>Sí, quiero incorporar uno</button>
          </div>
        ) : (
          <>
            <label className="f">Enunciado del contenido nuevo</label>
            <input type="text" value={nuevo.texto} onChange={e => onNuevo({ texto: e.target.value })}
              placeholder="La cooperativa escolar como espacio de decisión colectiva sobre lo que comemos." />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn sm" onClick={onGeneraPda} disabled={ocupado}>Redactar sus PDA</button>
              <button className="btn sec sm" onClick={() => onNuevo({ activo: false, res: null })}>Cancelar</button>
            </div>
            {nuevo.res && (
              <div style={{ marginTop: 16 }}>
                {nuevo.res.valoracion && <div className="nota"><b>Valoración: </b>{nuevo.res.valoracion}</div>}
                {nuevo.res.sugerenciaRedaccion && nuevo.res.sugerenciaRedaccion !== nuevo.texto && (
                  <div className="aviso"><b>Redacción sugerida: </b>{nuevo.res.sugerenciaRedaccion}</div>
                )}
                <div className="pda">
                  {Object.keys(nuevo.res.pda || {}).map(g => (
                    <div key={g}>
                      <div className="g">PDA propuestos · {g}</div>
                      <ul>{(nuevo.res.pda[g] || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={onGuardar}>Guardar esta problemática</button>
            </div>
          </>
        )}
        <p className="hint" style={{ marginTop: 12 }}>
          Al guardar, la pantalla vuelve arriba para que captures la siguiente.
          Te quedan {restantes} problemáticas en esta sesión.
        </p>
      </div>
    </>
  )
}
