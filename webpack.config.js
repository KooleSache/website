var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var isProduction = process.env.NODE_ENV === 'production';
var cssLoaders = ["style-loader", "css-loader", "autoprefixer-loader?browsers=last 2 version"];
var scssLoaders = cssLoaders.concat(["sass-loader?imagePath=/_images&includePaths[]=./_sass"]);

if (isProduction) {
    cssLoaders = ExtractTextPlugin.extract(cssLoaders.slice(1).join('!'));
    scssLoaders = ExtractTextPlugin.extract(scssLoaders.slice(1).join('!'));
} else {
    cssLoaders = cssLoaders.join('!');
    scssLoaders = scssLoaders.join('!');
}

module.exports = {
  entry: ["./_js/index.js"],
  output: {
    path: path.join(__dirname, "assets"),
    publicPath: "assets/",
    filename: "[name].[hash].js",
    chunkFilename: "[name].[id].js"
  },
  plugins: [
      new ExtractTextPlugin("[name].[hash].css")
  ],
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
