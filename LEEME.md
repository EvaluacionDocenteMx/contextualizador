# Contextualizador · Programa Analítico

Aplicación con IA para el segundo plano del Programa Analítico. El colectivo escribe **una
problemática** de su lectura de la realidad y la herramienta busca en el Programa Sintético
completo de su nivel los contenidos y procesos de desarrollo de aprendizaje que se vinculan con
ella, explica por qué y cómo abordarlos, reorienta la propuesta según los ejes articuladores que
elija, muestra las finalidades y los rasgos del perfil de egreso que se favorecen, sugiere una
ruta de proyecto con la metodología sociocrítica que corresponda y redacta los PDA de los
contenidos nuevos de codiseño.

Un sitio por nivel, desde el mismo código: preescolar, primaria y secundaria.

---

## Lo que hay que tener antes de publicar

1. Una cuenta en **console.anthropic.com** con saldo y una llave de API.
2. Una cuenta gratuita en **Netlify**.
3. Este repositorio en GitHub (o subir la carpeta a Netlify).

---

## Publicar los tres sitios

Se crean **tres sitios de Netlify apuntando al mismo repositorio**. Lo único que cambia entre
ellos son dos variables.

En cada sitio, en **Site configuration → Environment variables**:

| Variable | Preescolar | Primaria | Secundaria |
|---|---|---|---|
| `NIVEL` | `preescolar` | `primaria` | `secundaria` |
| `VITE_NIVEL` | `preescolar` | `primaria` | `secundaria` |
| `ANTHROPIC_API_KEY` | tu llave | tu llave | tu llave |

Y estas, iguales en los tres:

| Variable | Para qué | Sugerido |
|---|---|---|
| `TOPE_MENSUAL_USD` | Techo de gasto del periodo. Al alcanzarlo la app deja de llamar al modelo. | `60` |
| `TOPE_PROBLEMATICAS` | Máximo de problemáticas por sesión de una escuela. | `20` |
| `TOPE_IP_HORA` | Llamadas por hora desde una misma conexión. | `120` |
| `TOPE_IP_DIA` | Llamadas por día desde una misma conexión. | `500` |
| `CLAVE_PANEL` | Contraseña para ver el consumo en `/api/consumo`. | invéntala |
| `CODIGO_ACCESO` | *Opcional.* Si la defines, la app pide ese código para funcionar. Úsala solo si el enlace se filtra. | vacío |
| `MODO_DEMO` | `1` para que funcione con respuestas de ejemplo y **cero consumo**. | vacío |

**Build command:** `npm run build` · **Publish directory:** `dist` · **Functions directory:**
`netlify/functions` (ya viene en `netlify.toml`).

> Antes de abrir la llave, publica los tres sitios con `MODO_DEMO=1`. Así puedes enseñarlos y
> repartirlos sin gastar. Cuando estés listo, borras esa variable y quedan activos.

---

## Cómo se controla el gasto

Cinco candados, todos del lado del servidor. Nada de esto se puede saltar desde el navegador.

**1 · No se paga dos veces la misma pregunta.** Cada respuesta se guarda con la firma exacta de
su petición. Si el colectivo vuelve a presionar el botón, recarga la página, retrocede o entra
al día siguiente, se le devuelve lo guardado sin tocar el modelo. Solo se vuelve a llamar si
cambia el texto de la problemática, los grados o los ejes. En el navegador hay además un
bloqueo: mientras una llamada está en vuelo, las demás se ignoran.

**2 · Tope de problemáticas por sesión.** Veinte. Cuando una escuela llega al límite recibe un
aviso para descargar su documento y abrir una sesión nueva.

**3 · Límite por conexión.** Protege si el enlace se filtra. Una escuela trabajando normal no se
acerca; un script choca de inmediato.

**4 · Techo de gasto del periodo.** Se lleva la cuenta real de tokens y dólares con los precios
vigentes. Al alcanzar el tope, la función deja de llamar al modelo y responde con un aviso.

**5 · Techo de tokens de salida** por cada tipo de llamada, para que ninguna respuesta se
desborde.

Para ver el consumo: `https://TU-SITIO.netlify.app/api/consumo?clave=LA_QUE_PUSISTE`

---

## Qué modelo se usa en cada paso

| Paso | Modelo | Por qué |
|---|---|---|
| Encontrar contenidos, explicar el porqué y el cómo | Sonnet | Es el razonamiento que da valor a la herramienta |
| Reorientar según los ejes articuladores | Sonnet | Cambia el sentido del proyecto, no es formato |
| Ruta de proyecto | Haiku | Estructura fija tomada del documento oficial |
| PDA de contenidos nuevos | Haiku | Redacción en un registro ya definido |

---

## Contra la invención

El catálogo curricular vive **solo en el servidor**: no viaja al navegador. El modelo solo puede
proponer contenidos citándolos por su identificador, y **cada propuesta se coteja contra el
catálogo antes de salir**. Si inventa un contenido, un PDA o una página, se descarta y nunca
llega a la pantalla. Las finalidades de los campos formativos ni siquiera se le preguntan al
modelo: se buscan directamente en el documento oficial. Todo lo que ve el colectivo trae su fase
y su número de página para cotejarlo en el impreso.

---

## Trabajar en el proyecto

```bash
npm install
npm run dev                          # interfaz en desarrollo
node pruebas/servidor.mjs primaria   # servidor local con el modelo simulado
node pruebas/control.mjs             # prueba los cinco candados de costo
python3 pruebas/e2e.py 8899          # recorrido completo de la app
npm run build                        # compila con el nivel de VITE_NIVEL
```

`pruebas/servidor.mjs` levanta la función real pero sustituye la llamada al modelo por
respuestas simuladas: sirve para recorrer la aplicación completa sin gastar.

---

## Estructura

```
datos/                       catálogo curricular por nivel (solo servidor)
netlify/functions/
  ├─ ia.js                   único punto de contacto con el modelo
  ├─ _control.js             topes, caché, presupuesto y verificación
  └─ consumo.js              panel privado de gasto
src/
  ├─ App.jsx                 recorrido de la aplicación
  ├─ api.js                  cliente con bloqueo de llamadas repetidas
  ├─ nivel.js                lo mínimo que el navegador necesita saber
  └─ componentes/
```

### Actualizar el catálogo

Los archivos de `datos/` se generan desde los PDF oficiales. Si la SEP publica una versión nueva
de un programa sintético, se regenera el JSON de ese nivel y se vuelve a desplegar. La interfaz
no cambia.

---

Construido sobre los Programas Sintéticos de las Fases 2 a 6, el Plan de Estudio para la
Educación Preescolar, Primaria y Secundaria 2022 y las Sugerencias metodológicas para el
desarrollo de los proyectos educativos (SEP).
