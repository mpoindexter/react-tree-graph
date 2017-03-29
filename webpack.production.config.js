var webpack = require('webpack');
var path = require('path');
var loaders = require('./webpack.loaders');
var WebpackCleanupPlugin = require('webpack-cleanup-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

loaders.push({
  test: /\.scss$/,
  loader: ExtractTextPlugin.extract({fallback: 'style-loader', use: 'css-loader?sourceMap&localIdentName=[local]___[hash:base64:5]!sass-loader?outputStyle=expanded'}),
  exclude: ['node_modules']
});

module.exports = {
  entry: {
    'library': './src/library.js',
    'library.min': './src/library.js'
  },
  output: {
    path: path.join(__dirname, 'lib'),
    filename: '[name].js',
    library: 'reactTreeGraph',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  devtool: 'source-map',
  externals: {
    react: 'react',
    'react-addons-transition-group': 'react-addons-transition-group'
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  module: {
    loaders
  },
  plugins: [
    new WebpackCleanupPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      minimize: true,
      sourceMap: true,
      include: /\.min\.js$/
    })
  ]
};
