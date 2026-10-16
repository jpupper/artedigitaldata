/* Página SOLO OUTPUT: reproduce el proyecto del link con el reproductor del
   sistema (el mismo que usa flyer.html), que entiende palabras + imágenes +
   timeline y respeta el formato (viewportBase) guardado.

   - ?outputeffect=<id>  → reproduce ese proyecto
   - ?id=<id>            → igual
   El motor NO debe cargar el efecto por su cuenta (ver FSC_OUTPUT_PLAYER). */
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('outputeffect') || params.get('id');

    // Le avisa a js/particulas.js que el reproductor del sistema ya se ocupa
    window.FSC_OUTPUT_PLAYER = true;

    if (id) {
      window.FSC_PROYECTO_ID = id;
    }
  } catch (e) { }
})();
