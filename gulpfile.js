var gulp = require('gulp');
var browserSync = require('browser-sync');
var cp = require('child_process');
var gutil = require("gulp-util");
var webpack = require("webpack");
var WebpackDevServer = require("webpack-dev-server");
var webpackConfig = require("./webpack.config.js");

var messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};

// Handle the error
function errorHandler (error) {
  console.log(error.toString());
  this.emit('end');
}

gulp.task("webpack-dev-server", function(callback) {
    // modify some webpack config options
    var myConfig = Object.create(webpackConfig);
    myConfig.devtool = "source-maps";
    myConfig.debug = true;
    myConfig.entry = myConfig.entry.concat([
        "webpack-dev-server/client?http://localhost:8080",
        "webpack/hot/dev-server"
    ]);
    myConfig.output.publicPath = "http://localhost:8080/assets/"
    myConfig.plugins.push(new webpack.HotModuleReplacementPlugin());

    // Start a webpack-dev-server
    new WebpackDevServer(webpack(myConfig), {
        //contentBase: "http://localhost:8080/assets/",
        publicPath: myConfig.output.publicPath,
        //port: 8081,
        hot: true,
        stats: {
            colors: true
        }
    }).listen(8080, "localhost", function(err) {
            if(err) throw new gutil.PluginError("webpack-dev-server", err);
            gutil.log("[webpack-dev-server]", "http://localhost:8080/webpack-dev-server/index.html");
        });
});

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll-build', function (done) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn('bundle', ['exec', 'jekyll', 'build'], {stdio: 'inherit'})
        .on('close', done)
        .on('error', errorHandler);
});

/**
 * Rebuild Jekyll & do page reload
 */
gulp.task('jekyll-rebuild', ['jekyll-build'], function () {
    browserSync.reload();
});

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['jekyll-build'], function() {
    browserSync({
        server: {
            baseDir: '_site'
        }
    });
});

/**
 * Watch scss files for changes & recompile
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function () {
    gulp.watch(['index.html', '*.md', '_includes/*.html', '_layouts/*.html', '_posts/*', '**/index.html'], ['jekyll-rebuild']);
});

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['browser-sync', 'watch', 'webpack-dev-server']);
//gulp.task('default', ['webpack-dev-server']);
