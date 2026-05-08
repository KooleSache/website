const path = require('path')
const fs = require('fs')
const browserSync = require('browser-sync')
const chokidar = require('chokidar')
const { buildCss, buildJs, SITE, ROOT } = require('./assets')
const { build } = require('./metalsmith')

const production = false

async function fullBuild() {
  fs.rmSync(SITE, { recursive: true, force: true })
  fs.mkdirSync(SITE, { recursive: true })
  const [cssFilename, jsFilename] = await Promise.all([
    buildCss({ production }),
    buildJs({ production })
  ])
  await build({ production, cssFilename, jsFilename })
}

async function rebuildContent(bs) {
  const [cssFilename, jsFilename] = await Promise.all([
    buildCss({ production }),
    buildJs({ production })
  ])
  await build({ production, cssFilename, jsFilename })
  bs.reload()
}

async function rebuildCss(bs) {
  await buildCss({ production })
  bs.reload('main.css')
}

async function rebuildJs(bs) {
  await buildJs({ production })
  bs.reload()
}

function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

async function main() {
  await fullBuild()

  const bs = browserSync.create()
  bs.init({
    server: SITE,
    open: false,
    notify: false,
    logLevel: 'info',
    port: 3000,
    ui: false
  })

  const debouncedContent = debounce(() => rebuildContent(bs).catch(console.error), 100)
  const debouncedCss = debounce(() => rebuildCss(bs).catch(console.error), 50)
  const debouncedJs = debounce(() => rebuildJs(bs).catch(console.error), 50)

  chokidar.watch([
    path.join(ROOT, '_pages'),
    path.join(ROOT, '_layouts'),
    path.join(ROOT, '_includes')
  ], { ignoreInitial: true }).on('all', debouncedContent)

  chokidar.watch(path.join(ROOT, '_sass'), { ignoreInitial: true })
    .on('all', debouncedCss)

  chokidar.watch(path.join(ROOT, '_js'), { ignoreInitial: true })
    .on('all', debouncedJs)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
