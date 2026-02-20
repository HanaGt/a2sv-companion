const CopyPlugin = require('copy-webpack-plugin');
const ExtReloader = require('webpack-ext-reloader');

const path = require('path');
const outputPath = 'dist';
const entryPoints = {
  main: [path.resolve(__dirname, 'src', 'main.ts')],
  services: path.resolve(__dirname, 'src', 'services.ts'),
  'auth.content': path.resolve(__dirname, 'src', 'content/auth.content.ts'),
  'leetcode.content': path.resolve(
    __dirname,
    'src',
    'content/leetcode.content.ts'
  ),
  'codeforces.content': path.resolve(
    __dirname,
    'src',
    'content/codeforces.content.ts'
  ),
  sidepanel: path.resolve(__dirname, 'src', 'sidepanel.ts'),
};

module.exports = (env, argv) => {
  const plugins = [
    new CopyPlugin({
      patterns: [{ from: '.', to: '.', context: 'public' }],
    }),
  ];

  if (argv.mode === 'development') {
    plugins.push(
      new ExtReloader({
        manifest: path.resolve(__dirname, 'public', 'manifest.json'),
        entries: {
          background: 'services',
          contentScript: ['auth.content', 'leetcode.content', 'codeforces.content'],
          extensionPage: ['main', 'sidepanel'],
        },
      })
    );
  }

  // Chrome extension CSP forbids eval(); avoid devtools that use it (e.g. default "eval" in dev)
  const devtool =
    argv.mode === 'development'
      ? 'inline-cheap-module-source-map'
      : false;

  return {
    entry: entryPoints,
    devtool,
    output: {
      path: path.join(__dirname, outputPath),
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
          include: path.resolve(__dirname, 'src'),
        },
        {
          test: /\.css$/,
          include: path.resolve(__dirname, 'src'),
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(jpg|jpeg|png|gif|woff|woff2|eot|ttf|svg)$/i,
          use: 'url-loader?limit=1024',
        },
      ],
    },
    plugins,
  };
};
