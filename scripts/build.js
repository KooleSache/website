const fs = require('fs')
const path = require('path')
const { buildCss, buildJs, SITE } = require('./assets')
const { build } = require('./metalsmith')

async function main() {
  const production = process.env.NODE_ENV === 'production'

  fs.rmSync(SITE, { recursive: true, force: true })
  fs.mkdirSync(SITE, { recursive: true })

  const [cssFilename, jsFilename] = await Promise.all([
    buildCss({ production }),
    buildJs({ production })
  ])

  await build({ production, cssFilename, jsFilename })
  console.log(`Built site to ${path.relative(process.cwd(), SITE)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
