var path = require("path");
var fs = require("fs");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var isProduction = process.env.NODE_ENV === 'production';
var cssLoaders = ["style-loader", "css-loader", "autoprefixer-loader?browsers=last 2 version"];
var scssLoaders = cssLoaders.concat(["sass-loader?imagePath=/_images&includePaths[]=./_sass"]);
var plugins = [new ExtractTextPlugin("[name].[hash].css")];

if (isProduction) {
    cssLoaders = ExtractTextPlugin.extract(cssLoaders.slice(1).join('!'));
    scssLoaders = ExtractTextPlugin.extract(scssLoaders.slice(1).join('!'));
    console.log("Compiling for production!")
    plugins = plugins.concat([
        // Write a bundle compilation hash to application.properties to use it in HTML
        function() {
            this.plugin("done", function(stats) {
                var jekyllConfig = fs.readFileSync(path.join(__dirname, "_config.yml"), { encoding: "utf-8" });
                jekyllConfig = jekyllConfig.replace("production: false", "production: true")
                fs.writeFileSync(
                    path.join(__dirname, "_config_production.yml"),
                    jekyllConfig
                );
                fs.appendFileSync(
                    path.join(__dirname, "_config_production.yml"),
                    "webpack_hash: " + stats.hash + "\n"
                );
            });
        }
    ]);
} else {
    cssLoaders = cssLoaders.join('!');
    scssLoaders = scssLoaders.join('!');
}

module.exports = {
  entry: {
      main: ["./_js/index.js"],
      critical: ["./_sass/critical.scss"]
  },
  output: {
    path: path.join(__dirname, "assets"),
    publicPath: "/assets/",
    filename: isProduction ? "[name].[hash].js" : "[name].js",
    chunkFilename: "[name].[id].js"
  },
  plugins: plugins,
  module: {
    loaders: [
      {
          test: /\.js$/,
          loaders: ["babel"],
          exclude: /node_modules/
      },
      { test: /\.css$/, loader: cssLoaders },
      { test: /\.scss$/, loader: scssLoaders },
      { test: /\.(png|svg|jpg)$/, loader: "url?limit=15000" },
      { test: /\.(ttf|otf|eot|woff|woff2)$/, loader: "file" },
    ]
  },
  resolve: {
    root: path.join(__dirname, "src"),
    modulesDirectories: ["node_modules"],
    extensions: ["", ".webpack.js", ".js", ".css", ".scss"],
    alias: {}
  }
};
