# Análisis comparativo — `LetterMaster_funcional` ↔ Editor de Partículas (`particulas.html`)

**Fecha:** 11 de septiembre de 2026
**Repositorio A (referencia externa, sólo lectura):** `D:\Programacion\Processing\LetterMaster_funcional`
**Repositorio B (proyecto actual):** `artedigitaldata` — `public/particulas.html` + ecosistema de partículas p5
**Estado del repo B al momento del análisis:** rama `main`, con cambios locales sin commitear en `particulas.css`, `p5-effect.js`, `particulas.js` y `particulas.html` (timeline/keyframes, `POS_X`/`POS_Y`, `LETTER_SPACING` en px).

---

## 0. Resumen ejecutivo

1. **No son el mismo tipo de producto.** `LetterMaster_funcional` es una *herramienta de autor* de escritorio (Processing/Java) pensada para que un operador/diseñador de datos la maneje en vivo desde un teclado y una GUI propia, alimentando pantallas LED o salidas Spout/OSC. `particulas.html` es un *efecto web multiusuario* que corre como fondo en 16 páginas del sitio, con un editor acotado, persistencia en base de datos y aportes de la comunidad. La comparación más útil no es "cuál es mejor" sino **qué ideas de autor conviene portar al editor web**.

2. **La diferencia arquitectónica más importante es cómo se forman las palabras.** En LetterMaster las letras que forman la frase **son las mismas letras ambientales que ya flotan en pantalla**: `asignarpalabra()` recicla el pool (`letras`) buscando cada carácter, y sólo crea letras nuevas cuando falta alguna. En `particulas.html`, cada click **inyecta N partículas nuevas** (`WordParticle`) y las letras ambientales quedan aparte; cuando la palabra se disuelve, esas letras se borran y no vuelven al pool. Visualmente LetterMaster "reorganiza la sopa"; Partículas "añade una capa encima". El reciclado es, sobre todo, una mejora **estética y de control de población**; no es la optimización de mayor impacto en CPU (ver §5.1.1).

3. **Lo que LetterMaster tiene y Partículas no, y que más valor aportaría:** (a) reciclado de letras desde un pool, (b) **multi-atractor** simultáneo (multi-manos / multi-persona, con Kinect o multi-touch), (c) **ajuste de línea / multilínea** con `letterspacey` y límites de caja, (d) **selector de tipografías en caliente** (14 fuentes), (e) **pipeline de feedback con shaders GLSL propio** (fuerza, escala, rotación, doble pasada invertida), (f) **control externo por OSC** y salida **Spout**, (g) **gestor de presets** con backups automáticos (53 versiones), (h) **overlay de debug** y separación estricta display/update.

4. **Lo que Partículas tiene y LetterMaster no, y que LetterMaster necesitaría desesperadamente:** backend con **palabras comunitarias** (colección `ParticleWord`, aportes por usuario registrado, borrado sólo admin), **persistencia real de configuración** (antes sólo un `default.json` local + `.ser` binario de ControlP5), **timeline con keyframes** para coreografía, **soporte táctil/mobile**, **shader ASCII de fondo** con recarga en vivo, y una **versión GPU** con 20.000 partículas (`letrasgpu.html` + `gpu-particles.js`).

5. **LetterMaster está congelado y tiene deuda visible.** Última modificación real de fuentes: agosto 2022 / zip de octubre 2023. No es repo git. Tiene código muerto confirmado (`initGUI_shaders()` nunca se agrega al acordeón; `Kinectv1/v2`, `cam`, `Serial` y buena parte de `video.pde` están comentados; `displaynormal()` no aplica `colorrandom` ni la fuente porque las llamadas a `textFont()` están comentadas).

6. **Partículas tiene deuda propia que conviene arreglar antes de sumar features.** El timeline es WIP y **no se persiste** (no está en `CFG` ni en el backend); el atajo "Espacio" documentado en el tooltip del play **no existe** en el `keydown`; `timelineLayers[].startTime/duration` se dibujan como clip pero **la interpolación los ignora**; y `CFG.WORDS` + la colección `ParticleWord` son **dos fuentes de verdad** con heurísticas frágiles (`WORDS.length >= 20`).

7. **Recomendación:** portar de LetterMaster, en este orden: **reciclado de letras → multilínea y caja tipográfica → multi-atractor (táctil) → selector de tipografías → feedback con shader GPU → control en vivo por WebSocket/OSC → presets versionados.**

---

## 1. Alcance y método

### 1.1 Qué se revisó en A (`LetterMaster_funcional`)

| Archivo | LOC | Rol |
|---|---:|---|
| `LetterMaster_funcional.pde` | 285 | Sketch principal: `setup`, `draw`, `updateall`, atajos de teclado |
| `Sopa.pde` | 397 | Clases `Sopadeletras` y `Sopaenmodulo` — el motor real de la "sopa" |
| `Letra.pde` | 332 | Clase `Letra`: partícula-boid con `seek/arrive/flee` |
| `atractor.pde` | 131 | Clase `Attractor`: fuerza gravitatoria inversa al cuadrado |
| `GUI_init.pde` | 999 | Construcción de toda la UI ControlP5 (acordeón, 8 grupos) |
| `GUI_listeners.pde` | 394 | Callbacks de UI, carga de fuentes, save/load de JSON |
| `Agenda.pde` | 428 | Módulo "Agenda" (cronograma de evento) |
| `Infografia.pde` | 205 | Clase base `Infografia` + contenedor `Modulo` |
| `PantallaPrincipal.pde` | 351 | Módulo "Pantalla Principal" (carrusel de composiciones) |
| `redbull.pde` | 184 | Módulo RedBull (contador con shader + pistas de audio) |
| `shaderrender.pde` | 236 | Pipeline de feedback GLSL (doble pasada + mezcla de fondo) |
| `Sopa`, `tiempo.pde`, `utils.pde`, `OSC.pde`, `video.pde`, `cam.pde`, `Serial.pde`, `Kinectv1/2.pde` | ~600 | Secuencia automática, utilidades, OSC, video, cámara, Kinect |
| `data/shaders/*` | 8 shaders | `sh.glsl`, `sh_inverted.glsl`, `agregarfondo.glsl`, `magnifico`, `voronoi`, `shpapel`, `diff`, `feed`, `fondo.frag`, `shcontador.frag` |
| `data/frases.txt` + `frases2.txt` | 270 frases | Pool de frases para el modo aleatorio |
| `data/fonts/*` | 25 fuentes | 14 seleccionables desde la GUI (.vlw + .otf) |
| `data/savefiles/*` | 53 archivos | Presets serializados de ControlP5 (`.json.ser`) |
| **Total `.pde`** | **4.684** | |

No es un repositorio git; no se modificó ningún archivo de A.

### 1.2 Qué se revisó en B (`artedigitaldata`)

| Archivo | LOC | Rol |
|---|---:|---|
| `public/particulas.html` | ~800 | Editor: panel de 3 pestañas + panel de timeline |
| `public/js/p5-effect.js` | 1.042 | Motor p5: `Particle`, `WordParticle`, `spawnWordParticles`, `CFG`, API `window.ParticlesConfig` |
| `public/js/particulas.js` | 1.365 | UI, palabras comunitarias, flyer, timeline/keyframes, persistencia |
| `public/js/ascii-shader-bg.js` | 598 | Fondo WebGL2: FBO de ruido → shader ASCII (atlas 5×5 de 32 glifos) |
| `public/css/particulas.css` | 1.216 | Estilos del panel, pills de palabras, timeline |
| `src/routes/public.ts` | 520 | `GET/POST /particles-config`, `GET/POST/DELETE /particles-words` |
| `src/models/ParticleWord.ts` | 33 | Modelo Mongoose de palabra aportada + autor |
| `public/shaders/ascii.frag`, `noise.frag`, `common.vert` | 3 shaders | Shaders externos recargables en vivo |
| `public/letrasgpu.html` + `public/js/gpu-particles.js` + `public/lettesGPU/*` | ~1.017 | Variante GPU (Three.js + GPGPU, 20.000 partículas) |
| **Total relevante** | **~7.600** | |

Dato clave de contexto: **`p5-effect.js` se incluye en 16 páginas** del sitio (`index`, `perfil`, `eventos`, `obras`, `recursos`, `search`, `post`, `oportunidad`, etc.). Es un **fondo global**, no un juguete del editor. Cualquier cambio en el generador de palabras impacta todo el sitio.

---

## 2. Inventario funcional de `LetterMaster_funcional`

### 2.1 Núcleo de letras (`Letra.pde`)

- Partícula tipográfica con `pos`, `speed`, `accel`, `mass = 40`, `maxspeed = 20`, `maxforce = 10`.
- Comportamientos: `seek()` (persecución con límite de fuerza), `arrive()` (frenado suave dentro de 200 px), `flee()` (huida), `applyForce()` (divide por masa), `checkEdges()` (rebote contra los 4 bordes).
- Integración con fricción (`speed.mult(0.99)`, `accel.mult(0.99)`) y **ruido aleatorio** (`PVector.random2D().mult(random(rand))`) sólo en letras no seleccionadas.
- **Alpha por letra** con dos modos vía `letterfade`:
  - `letterfade = true` → letras activas 255, inactivas → 0.
  - `letterfade = false` → rango comprimido `[80, 255]`, o sea **todas las letras quedan siempre visibles**, con las activas más brillantes. Este es el modo "LetrasFONDO ON/OFF" de la GUI.
- Tipos especiales de "letra" (`isImage`, `isLine`, `isCuadrado`): una imagen (`relojito.png`) puede comportarse como letra, y también se pueden dibujar **líneas y rectángulos con físicas de partícula** — se usa en la Agenda para divisores y viñetas.
- **Hue rotate** por letra: `color(sin(millis()*0.001 + ang)*127+127, 200, 200, alpha)` con un `ang = random(TWO_PI)` por letra, para que ninguna pulse en fase.
- Doble ruta de dibujo: `display()` → `displayforshaderrender()` (a `PGraphics` offscreen) o `displaynormal()` (a pantalla).

### 2.2 Formación de frases (`Sopa.pde`)

- `Sopadeletras` mantiene un `ArrayList<Letra> letras` que **es el pool ambiental**.
- `caracteresdisponibles` incluye minúsculas, mayúsculas, `ñ`, `! . ?` y vocales acentuadas `á é í ó ú`.
- **`asignarpalabra(String)` es el corazón del sistema y funciona así:**
  1. Deselecciona todas las letras (`numselect = -1`, `select = false`).
  2. Recorre el pool **de atrás hacia adelante** buscando una letra no usada que coincida con `palabra.charAt(index)`.
  3. Cuando la encuentra: `select = true`, le asigna `sepx` (desplazamiento X relativo al centro) y `sepy` (altura de línea), y avanza `sepx += textWidth(p.c)`.
  4. **Salto de línea automático:** si `sepx > sepxlimit` y el siguiente carácter es un espacio, vuelve a `sepxstart` y suma `letterspacey` a `sepy`. Es decir, hay **multilínea real por caja**.
  5. Si en una pasada no encontró ninguna letra válida, **crea una nueva** con `agregarletra()` y repite hasta cubrir toda la palabra.
- **Reciclado de la misma letra entre frases distintas:** si ya hay una `A` en el pool, la próxima frase reutiliza *esa* `A`. No se generan partículas nuevas mientras haya stock.
- `Sopaenmodulo` añade: `texto` (string de origen), `fontdir` (ruta de fuente para serializar), `relativepos`, `select` (sólo la sopa seleccionada recibe los cambios de UI), `show()/hide()`, `overRect()`.
- `updateValues()` = recalcular el layout sin cambiar el texto (se usa al tocar fuente, tamaño, spacing, apertura X o posición).
- `calcularatraccion()` está sobrecargado para **un** atractor o para una **lista** de atractores.

### 2.3 Atractores (`atractor.pde`)

- Fuerza tipo gravitatoria: `strength = G * Masaatractor / d²`, normalizada y multiplicada — es decir, **cae con el cuadrado de la distancia y explota al acercarse** (el `constrain(d, 5.0, 25.0)` está comentado, o sea que quedó sin límite).
- `mouse_attractor` sigue al mouse; tiene `dragging`, `hover`, `clicked()`, `drag()`, `stopDragging()` — un atractor **agarrable**.
- **`calcularatraccion(ArrayList<Attractor>)`**: el motor soporta N atractores a la vez. El código de Kinect v1/v2 (hasta 10 usuarios × 2 manos = 20 atractores) está escrito y estructurado, sólo comentado por falta de hardware/drivers.
- Los sliders de fuerza están en el grupo "Forces": `Masaatractor` (0–10000, default 1500), `speedlimit` (0–20), `accel_orden`, `atractorforce` (0–10).

### 2.4 Layout tipográfico y composición

- Parámetros globales: `global_fontsize` (1–150), `separacioneny` (0–600, "Letter Space Y"), `aperturax` (rango con dos handles: inicio y fin de caja en X), `letras_poosy` (posición Y del bloque).
- **Jerarquía de composición de tres niveles**: `Infografia` → `Modulo` (PVector `pos` + `ArrayList<Sopaenmodulo>`) → `Sopaenmodulo` (frase concreta). Cada sopa tiene `relativepos` respecto de su módulo, y `Modulo.setPos()` recalcula en cascada `absolutey`, `sepxstart` y `sepxlimit` de todas sus sopas.
- `textboxwidth`, `anchorect`, `altorect`, `margin` definen la caja de la frase (y `sobreFrase()` la usa para empujar letras sueltas hacia afuera con vida propia).
- `setPosX/setPosY/setPosY` → recalculan el layout tipográfico completo. Todo el sistema es **relayout total e inmediato** mientras las físicas siguen corriendo.
- **No existe** alineación inferior (ni centrado vertical) del bloque: la primera línea se ancla en `absolutey` y el bloque crece hacia **abajo**. El algoritmo exacto está en §11.1.

### 2.5 Estética: pipeline de shaders (`shaderrender.pde` + `data/shaders/`)

- Pipeline de **dos pasadas**:
  1. `soparender` dibuja todas las letras (fondo negro) → `sh.glsl` con uniforms `prev`, `render`, `letteropacity`, `feedbackforce`, `feedback_scale`, `feedback_rotate`, `time` (incluye `snoise` animado) → `sopafinal`.
  2. Segunda pasada con `sh_inverted.glsl` (fondo blanco, `feedback_force_inverted`) → `sopafinal_inverted`.
  3. `agregarfondo.glsl` mezcla uno u otro con el fondo según `proyectoactivo`: en Agenda **suma** (`background + sopa`), en Pantalla Principal **multiply + mix** (`background * sopa_inverted`, luego `mix(sopa, fin, 1.0 - sopa.r)`).
- **Esto es una estética que Partículas no tiene**: el doble feedback (blanco y negro) produce esos rastros "quemados" y halos invertidos típicos de instalación.
- Shaders adicionales en `data/shaders/effects/`: `voronoi.glsl`, `voronoi2.glsl`, `voronoi3.glsl`, `macrividela.glsl`, `magnify.glsl`, `shpapel.glsl`, `diff.glsl`, `feed.glsl`; y del módulo RedBull: `fondo.frag`, `shcontador.frag`.
- **Recarga de shaders en caliente** con la tecla `s` (`reloadShaders()`), para live-coding durante un montaje.
- **Deuda:** `initGUI_shaders()` (STfeed, STnoise, noisespeed, feedspeedy, STimage, umbral, noiseScale, feedbackScale, cirsize) **nunca se llama** desde `initGUI()` ni se agrega al acordeón → todo ese grupo está muerto. Y en `displaynormal()` las llamadas a `textFont()` están comentadas, con lo cual `colorrandom` y la fuente por letra **no se aplican en el modo normal** (se nota cuando se apaga "Feedback").

### 2.6 Módulos y pantallas

**Proyecto 0 — Standart**
- Una sola `Sopadeletras` a pantalla completa.
- **Secuencia automática** (`tiempo.pde`): cada `durationsec` ms llama a `setFraseRandom()`, que elige una frase aleatoria de `frases.txt` (135 frases irónicas/poéticas) o `frases2.txt`, con barra de progreso dibujada arriba (`displaysecuencia`, 1/8 a 7/8 del ancho).
- Entrada de texto en vivo (Textfield "Frase"): `updateFraseinput()` corre cada frame y reescribe la sopa sin apretar Enter.
- Botón `Frase_Random` / tecla `p`.

**Proyecto 1 — Agenda** (`Agenda.pde`)
- Cronograma de evento cargado desde `infografia.json` (`horario`, `persona`, `informacion`).
- Cada ítem es un `Modulo` con **6 sopas**: horario, persona, información, un ícono-imagen (reloj), una **línea** y un **cuadrado** — los tres últimos son "letras" especiales usadas como elementos gráficos con físicas.
- Título y subtítulo animados que **cambian por tramos** según el slide (`cambiartextostitulos` con umbrales 3/5/8).
- Carrusel **vertical continuo**: `moverslider()` muestra el módulo anterior, el actual y el siguiente, posicionados con `agenda_sepy`; con circularidad al llegar a los extremos.
- Controles propios de Agenda: `agenda_sepy`, `agenda_globalx`, `agenda_titulox/y`, `agenda_fontsize`, `agenda_margin`, `agenda_linea_*`, `agenda_cuadrado_*` (el grupo está comentado en el acordeón, pero los listeners existen).

**Proyecto 2 — Pantalla Principal** (`PantallaPrincipal.pde`)
- Carrusel cíclico de composiciones tipográficas libres (`Modulo` con N `Sopaenmodulo` en `relativepos`).
- **Persistencia JSON**: `loadJSONArray("infografia2.json")` en `initmodulos()` y `saveJson()` que serializa texto, fuente, fontsize, color RGB, módulo, separación Y, apertura X, posición Y.
- Botones `addnewsopa`, `addnewsopa_random` (agrega una sopa con frase aleatoria del pool), `savejson`, `loadjson`; tecla `b` borra el módulo activo; `itemselect` (ScrollableList) selecciona la sopa activa y **todos los cambios de UI se aplican sólo a la seleccionada**.
- Fondo: video por slide (`videosfondo/pantallaprincipalvideoN.mp4` — archivos no presentes en el repo) o imagen de `data/img/fondo/ESCENA1..6.jpg`.

**Módulo RedBull** (`redbull.pde`)
- Pantalla de juego/quiz con cuenta regresiva de 30 s renderizada **por shader** (`shcontador.frag`), 9 pistas de audio con BPM (`data/sound/*.wav` — carpeta hoy vacía), y visualización de `STAGE` y `TRACK`. Se activa por OSC con `/datosredbull`.
- Concepto interesante: **el sistema de letras como motor de una dinámica de evento con audio sincronizado**.

### 2.7 Entrada/salida y control externo

- **OSC** (`OSC.pde`, puerto 3521 recibe / 7000 envía):
  - `/agregarfrase` (String) → agrega una sopa con **posición y color aleatorios** en pantalla: control remoto desde tablet/TouchOSC.
  - `/borrartodo` → limpia el módulo activo.
  - `/datosredbull` (escenario, track, palabra) y `/playtrack` → arranca módulo RedBull y reproduce audio.
- **Spout** (`spout.createSender("Sopa de letras")`): salida de textura en vivo para Resolume, TouchDesigner, OBS o mapping. Toggle `spoutactive` en la GUI.
- **Kinect v1 / v2** (código escrito, comentado): `enableSkeleton3DMap`, hasta 20 atractores desde manos, offsets y umbrales configurables por rango (`kinect2_offsetx`, `kinect2_umbrallimit`).
- **Serial** (comentado) para disparadores por hardware.
- **Minim** para audio: 9 `AudioPlayer` precargados (`apagarSonidos()`, `rewind()`, `play()`).

### 2.8 UI, presets y debug

- GUI ControlP5 con **acordeón de 8 grupos**: Forces, Letras, Render options, Logo, Efectos, Secuencia, Standart, Pantalla Principal.
- `cp5.saveProperties("data/savefiles/default.json")` + **backup automático con número aleatorio** en cada guardado (53 archivos acumulados) y carga al inicio (`cp5.loadProperties("data/savefiles/default.json")`).
- Atajos: `g` (mostrar GUI), `d` (debug), `p` (frase random), `b` (borrar módulo), `x` (mostrar/ocultar sopa), `s` (recargar shaders), `y` (borrar letras no seleccionadas en thread), `c`/`v` (guardar/cargar preset), `1`–`6` (salto directo de slide), `f` (fondo RedBull).
- **`showdebug()`**: overlay con framerate y visualización del estado de las partículas (círculos verde/rojo por letra seleccionada/no seleccionada, rectángulo de la caja de frase).
- **Separación display/update**: `draw()` sólo dibuja; `updateall()` hace toda la simulación y la gestión de estado. Es un patrón limpio que evita side-effects en el render.
- Logo superpuesto con rotación (`rotarlogo`, `logosize`), fondo con `fondoactivo` + `backrefresh` y `bgdecay` (rect semitransparente por frame = feedback suave sin shader).

---

## 3. Inventario funcional del Editor de Partículas actual

### 3.1 Motor (`p5-effect.js`)

- Dos clases:
  - **`Particle`** — letra ambiental. Nace desde el mouse (throttle por `SPAWN_INTERVAL_MS` y `SPAWN_COUNT_MIN/MAX` escalado por velocidad del cursor), desde posiciones random o desde los 4 bordes en `AUTO_MODE`. Tiene `scale-in` (0→1 durante el 15 % inicial de su vida), `lifespan` con `decay`, `CHAR_BG` opcional.
  - **`WordParticle`** — letra con objetivo. `holdTime = 80` frames congelada en la palabra antes de disolverse (`decay = 2.2`); en modo flyer `holdTime = Infinity`, `decay = 0` (vida infinita), y al llegar a `d < 4` se clava en el target (`pos.set(target); vel.set(0,0)`).
- Movimiento tipo `arrive`: `slowRadius = 60`, frenado adicional `if (d < 18) vel *= 0.85; if (d < 3) vel *= 0.35`. Esto es clave para que no tiemblen.
- Flotación senoidal de las letras de palabra ya fijadas: `sin(frameCount*0.08 + noiseSeed) * 1.5`.
- **Repulsión mutua** `O(n²)` entre partículas dentro de `REPULSION_RADIUS`, con la excepción explícita de las `WordParticle` (`if (other !== this && !(other instanceof WordParticle))`).
- **Flowfield** (Perlin) aplicado sólo a las partículas ambientales, con grilla X/Y, escala X/Y, fuerza, velocidad temporal, visualización de vectores, y **wrap suave** en los bordes cuando está activo.
- **Feedback/estela** por `BG_ALPHA`: `0` = nunca limpia (feedback infinito), `50` = velo suave, `255` o ASCII activo = `clear()` total.
- Config global `CFG` con defaults, merge desde `localStorage` (evita flash), `loadRemoteConfig()` desde `GET /public/particles-config`, `saveRemoteConfig()` (POST con Bearer token admin), `reset()`, y sincronización entre pestañas vía evento `storage`.
- API pública: `window.ParticlesConfig = { get, set, save, reset, loadRemote, spawnWordAt, DEFAULTS }`.

### 3.2 Generador de palabras (lo que se agregó recientemente)

- `spawnWordParticles(word, centerX, centerY, isFlyer, flyerId, wordConfig)`:
  - Mide el **ancho real de cada glifo** con `textWidth(ch)` tras setear `textSize(wordFontSize)`.
  - Suma `LETTER_SPACING` en píxeles **entre** caracteres (el reciente cambio de "0.0–3.0 escala" a "0–100 px" es una mejora clara sobre LetterMaster, que sólo usaba `textWidth`).
  - Calcula `startX = centerX − totalWidth/2`, apoya todo en **una sola línea** sobre `startY = constrain(centerY, 40, height−40)`.
  - Cada carácter nace en un punto aleatorio a `random(60, 240)` px del centro en ángulo aleatorio (`spawnX/Y`) y "vuela" hasta su target. Es un efecto de ensamblado muy distinto al de LetterMaster, más cinematográfico.
- **Selección de palabra por click** (`window.mousePressed`): lista `CFG.WORDS`, elige índice random **evitando repetir el inmediatamente anterior**, y excluye clicks sobre panel/header/inputs/timeline. También sincroniza los sliders `POS_X`/`POS_Y` con el punto del click.
- **Modo automático** (`AUTO_MODE` + `AUTO_INTERVAL_SEC`): cada `intervalSec × 60` frames (mínimo 30) lanza una palabra en posición aleatoria dentro de márgenes seguros (`padX`/`padY` escalados al viewport), y cada 4 frames nace una letra suelta desde un borde o desde posición random.
- **Touch**: `touchStarted` replica la lógica con `tx/ty`, valida que sea la página completa del editor (`isFullEditorPage`) y guarda `lastTouchTimestamp` para descartar el click sintético que sigue al tap.

### 3.3 Flyer Mode y Timeline (WIP en el working tree)

- **Flyer Mode**: palabras de vida infinita, posicionadas por click en el lienzo o en `POS_X/POS_Y`, listadas como pills (`flyerWords`), persistidas en `CFG.FLYER_WORDS`. `updateFlyerWordParticles()` recomputa targets cuando cambian posición, tamaño o spacing sin recrear partículas.
- **Timeline**: `timelineLayers[]` con `{id, name, word, x, y, fontSize, letterSpacing, startTime, duration, keyframes[]}`.
  - Interpolación lineal de `x, y, fontSize, letterSpacing` entre keyframes ordenados (`getInterpolatedLayerProperties`).
  - Transporte: play/pausa con `requestAnimationFrame`, rewind a 0, loop al llegar a `timelineDuration` (10 s fijos), scrub arrastrando sobre el ruler.
  - UI: clips por capa, marcadores de keyframe clickeables, indicador de tiempo `00:00.00 / 00:10.00`, botones `+ Agregar Capa`, `Add Keyframe`, `Delete KF` (borra el KF seleccionado o la capa entera), cerrar.
  - `Add Keyframe` toma los valores actuales de `POS_X/POS_Y/TEXT_SIZE_MAX/LETTER_SPACING` y **sobrescribe** el KF existente si está a menos de 0.15 s.

### 3.4 Estética

- **4 colores** (`COLOR_1..4`) con asignación por posición aleatoria en un **gradiente continuo** (`lerpColor` entre pares) y un `hue rotate` implícito por partícula vía `ang`… no: en realidad el color se fija en el constructor con `colorPos` aleatorio — **no hay ciclo temporal de hue** (a diferencia del `colorrandom` de LetterMaster).
- **`CHAR_BG`**: rectángulo redondeado detrás de cada letra, con color y opacidad propias — equivalente al `isCuadrado` de LetterMaster pero aplicado **a todas** las letras y con más control visual.
- **Shader ASCII de fondo** (`ascii-shader-bg.js` + `public/shaders/*`): pipeline de render-to-texture (FBO de ruido `snoise`) hacia un shader que mapea niveles de gris a un **atlas 5×5 de 32 glifos** (`getCharBitmask`), con `u_charSize`, `u_glyphScale`, `u_tile`, `u_opacity`, `u_speed`, modo "solo ruido" y **recarga de shaders en vivo** (tecla `R` o botón) leyendo `/shaders/ascii.frag` y `/shaders/noise.frag`.
- Nota: el color del shader toma la paleta activa (`AsciiShaderBG` lee `ParticlesConfig.get()`), así que paleta y fondo están sincronizados.

### 3.5 Comunidad y backend (lo más diferencial frente a LetterMaster)

- Modelo `ParticleWord`: `word` (único, uppercase), `addedBy { userId, username, displayName, avatar }`, timestamps.
- `GET /public/particles-words`: seed inicial desde `particles_p5_config.WORDS` con autor `jpupper`, limpieza de palabras anónimas, agrupación `byUser` con `words[]`, `count` y `lastAdded`, totales `totalWords`/`totalContributors`.
- `POST /public/particles-words`: **sólo usuarios registrados** (authMiddleware), separa por comas, recorta a 120 caracteres, ignora duplicados, y guarda automáticamente atribuyendo el aporte al usuario.
- `DELETE /public/particles-words/:word`: **sólo admin** (adminMiddleware) + validación de que quede al menos una palabra.
- `GET/POST /public/particles-config`: la config global de físicas sólo la puede escribir un admin (JWT verificado por username `jpupper`, rol `ADMIN`/`ADMINISTRADOR`, o `permissions.artedigital.role === 'ADMINISTRADOR'`).
- Fallback de endpoint `/api` ⇄ `/artedigitaldata/api` en todas las llamadas (para el proxy del hosting).

### 3.6 UX del editor

- Panel con 3 pestañas (Parámetros / Flyer / Palabras de Usuarios), backdrop para mobile, badge de contador arriba y en la pestaña.
- Sliders numéricos **bidireccionales** slider↔input con clamping y **validaciones cruzadas** (`SPAWN_COUNT_MIN/MAX`, `LIFESPAN_DECAY_MIN/MAX`, `SPAWN_RADIUS_MIN/MAX`).
- Buscador de palabras propias (`filterWordInput`) y de colaboradores (por usuario **o por palabra**).
- Estados de sesión: admin (guardar + borrar), usuario registrado (agregar palabras), anónimo (sólo explorar), con avisos contextuales en `#admin-notice` y `#word-auth-hint`.
- Atajos `F` (fullscreen + ocultar UI), `P` (panel), `R` (recargar shaders), con guarda para no interferir en campos de texto.
- Toast de feedback, botón Reset con confirmación, botón Guardar sólo visible para admin.

### 3.7 Gemelo GPU (contexto)

- `letrasgpu.html` + `lettesGPU/js/gpu-particles.js`: Three.js + `GPUComputationRenderer` embebido, 20.000 partículas en texturas de posición/velocidad, atlas de caracteres, word attractor por shader (`u_targetTexture`, `u_attractorActive`), flowfield y fuerza de mouse **resueltos en la GPU** (`u_flowfieldEnabled`, `u_flowfieldScale`, `u_friction`, `u_maxSpeed`).
- Esta es la respuesta natural a la mayor debilidad del motor p5 (la repulsión `O(n²)` en CPU) y también el lugar donde tiene más sentido portar el feedback shader de LetterMaster.

---

## 4. Tabla comparativa

| # | Capacidad | `LetterMaster_funcional` | `particulas.html` | Veredicto |
|---|---|---|---|---|
| 1 | Formación de palabras | ✅ Recicla el pool existente | ⚠️ Inyecta partículas nuevas cada vez | **Portar A** |
| 2 | Atractores | ✅ N atractores (mouse + Kinect/multi-mano), fuerza gravitatoria d⁻² | ❌ 1 sola fuente (mouse/touch), `arrive` con slowRadius | **Portar A** |
| 3 | Multilínea / ajuste de frase en caja | ✅ Salto por `sepxlimit` + `letterspacey` | ❌ Una sola línea | **Portar A** |
| 4 | Separación entre letras | ⚠️ Sólo `textWidth` (sin gap) | ✅ `LETTER_SPACING` en px | **B mejor** |
| 5 | Posición del bloque | ✅ X/Y por módulo + `aperturax` (2 handles) | ⚠️ `POS_X`/`POS_Y` (1 punto, reciente) | **Portar ancho de caja** |
| 6 | Tipografías | ✅ 14 fuentes conmutables en vivo | ❌ `monospace` fija | **Portar A** |
| 7 | Tamaño de letra | ✅ Global 1–150 relayout instantáneo | ✅ MIN/MAX (letras sueltas vs palabras) | **B mejor** |
| 8 | Color | ⚠️ ColorWheel + hue rotate (roto en modo normal) | ✅ 4 colores con gradiente; sin ciclo temporal | **Empate / combinar** |
| 9 | Marco por letra | ✅ `isCuadrado` (letra especial) | ✅ `CHAR_BG` color + opacidad | **B mejor** |
| 10 | Líneas / imágenes como partícula | ✅ `isLine`, `isImage` | ❌ | **Portar A** |
| 11 | Feedback con shader | ✅ Doble pasada (`sh` + `sh_inverted`) + `agregarfondo` + rotación/escala | ⚠️ Sólo `BG_ALPHA` (velo 2D) | **Portar A** |
| 12 | Shaders de efectos | ✅ voronoi ×3, magnify, papel, diff, feed | ⚠️ Sólo ASCII de fondo (externo, recargable) | **Portar pipeline** |
| 13 | Recarga de shaders en vivo | ✅ tecla `s` | ✅ tecla `R` / botón | Empate |
| 14 | Secuencia automática | ✅ Frase random cada N ms con barra de progreso | ✅ `AUTO_MODE` con intervalo y posición random | Empate (B sin barra ni orden) |
| 15 | Pool de frases | ✅ 270 frases "de sentido" | ✅ ~400 términos técnicos/culturales | Complementarios |
| 16 | Flyer / composición fija | ⚠️ `Sopaenmodulo` fija (infografía) | ✅ Flyer Mode + `FLYER_WORDS` persistido | **B mejor** |
| 17 | Keyframes / timeline | ❌ Sólo secuencia por slide | ⚠️ Timeline WIP sin persistir | **B (terminar)** |
| 18 | Jerarquía de composición | ✅ `Infografia → Modulo → Sopa` con `relativepos` | ❌ Capas planas (`layer.x/y`) | **Portar A** |
| 19 | Persistencia de configuración | ⚠️ `default.json` + `.ser` local, 53 backups | ✅ Backend `BotConfig` + localStorage + admin-only | **B mejor** |
| 20 | Backups / versionado de preset | ✅ Backup automático por guardado | ❌ Sobrescribe | **Portar A** |
| 21 | Multiusuario / comunidad | ❌ | ✅ Colección `ParticleWord` + UI de colaboradores | **B único** |
| 22 | Salida a video (Spout/Syphon) | ✅ Spout | ❌ | Ver §6.4 |
| 23 | Control externo en vivo | ✅ OSC (`/agregarfrase`, `/borrartodo`, RedBull) | ❌ (sólo POST admin de config) | **Portar idea (WebSocket)** |
| 24 | Sensores (Kinect / LIDAR) | ⚠️ Código escrito, comentado | ❌ | **Portar idea** |
| 25 | Audio | ✅ 9 pistas + audio reactivo en RedBull | ❌ | Portar (falta ver si aplica) |
| 26 | Módulos de contenido (agenda/timeline de evento) | ✅ Agenda + Pantalla Principal con JSON | ⚠️ Timeline (capas sueltas por palabra) | **Portar el modelo de datos** |
| 27 | Video de fondo | ⚠️ `Movie` por slide (comentado / archivos faltantes) | ❌ (sólo shader) | Ver §6.4 |
| 28 | Táctil / mobile | ❌ | ✅ `touchStarted`, viewport, `lastTouchTimestamp` | **B mejor** |
| 29 | Escalabilidad de partículas | ⚠️ 40–200 letras, repulsión O(n²) | ⚠️ p5 CPU O(n²); ✅ gemelo GPU 20.000 | **B tiene la salida** |
| 30 | Debug / inspección | ✅ `isdebug` con shapes de estado + FPS | ❌ (FPS sólo en `letrasgpu`) | **Portar A** |
| 31 | Separación display/update | ✅ Estricta (`draw` vs `updateall`) | ⚠️ Lógica dentro de `draw()` | **Portar A** |
| 32 | Autoría de la UI | GUI nativa ControlP5 (desktop, 8 grupos) | Panel HTML/CSS responsive (mobile-first) | Empate |
| 33 | Multi-página | ❌ Sketch único | ✅ Fondo global en 16 páginas | **B único** |
| 34 | Tipado / tests / tooling | ❌ sketch monolítico | ⚠️ JS vanilla + `tools/visual-harness` de snapshots | **B mejor** |

---

## 5. Qué agregarle a `particulas.html` (candidatos a portar, priorizados)

### P0 — Alto impacto, bajo costo

#### 5.1 Reciclado de letras (pool ambiental)
**Qué hace A:** `asignarpalabra()` busca en `letras` una partícula con el carácter pedido y la *reutiliza*; sólo crea cuando no hay stock.
**Por qué importa (razón principal, estética):** hoy cada click **suma** partículas y las letras ambientales no participan de la palabra. El resultado es que la sopa no "se ordena", se superpone: dos capas visuales (la ambiental y la palabra) en vez de un solo material que se reorganiza. Además, la palabra anterior se desvanece mientras la nueva entra volando, en lugar de transformarse en ella.
**Por qué importa (razón secundaria, población):** las letras creadas por click quedan vivas ~200 frames (`holdTime = 80` + `255 / decay 2.2 ≈ 116`) → ~3,3 s. No es un crecimiento sin límite, pero crea **picos** de población según la frecuencia de clicks, y esos picos encarecen cuadráticamente el frame de todas las letras (ver §5.1.1).
**Cómo:** en `draw()`, antes de `spawnWordParticles`, hacer un *claim* de `Particle` libres cuyo `char` coincida (y no estén ya reclamadas), convertirlas en `WordParticle` con el target calculado, y crear sólo las faltantes. Requiere un flag `p.claimed` y devolver las letras al pool (o reciclarlas) al vencer el `holdTime` en vez de matarlas.

#### 5.1.1 ¿Reciclar es realmente más óptimo que borrar y crear?

Es una pregunta legítima, y la respuesta honesta es **"sí, pero por menos de lo que parece"**. Hay que separar dos costos distintos:

**a) Costo de asignación.** Comparando 1:1 sobre la misma población:

| Operación | Costo |
|---|---|
| `new Particle()` / `new WordParticle()` | Asignación de un objeto nuevo → presión de GC; decenas por segundo con clicks rápidos |
| `particles.splice(i, 1)` | **O(n)** por `memmove` del array, dentro del bucle de `draw()` |
| Mutar campos de una partícula existente (reciclar) | O(1), cero asignación |

Reciclar gana, pero a escala de cientos de partículas y 60 fps **este término es ruido** frente al punto (b). No es un argumento de peso por sí solo.

**b) Costo de población (el término dominante).** En `p5-effect.js`, `p.applyRepulsion(particles)` se llama para **todas** las partículas y el bucle interno recorre **todo** el array, descartando las `WordParticle` con un `instanceof`:

```js
applyRepulsion(others) {
  for (let other of others) {
    if (other !== this && !(other instanceof WordParticle)) { /* ... */ }
  }
}
```

Consecuencia: las letras de palabra **no repelen nada** (`WordParticle.applyRepulsion() {}` es un no-op) pero **sí engordan el array que todos recorren**. Cada palabra de 12 letras encarece el frame de *todas* las letras ambientales sin aportar interacción. El costo por frame es O(n²) sobre el largo del array, y reciclar desde un pool acota ese `n` por diseño (subir `SPAWN_COUNT` o el `holdTime` no dispara el n²).

**c) El contrapeso: reciclar encarece la formación.** `asignarpalabra()` hace una **búsqueda lineal del pool por carácter** (O(pool × len)), y se re-ejecuta en cada tecleo (`updateFraseinput()` corre cada frame) y en cada relayout. Crear sin buscar es O(len). Y en LetterMaster ese loop está bugueado (`i > 0`, §7.2), así que puede recorrer todo el pool, no encontrar la letra del índice 0 y **crear igual**: lo peor de los dos mundos.

**d) Dónde borrar+crear es legítimamente mejor:** cuando se necesitan glifos fuera del pool (acentos, dígitos, `@`), cuando se **quiere** el efecto de materialización desde la nada (el ensamblado desde un anillo a 60–240 px es una *feature* del diseño actual y depende de crear), cuando hay que reducir población dinámicamente en un dispositivo lento, o cuando se busca variedad ilimitada sin administrar un pool.

**e) Ojo con la conclusión fácil.** LetterMaster es más barato por frame (O(n) lineal) **no por reciclar, sino porque no tiene repulsión entre letras**: en `Sopadeletras.update()` cada letra va a su target o deriva al azar, y el bloque de empuje que sí existe está anulado (`float accelforce = 0;`). Son decisiones independientes y no conviene atribuir a una el mérito de la otra.

**f) Entonces, ¿cuál es la opción óptima?** Ninguna de las dos por separado:

1. **Object pool / free-list**: al morir, la partícula vuelve a una lista libre y se reusa con `reset(x, y)` → evita el `new` **y** el `splice` (swap-and-pop O(1) en lugar de memmove). Es reciclar aplicado al camino de creación: el mejor de ambos.
2. **Repulsión con grilla espacial** (hash por celdas del tamaño de `REPULSION_RADIUS`) → O(n) real, elimina el término dominante.
3. **Mover el motor a la ruta GPU**: `gpu-particles.js` ya corre 20.000 partículas con atractor y flowfield en shader.

Con (1) + (2) el debate reciclar-vs-crear deja de ser relevante: la población puede crecer porque el costo marginal ya no es cuadrático. La razón que **sí sobrevive** para reciclar es la continuidad visual (§5.1).

#### 5.2 Multilínea y caja tipográfica
**Qué hace A:** `sepx > sepxlimit && siguiente == ' '` → `sepx = sepxstart; sepy += letterspacey`.
**Por qué importa:** hoy `spawnWordParticles` siempre escribe en una línea, y `POS_Y` con `constrain(centerY, 40, height−40)` hace que una frase larga se salga lateralmente sin remedio. La pestaña Flyer promete "frases" y "texto", pero el motor no las ajusta.
**Cómo:** `spawnWordParticles` ya calcula `charWidths`; extenderlo a `measure → wrap por palabras → distribuir Y` y exponer `LETTERSPACE_Y` (nuevo, equivalente a `letterspacey`) + `BOX_WIDTH` (equivalente a `aperturax`). Es un cambio contenido en una función y da un salto enorme en calidad de composición.

#### 5.3 Selector de tipografías en caliente
**Qué hace A:** 14 fuentes (.vlw) con `loadglobal_fontfromGUI(n)`, aplicadas con `setFont` + `updateValues()`.
**Por qué importa:** `p5-effect.js` está clavado en `textFont('monospace')`. Toda la identidad visual del efecto depende de una fuente genérica, y LetterMaster tiene un set curado (FishmongerK incluye la familia expandida/condensada que usaba con la sopa).
**Cómo:** cargar webfonts con `loadFont()` de p5 o `document.fonts.load`, exponer `FONT_FAMILY`/`FONT_WEIGHT` en `CFG`, y recalcular targets al cambiar (el timeline ya tiene `fontSize` por capa, así que el plumbing existe).

#### 5.4 Overlay de debug y separación display/update
**Qué hace A:** `showdebug()` dibuja FPS y el estado de cada letra; `draw()` no simula, `updateall()` simula.
**Por qué importa:** depurar el generador de palabras hoy es a ciegas. Y tener `particles.push`, colisiones y auto-mode dentro de `draw()` mezcla responsabilidades y hace difícil razonar sobre el orden de operaciones.
**Cómo:** `DEBUG` en `CFG`, dibujar targets/claimed/velocidad en un `PGraphics` de overlay, y extraer el bloque de simulación de `draw()` a `simulate()`.

### P1 — Alto impacto, más trabajo

#### 5.5 Multi-atractor (multi-touch / multi-persona)
**Qué hace A:** `calcularatraccion(ArrayList<Attractor>)`, con Kinect v1/v2 listo para 20 atractores.
**Por qué importa:** es el salto de "efecto de fondo" a "instalación interactiva". En web se consigue sin hardware: `touchStarted/touchMoved` con `touches[]` ya está a medio camino (hoy sólo lee `touches[0]`).
**Cómo:** mantener un array `attractors[]` con posición suavizada (lerp) y vida corta por dedo/hand-tracker; cada `Particle` recibe la suma de fuerzas. En la versión GPU ya existen los uniforms de mouse: se extienden a un `u_mouse2/3/4`.
**Nota técnica:** la fuerza de A cae con `d⁻²` (sin clamp) → muy "imán"; conviene usar el `arrive` actual para las palabras y `d⁻²` sólo para las letras libres, o exponer `ATTRACTOR_FALLOFF` con clamp.

#### 5.6 Pipeline de feedback con shader (doble pasada)
**Qué hace A:** `sh.glsl` (prev + render + `feedback_scale` + `feedback_rotate` + ruido simplex) con dos instancias (normal/invertida) y `agregarfondo.glsl` para mezclar con el fondo.
**Por qué importa:** `BG_ALPHA` da una estela plana sin memoria espacial. El feedback con escala/rotación produce esos vórtices y halos que son la firma visual de LetterMaster, y `public/js/ascii-shader-bg.js` **ya tiene toda la infraestructura WebGL2 + FBO + recarga en vivo** para hacerlo sin cambiar de stack.
**Cómo:** segundo `PGraphics` (o FBO) que acumula el frame anterior, con `feedbackScale`, `feedbackRotate`, `feedbackForce` y `letterOpacity` en el panel; conservar `BG_ALPHA` como fallback barato. Idealmente implementarlo en la ruta GPU (`gpu-particles.js`) para no cargar más costo a la CPU.

#### 5.7 Jerarquía de composición (Grupo → Bloque → Palabra)
**Qué hace A:** `Infografia → Modulo(pos) → Sopaenmodulo(relativepos)`, con `setPos()` en cascada.
**Por qué importa:** el timeline actual es **plano**: cada capa es una palabra independiente con su x/y. Componer un flyer de 3 bloques alineados (título + subtítulo + bajada) exige moverlos a mano uno por uno, y no hay forma de cambiar la tipografía/tamaño de un bloque completo.
**Cómo:** introducir `GROUPS[]` con `{x, y, anchor, children[]}` y hacer que las capas referencien `groupId + relativeX/Y`; el timeline entonces anima grupo **y** capa. Es también la base para un preset de "plantilla de flyer".

#### 5.8 Líneas / formas con físicas (`isLine`, `isCuadrado`, `isImage`)
**Qué hace A:** una "letra" puede renderizarse como línea, rectángulo o imagen y seguirse moviendo con las mismas físicas.
**Por qué importa:** permite viñetas, divisores, íconos y logos que **se ensamblan con las palabras** en vez de quedar rígidos (LetterMaster lo usa en la Agenda). Combinado con `CHAR_BG` abre un lenguaje gráfico mucho más rico.
**Cómo:** un campo `renderType` en `WordParticle`/`Particle` ('char' | 'line' | 'rect' | 'image') con sprite/URL opcional; `spawnWordParticles` ya asigna un target por glifo, así que un "glifo" puede ser una imagen.

### P2 — Diferenciales de producto

#### 5.9 Control en vivo remoto (WebSocket / OSC)
**Qué hace A:** OSC `/agregarfrase`, `/borrartodo`, `/datosredbull` — el operador controla la instalación desde una tablet.
**Por qué importa:** el proyecto ya usa **socket.io** (`server.ts`) pero el editor de partículas no publica nada. Un operador en un evento debería poder disparar palabras, cambiar paleta o activar auto-mode desde el celular sin tocar la laptop.
**Cómo:** canal socket.io `/particles` con eventos `spawn-word`, `set-config` (sólo admin), `clear`. Como el efecto es global, el estado en vivo debe ir separado de `CFG` persistido. Alternativa/puente: un adaptador OSC→WebSocket (o `osc.js` en Node) para reutilizar controladores TouchOSC/Lemur existentes.

#### 5.10 Presets versionados con backup
**Qué hace A:** `saveProperties("default.json")` + `backup<random>.json` (53 versiones), y atajos `c`/`v`.
**Por qué importa:** hoy "Guardar Efecto" **sobrescribe** y "Reset" es irreversible (y el reset incluso persiste a fábrica). En un contexto de instalación eso es peligroso.
**Cómo:** una colección `ParticlePreset { name, config, createdBy, createdAt }`, un selector de presets en el panel, "Guardar como…" y "Restaurar preset anterior" (siempre conservar el último antes de sobrescribir).

#### 5.11 Módulos de contenido (equivalente a Agenda / Pantalla Principal)
**Qué hace A:** dos infografías basadas en **datos** (`infografia.json` con horario/persona/información; `infografia2.json` con composiciones), con carrusel temporizado y cambio de título por tramos.
**Por qué importa:** el salto conceptual más grande. Hoy el editor produce **efectos**; LetterMaster produce **piezas de comunicación** (cronogramas, carteles, datos). En el sitio ya hay eventos/oportunidades: un "modo agenda del evento" que arme el texto desde la API sería un uso de producto, no un efecto.
**Cómo:** un modo `CONTENT_MODE` que reciba un array de slides `{kicker, title, subtitle, duration}` y dispare `spawnWordParticles` con secuencia, reutilizando el timeline para la coreografía.

#### 5.12 Secuencia con barra de progreso y orden
**Qué hace A:** barra visible + `durationsec` configurable + frase random.
**Por qué importa:** `AUTO_MODE` tarda un número de **frames** (`Math.max(30, intervalSec * 60)`), así que en un monitor de 144 Hz o en una máquina lenta el intervalo real no coincide con el valor en segundos — un bug de UX sutil pero visible.
**Cómo:** pasar a tiempo real (`millis()`/`performance.now()`), agregar barra de progreso opcional y permitir secuencia ordenada o aleatoria sin repetición (ya existe la evitación de repetir consecutivas).

#### 5.13 Sensores reales (Kinect / seguimiento de manos)
**Qué hace A:** Kinect v1/v2 con 10/6 usuarios y skeleton 3D, más offsets y umbrales.
**Por qué importa:** es el caso de uso de instalación física (museo, evento). En web hoy se hace con **MediaPipe Hands** corriendo en el navegador, sin drivers.
**Cómo:** un módulo opcional de tracking que alimente `attractors[]` (§5.5) con N manos. Encaja perfecto con la arquitectura de multi-atractor y no requiere hardware propietario.

---

## 6. Lectura cruzada: dónde cada uno es mejor

### 6.1 LetterMaster hace mejor (diseño, más allá de features sueltas)

1. **Continuidad visual del material.** El pool reciclado hace que el efecto se sienta como *un solo sistema* reorganizándose; Partículas se siente como capas que se apilan y se borran. Esta es la diferencia estética fundamental.
2. **Sistema de composición en árbol** (`Infografia → Modulo → Sopa` + `relativepos` + relayout en cascada). Es la base de todo lo que hace con la Agenda y la Pantalla Principal.
3. **Arquitectura de render por capas con shaders y doble pasada** (normal + invertida) y mezcla final según el módulo. Muy superior al velo plano de `BG_ALPHA`.
4. **Simulación separada del dibujo** (`updateall()` vs `draw()`), que hace trivial correr el motor con GUI apagada o alimentado por sensores.
5. **Control en vivo y salida profesional** (OSC + Spout + audio + atajos de teclado numerados + recarga de shaders). Está pensado para operar en un evento, no para configurarse y dejarse.
6. **Estado de la herramienta observable** (`isdebug`, `showdebug`, rectángulos de caja, colores por estado) y **presets con backup automático**.
7. **Parametrización tipográfica real**: 14 fuentes, apertura X con dos handles, spacing Y multilínea, tamaño 1–150 con relayout inmediato.

### 6.2 Partículas hace mejor (y LetterMaster no tiene)

1. **Backend comunitario**: `ParticleWord` con autor, agrupación por usuario, aportes con login, borrado admin, seeding. LetterMaster es 100 % local y mono-operador.
2. **Persistencia y control de acceso**: `BotConfig` + localStorage + `storage` entre pestañas, con verificación de rol en el backend. En A, el "preset" es un JSON/binario local y cualquiera que abra el sketch toca todo.
3. **Timeline con keyframes** (aunque WIP): coreografía de posición, tamaño y spacing en el tiempo. A sólo tiene "cambio de frase cada N ms" y carrusel por slide.
4. **Mobile y táctil de primera clase**: viewport, backdrop, `touchStarted`, supresión del click sintético, fullscreen, atajos con guarda de inputs.
5. **Shader ASCII externo y recargable** con atlas de glifos, modo solo-ruido y recarga en vivo desde `/shaders/*.frag` — un efecto muy "cyberpunk" que LetterMaster no tiene pese a tener 8 shaders.
6. **Ruta GPU real** (`gpu-particles.js`: GPGPU 20.000 partículas, atlas, atractor por shader). A está topeado por el `O(n²)` de la CPU.
7. **Reutilización multi-página**: el efecto vive en 16 páginas y se sincroniza por config central. A es una app de escritorio.
8. **Separación de costos**: `LETTER_SPACING` en píxeles (legible), `TEXT_SIZE_MIN/MAX` (letras sueltas vs palabras), validaciones cruzadas entre sliders, fallback de endpoints.

### 6.3 Lo mejor de ambos mundos (síntesis)

La visión de producto razonable es: **el motor de Partículas (web, multiusuario, GPU) + el modelo de composición y el pipeline estético de LetterMaster**. Es decir, que las letras del fondo **sean** el material con el que se escriben las palabras, que las frases se ajusten a una caja con tipografías elegibles, que el feedback con shader corra en la ruta GPU, y que un operador pueda disparar todo desde un celular durante un evento.

### 6.4 Lo que **no** conviene portar tal cual

- **Spout/SpoutSender**: no aplica en web. El reemplazo natural es *capturar el canvas* (`canvas.captureStream()`) y enviarlo por WebRTC a Resolume/OBS, o exportar PNG/secuencia de frames para flyers impresos. Un botón "Exportar frame a PNG" para Flyer Mode es más útil y mucho más simple.
- **Kinect nativo y Serial**: reemplazar por MediaPipe Hands / WebSerial si hicieran falta (§5.13). Portar los bindings no tiene sentido.
- **`redbull.pde`** (quiz con audio y contador): es un módulo de evento específico de un cliente; conviene extraer sólo la *idea* (contador por shader + audio) si aparece un caso de uso.
- **ControlP5 `.ser`**: formato de serialización Java; los presets deben ir a Mongo (§5.10).

---

## 7. Riesgos y deuda detectadas (a resolver antes o junto con lo nuevo)

### 7.1 En el proyecto actual (B)

| Riesgo | Detalle | Impacto |
|---|---|---|
| `p5-effect.js` es global | Se carga en 16 páginas; `AUTO_MODE`, `WORDS` y las físicas afectan todo el sitio, no sólo el editor | Alto: un default en `AUTO_MODE` o muchas partículas degrada todas las páginas |
| Timeline no persiste | `timelineLayers` no está en `CFG` ni en el POST de config; sólo `FLYER_WORDS` se guarda | Alto: se pierde el trabajo al recargar |
| `startTime`/`duration` ignorados | `evaluateTimelineAtTime()` interpola sobre **toda** la línea de tiempo; el clip dibujado sugiere una ventana que no se respeta | Medio: comportamiento confuso |
| Atajo "Espacio" inexistente | El tooltip del play dice `(Espacio)` pero el `keydown` sólo maneja `F`, `P`, `R` | Bajo pero visible |
| Dos fuentes de verdad de palabras | `CFG.WORDS` (localStorage + BotConfig) y la colección `ParticleWord`, sincronizadas por heurísticas `length >= 20` | Medio: estados divergentes entre navegadores |
| Migración de `LETTER_SPACING` | Pasó de escala `0.0–3.0` a píxeles `0–100` sin migrar valores guardados | Medio: configs viejas quedan con espaciado mínimo |
| `AUTO_INTERVAL_SEC` en frames | `Math.max(30, intervalSec * 60)` atado a 60 fps | Bajo/Medio |
| Repulsión `O(n²)` | `applyRepulsion` recorre todo el array por partícula | Medio: es la razón de ser del gemelo GPU |
| WordParticles no recicladas | Cada click suma N partículas nuevas | Medio: pico de conteo (§5.1) |

### 7.2 En `LetterMaster_funcional` (A) — para no copiar el bug

- `displaynormal()` tiene **comentadas** las llamadas a `textFont()`; `colorrandom` (hue rotate) tampoco se aplica por esa vía. El modo sin shader se ve distinto y peor que el modo con shader.
- `initGUI_shaders()` (`STfeed`, `STnoise`, `noisespeed`, `feedspeedy`, `STimage`, `umbral`, `noiseScale`, `feedbackScale`, `cirsize`) **nunca se invoca** ni se agrega al acordeón: es un grupo completo de controles muertos.
- **Off-by-one en el corazón del sistema**: `Sopadeletras.asignarpalabra()` recorre el pool con `for (int i = letras.size()-1; i > 0; i--)` → **la letra del índice 0 nunca se reutiliza** (siempre se descarta candidata y eventualmente se crea una nueva). El mismo patrón `i > 0` aparece en `removeNonSelectLetrasFromAgenda()` y en `Attractor.update(float x, float y)`. Al portar el reciclado hay que usar `i >= 0`.
- El atractor no limita la distancia mínima (`constrain(d, 5.0, 25.0)` comentado) → la fuerza puede explotar cuando una letra pasa cerca del atractor.
- `proyectoactivo` arranca en `1` (Agenda) mientras el comentario dice "empatar con el GUI" → el sketch abre en un módulo distinto del que el usuario espera.
- Rutas de assets rotas o faltantes: `data/sound/` está **vacía** aunque `loadAudio()` carga 9 `.wav`; los `videosfondo/pantallaprincipalvideoN.mp4` no están en el repo; el shader del contador se referencia como `shaders/shcontador.frag` mientras otros están bajo `data/shaders/`.
- Deuda de estilo: `println` de debug por todos lados, loops anidados con `modulos.get(i).sopas.get(k)` repetidos tres veces en Agenda, y comentarios que documentan bugs ("CÓMO MIERDA ESTO FUNCIONA"). Es un archivo de trabajo, no una librería.
- **Aliasing de `PVector` en la "fricción"**: `PVector friction = p.speed;` no es una copia, y `applyForce()` muta su argumento → la velocidad se destruye cada frame (§10.4). Es el bug de física más consecuente del sketch.
- **Acumulador de aceleración sin reset**: `accel` sólo se multiplica por 0.99 y nunca vuelve a 0, lo que da una ganancia efectiva de ~100× y comprime el rango útil de los sliders a `f ∈ (0, 0.05]` (§10.2). No es un bug de sintaxis, pero sí una decisión que hace que los sliders no sean proporcionales.
- **Agenda rota por parámetros en 0**: `agenda_sepy`, `agenda_globalx` y `agenda_globaly` nunca se asignan (sus widgets están comentados), así que `moverslider()` superpone los tres módulos visibles en (0,0) — y `proyectoactivo` arranca en 1, o sea en ese módulo.
- El `Attractor` con `PVector.prevpos` que nunca se inicializa con el mismo valor (`prevpos = new PVector(0,0)` y `pos = (-500,-500)`) hace que el primer `apdist` sea gigante (aunque el resultado no se usa).
- `speedlimit` se aplica dentro de `Letra.update()`, **antes** de recibir las fuerzas del frame; y las fuerzas del atractor se aplican aún más tarde en `updateall()`. Todo el sistema tiene un frame de retardo entre fuerza e integración.

---

## 8. Roadmap sugerido

**Fase 1 — Quick wins (sin tocar arquitectura)**
1. `DEBUG` overlay + extracción de `simulate()` fuera de `draw()`.
2. Multilínea + caja tipográfica en `spawnWordParticles` (`LETTERSPACE_Y`, `BOX_WIDTH`) — incluye migración de `LETTER_SPACING`.
3. `AUTO_INTERVAL_SEC` en tiempo real + barra de progreso opcional.
4. Reciclado de letras del pool ambiental.
5. Atajo `Espacio` para play/pausa y persistencia del timeline en `CFG` (resolviendo el clip `startTime/duration` mientras se está ahí).

**Fase 2 — Composición y tipografía**
6. Selector de fuentes (webfonts) con relayout en caliente.
7. Grupos/contenedores con `relativepos` y animación por grupo.
8. Tipos de glifo extra: línea, rect, imagen.
9. Presets versionados con backup y "Guardar como…".
10. Unificar `CFG.WORDS` ↔ `ParticleWord` (una sola fuente de verdad, con la colección como canónica).

**Fase 3 — Estética GPU**
11. Feedback con shader de doble pasada (normal + invertida) sobre la ruta GPU, con `feedbackScale`/`Rotate`/`Force`/`letterOpacity`.
12. Migrar `applyRepulsion` y el atractor a la ruta GPGPU (o limitar candidatos por grilla espacial en CPU) — es el término dominante, por encima del debate reciclar-vs-crear.
12b. Reemplazar `splice` + `new` por un **object pool / free-list** con swap-and-pop, para eliminar asignaciones y `memmove` sin renunciar al efecto de materialización (§5.1.1 f).
13. Mezcla configurable de fondo (sum / multiply / screen) al estilo `agregarfondo.glsl`.

**Fase 4 — Instalación y operación en vivo**
14. Multi-atractor táctil (N dedos) y opcionalmente MediaPipe Hands.
15. Canal socket.io de control en vivo + adaptador OSC opcional.
16. Modo "contenido" (agenda / slides) alimentado por la API del sitio.
17. Export PNG del frame actual y `captureStream()` para salida externa.

---

## 9. Parámetros: inventario exacto y correspondencia

### 9.1 Controles de LetterMaster (44 widgets instanciados)

| Grupo | Control | Tipo | Rango | Default | Efecto real |
|---|---|---|---|---|---|
| Forces | `Masaatractor` | slider | 0–10000 | **1500** | Está en el **numerador** de la fuerza del atractor (`G·M/d²`); no es la masa de la letra |
| Forces | `speedlimit` | slider | 0–20 | **5** | `speed.limit(speedlimit)` → velocidad tope en px/frame |
| Forces | `accel_orden` | slider | 0–20 | 5 | **MUERTO**: sólo se declara, nunca se lee en ningún `.pde` |
| Forces | `atractorforce` | slider | 0–10 | **10** | Multiplicador adimensional de la fuerza del atractor |
| Letras | `Frase` | textfield | — | `""` | Texto de la sopa (se relee cada frame) |
| Letras | `mostrarletras` | toggle | — | false | Invierte `letterfade`: todas las letras a full vs. sólo la frase |
| Letras | `fontsize` | slider | 1–150 | **30** | `global_fontsize` |
| Letras | `separacioneny` | slider | 0–600 | **80** (var init 60; Sopa init 100) | `letterspacey`: salto de línea |
| Letras | `aperturax` | range (2 handles) | 0–width | **width·1/7 … width·5/8** | `sepxstart` / `sepxlimit`: caja de la frase en X |
| Letras | `letras_poosy` | slider | 0–height | 0 | Y del bloque (sólo proyecto 2) |
| Letras | `colorletra` | ColorWheel | RGB | **(50,220,225)** | Color de las letras |
| Letras | `colorrandom` | toggle | — | false | Hue rotate por letra |
| Letras | `tipografia` | list | 14 fuentes | **idx 8** (Fhmgr Expnd Normal) | Fuente global |
| Render | `spoutactive` | toggle | — | false | Salida Spout |
| Render | `fondoactivo` | toggle | — | true | Fondo activo |
| Render | `proyectoactivo` | list | 3 opciones | **1 (Agenda)** | Módulo activo |
| Render | `kinect1`, `kinect1_offsetx/y`, `kinect1_umbral` | toggle + 3 ranges | 0–1920 / 0–30000 | — | **Muertos** (Kinect comentado) |
| Render | `kinect2`, `kinect2_offsetx/y`, `kinect2_umbrallimit` | toggle + 3 ranges | 0–1920 / **0–10** | — | **Muertos**, y con rango absurdo (0–10 para un umbral de 0–200) |
| Logo | `logosize` | slider | 0–2 | **0.25** | Escala del logo |
| Logo | `rotarlogo` | toggle | — | false | Rota el logo con `millis()` |
| Efectos | `EFECTO` | toggle | — | **true** | `RENDERSHADER`: prende el pipeline GLSL |
| Efectos | `letteropacity` | slider | 0–1.5 | **1.0** | Opacidad de la capa de letras en `sh.glsl` |
| Efectos | `feedback_force` | slider | 0–2.5 | **0.9** | Peso de la capa previa (pasada normal) |
| Efectos | `feedback_force_inverted` | slider | 0–2.5 | **1.1** | Idem pasada invertida |
| Efectos | `feedback_scale` | slider | 0–2.5 | **0.99** | Zoom del feedback |
| Efectos | `feedback_rotate` | slider | −π…π | **0** | Rotación del feedback |
| Secuencia | `duracionsecuencia` | slider | 0–60000 | **15000 ms** | Tiempo por frase |
| Secuencia | `secuenciaactiva` | toggle | — | false | Rotación automática de frases |
| Secuencia | `showsecuencia` | toggle | — | true | Barra de progreso |
| Standart | `Frase_Random` | bang | — | — | Frase aleatoria |
| PP | `pp_video` | toggle | — | true | Videos de fondo |
| PP | `itemselect` | list | — | — | Sopa seleccionada |
| PP | `savejson` / `loadjson` / `addnewsopa` / `addnewsopa_random` | bangs | — | — | Acciones de persistencia |
| Render | `GUI_savejson` / `GUI_loadjson` | bangs | — | — | Preset global |

**Controles en código muerto:** `initGUI_shaders()` define 9 sliders (`STfeed` 0.7–2.0/0.98, `STnoise` 0–20/18, `noisespeed` −1…1, `feedspeedy` −0.01…0.01, `STimage` 0–1/0.7, `umbral` 0–0.2/0.15, `noiseScale` 0–0.5/0.15, `feedbackScale` 0.9–1.1/1.0, `cirsize` 0–0.5/0.4) y **la función nunca se llama**. Además hay ~9 listeners de Agenda (`agenda_sepy`, `agenda_globalx/y`, `agenda_titulox/y`, `agenda_margin`, `agenda_fontsize`, `agenda_titulo/subtitulo_fontsize`, `agenda_linea_y`) **sin widget**, porque el grupo `G_agenda` y `initGUI_agenda()` están comentados.

> **Consecuencia concreta de eso último:** `agenda_sepy`, `agenda_globalx` y `agenda_globaly` quedan en 0 de por vida. `Agenda.moverslider()` usa esos valores para posicionar los módulos visibles, así que **los tres módulos del carrusel se dibujan superpuestos en (0,0)**, y `proyectoactivo` arranca en 1 (Agenda). Es decir: el sketch abre en el módulo que está visualmente roto.

**Constantes físicas NO expuestas en LetterMaster** (no se pueden ajustar sin recompilar):

| Constante | Valor | Dónde |
|---|---|---|
| `mass` | **40** | `Letra.pde`, divisor de toda fuerza |
| `maxspeed` | **20** | `Letra.pde`, sólo en el `desired` de `seek`/`arrive` |
| `maxforce` | **10** (×4 = **40** en `seek`) | `Letra.pde` |
| `rand` | **0.5** | Magnitud del ruido blanco por frame |
| Damping | **0.99** en `accel` y en `speed` | `Letra.update()` |
| `Fricvar` | **2** (→ multiplicador 1.0) | Bloque de "fricción" en `Sopa.update()` |
| Alpha | **±10 / frame**, clamp `[0,255]` o `[80,255]` | `Letra.update()` |
| `bgdecay` | **10** | Alpha del rect de limpieza de fondo |

### 9.2 Parámetros de Partículas (49 claves de `CFG`, 42 expuestas en el panel)

| Grupo | Claves | Nº |
|---|---|---|
| Físicas y comportamiento | `MAX_SPEED` 4, `MAX_FORCE` 0.6, `MOUSE_FORCE_MULT` 1.1, `MOUSE_FORCE_MIN` 0.2, `MOUSE_FORCE_MAX` 2, `REPULSION_RADIUS` 5, `DISPERSION_MIN` 0, `DISPERSION_MAX` 0.5, `SPAWN_RADIUS_MIN` 20, `SPAWN_RADIUS_MAX` 100, `SPAWN_INTERVAL_MS` 40, `SPAWN_COUNT_MIN` 1, `SPAWN_COUNT_MAX` 2, `LIFESPAN_DECAY_MIN` 1.0, `LIFESPAN_DECAY_MAX` 2.5 | 15 |
| Flowfield | `FLOWFIELD_ENABLED` false, `FORCE` 0.4, `GRID_X` 40, `GRID_Y` 40, `SCALE_X` 0.006, `SCALE_Y` 0.006, `SCALE` 0.006 (legado), `SPEED` 0.002, `SHOW_VECTORS` false | 9 |
| ASCII | `ASCII_ENABLED` true, `NOISE_ONLY` false, `OPACITY` 0.35, `CHAR_SIZE` 14, `GLYPH_SCALE` 0.85, `TILE` 3.0, `SPEED` 1.0 | 7 |
| Fondo / color | `BG_ALPHA` 50, `CHAR_BG_ENABLED` false, `CHAR_BG_COLOR` `#000000`, `CHAR_BG_OPACITY` 0.8, `COLOR_1..4` | 7 |
| Tipografía / layout | `TEXT_SIZE` 36 (legado), `TEXT_SIZE_MIN` 16, `TEXT_SIZE_MAX` 36, `LETTER_SPACING` **1.0** | 4 |
| Auto / Flyer | `AUTO_MODE` false, `AUTO_INTERVAL_SEC` 2.5, `FLYER_MODE_ENABLED` false, `FLYER_WORDS` `[]` | 4 |
| Datos | `WORDS` (~400), `CHARACTERS` | 2 |
| Sólo en runtime | `POS_X`, `POS_Y` (no están en `DEFAULT_CONFIG`; se agregan a `CFG` recién en el primer cambio) | 2 |

**Derivadas automáticamente (no editables):** `SPAWN_RADIUS_MIN` = 25 % de `SPAWN_RADIUS_MAX`; `LIFESPAN_DECAY_MIN` = 40 % de `LIFESPAN_DECAY_MAX`; `TEXT_SIZE` = `TEXT_SIZE_MAX`; `MOUSE_FORCE_MIN/MAX` sólo recortan `MOUSE_FORCE_MULT`; `DISPERSION_MIN` fijo en 0; `FLOWFIELD_SCALE` legado.

Tres inconsistencias concretas:

- `LETTER_SPACING`: default **1.0** en `DEFAULT_CONFIG` pero el input del HTML declara `value="10"`; como `syncInputsFromConfig()` pisa el DOM con el valor de `CFG`, el valor efectivo es **1 px**, no 10.
- `POS_X`/`POS_Y`: rango duro **0–1920 / 0–1080** en el HTML. En un viewport más grande, `updatePosSliders()` escribe valores fuera de rango y el slider se recorta.
- `TEXT_SIZE_MIN` (16) y `TEXT_SIZE_MAX` (36) sí distinguen letras sueltas de palabras, pero una vez que el usuario toca `TEXT_SIZE_MAX` el `applyConfigChange` copia el valor a `TEXT_SIZE` legado.

### 9.3 Correspondencia parámetro a parámetro

| Concepto | LetterMaster | Partículas p5 | ¿Porte 1:1? |
|---|---|---|---|
| Velocidad tope | `speedlimit` 0–20, def. **5 px/frame** | `MAX_SPEED` 0.5–15, def. **4** (palabras: `max(8, ×2)` = **8**) | ✅ Misma unidad |
| Fuerza máxima | `maxforce` = **10** fijo (×4 en `seek`) | `MAX_FORCE` 0.1–2, def. **0.6** (palabras ×1.5 = **0.9**) | ❌ **No comparable** (§10.2) |
| Masa | **40**, fija | no existe | ❌ Modelo distinto |
| Atractor de cursor | `Masaatractor` + `atractorforce` | **no existe** | ❌ Falta la función entera |
| Ruido / dispersión | `rand = 0.5`, **continuo por frame** | `DISPERSION_MAX` 0.5, **sólo en la velocidad inicial** | ❌ Semántica distinta |
| Amortiguación | **0.99** fijo en accel y speed | ninguna; frena por `slowRadius` 60, ×0.85 a d<18, ×0.35 a d<3 | ❌ Mecanismo distinto |
| Repulsión entre letras | **no existe** | `REPULSION_RADIUS` 0–40 def. **5**, fuerza 0.6 | ❌ Sólo en p5 |
| Campo de flujo | no (ruido blanco) | `FLOWFIELD_*` fuerza 0.4 / grilla 40 / escala 0.006 / vel. 0.002 | ❌ Sólo en p5 |
| Salto de línea | `separacioneny` 0–600 def. **80** | **no existe** | ❌ Falta |
| Caja en X | `aperturax`, 2 handles, def. **width·1/7 … width·5/8** | `POS_X`, 1 valor, def. 960 | ⚠️ Falta el ancho |
| Tamaño de letra | `fontsize` 1–150 def. **30** (global) | `TEXT_SIZE_MIN` 16 / `TEXT_SIZE_MAX` 36 | ⚠️ p5 distingue dos |
| Spacing horizontal | implícito = `textWidth(c)` | `LETTER_SPACING` 0–100, def. real **1 px** | ⚠️ p5 agrega gap |
| Color | 1 ColorWheel + `colorrandom` | 4 colores + gradiente, sin ciclo temporal | ⚠️ Combinar |
| Vida de la palabra | **infinita** (persiste hasta reasignar) | `holdTime` 80 frames + `decay` 2.2 → **se autodisuelve ~3,3 s** | ❌ Comportamiento opuesto |
| Fade | alpha ±10/frame, clamp [0,255] o [80,255] | `lifespan` 255 con decay 1–2.5 + scale-in al 15 % | ❌ Distinto |
| Bordes | **rebote elástico** (invierte speed y accel) | nada (o wrap si hay flowfield) | ❌ Distinto |
| Fondo | `bgdecay` 10 **o** pipeline GLSL | `BG_ALPHA` 0–255 def. 50 | ⚠️ El GLSL es otro sistema |
| Tiempo | `duracionsecuencia` 0–60000 **ms** | `AUTO_INTERVAL_SEC` 0.8–7 **→ frames** (`×60`, mín. 30) | ❌ Unidad distinta |
| Reproducción | `secuenciaactiva` (bool) | `AUTO_MODE` (bool) | ✅ Equivalente |

---

## 10. Física: comparación ecuacional

Son **dos modelos distintos**, no dos calibraciones del mismo modelo.

### 10.1 Integración por frame

**LetterMaster** (`Letra.update()` + `Sopa.update()`):

```java
// 1) INTEGRAR  (dentro de Letra.update())
speed += accel;
speed.limit(speedlimit);      // clamp global
accel *= 0.99;                // decaimiento IIR — NUNCA se resetea a 0
speed *= 0.99;
pos   += speed;
checkEdges();                 // rebote: invierte speed.x/y Y accel.x/y
if (!select) accel += random2D() * random(0.5);   // ruido térmico

// 2) APLICAR FUERZAS  (después, en Sopa.update())
if (dist > 2) seek(target); else arrive(target);  // steer ≤ maxforce*4 / maxforce
applyForce(f) { accel += f / 40; }                // masa = 40
calcularatraccion(attractor);                     // en updateall(), aún más tarde
```

**Partículas p5** (`Particle.update()` / `WordParticle.update()`):

```js
// fuerzas primero (en draw())
acc.add(flowfieldForce);   // si FLOWFIELD_ENABLED
acc.add(separationSteer);  // limitado a MAX_FORCE
// luego integrar
vel.add(acc);  vel.limit(MAX_SPEED);  pos.add(vel);  acc.mult(0);  // ← RESET
lifespan -= decay;
```

### 10.2 La diferencia que invalida cualquier traducción de valores

`accel` en LetterMaster **nunca se pone en cero**: sólo se multiplica por 0.99. Es un **acumulador IIR** (pasabajos de primer orden) con constante de tiempo ~100 frames. En régimen estacionario, una fuerza constante `f` (después de dividir por la masa) produce:

```
accel_ss = f / (1 − 0.99) = 100 · f
```

Es decir: **una ganancia de 100×** sobre la fuerza de un frame. Y como `speed` se integra con ese `accel` y luego se recorta con `speed.limit(speedlimit)`, el desplazamiento efectivo por frame es:

```
desplazamiento ≈ min(100 · f, speedlimit)
```

Con los defaults (`speedlimit = 5`) el **rango útil de cualquier fuerza es `f ∈ (0, 0.05]`**: por debajo la letra no se mueve, por encima queda clavada a velocidad tope. El sistema se comporta casi como **binario** (quieta o a 300 px/s), no como un muelle proporcional.

En cambio, en p5 `acc = 0` cada frame, así que una fuerza es literalmente **una aceleración en px/frame²** y tiene efecto sólo durante ese frame. Los sliders son directamente proporcionales a la respuesta.

| Magnitud | LetterMaster | Partículas p5 | Nota |
|---|---|---|---|
| Unidad de fuerza | `f/40`, acumulada ×100 | px/frame² directo | **Incompatibles** |
| Fuerza del atractor a 20 px | `375/d² = 0.94` → ×100 = 94 → clamp | no existe | Satura siempre |
| Fuerza del atractor a 86 px | `375/d² = 0.05` → ×100 = 5 = clamp | no existe | **Radio de saturación** |
| Fuerza del atractor a 500 px | `375/d² = 0.0015` → 0.15 px/frame | no existe | Deriva suave |
| `seek` (palabras) | `steer ≤ 40/40 = 1.0` → ×100 → clamp | `≤ 0.9` | Ambas saturan su tope |
| Repulsión | no existe | `≤ 0.6` | Sólo p5 |
| Flowfield | no existe | `0.4` | Sólo p5 |
| Velocidad tope | 5 px/frame (300 px/s) | 4 ambientales / 8 palabras (480 px/s) | Comparable |

### 10.3 Nueve diferencias cualitativas

1. **Atractor continuo vs. ausencia de atractor.** LetterMaster tiene un campo de fuerza permanente sobre **todas** las letras (incluidas las que forman la palabra). En `particulas.html` el mouse **sólo genera partículas y elige palabras**: no atrae nada. El nombre "Palabras de Click (Atractor)" del panel describe los *targets* de las `WordParticle`, no un campo físico. (La versión GPU sí tiene `u_mouse`, `u_mouseForce`, `u_mouseRadius`.)
2. **Acumulador IIR vs. impulso por frame** (§10.2).
3. **Rebote elástico vs. sin bordes.** LetterMaster invierte `speed` **y `accel`**, así que el acumulador también invierte: cerca de los bordes puede quedar oscilando. p5 no tiene bordes (las partículas salen y mueren, o hay wrap con flowfield).
4. **Fade por estado vs. vida por decaimiento.** El alpha de LetterMaster depende de `select` y se mueve ±10/frame hacia un clamp: es un **estado de pertenencia a la frase**. El de p5 depende de `lifespan`/`decay`: es una **vida útil**.
5. **Palabra permanente vs. palabra efímera.** En LetterMaster una frase formada **se queda** hasta que se asigna otra. En p5 toda `WordParticle` se autodisuelve (`holdTime` 80 frames ≈ 1,3 s + `255/2.2` ≈ 1,9 s ≈ **3,3 s de vida total**). Para un uso tipo infografía/agenda esto es el bloqueante principal.
6. **La palabra compite con el atractor (A) vs. está aislada (B).** En A, `calcularatraccion()` recorre **todo** el pool, así que las letras del cartel también son arrastradas por el cursor y pelean con su target (de ahí la necesidad del switch `dist > 2 ? seek : arrive`). En B, `WordParticle` no recibe repulsión ni flujo: su única fuerza es el `steer` al target.
7. **Repulsión entre letras.** LetterMaster **no tiene ninguna** separación entre partículas (las letras se pueden amontonar). p5 tiene un `separation` clásico de Reynolds (radio 5 px, fuerza 0.6) sólo entre ambientales.
8. **Ruido blanco continuo vs. campo coherente.** A agrega un vector aleatorio nuevo **cada frame** a cada letra libre (`rand = 0.5`). B ofrece ruido blanco sólo como dispersión inicial y, opcionalmente, un **flowfield Perlin** que da corrientes persistentes.
9. **Masa vs. ausencia de masa.** Todo en A pasa por `/40`; en B no existe la masa.

### 10.4 El bug de "fricción" de LetterMaster y su efecto real

```java
float Fricvar = 2;
PVector friction = p.speed;   // ← NO es una copia: es el MISMO objeto
friction.mult(-1);            // speed queda invertida
friction.normalize();         // speed pasa a tener magnitud 1
friction.mult(Fricvar*0.5);   // speed queda EXACTAMENTE en 1.0
p.applyForce(friction);       // force.div(40) muta speed → 0.025, y accel += esa fuerza
```

Como `PVector` se asigna por referencia y `applyForce()` **muta su argumento** (`force.div(mass)`), esta "fricción" **destruye `speed` cada frame**, dejándola en 0.025 y con la dirección invertida. Efectos concretos:

- La **velocidad deja de ser un estado útil**: se aniquila y se reconstruye íntegramente desde `accel` en el frame siguiente. El movimiento pasa a ser un *acumulador con resorte*, no un boid con inercia.
- `seek()` calcula `steer = desired − speed`; con `speed ≈ 0`, eso degenera en `steer ≈ desired`, o sea **el `seek` se comporta como un atractor puro**, no como un emparejamiento de velocidades. Lo mismo suavizado en `arrive` por el `map(d, 0, 200, 0, maxspeed)`.
- Se aplica **sólo a letras seleccionadas**, así que hay dos físicas distintas conviviendo: las letras de fondo y las de la frase no se integran igual.
- Es coherente con el comentario del autor: *"ESTO ES LO MEJOR QUE LOGRE PARA QUE NO TEMBLARAN LAS PUTAS LETRITAS"*. La línea es un parche empírico contra el temblor, y el temblor es el síntoma esperable de un acumulador a 0.99 con ganancia 100×.

### 10.5 Qué implica esto para un porte de parámetros

- **Ningún valor se migra 1:1.** `Masaatractor = 1500` y `atractorforce = 10` no tienen equivalente numérico en p5; lo que hay que portar es la **forma de la curva** (`F/d²` con recorte de distancia mínima), no los números.
- Si se quiere el "look" de LetterMaster, conviene implementarlo como un **campo de fuerza explícito** en las unidades de p5 (`px/frame²`), con `MIN_DIST` para evitar la singularidad (que en A está desactivada) y sin acumulador: el acumulador 0.99 es lo que desacopla los sliders de la respuesta real.
- Lo que **sí conviene portar tal cual es el modelo de estados**, porque es lo que habilita el uso "infografía": palabra **persistente** (no autodisuelta), alpha por **pertenencia** en vez de por vida, y letras que **vuelven al pool** en lugar de morir.
- La única equivalencia realmente directa es la de **velocidad tope** (`speedlimit` 5 ↔ `MAX_SPEED` 4–8, misma unidad de px/frame).

---

## 11. Layout vertical y shader aplicado a las letras (verificación de código)

> Esta sección responde a dos puntos que quedaban subrepresentados en el resto del documento: **(a)** si LetterMaster tiene un sistema para *posicionar palabras abajo en función del largo*, y **(b)** cómo se aplica el shader **sobre las letras** (no sobre el fondo).

### 11.1 No existe un sistema de alineación inferior por largo de palabra

Búsqueda exhaustiva en los 19 `.pde` (`palabra.length()`, `textWidth`, `height-`, `bottom`, `abajo`, `ymin/ymax`): **no hay ninguna lógica que posicione la frase según el largo de la palabra**. El largo sólo influye de forma indirecta, a través del ancho acumulado de los caracteres.

Lo que sí existe es un layout **anclado arriba y cortado por espacios**:

`Sopa.pde::asignarpalabra()` (~líneas 305-345):

```java
float sepx = sepxstart;               // borde izquierdo de la caja
index = 0; sepy = 0;
...
p.sepx = sepx;  p.sepy = sepy;        // target horizontal / offset de línea
sepx += textWidth(p.c);
if (sepx > sepxlimit && palabra.charAt(constrain(index,0,len-1)) == ' ') {
  sepx = sepxstart;                   // nueva línea
  sepy += letterspacey;               // baja UNA línea
}
```

`Sopa.pde::update()` (~línea 263):

```java
mouse.set(p.sepx, absolutey + p.sepy/2);
```

Comportamiento exacto:

| Aspecto | Comportamiento real |
|---|---|
| Ancla vertical | `absolutey`, **fija**. La línea 1 queda ahí. |
| Crecimiento | Hacia **abajo**: línea n → `absolutey + n·letterspacey` |
| Pitch efectivo de línea | **`letterspacey/2`** por el `/2` del target, no `letterspacey` |
| Centrado vertical del bloque | **No** |
| Alineación al fondo | **No** |
| Corte de línea | Sólo si el **siguiente char es un espacio** |
| Palabra más larga que la caja | **Desborda** `sepxlimit` (nunca se parte) |
| `palabra.length()` en Y | **Nunca** se usa |
| En Standart | `updateall()` fuerza `absolutey = height/2` y `sepxstart = width*1.5/8` **cada frame** → la GUI no manda |

Controles relacionados (ninguno alinea al fondo):

- `separacioneny` → `letterspacey` (pitch vertical).
- `aperturax` (range de dos handles) → `sepxstart`/`sepxlimit` (banda horizontal).
- `letras_poosy` ("PP OS Y") → `PantallaPrincipal.setSelectedSopasPosY()` → `Sopaenmodulo.setPosY()` → mueve `absolutey` de la sopa seleccionada (sólo `proyectoactivo == 2`).

Lo más parecido a "posicionar hacia abajo" está en la **Agenda**, y es por **índice de slide**, no por largo de texto: `Agenda.moverslider()` ubica el módulo `i` en `absolutey + agenda_sepy·n` con `n ∈ {0,1,2}` según `num_slide`.

**Veredicto:** el "sistema para posicionar abajo según el largo" **no existe**; lo que hay es un corte por espacios con ancla fija. Por eso el porte útil para `particulas.html` no es "alinear abajo", sino **reflow multilínea real** (§5.2): medir, cortar por palabra, distribuir Y y exponer el **ancla** (top/center/bottom) como parámetro. `BOX_WIDTH` + `LETTERSPACE_Y` + `ANCHOR_Y` es un cambio contenido en `spawnWordParticles()` y cubre la caja tipográfica de A y bastante más.

### 11.2 El shader no es un post-proceso del canvas: se aplica **a la capa de letras**

Este es el punto que faltaba nombrar y es, probablemente, lo más "LetterMaster" del sketch. El flujo real es:

1. `Letra.display()` — si `RENDERSHADER` es `true`, llama a `displayforshaderrender()` y **dibuja cada letra dentro de `soparender`** (un `PGraphics` P2D), no en el canvas. Ahí también viven `isImage` / `isLine` / `isCuadrado`.
2. `shaderrender.pde::feedback()` corre **tres pasos**:

| Paso | Entrada | Shader | Salida |
|---|---|---|---|
| A | `render=soparender` (tinta sobre **negro**), `prev=sopafinal` | `feedbacksopa/sh.glsl` | `sopafinal` |
| B | `render=soparender` (tinta sobre **blanco**), `prev=sopafinal_inverted` | `feedbacksopa/sh_inverted.glsl` | `sopafinal_inverted` |
| C | `rendersopa`, `rendersopa_inverted`, `fondo` | `agregarfondo.glsl` (sólo si `fondoactivo`) | `final_render` |

3. Uniforms vivos por frame (`shaderrender.pde`, líneas 97-101 y 130-134): `prev`, `render`, `resolution`, `time = millis()*0.001`, `letteropacity`, `feedbackforce`, `feedback_scale`, `feedback_rotate`.

**Núcleo de `sh.glsl`** (esto es *toda* la estética; el resto del archivo es un template con funciones muertas):

```glsl
vec4 fig = texture2DRect(render, uv);              // letra de ESTE frame
puv = scale(vec2(feedback_scale)) * (uv-0.5);      // zoom del muestreo
puv = rotate2d(feedback_rotate) * puv;             // rotación del muestreo
vec4 prev = texture2DRect(prev, puv+0.5);          // frame ANTERIOR re-muestreado
float n = snoise(vec2(uv.x*20., uv.y*20.+time))*0.6+0.9;
fin = fig.rgb*letteropacity + prev.rgb*feedbackforce*n*(1.0-fig.rgb);
```

Dos detalles que definen el look y hay que entender antes de portarlo:

- **`(1.0 - fig.rgb)` hace que las letras tapen/borren la estela.** La memoria sólo sobrevive donde **no** hay tinta. No es un `trail` que suma encima de las letras: las letras **recortan luz** del rastro. Eso es precisamente lo que no da un `BG_ALPHA` plano.
- **`feedback_scale = 0.99`** re-muestrea el frame anterior ~1% hacia adentro → zoom infinito hacia el centro; `feedback_rotate` lo gira → vórtice. `feedbackforce ≈ 0.9` decae; cerca de 1.0 → memoria casi infinita; `> 1` (invertida, 1.1) → gana brillo.

**`sh_inverted.glsl` es otro efecto**, no un espejo: usa umbral `limit = 0.6`, atenúa `fig.rgb *= 0.7`, y si algún canal queda por debajo pinta `1 - letteropacity`; si no, `prev*feedbackforce + n`. Es el halo/silueta invertida sobre blanco.

Controles en vivo (grupo **Efectos**: `initGUI_efectos()` **sí** se llama; no confundir con `initGUI_shaders()`, que está muerto):

| Slider | Rango | Default | Efecto |
|---|---|---|---|
| `EFECTO` (toggle) | — | on | `RENDERSHADER` on/off |
| `letteropacity` | 0–1.5 | 1.0 | tinta de la letra sobre la estela |
| `feedback_force` | 0–2.5 | 0.9 | decaimiento de la memoria (pasada A) |
| `feedback_force_inverted` | 0–2.5 | 1.1 | idem pasada B |
| `feedback_scale` | 0–2.5 | 0.99 | zoom del feedback |
| `feedback_rotate` | −π..π | 0 | rotación del feedback |

Y `reloadShaders()` con la tecla `s` recarga los `.glsl` **en caliente** (live-coding en montaje).

**Deuda de este módulo** (a no copiar):

- `sh.glsl` arrastra ~150 líneas de `voronoi`, `fbm`, `poly`, `def`, `cir`, etc. **sin usar**; toda la matemática que importa es `snoise`.
- `sh_inverted.glsl` y `magnify.glsl` son copias casi idénticas (≈95% duplicado); `magnify()` no se llama.
- `float letteropacity;` se declara **sin inicializar** (0.0) y depende de que ControlP5 escriba 1.0.
- `agregarfondo.glsl` sólo define salida para `proyectoactivo == 1` y `== 2`; con `proyectoactivo == 0` (Standart) queda `fin = vec4(0.)` → **negro**, y `feedback()` lo usa igual si `fondoactivo`.

**Contraste con `particulas.html`:** hoy **no hay ningún post-proceso sobre la capa de letras**. `ascii-shader-bg.js` es un shader de **fondo**, en otro canvas y con otra semántica; `BG_ALPHA` es un fade plano sin memoria espacial. El feedback sobre letras es, entonces, una capacidad realmente faltante, ya priorizada en §5.6 como P1.

**Cómo se portaría:** dos FBO *ping-pong* que acumulan, muestreando el target anterior con `scale`/`rotate` y mezclando `letters*letterOpacity + prev*feedbackForce*(1-letters)`. La infraestructura WebGL2 + FBO + recarga en vivo ya existe en `ascii-shader-bg.js`, y los 4 parámetros entran directo al panel. Dos cuidados: (1) son 1–2 passes full-screen por frame, barato en desktop y caro en móvil → resolución escalada y fallback a `BG_ALPHA` en el tier bajo; (2) hacerlo en la ruta GPU (`gpu-particles.js`) evita sumar costo a la CPU.

### 11.3 `aperturax`: qué se supone que hace y por qué los dos handles desconciertan

`cp5.addRange("aperturax")` no es un slider con dos valores por error: es un **control de rango** de ControlP5 con dos handles, y existe porque define **los dos bordes de la columna tipográfica**:

| Handle | `arrayValue` | Variable | Rol |
|---|---|---|---|
| Izquierdo | `0` | `sopa.sepxstart` | **origen de cada línea** (margen izquierdo de la caja) |
| Derecho | `1` | `sopa.sepxlimit` | **punto de corte** (margen derecho; dispara el salto si el siguiente char es espacio) |

`GUI_listeners.pde`:

```java
if (theEvent.isFrom("aperturax")) {
  int var1 = int(theEvent.getController().getArrayValue(0));   // izquierda
  int var2 = int(theEvent.getController().getArrayValue(1));   // derecha
  sopa.sepxstart = var1;
  sopa.sepxlimit = var2;
  sopa.updateValues();
  info2.setSelectedSopasAperturaX(var1, var2);
}
```

O sea: **no son dos comandos, es una caja** ("apertura" = ancho útil de la columna). El problema es que en la práctica no se comporta como una caja:

1. **El handle izquierdo no persiste en Standart.** `updateall()` fuerza cada frame:

   ```java
   sopa.absolutey = height / 2;
   sopa.sepxstart = width*1.5/8;   // ← pisa el handle izquierdo
   ```

   Al arrastrar funciona (el listener hace `updateValues()`), pero **cualquier relayout posterior** (tipear en "Frase", `Frase_Random`, tecla `p`) vuelve a `width*1.5/8`. El handle derecho (`sepxlimit`) no se toca nunca → sólo el derecho es realmente operativo. De ahí la sensación de "dos comandos que hacen cualquier cosa".

2. **Los defaults del rango no llegan a la sopa.** `initGUI()` corre **antes** de `initSopaPrincipal()` (ver `setup()`), así que cuando se crea el `addRange` la variable `sopa` todavía es `null`. El comentario del propio autor lo delata:

   ```java
   // disable broadcasting since setRange and setRangeValues will trigger an event
   //.setBroadcast(false)
   ```

   Si el evento disparara en el constructor, `sopa.sepxstart = var1` tiraría NPE. Como el sketch no crashea, el `setRangeValues(width*1/7, width*5/8)` queda **puramente cosmético** hasta el primer arrastre. El valor real lo fija el constructor: `sepxstart = pos.x - textboxwidth/2`, `sepxlimit = pos.x + textboxwidth/2` (con `textboxwidth = 320`) → en 1080×720 la caja arranca en **[380, 700]**, mientras la GUI muestra [154, 675].

3. **`anchorect` mezcla coordenada con ancho.** `asignarpalabra()` hace `anchorect = sepxlimit + margin` y después `anchorect` se pasa como `_ancho` a `sobreFrase()`. `sepxlimit` es una **x absoluta**, no un ancho; lo correcto sería `sepxlimit - sepxstart + margin`. La consecuencia es que el "empuje" de letras sueltas fuera de la caja usa un rectángulo equivocado (y depende del lado de la pantalla).

4. **En Pantalla Principal las sopas se pisan.** `aperturax` se guarda por sopa en `infografia2.json` (`sepxstart`, `sepxlimit`), pero `Modulo.setPos()` —que corre en cada `moverslider()`— los recalcula desde la posición del módulo:

   ```java
   s.sepxstart = abs_pos.x - s.textboxwidth/2;
   s.sepxlimit = abs_pos.x + s.textboxwidth/2;
   ```

   Así que el valor ajustado a mano se pierde en cuanto el carrusel avanza. La persistencia de apertura X es, en la práctica, decorativa.

**Veredicto para el porte:** en `particulas.html` conviene exponer **dos campos** (`BOX_LEFT`/`BOX_RIGHT`, o `BOX_WIDTH` + `BOX_LEFT`) en vez de un "range" de dos handles, porque en web el modelo natural es ancho + posición. Y hay que decidir explícitamente el modo de corte: por palabra (con fallback a corte por carácter si la palabra es más larga que la caja) en vez de "sólo si el siguiente char es un espacio".

---

## 12. Anexo A — Mapa de equivalencias conceptuales

| Concepto en LetterMaster | Equivalente en Particulas | Estado |
|---|---|---|
| `Letra` (boid) | `Particle` / `WordParticle` | ✅ existe |
| `Sopadeletras.asignarpalabra()` | `spawnWordParticles()` | ⚠️ sin reciclado ni wrap |
| `Attractor` / `calcularatraccion(lista)` | fuerza de mouse/touch | ⚠️ sólo un atractor |
| `sepxstart` / `sepxlimit` / `aperturax` | `POS_X` + `BOX_WIDTH` (falta) | ⚠️ parcial |
| `letterspacey` | `LETTERSPACE_Y` (falta) | ❌ |
| `global_font` / `tipografia` (14 fuentes) | `textFont('monospace')` | ❌ |
| `colorrandom` (hue rotate temporal) | color por partícula fijo | ⚠️ distinto |
| `isCuadrado` | `CHAR_BG_ENABLED` | ✅ mejor en B |
| `letterfade` (alpha 80–255) | `lifespan` / `decay` | ⚠️ distinto modelo |
| `sh.glsl` + `agregarfondo.glsl` | `BG_ALPHA` (+ `ascii.frag` de fondo) | ⚠️ falta feedback real |
| `Modulo` / `relativepos` | `timelineLayers[]` (plano) | ❌ falta jerarquía |
| `frases.txt` (270) | `CFG.WORDS` (~400 términos) | ✅ complementarios |
| `cp5.saveProperties` + backups | `BotConfig` + localStorage | ✅ mejor en B, sin backups |
| OSC `/agregarfrase` | — (socket.io disponible) | ❌ |
| Spout | `captureStream()` (posible) | ❌ |
| Kinect v1/v2 | MediaPipe Hands (posible) | ❌ |
| `isdebug` / `showdebug()` | FPS sólo en `letrasgpu` | ❌ |
| `updateall()` vs `draw()` | todo dentro de `draw()` | ❌ |
| Agenda / Pantalla Principal | Timeline (capas sueltas) | ⚠️ distinto enfoque |
| RedBull (contador + audio) | — | ❌ (no prioritario) |

## 13. Anexo B — Archivos clave para cada port

| Port | Archivos a tocar |
|---|---|
| Reciclado de letras, multilínea, debug, separación display/update, tipos de glifo | `public/js/p5-effect.js` |
| Fuentes, grupos/contenedores, presets, timeline persistente | `public/js/particulas.js` + `public/particulas.html` + `public/css/particulas.css` |
| Feedback shader de doble pasada | `public/js/ascii-shader-bg.js` (infra WebGL2 existente) y/o `public/lettesGPU/js/gpu-particles.js` |
| Palabras y config (fuente única de verdad) | `src/routes/public.ts` + `src/models/ParticleWord.ts` |
| Control en vivo | `server.ts` (socket.io ya presente) + `particulas.js` |
| Modo contenido (agenda) | `src/routes/eventos.ts` (datos) + timeline de `particulas.js` |

---

### Notas finales

- Nada del repositorio A fue modificado: la inspección fue de sólo lectura.
- El análisis de B se hizo sobre el estado del working tree (incluyendo los cambios sin commitear de timeline), no sobre `HEAD`.
- Los números de línea o identificadores citados son los del momento del análisis; si el archivo cambia, conviene revalidar antes de implementar.
