const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
  entry: ['./src/index.js'],
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        // CLI work should already be excluded from this from the entrypoint, but just in case...
        exclude: [`${__dirname}/src/cli/`],
        use: {
          loader: 'babel-loader',
          options: {
            extends: './.babelrc',
          },
        },
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
  },
  target: 'web',
};
