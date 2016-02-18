const webpack = require('webpack')
const metalsmith = require('metalsmith')
const debug = require('metalsmith-debug')
const markdown = require('metalsmith-markdownit')
const permalinks = require('metalsmith-permalinks')
const inplace = require('metalsmith-in-place')
const layouts = require('metalsmith-layouts')
const define = require('metalsmith-define')
const msWebpack = require('metalsmith-webpack')
const watch = require('metalsmith-watch')
const serve = require('metalsmith-serve')
const assets = require('metalsmith-assets')
const webpackDevServer = require('metalsmith-webpack-dev-server')
const collections = require('metalsmith-collections')
const remote = require('metalsmith-remote-json-to-files').default

const isProduction = process.env.NODE_ENV === 'production'
const metadata = require('./metadata')
const config = require('./config')
const webpackConfig = require('./webpack.config')

function cb(json) {
    return json.reduce((prev, curr) => {
        const key = 'changelog/' + curr.tag_name + '.md'
        const transformed = {}
        transformed[key] = Object.assign({}, {
            layout: 'page.html',
            collection: 'changelog',
            title: curr.tag_name,
            date: new Date(curr.created_at),
            contents: new Buffer(curr.body)
        })
        return Object.assign(prev, transformed)
    }, {})
}

const server = metalsmith(__dirname)
    .source(config.source)
    .destination(config.destination)
    .metadata(Object.assign(metadata, {
        config: Object.assign(config, {
            production: isProduction
        })
    }))
    .use(debug())
    .use(remote({
        url: 'https://api.github.com/repos/adanmayer/ColorSnapper2/releases',
        fetchOpts: {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'token c8930579e19220e1b8c39876476e06c94d7fa4c5'
            }
        }
    }, cb))
    .use(markdown({
        html: true,
        typographer: true,
        linkify: true
    }))
    .use(permalinks({
        pattern: ':permalink'
    }))
    .use(collections({
        changelog: {
            pattern: 'changelog/**/*.md',
            sortBy: 'date',
            reverse: true,
            refer: false
        }
    }))
    .use(define(config))
    .use(assets({
        source: './img', // relative to the working directory
        destination: './img' // relative to the build directory
    })).use(assets({
        source: './app', // relative to the working directory
        destination: './app' // relative to the build directory
    }))

if (!isProduction) {
    var myConfig = Object.assign({}, webpackConfig)
    myConfig.devtool = 'source-maps'
    myConfig.entry = myConfig.entry.concat([
        'webpack-dev-server/client?' + config.webpackUrl,
        'webpack/hot/dev-server'
    ])
    myConfig.output.publicPath = config.webpackUrl + '/'
    myConfig.plugins.push(new webpack.HotModuleReplacementPlugin())

    server
        .use(watch({
            paths: {
                '${source}/**/*': true,
                '_layouts/*': '**/*',
                '_includes/*': '**/*'
            }
        }))
        .use(serve())
        .use(webpackDevServer(myConfig, {
            port: config.webpackPort,
            host: config.webpackHost,
            hot: true,
            quiet: true,
            noInfo: true,
            stats: {colors: true}
        }))
} else {
    server
        .use(msWebpack(webpackConfig))
}

server
    .use(inplace({
        engine: 'handlebars',
        partials: '_includes'
    }))
    .use(layouts({
        engine: 'handlebars',
        directory: '_layouts',
        partials: '_includes'
    }))
    .build(function (err) {
        if (err) throw err
        console.log('Built web-site to ' + config.destination)
    })
