var path = require('path');
var fs = require('fs');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var isProduction = process.env.NODE_ENV === 'production';
var plugins = [new ExtractTextPlugin('[name].[hash].css', { disable: !isProduction })];

module.exports = {
    entry: ['./_js/index.js'],
    output: {
        path: path.join(__dirname, '_site'),
        publicPath: isProduction ? '/' : 'http://localhost:8081/',
        filename: isProduction ? '[name].[hash].js' : '[name].js',
        chunkFilename: '[name].[id].js'
    },
    plugins: plugins,
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel',
                exclude: /node_modules/
            },
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract('style', 'css!postcss?parser=postcss-scss')
            },
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract('style', 'css!postcss')
            },
            {
                test: /\.(png|svg|jpg)$/,
                loader: 'url?limit=15000'
            },
            {
                test: /\.(ttf|otf|eot|woff|woff2)$/,
                loader: 'file'
            }
        ]
    },
    postcss: function() {
        return [
            require('precss'),
            require('postcss-calc'),
            require('autoprefixer')({ browsers: ['last 2 version', 'ie >= 10'] })
        ];
    },
    resolve: {
        root: path.join(__dirname, 'src'),
        modulesDirectories: ['node_modules'],
        extensions: ['', '.webpack.js', '.js', '.css', '.scss'],
        alias: {}
    }
};
