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

/* Solo secundaria se organiza por asignaturas. En los otros niveles esta lista
   queda vacía y los filtros de asignatura no aparecen. */
const ASIG = {
  secundaria: {
    'Lenguajes': ['Español', 'Lengua Indígena como Lengua Materna', 'Lengua Indígena como Segunda Lengua', 'Inglés', 'Artes'],
    'Saberes y Pensamiento Científico': ['Matemáticas', 'Biología', 'Física', 'Química'],
    'Ética, Naturaleza y Sociedades': ['Geografía', 'Historia', 'Formación Cívica y Ética'],
    'De lo Humano y lo Comunitario': ['Tecnología', 'Educación Socioemocional', 'Tutoría', 'Educación Física'],
  },
}
export const ASIGNATURAS_POR_CAMPO = ASIG[NIVEL] || {}
export const ASIGNATURAS = Object.values(ASIGNATURAS_POR_CAMPO).flat()

export const EJES = [
  { id: 'inclusion', nombre: 'Inclusión' },
  { id: 'pensamiento_critico', nombre: 'Pensamiento crítico' },
  { id: 'interculturalidad', nombre: 'Interculturalidad crítica' },
  { id: 'igualdad_genero', nombre: 'Igualdad de género' },
  { id: 'vida_saludable', nombre: 'Vida saludable' },
  { id: 'lectura_escritura', nombre: 'Apropiación de las culturas a través de la lectura y la escritura' },
  { id: 'artes_estetica', nombre: 'Artes y experiencias estéticas' },
]
