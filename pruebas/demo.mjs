/* Verifica que una respuesta de demo NUNCA se sirva como respuesta real. */
process.env.NIVEL='primaria'; process.env.TOPE_MENSUAL_USD='50'; process.env.TOPE_PROBLEMATICAS='20'
process.env.MODO_DEMO='1'; delete process.env.ANTHROPIC_API_KEY
const fs=await import('node:fs/promises')
const datos=JSON.parse(await fs.readFile(new URL('../datos/primaria.json', import.meta.url),'utf8'))
const ids=datos.contenidos.filter(c=>c.pda['5°']).slice(0,4).map(c=>c.id)
let llamadas=0
globalThis.fetch=async()=>{llamadas++
  return {ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify({
    lectura:'RESPUESTA REAL DEL MODELO.',
    propuestas:ids.map(id=>({id,porque:'razonamiento real',como:'ruta real'})),sinAporte:[]})}],
    usage:{input_tokens:400,output_tokens:1500,cache_read_input_tokens:110000}})}}
const {default:ia}=await import('../netlify/functions/ia.js')
const post=b=>ia(new Request('https://x/api/ia',{method:'POST',
  headers:{'x-nf-client-connection-ip':'5.5.5.5'},body:JSON.stringify(b)}))
const cuerpo={op:'propuesta',sesion:'ses-demo0001',
  problematica:'Problemas de alimentacion en la comunidad y venta de frituras en la escuela',grados:['5°','6°']}

let r=await (await post(cuerpo)).json()
console.log('1 · con MODO_DEMO=1 →', r.demo?'demo':'IA', '| lectura:', (r.lectura||'').slice(0,45))
console.log('   motivo:', r.demoPorque)

// se apaga el modo demo y se pone la llave, como hizo Alfonso
process.env.MODO_DEMO=''
process.env.ANTHROPIC_API_KEY='sk-real'
r=await (await post(cuerpo)).json()
console.log('2 · MISMA problemática, ya sin demo →', r.demo?'DEMO (mal)':'IA (bien)',
            '| lectura:', (r.lectura||'').slice(0,45))
console.log('   ¿vino del caché?', r.deCache===true, '| llamadas reales al modelo:', llamadas)

// y ahora se comprueba que el caché real sí funcione
r=await (await post(cuerpo)).json()
console.log('3 · repetida ya en modo real →', r.deCache?'del caché (bien)':'volvió a llamar (mal)',
            '| llamadas acumuladas:', llamadas)

// y que si falta la llave, avise con claridad
delete process.env.ANTHROPIC_API_KEY
r=await (await post({...cuerpo,problematica:'Otra problematica distinta para probar sin llave'})).json()
console.log('4 · sin llave →', r.demo?'demo':'IA', '|', r.demoPorque)
