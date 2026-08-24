/* Lo mínimo que el navegador necesita saber. El catálogo curricular vive en
   el servidor: aquí no viaja ni un contenido. */
export const NIVEL = typeof __NIVEL__ !== 'undefined' ? __NIVEL__ : 'primaria'

const CFG = {
  preescolar: { nombre: 'Preescolar', grados: ['1°', '2°', '3°'], detalle: 'Fase 2 · los tres grados de preescolar' },
  primaria:   { nombre: 'Primaria', grados: ['1°', '2°', '3°', '4°', '5°', '6°'], detalle: 'Fases 3, 4 y 5 · puedes mezclar grados de fases distintas' },
  secundaria: { nombre: 'Secundaria', grados: ['1°', '2°', '3°'], detalle: 'Fase 6 · los tres grados, con sus disciplinas' },
}
export const INFO = CFG[NIVEL] || CFG.primaria

export const CAMPOS = ['Lenguajes', 'Saberes y Pensamiento Científico',
  'Ética, Naturaleza y Sociedades', 'De lo Humano y lo Comunitario']
export const CL = { 'Lenguajes': 'len', 'Saberes y Pensamiento Científico': 'sab',
  'Ética, Naturaleza y Sociedades': 'eti', 'De lo Humano y lo Comunitario': 'hum' }

export const EJES = [
  { id: 'inclusion', nombre: 'Inclusión' },
  { id: 'pensamiento_critico', nombre: 'Pensamiento crítico' },
  { id: 'interculturalidad', nombre: 'Interculturalidad crítica' },
  { id: 'igualdad_genero', nombre: 'Igualdad de género' },
  { id: 'vida_saludable', nombre: 'Vida saludable' },
  { id: 'lectura_escritura', nombre: 'Apropiación de las culturas a través de la lectura y la escritura' },
  { id: 'artes_estetica', nombre: 'Artes y experiencias estéticas' },
]
