// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

// Development-only logger.
//
// `__DEV__` is a compile-time constant injected by webpack's DefinePlugin
// (see webpack.config.js): `true` in development builds, `false` in
// production. In production it resolves to a literal `false`, so the minifier
// drops the dead branch below and the `console` calls never ship.
//
// IMPORTANT — guard every call site with `if (__DEV__)`:
//
//   if (__DEV__) logger.debug('state', snapshot);
//
// Without the guard, the call survives as a no-op but its *arguments* (the
// message strings, any snapshot()) still get compiled in and evaluated at
// runtime. The `if (__DEV__)` wrapper lets the minifier delete the whole
// statement — arguments included — so nothing about logging ships to prod.

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

const LOG_PREFIX = '[PSST]';

export const logger = __DEV__
  ? {
      log: (...args: unknown[]) => console.log(LOG_PREFIX, ...args),
      info: (...args: unknown[]) => console.info(LOG_PREFIX, ...args),
      warn: (...args: unknown[]) => console.warn(LOG_PREFIX, ...args),
      error: (...args: unknown[]) => console.error(LOG_PREFIX, ...args),
      debug: (...args: unknown[]) => console.debug(LOG_PREFIX, ...args),
    }
  : {
      log: noop,
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
    };
