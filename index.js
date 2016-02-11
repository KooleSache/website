const metalsmith = require('metalsmith')
const markdown = require('metalsmith-markdownit')
const permalinks = require('metalsmith-permalinks')
const inplace = require('metalsmith-in-place')
const layouts = require('metalsmith-layouts')
const define = require('metalsmith-define')
const webpack = require('metalsmith-webpack')
const watch = require('metalsmith-watch')
const serve = require('metalsmith-serve')
const assets = require('metalsmith-assets')
const webpackDevServer = require('./metalsmith-webpack-dev-server')

const isProduction = process.env.NODE_ENV === 'production'
const metadata = require('./metadata')
const config = require('./config')
const webpackConfig = require('./webpack.config')

const server = metalsmith(__dirname)
    .source(config.source)
    .destination(config.destination)
    .metadata(Object.assign(metadata, {
        config: Object.assign(config, {
            production: isProduction
        })
    }))
    .use(markdown({
        html: true,
        typographer: true,
        linkify: true
    }))
    .use(permalinks({
        pattern: ':permalink'
    }))
    .use(define(config))
    .use(assets({
        source: './img', // relative to the working directory
        destination: './img' // relative to the build directory
    }))

if (!isProduction) {
    server
        .use(watch({
            paths: {
                '${source}/**/*': true,
                '_layouts/*': '**/*',
                '_includes/*': '**/*'
            }
        }))
        .use(serve())
        .use(webpackDevServer(webpackConfig, {
            port: 8081,
            contentBase: 'http://localhost:8081/',
            hot: true,
            proxy: {
                '*': 'http://localhost:8080'
            },
            // webpack-dev-middleware options
            quiet: true,
            noInfo: false,
            publicPath: 'http://localhost:8081/',
            stats: {colors: true}

        }))
} else {
    server
        .use(webpack(webpackConfig))
}

server
    .use(inplace({
        engine: 'handlebars',
        partials: '_includes'
    }))
    .use(layouts({
        engine: 'handlebars',
        directory: '_layouts',
        partials: '_includes',
        default: 'default.html'
    }))
    .build(function (err) {
        if (err) throw err;
        console.log('Built web-site to ' + config.destination)
    })
