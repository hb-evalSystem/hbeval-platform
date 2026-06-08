// postcss.config.js
// Tells PostCSS which plugins to run when processing globals.css.
// Tailwind generates the utility classes; autoprefixer adds vendor prefixes
// for cross-browser support. Both are devDependencies in package.json.
// Without this file, Next.js cannot process the @tailwind directives and the
// build fails with "Cannot find module 'autoprefixer'".
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
