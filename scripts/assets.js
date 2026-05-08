const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const sass = require('sass')
const postcss = require('postcss')
const autoprefixer = require('autoprefixer')
const esbuild = require('esbuild')

const ROOT = path.resolve(__dirname, '..')
const SITE = path.join(ROOT, '_site')

function shortHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 20)
}

// esbuild plugin that turns SCSS imports from _js/index.js into no-ops.
// SCSS is compiled separately via Dart Sass.
const ignoreScssPlugin = {
  name: 'ignore-scss',
  setup(build) {
    build.onResolve({ filter: /\.scss$/ }, (args) => ({
      path: args.path,
      namespace: 'ignore-scss'
    }))
    build.onLoad({ filter: /.*/, namespace: 'ignore-scss' }, () => ({
      contents: '',
      loader: 'js'
    }))
  }
}

async function buildCss({ production }) {
  const entry = path.join(ROOT, '_sass', 'index.scss')
  const result = sass.compile(entry, {
    loadPaths: [path.join(ROOT, '_sass')],
    style: production ? 'compressed' : 'expanded',
    sourceMap: !production,
    silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin']
  })

  const processed = await postcss([autoprefixer()]).process(result.css, {
    from: entry,
    to: path.join(SITE, 'main.css'),
    map: !production && result.sourceMap ? { inline: true, prev: result.sourceMap } : false
  })

  fs.mkdirSync(SITE, { recursive: true })

  let filename = 'main.css'
  if (production) {
    filename = `main.${shortHash(Buffer.from(processed.css))}.css`
  }
  fs.writeFileSync(path.join(SITE, filename), processed.css)
  return filename
}

async function buildJs({ production }) {
  fs.mkdirSync(SITE, { recursive: true })
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, '_js', 'index.js')],
    outfile: path.join(SITE, 'main.js'),
    bundle: true,
    target: 'es2018',
    minify: production,
    sourcemap: !production,
    write: false,
    plugins: [ignoreScssPlugin]
  })

  const js = result.outputFiles.find(f => f.path.endsWith('.js'))
  const map = result.outputFiles.find(f => f.path.endsWith('.js.map'))

  let filename = 'main.js'
  if (production) {
    filename = `main.${shortHash(js.contents)}.js`
  }
  fs.writeFileSync(path.join(SITE, filename), js.contents)
  if (!production && map) {
    fs.writeFileSync(path.join(SITE, `${filename}.map`), map.contents)
  }
  return filename
}

module.exports = { buildCss, buildJs, SITE, ROOT }
