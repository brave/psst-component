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
//   window.psstResult = (() => { ...entire webpack runtime, closured...; return <expr>; })();
//
// which takes two rewrites, because the assignment and the `return` live in
// source generated at two different points in webpack's render pipeline:
//
// 1. `renderStartup` produces `window.psstResult = <expr>;` *inside* the
//    `iife: true` wrapper. We rewrite it to `return <expr>;`.
// 2. `render` fires once the whole chunk (including the wrapper's closing
//    `})()`) is assembled. We prefix that with `window.psstResult = `.
//
// Doing only (1) isn't enough: with the closure's own call expression left as
// a bare, value-discarding statement, minification (`bundle:prod`) sees the
// `return`'s value as provably unused and strips it, silently regressing to
// the exact problem we're fixing. Wrapping with (2) makes the outer
// assignment the thing that consumes the `return`ed value, so it survives
// minification -- the assignment is a visible side effect a minifier can't
// drop, and the value it assigns depends on the `return`.
const RENDER_STARTUP_MARKER = '/* psst-closure-return */';
const ASSIGNMENT_LINE_PATTERN = /^window\.psstResult = ([^\n]+);$/m;

class WrapPsstResultInClosurePlugin {
  /** @param {import('webpack').Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

      hooks.renderStartup.tap(
        // Run after AssignLibraryPlugin's own (default-stage) tap, which is
        // what produces the `window.psstResult = <expr>;` assignment below.
        { name: PLUGIN_NAME, stage: 10 },
        (source) => {
          const text = source.source().toString();
          if (!ASSIGNMENT_LINE_PATTERN.test(text)) {
            return source;
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
        return new ConcatSource('window.psstResult = ', source);
      });
    });
  }
}

module.exports = { WrapPsstResultInClosurePlugin };
