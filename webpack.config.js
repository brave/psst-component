const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const {
  WrapPsstResultInClosurePlugin,
} = require('./scripts/webpack/wrap-psst-result-plugin');

const SRC_DIR = path.resolve(__dirname, 'src');

// Folders under src/ that are NOT website implementations (shared code, etc.).
// Everything else under src/ is treated as a supported website.
const NON_WEBSITE_DIRS = new Set(['common']);

// Settings shared by every website's build. `mode` comes from the webpack CLI
// (`--mode production` / `--mode development`); it defaults to development.
function makeSharedConfig(mode) {
  const isProduction = mode === 'production';

  return {
    mode,
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            // Bundling only needs JS; declaration files belong to `npm run build`.
            options: {
              compilerOptions: {
                declaration: false,
                declarationMap: false,
              },
            },
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    devtool: false,
    optimization: {
      // Minify in production so the dead `__DEV__` branches are stripped out.
      minimize: isProduction,
      // Keep each module inside its own function wrapper. Production mode would
      // otherwise enable scope hoisting (ModuleConcatenationPlugin), which lifts
      // every module's `const`/`class` (e.g. `noop`, `PolicyScriptBase`) into a
      // shared enclosing scope. This was added back when the bundle had no
      // outer wrapper (`iife: false`): those lifted declarations ended up
      // directly at the top level of the injected script, and since the target
      // pages are SPAs (x.com) where Brave re-injects the same script into the
      // *same* realm across in-app navigations, a second injection then threw
      // `Identifier 'noop' has already been declared`.
      //
      // Now that `iife: true` (see `output` below) wraps the whole bundle in a
      // closure, every injection gets a fresh function scope, so this may no
      // longer be necessary. Leaving it disabled for now since re-enabling it
      // is a separate, independently testable change.
      concatenateModules: false,
    },
    plugins: [
      // Replace `__DEV__` with a literal `true`/`false` at build time. In
      // production it becomes `false`, and the minifier removes every guarded
      // logging branch — so no logging code ships.
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProduction),
      }),
      // Rewrites the bundle's trailing `window.psstResult = <expr>;` into a
      // `return`, so it keeps working as the script's completion value once
      // `output.iife: true` wraps the whole bundle in a closure. See
      // scripts/webpack/wrap-psst-result-plugin.js for the full rationale.
      new WrapPsstResultInClosurePlugin(),
    ],
  };
}

/** Discover website folders under src/ (each is a separate bundle target). */
function getWebsites() {
  return fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NON_WEBSITE_DIRS.has(entry.name))
    .map((entry) => entry.name);
}

/**
 * Build the webpack `entry` map for a website: every top-level *.ts script
 * (e.g. user.ts, policy.ts) becomes its own entry, keyed by its base name.
 */
function getEntries(website) {
  const websiteDir = path.join(SRC_DIR, website);
  const entries = {};

  for (const file of fs.readdirSync(websiteDir)) {
    if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
    const name = path.basename(file, '.ts');
    // Webpack wants a relative, forward-slashed path.
    entries[name] = './' + path
      .relative(__dirname, path.join(websiteDir, file))
      .split(path.sep)
      .join('/');
  }

  return entries;
}

module.exports = (env, argv) => {
  const mode = argv && argv.mode ? argv.mode : 'development';
  const sharedConfig = makeSharedConfig(mode);

  return getWebsites()
    .map((website) => ({ website, entry: getEntries(website) }))
    // Skip any folder that has no scripts to bundle.
    .filter(({ entry }) => Object.keys(entry).length > 0)
    .map(({ website, entry }) => ({
      name: website,
      ...sharedConfig,
      entry,
      output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'out', 'scripts', `${website}`),
        // These scripts are injected and read by their *completion value* (the
        // value of the last evaluated expression). `iife: true` wraps the whole
        // bundle -- module table, `__webpack_require__`, and the rest of the
        // webpack runtime -- in a closure, so none of that leaks into the
        // isolated world shared with other Brave-injected scripts. On its own
        // that wrapper doesn't propagate a result out: `library: { type:
        // 'window' }` only appends `window.psstResult = <expr>;` as a plain
        // statement inside it, with no `return`. WrapPsstResultInClosurePlugin
        // (scripts/webpack/wrap-psst-result-plugin.js) rewrites that statement
        // into `return (window.psstResult = <expr>);`, so the assignment still
        // runs but its value also becomes the outer closure's completion value
        // -- which is what the injector reads.
        iife: true,
        library: {
          name: 'psstResult',
          type: 'window',
          export: 'default',
        },
      },
    }));
};
