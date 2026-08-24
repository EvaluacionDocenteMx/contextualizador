#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recorrido completo de la aplicación contra el servidor de prueba."""
import sys, os, json
from playwright.sync_api import sync_playwright

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
errs = []
os.makedirs('/tmp/dl3', exist_ok=True)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    c = b.new_context(accept_downloads=True, viewport={'width': 1240, 'height': 1000})
    pg = c.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console.' + m.type + ': ' + m.text) if m.type == 'error' else None)
    pg.goto(f'http://127.0.0.1:{PUERTO}/', wait_until='networkidle')
    pg.wait_for_selector('#p1', timeout=15000)

    # grados: dejar solo 5° y 6°
    for g in ['1°', '2°', '3°', '4°']:
        pg.click(f'.card .chip:has-text("{g}") >> nth=0')
    activos = pg.eval_on_selector_all('.card .chip[aria-pressed="true"]', 'e=>e.map(x=>x.textContent)')
    pg.fill('.card input >> nth=0', 'Escuela Primaria Benito Juárez')
    pg.fill('.card input >> nth=1', '29DPR0123X')

    PROB = ('En la comunidad hay muchos problemas de alimentación. En la tienda de junto a la escuela y '
            'en la cooperativa se venden sobre todo frituras y refrescos, y son lo que más consumen las '
            'niñas y los niños en el recreo. Varias familias dicen que la fruta y la verdura salen caras.')
    pg.fill('#p1 textarea', PROB)
    pg.screenshot(path='/tmp/e1.png', full_page=True, scale='css')

    pg.click('button:has-text("Buscar en el Programa Sintético")')
    pg.wait_for_selector('#p2', timeout=20000)
    props = pg.eval_on_selector_all('#p2 .prop', 'e=>e.length')
    marcadas = pg.eval_on_selector_all('#p2 .prop.on', 'e=>e.length')
    muestra = pg.evaluate("""()=>Array.from(document.querySelectorAll('#p2 .prop')).slice(0,2).map(x=>({
        c:x.querySelector('.prop-t b').textContent,
        campo:x.querySelector('.meta .tag').textContent,
        ref:x.querySelector('.meta small').textContent,
        porque:(x.querySelector('.bq')||{}).textContent||'',
        pda:x.querySelectorAll('.pda li').length}))""")
    pg.eval_on_selector('#p2', 'e=>e.scrollIntoView()')
    pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/e2.png')

    # filtro por campo
    pg.click('#p2 .chip.mini:has-text("Lenguajes")')
    pg.wait_for_timeout(250)
    tras_filtro = pg.eval_on_selector_all('#p2 .prop', 'e=>e.length')
    pg.click('#p2 .chip.mini:has-text("Lenguajes")')
    pg.wait_for_timeout(200)

    # ejes
    pg.click('#p2 .chip:has-text("Pensamiento crítico")')
    pg.click('#p2 .chip:has-text("Vida saludable")')
    pg.click('button:has-text("Aplicar los ejes")')
    pg.wait_for_selector('#p3', timeout=20000)
    orient = pg.eval_on_selector('#p3 .nota', 'e=>e.textContent')
    adic = pg.eval_on_selector_all('#p2 .tag.t-eje', 'e=>e.length')
    preg = pg.eval_on_selector_all('#p3 ul li', 'e=>e.length')
    pg.eval_on_selector('#p3', 'e=>e.scrollIntoView()')
    pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/e3.png')

    # proyecto + finalidades + perfil
    pg.click('button:has-text("Ver finalidades")')
    pg.wait_for_selector('#p4', timeout=20000)
    finalidades = pg.eval_on_selector_all('#p4 .bq', 'e=>e.length')
    rasgos = pg.eval_on_selector_all('#p4 .bc', 'e=>e.length')
    fases = pg.eval_on_selector_all('.mom', 'e=>e.length')
    pg.eval_on_selector('#p4', 'e=>e.scrollIntoView()')
    pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/e4.png')

    # contenido nuevo
    pg.click('button:has-text("Sí, quiero incorporar uno")')
    pg.fill('input[placeholder*="cooperativa escolar"]',
            'La cooperativa escolar como espacio de decisión colectiva sobre lo que comemos.')
    pg.click('button:has-text("Redactar sus PDA")')
    pg.wait_for_selector('.pda .g:has-text("PDA propuestos")', timeout=20000)
    pdaNuevos = pg.eval_on_selector_all('.pda li', 'e=>e.length')

    # guardar y ver documento
    pg.click('button:has-text("Guardar esta problemática")')
    pg.wait_for_timeout(700)
    guardadas = pg.eval_on_selector_all('.gitem', 'e=>e.length')
    filas = pg.eval_on_selector_all('table tbody tr', 'e=>e.length')
    contador = pg.eval_on_selector('.bar .pill', 'e=>e.textContent')
    pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/e5.png', full_page=True, scale='css')

    with pg.expect_download() as di:
        pg.eval_on_selector('button:has-text("Descargar Word")', 'e=>e.click()')
    d = di.value
    p = '/tmp/dl3/' + d.suggested_filename
    d.save_as(p)
    peso = os.path.getsize(p)
    b.close()

print('=' * 68)
print('grados activos tras filtrar:', activos)
print(f'propuestas: {props} · marcadas por omisión: {marcadas} · tras filtrar a Lenguajes: {tras_filtro}')
print(f'adicionales por eje: {adic} · preguntas para el colectivo: {preg}')
print(f'finalidades: {finalidades} · rasgos de perfil: {rasgos} · fases del proyecto: {fases}')
print(f'PDA de codiseño: {pdaNuevos} · guardadas: {guardadas} · filas del documento: {filas}')
print(f'contador de sesión: "{contador}" · Word: {peso} bytes')
print('\nMUESTRA DE PROPUESTA:')
for m in muestra:
    print(f'  · {m["campo"]} | {m["ref"]} | {m["pda"]} PDA')
    print(f'    {m["c"][:96]}')
    print(f'    {m["porque"][:150]}')
print('\nORIENTACIÓN POR EJES:', orient[:180])
print('\nERRORES:', errs or 'ninguno')
