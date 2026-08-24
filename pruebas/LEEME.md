# Pruebas

`control.mjs` verifica toda la capa de control de costo sin gastar un solo centavo:
sustituye la llamada al modelo por una respuesta simulada y comprueba que la
verificación contra el catálogo, el caché, el tope por sesión, el límite por
conexión y el techo de gasto funcionan.

    node pruebas/control.mjs
