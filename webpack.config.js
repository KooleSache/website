var path = require("path");

module.exports = {
  entry: ["./_js/index.js"],
  output: {
    path: path.join(__dirname, "_site", "assets"),
    publicPath: "assets/",
    filename: "[name].js",
    chunkFilename: "[name].[id].js"
  },
  plugins: [
  ],
  module: {
    loaders: [
      { test: /\.css$/, loaders: [
          "style-loader",
          "css-loader",
          "autoprefixer-loader?browsers=last 2 version"
        ]
      },
      { test: /\.scss$/, loaders: [
          "style-loader",
          "css-loader",
          "autoprefixer-loader?browsers=last 2 version",
          "sass-loader?imagePath=/_images&includePaths[]=./_sass"
        ]
      },
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
