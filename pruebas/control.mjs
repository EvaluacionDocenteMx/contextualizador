process.env.NIVEL='primaria'; process.env.TOPE_PROBLEMATICAS='20'
process.env.TOPE_IP_HORA='4'; process.env.TOPE_MENSUAL_USD='50'
process.env.ANTHROPIC_API_KEY='sk-falsa'
const fs = await import('node:fs/promises')
const datos = JSON.parse(await fs.readFile(new URL('../datos/primaria.json', import.meta.url),'utf8'))
const ids = datos.contenidos.filter(c=>c.pda['5°']||c.pda['6°']).slice(0,6).map(c=>c.id)
let llamadas=0
globalThis.fetch = async () => { llamadas++
  const cuerpo={lectura:'Lectura simulada.',
    propuestas: ids.map(id=>({id,porque:'porque…',como:'como…'})).concat([{id:'c9999',porque:'inventado',como:'x'}]),
    sinAporte:[{campo:'Lenguajes',razon:'—'}]}
  return {ok:true, json: async()=>({content:[{type:'text',text:JSON.stringify(cuerpo)}],
    usage:{input_tokens:500,output_tokens:1200,cache_read_input_tokens:110000,cache_creation_input_tokens:0}})} }
const {default:ia}=await import('../netlify/functions/ia.js')
const ctl=await import('../netlify/functions/_control.js')
const post=(b,ip='1.2.3.4')=>ia(new Request('https://x/api/ia',{method:'POST',
  headers:{'x-nf-client-connection-ip':ip},body:JSON.stringify(b)}))
const j=async r=>[r.status,await r.json()]

console.log('1 · llamada normal · verificación contra el catálogo')
let [s,r]=await j(await post({op:'propuesta',sesion:'ses-aaaa1111',problematica:'Problemas de alimentación en la comunidad',grados:['5°','6°']}))
console.log(`   estado ${s} · propuestas válidas ${r.propuestas?.length} · inventadas descartadas ${r.descartadas} · costo $${r.costo?.estaLlamada} · API: ${llamadas}`)
console.log(`   ejemplo verificado: ${r.propuestas?.[0]?.contenido?.slice(0,60)}… (${r.propuestas?.[0]?.fase} p.${r.propuestas?.[0]?.pagina})`)

console.log('2 · misma petición repetida · debe salir del caché')
;[s,r]=await j(await post({op:'propuesta',sesion:'ses-aaaa1111',problematica:'Problemas de alimentación en la comunidad',grados:['5°','6°']}))
console.log(`   deCache ${r.deCache===true} · llamadas al API acumuladas ${llamadas}`)

console.log('3 · tope de problemáticas por sesión (bajado a 3)')
ctl.LIMITES.problematicasPorSesion=3
for(let i=0;i<5;i++){const [st,rr]=await j(await post({op:'propuesta',sesion:'ses-bbbb2222',problematica:'Problemática distinta número '+i,grados:['5°']},'2.2.2.2'))
  console.log(`   problemática ${i+1}: ${st} ${rr.codigo?'→ '+rr.codigo:'→ ok'}`)}

console.log('4 · límite por conexión (4 por hora)')
for(let i=0;i<6;i++){const [st,rr]=await j(await post({op:'propuesta',sesion:'ses-c'+i+'ccc333',problematica:'Otra problemática '+i,grados:['5°']},'9.9.9.9'))
  console.log(`   intento ${i+1}: ${st} ${rr.codigo?'→ '+rr.codigo:'→ ok'}`)}

console.log('5 · tope de gasto del periodo')
ctl.LIMITES.topeMensualUsd=0.0001
;[s,r]=await j(await post({op:'propuesta',sesion:'ses-dddd4444',problematica:'Con el techo ya rebasado',grados:['5°']},'3.3.3.3'))
console.log(`   estado ${s} · código ${r.codigo}`)
console.log(`   mensaje: ${(r.mensaje||'').slice(0,110)}`)
const g=await ctl.gastoDelMes()
console.log(`\nGasto acumulado registrado: $${g.usd.toFixed(4)} en ${g.llamadas} llamadas · llamadas reales al modelo: ${llamadas}`)
