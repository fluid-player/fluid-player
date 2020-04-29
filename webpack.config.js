const path = require('path');
const webpack = require('webpack');

const packageJSON = require(path.resolve(__dirname, 'package.json'));

module.exports = (env, argv) => {
    const wpMode = typeof argv.mode !== 'undefined' ? argv.mode : 'development';
    const wpDebug = wpMode === 'development' && typeof argv.debug !== 'undefined' && !!argv.debug;

    return {
        devtool: wpMode === 'development' ? 'source-map' : false,
        plugins: [
            new webpack.DefinePlugin({
                FP_BUILD_VERSION: JSON.stringify(packageJSON.version),
                FP_HOMEPAGE: JSON.stringify(packageJSON.homepage),
                FP_ENV: JSON.stringify(wpMode),
                FP_DEBUG: JSON.stringify(wpDebug),
            })
        ],
        entry: {
            fluidplayer: './src/browser.js'
        },
        output: {
            filename: '[name].min.js',
            chunkFilename: '[name].min.js',
            path: path.resolve(__dirname, 'dist'),
            publicPath: '../dist/' // TODO - via env for production
        },
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: ['style-loader', 'css-loader'],
                },
                {
                    test: /\.svg$/,
                    loader: 'svg-url-loader'
                }
            ],
        }
    };
}
