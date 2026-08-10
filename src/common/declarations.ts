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

declare global {
    // Compile-time build flag injected by webpack's DefinePlugin.
    // `true` in development builds, `false` (and dead-code-eliminated) in production.
    const __DEV__: boolean;

    // Older hosts prepend `const params = {...}` to the top of the bundle,
    // making it a lexical global reachable by every module via the scope
    // chain, instead of assigning `window.params`. Kept for backward
    // compatibility -- see the `window.params` doc below for the current
    // mechanism, which takes priority when both are present.
    const params: string | PolicyScriptInputData | undefined;

    interface Window {
        // The host assigns `window.params = {...}` before injecting the
        // bundle. Using an assignment (rather than a `const` declaration)
        // means re-injecting the script on the same page -- e.g. on SPA
        // navigations -- reassigns this property instead of throwing
        // `Identifier 'params' has already been declared`.
        params?: string | PolicyScriptInputData | UserScriptInputData;
        UserScriptInstance: UserScriptBase;
        PolicyScriptInstance: PolicyScriptBase;
    }
}
