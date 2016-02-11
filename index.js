const metalsmith = require('metalsmith')
const markdown = require('metalsmith-markdownit')
const permalinks = require('metalsmith-permalinks')
const layouts = require('metalsmith-layouts')
const define = require('metalsmith-define')
const metadata = require('./metadata')
const config = require('./config')

metalsmith(__dirname)
    .source(config.source)
    .destination(config.destination)
    .metadata(metadata)
    .use(markdown({
        html: true,
        typographer: true,
        linkify: true
    }))
    .use(permalinks({
        pattern: ':title'
    }))
    .use(layouts({
        engine: 'handlebars',
        directory: '_layouts',
        partials: '_includes',
        default: 'default.html'
    }))
    .use(define(config))
    .build(function(err) {
        if (err) throw err;
        console.log('Built web-site to ' + config.destination)
    });
