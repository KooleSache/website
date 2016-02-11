var path = require('path');
var fs = require('fs');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var isProduction = process.env.NODE_ENV === 'production';
var plugins = [new ExtractTextPlugin('[name].[hash].css', { disable: !isProduction })];

if (isProduction) {
    console.log('Compiling for production!')
    plugins = plugins.concat([
        // Write a bundle compilation hash to application.properties to use it in HTML
        function () {
            this.plugin('done', function (stats) {
                var jekyllConfig = fs.readFileSync(path.join(__dirname, '_config.yml'), {encoding: 'utf-8'});
                jekyllConfig = jekyllConfig.replace('production: false', 'production: true')
                fs.writeFileSync(
                    path.join(__dirname, '_config_production.yml'),
                    jekyllConfig
                );
                fs.appendFileSync(
                    path.join(__dirname, '_config_production.yml'),
                    'webpack_hash: ' + stats.hash + '\n'
                );
            });
        }
    ]);
}

module.exports = {
    entry: ['./_js/index.js'],
    output: {
        path: path.join(__dirname, '_site'),
        publicPath: '/_site/',
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
