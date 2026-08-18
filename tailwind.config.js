/** @type {import('tailwindcss').Config} */

// Varios módulos del frontend arman clases de Tailwind por interpolación
// (`text-${accentColor}-400`), así que el scanner no puede verlas en el código
// y hay que declararlas a mano. Los colores salen de:
//   js/index.js       accentColor / colors  -> cyan | orange | fuchsia
//   js/profile.js     color                 -> cyan | orange | magenta
//   js/edit-logic.js  colorMap / borderMap  -> cyan | orange | magenta
// `magenta` no existe en la paleta de Tailwind: esas clases nunca generaron
// CSS, tampoco con el CDN, así que no se listan.
const ACCENTS = ['cyan', 'orange', 'fuchsia'];

const dynamicClasses = ACCENTS.flatMap((c) => [
  // js/index.js — tarjetas del feed
  `text-${c}-400`,
  `hover:text-${c}-400`,
  `group-hover:text-${c}-400`,
  `border-${c}-500/30`,
  `hover:border-${c}-500/30`,
  `hover:bg-${c}-500`,
  // js/index.js — updateFilterStyles()
  `bg-${c}-500/10`,
  `border-${c}-500/40`,
  // js/profile.js — tarjetas del perfil
  `border-${c}-500/10`,
  // js/edit-logic.js — modal de edición
  `hover:border-${c}-500/50`,
  `file:bg-${c}-500/20`,
  `file:text-${c}-400`,
]);

// Sin `theme.extend`: el Play CDN corría con la configuración por defecto de
// Tailwind, así que cualquier extensión aquí cambiaría el render.
module.exports = {
  content: [
    './public/**/*.html',
    './public/js/**/*.js',
  ],
  theme: {
    extend: {},
  },
  safelist: dynamicClasses,
  plugins: [],
};
