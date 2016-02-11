var MemoryInputFileSystem = require('enhanced-resolve/lib/MemoryInputFileSystem')
var MemoryOutputFileSystem = require('webpack/lib/MemoryOutputFileSystem')
var tty = require('tty')
var path = require('path')
var webpack = require('webpack')
var WebpackDevServer = require('webpack-dev-server')

module.exports = function(config, devConfig) {
    var compiler = webpack(config)

    return function (files, metalsmith, done) {
        var server = new WebpackDevServer(compiler, devConfig);
        server.listen(devConfig.port || 8081, "localhost", function() {
            done()
        });
    }
}
