// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type {PsstLogLevel} from './declarations';

// `logger.info/warn/error/debug` forward to the native PSST diagnostics
// timeline (visible at brave://psst-internals) whenever it's available --
// in dev AND prod builds alike, since that timeline is a production feature.
//
// `globalThis.psstLog` only exists once the browser has shipped the native
// bootstrap that defines it (see brave-core's psst_js_handler.cc). This
// component is released independently of the browser, so a build can run on
// a browser version that predates that native API. When it's missing, these
// fall back to the old dev-only `console.*` behavior, gated by `__DEV__` --
// a compile-time constant injected by webpack's DefinePlugin (see
// webpack.config.js): `true` in development builds, `false` in production.
//
// Because the native forward must work in production, these calls can no
// longer be dead-code-eliminated wholesale the way the old console-only
// logger was. Guard call sites that log anything non-trivial to compute with
// `if (__DEV__)` as before to avoid paying for it in prod when native
// logging isn't available either.

const LOG_PREFIX = '[PSST]';

const format = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.stack || String(value);
  }
  try {
    const json = JSON.stringify(value);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
};

function logToNative(
    level: PsstLogLevel, message: string,
    data?: Record<string, unknown>): boolean {
  if (typeof globalThis.psstLog !== 'function') {
    return false;
  }
  globalThis.psstLog(level, message, data);
  return true;
}

function makeLogFn(logLevel: PsstLogLevel) {
  return (...args: any[]): void => {

    const message = (args.length > 0 ? format(args[0]) : '');
    const data = (args.length > 1 ? args[1] : undefined);
    if (logToNative(logLevel, message, data)) {
      return;
    }
    if (!__DEV__) {
      return;
    }
    switch (logLevel) {
      case 'debug':
        console.debug(LOG_PREFIX, ...args);
        break;
      case 'info':
        console.info(LOG_PREFIX, ...args);
        break;
      case 'warn':
        console.warn(LOG_PREFIX, ...args);
        break;
      case 'error':
        console.error(LOG_PREFIX, ...args);
        break;
    }
  };
}

export const logger = {
  info: makeLogFn('info'),
  warn: makeLogFn('warn'),
  error: makeLogFn('error'),
  debug: makeLogFn('debug'),
};
