// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type { UserScriptBase } from "./user_base";
import type { PolicyScriptBase } from "./policy_base";
import type { Task } from "./psst_utils";

export interface UserScriptData {
  user_id: string | undefined;
  share_experience_link: string;
  site_name: string;
  initial_execution: boolean;
  tasks: Task[];
}

export interface UserScriptInputData {
    countryId: string|undefined;
}

export interface PolicyScriptInputData extends UserScriptData {
    initial_execution: boolean;
}

export type PsstLogLevel = 'debug' | 'info' | 'warn' | 'error';

declare global {
    // Compile-time build flag injected by webpack's DefinePlugin.
    // `true` in development builds, `false` (and dead-code-eliminated) in production.
    const __DEV__: boolean;

    // Older hosts prepend `const params = {...}` to the top of the bundle,
    // making it a lexical global reachable by every module via the scope
    // chain, instead of assigning `window.__bravePsstParams`. Kept for backward
    // compatibility -- see the `window.__bravePsstParams` doc below for the current
    // mechanism, which takes priority when both are present.
    const params: string | PolicyScriptInputData | undefined;

    interface Window {
        // The host assigns `window.__bravePsstParams = {...}` before injecting the
        // bundle. Using an assignment (rather than a `const` declaration)
        // means re-injecting the script on the same page -- e.g. on SPA
        // navigations -- reassigns this property instead of throwing
        // `Identifier 'params' has already been declared`.
        __bravePsstParams?: string | PolicyScriptInputData | UserScriptInputData;
        UserScriptInstance: UserScriptBase;
        PolicyScriptInstance: PolicyScriptBase;
    }

    // Installed by the browser's native PSST bootstrap (see brave-core's
    // psst_js_handler.cc) in the isolated world these scripts run in.
    // Declared as possibly-`undefined` rather than a plain `function` so
    // every call site is forced to feature-detect it -- the component is
    // shipped independently of the browser, so a build can reach users on a
    // browser version that predates this native API. Use `logger` or
    // `psstLog()` from `./logger` instead of calling this directly.
    var psstLog: ((level: PsstLogLevel, message: string, data?: Record<string, unknown>) => void) | undefined;
}
