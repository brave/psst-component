// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

// @ts-check
'use strict';

const { javascript } = require('webpack');
const { ConcatSource, RawSource } = require('webpack-sources');

const { JavascriptModulesPlugin } = javascript;

const PLUGIN_NAME = 'WrapPsstResultInClosurePlugin';

// webpack's `library: { type: 'window' }` (AssignLibraryPlugin) appends the
// bundle's result as a plain statement -- `window.psstResult = <expr>;` --
// with no `return`. That means even with `output.iife: true`, the outer
// wrapper's own call expression completes to `undefined`, not the script's
// result: only library types like `var`/`module` make webpack emit a
// `return` (via RuntimeGlobals.returnExportsFromRuntime), and those don't
// give us a `window.psstResult` global.
//
// PSST scripts are injected and read by their *completion value* (the value
// of the last evaluated top-level expression). We need the whole bundle to
// end up shaped like:
//
//   window.psstResult = (() => {
//     try {
//       ...entire webpack runtime, closured...
//       return <expr>;
//     } catch (error) {
//       return undefined;
//     }
//   })();
//
// which takes three rewrites, because the pieces are produced at different
// points in webpack's render pipeline:
//
// 1. `renderStartup` produces `window.psstResult = <expr>;` *inside* the
//    `iife: true` wrapper. We rewrite it to `return <expr>;`.
// 2. `render` fires once the whole chunk is assembled. We splice `try {`
//    right after the bootstrap opens and `} catch (error) { ...; return
//    undefined; }` right before it closes.
// 3. `render` also prefixes the whole thing with `window.psstResult = `.
//
// Putting the try/catch *inside* the closure, rather than around the outer
// assignment, keeps that outer statement a single uniform shape in both the
// success and failure cases: `window.psstResult = (closure)();` always
// assigns whatever the closure returns. That call's return value is also
// why minification (`bundle:prod`) can't strip either `return`: with the
// closure invoked as a bare, value-discarding expression statement, a
// minifier can see the value as provably unused and drop the `return`,
// silently regressing to the exact problem this file exists to fix. Once
// an outer assignment consumes the call's result, dropping the `return`
// would change what gets assigned, so it survives.
//
// Without the catch, an exception thrown before `return <expr>` would skip
// the assignment entirely -- on a SPA re-injection (see `concatenateModules`
// in webpack.config.js) that leaves `window.psstResult` holding the
// *previous* injection's now-stale value instead of reflecting this run's
// failure, and the injector would see an uncaught exception instead of a
// defined completion value. `return undefined` avoids both.
const RENDER_STARTUP_MARKER = '/* psst-closure-return */';
const ASSIGNMENT_LINE_PATTERN = /^window(?:\.psstResult|\["psstResult"\]) = ([^\n]+);$/m;

// Matches the `iife: true` bootstrap wrapper's opening two lines: the
// `(() => { // webpackBootstrap` (or `(function() {` fallback, used when the
// output target doesn't support arrow functions) line, and the
// `"use strict";` directive webpack always emits right after it. `try {`
// must be spliced in *after* this pair: a Directive Prologue's `"use
// strict";` is only a strict-mode directive when it's the first statement
// in the function body -- moved inside a `try` block, it'd silently become
// an inert string-literal expression instead, turning off strict mode for
// the whole bundle.
const BOOTSTRAP_OPEN_PATTERN =
  /\/\*+\/ (?:\(\(\) => \{|\(function\(\) \{) \/\/ webpackBootstrap\n\/\*+\/ \t"use strict";\n/;

// Matches the bootstrap wrapper's closing line. Anchored to the end of the
// source so it can't match one of the small per-helper runtime IIFEs
// earlier in the bundle (e.g. `/******/ (() => { ... })();`), which look
// similar but always end in `;` on the same line; the outer bootstrap's own
// close doesn't (that `;` is appended later, by webpack itself).
const BOOTSTRAP_CLOSE_PATTERN = /\/\*+\/ \}\)\(\)\n?$/;

class WrapPsstResultInClosurePlugin {
  /** @param {import('webpack').Compiler} compiler */
  apply(compiler) {
    const isProduction = compiler.options.mode === 'production';

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

      hooks.renderStartup.tap(
        // Run after AssignLibraryPlugin's own (default-stage) tap, which is
        // what produces the `window.psstResult = <expr>;` assignment below.
        { name: PLUGIN_NAME, stage: 10 },
        (source) => {
          const text = source.source().toString();
          if (!text.includes('psstResult')) {
            return source;
          }
          if (!ASSIGNMENT_LINE_PATTERN.test(text)) {
             throw new Error(
               `${PLUGIN_NAME}: couldn't find the expected psstResult assignment in renderStartup output -- ` +
                 'webpack\'s generated boilerplate may have changed.'
             );
          }
          const rewritten = text.replace(
            ASSIGNMENT_LINE_PATTERN,
            `${RENDER_STARTUP_MARKER} return $1;`
          );
          return new RawSource(rewritten);
        }
      );

      hooks.render.tap({ name: PLUGIN_NAME, stage: 10 }, (source) => {
        const text = source.source().toString();
        if (!text.includes(RENDER_STARTUP_MARKER)) {
          return source;
        }
        if (!BOOTSTRAP_OPEN_PATTERN.test(text) || !BOOTSTRAP_CLOSE_PATTERN.test(text)) {
          throw new Error(
            `${PLUGIN_NAME}: couldn't find the expected \`iife: true\` bootstrap ` +
              'wrapper to splice a try/catch into -- webpack\'s generated ' +
              'boilerplate may have changed.'
          );
        }

        const logStatement = isProduction
          ? ''
          : '\n  console.error("[PSST] Unhandled error while running injected script:", error);';

        const withTry = text.replace(BOOTSTRAP_OPEN_PATTERN, (match) => `${match}try {\n`);
        const withCatch = withTry.replace(
          BOOTSTRAP_CLOSE_PATTERN,
          (match) => `} catch (error) {${logStatement}\n  return undefined;\n}\n${match}`
        );

        return new ConcatSource('window.psstResult = ', withCatch);
      });
    });
  }
}

module.exports = { WrapPsstResultInClosurePlugin };
