# Harness visual

Compara el render del sitio entre dos estados del código, pixel a pixel. Se creó
para migrar del CDN de Tailwind a un CSS compilado sin cambiar el front-end, y
sirve para cualquier cambio que no deba alterar lo que se ve.

## Uso

```bash
# 1. Captura del estado de referencia (la primera vez, con --record, para
#    guardar las respuestas de la API, las fuentes y las imágenes)
node tools/visual-harness/capture.js antes --record

# 2. Hacer el cambio

# 3. Captura del estado nuevo y comparación
node tools/visual-harness/capture.js despues
node tools/visual-harness/compare.js antes despues
```

Para capturar una copia intacta del sitio (por ejemplo la de `git HEAD`) sin
tocar el working tree:

```bash
mkdir -p /tmp/pristine && git archive HEAD public | tar -x -C /tmp/pristine
HARNESS_ROOT=/tmp/pristine/public node tools/visual-harness/capture.js referencia
```

## Cómo se mantiene determinista

Sin estos controles el diff sería inservible: el contenido viene de la API en
vivo y cambia entre corridas.

| Fuente de variación | Control |
|---|---|
| API, imágenes de usuarios, fuentes y CDNs | `netcache.js` graba las respuestas la primera vez y luego las reproduce byte a byte |
| Render asíncrono que dispara el JS | Se espera a que el DOM deje de mutar (`MutationObserver`), no a un timeout fijo |
| Animaciones CSS | Se pausan en el fotograma 0; no se desactivan, para que una clase `animate-*` faltante siga notándose |
| Redirección al SSO | Se pre-siembra el flag `fsc_sso_checked` en `sessionStorage` y las páginas renderizan en su sitio |
| Otro dev server en `::1` | El servidor se ata a `127.0.0.1` con un puerto libre asignado por el SO |
| Navegaciones intermitentes | Hasta 3 reintentos por página |

`404.html` se marca como `nondeterministic` en `pages.js`: es un canvas
generativo de p5.js y además no carga Tailwind, así que su ruido se informa
aparte.

## Verificación de cobertura de clases

Las capturas prueban lo que se ve; no prueban las clases que sólo aparecen en
estados no visitados. `audit-classes.js` extrae el CSS que el Play CDN generaba
en vivo y `check-coverage.js` confirma que el build estático lo cubra entero.

```bash
HARNESS_ROOT=/tmp/pristine/public node tools/visual-harness/audit-classes.js
node tools/visual-harness/check-coverage.js
```

Si aparecen clases faltantes suelen venir de interpolación en JS
(`text-${color}-400`), que el scanner de Tailwind no puede ver: hay que
agregarlas al `safelist` de `tailwind.config.js`.
