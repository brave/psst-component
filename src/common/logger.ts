// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {}

const LOG_PREFIX = '[PSST]'

export const logger = __DEV__
  ? {
      log: (...args: unknown[]) => console.log(LOG_PREFIX, ...args),
      info: (...args: unknown[]) => console.info(LOG_PREFIX, ...args),
      warn: (...args: unknown[]) => console.warn(LOG_PREFIX, ...args),
      error: (...args: unknown[]) => console.error(LOG_PREFIX, ...args),
      debug: (...args: unknown[]) => console.debug(LOG_PREFIX, ...args)
    }
  : {
      log: noop,
      info: noop,
      warn: noop,
      error: noop,
      debug: noop
    }
