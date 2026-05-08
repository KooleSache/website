const path = require('path')
const fs = require('fs')
const Metalsmith = require('metalsmith')
const markdown = require('@metalsmith/markdown')
const permalinks = require('@metalsmith/permalinks')
const inplace = require('@metalsmith/in-place')
const layouts = require('@metalsmith/layouts')
const collections = require('@metalsmith/collections')
const discoverPartials = require('metalsmith-discover-partials')
const handlebarsTransform = require('jstransformer-handlebars')
const formatDate = require('../metalsmith-format-date-plugin')

// Layouts and partials in this project use .html extensions (e.g. default.html,
// home.html, head.html). jstransformer-handlebars only declares 'hbs' and
// 'handlebars' as input formats, which causes @metalsmith/layouts to skip files
// whose `layout: foo.html` doesn't match. Wrap the transformer to also accept
// `.html` so we don't have to rename every layout file.
const handlebars = Object.assign({}, handlebarsTransform, {
  inputFormats: ['hbs', 'handlebars', 'html']
})

const ROOT = path.resolve(__dirname, '..')
const metadata = require(path.join(ROOT, 'metadata'))
const config = require(path.join(ROOT, 'config'))

// Replacement for metalsmith-define: merge keys onto the metadata object.
function define(values) {
  return function (files, metalsmith, done) {
    Object.assign(metalsmith.metadata(), values)
    done()
  }
}

// Replacement for metalsmith-collections-addmeta: assign default metadata to
// every file in a named collection.
function addMetaToCollections(spec) {
  return function (files, metalsmith, done) {
    const meta = metalsmith.metadata()
    Object.keys(spec).forEach((name) => {
      const coll = (meta.collections && meta.collections[name]) || []
      coll.forEach((file) => {
        Object.keys(spec[name]).forEach((key) => {
          if (file[key] === undefined) file[key] = spec[name][key]
        })
      })
    })
    done()
  }
}

// Inline asset copy for ./img and ./app — replaces metalsmith-assets, which
// is unmaintained and assumes the old plugin signature.
function copyDir(srcRel, destRel) {
  return function (files, metalsmith, done) {
    const src = path.join(ROOT, srcRel)
    if (!fs.existsSync(src)) return done()
    const walk = (dir, prefix) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name)
        const rel = path.posix.join(prefix, entry.name)
        if (entry.isDirectory()) walk(abs, rel)
        else if (entry.isFile()) {
          files[path.posix.join(destRel, rel)] = {
            contents: fs.readFileSync(abs),
            mode: '0644'
          }
        }
      }
    }
    walk(src, '')
    done()
  }
}

function build({ production, cssFilename, jsFilename }) {
  const ms = Metalsmith(ROOT)
    .source(config.source)
    .destination(config.destination)
    .clean(false)
    .metadata(Object.assign({}, metadata, {
      config: Object.assign({}, config, { production }),
      assets: { css: cssFilename, js: jsFilename }
    }))
    .use(define(config))
    .use(formatDate())
    .use(collections({
      changelog: {
        pattern: 'changelog/**/*.md',
        sortBy: 'date',
        reverse: true,
        refer: false
      }
    }))
    .use(addMetaToCollections({
      changelog: { layout: 'page.html' }
    }))
    .use(markdown({
      html: true,
      typographer: true,
      linkify: true
    }))
    .use(permalinks())
    .use(copyDir('img', 'img'))
    .use(copyDir('app', 'app'))
    .use(discoverPartials({
      directory: '_includes',
      pattern: /\.html$/
    }))
    .use(inplace({
      transform: handlebars,
      pattern: '**/*.{html,md}'
    }))
    .use(layouts({
      transform: handlebars,
      directory: '_layouts',
      default: 'default.html',
      pattern: '**/*.html'
    }))

  return new Promise((resolve, reject) => {
    ms.build((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

module.exports = { build, ROOT }
