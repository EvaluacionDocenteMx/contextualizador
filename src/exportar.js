export function exportaWord(escuela, html) {
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Programa Analítico</title><style>
@page{size:29.7cm 21cm;margin:1.5cm}
body{font-family:Calibri,Arial,sans-serif;font-size:10.5pt;color:#000}
h1{font-size:17pt}h2{font-size:13pt;border-bottom:1pt solid #999;padding-bottom:3pt;margin-top:16pt}
h3,h4{font-size:11pt}table{border-collapse:collapse;width:100%}
th,td{border:.5pt solid #999;padding:4pt;vertical-align:top;font-size:8.5pt}
th{background:#eee}.nota{border:.5pt solid #ccc;padding:6pt;margin:6pt 0;background:#f7f7f7}
.dl dt{font-weight:bold;font-size:8.5pt;margin-top:5pt}.dl dd{margin:0 0 5pt 0;font-size:9pt}
.sub,small{color:#555;font-size:8.5pt}.sep{border-top:.5pt solid #ccc;margin:10pt 0}
.no-print{display:none}</style></head><body>${html}</body></html>`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([doc], { type: 'application/msword' }))
  a.download = 'Programa_Analitico_' + (escuela.cct || 'escuela') + '.doc'
  document.body.appendChild(a); a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 800)
}
