
// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { PolicyScriptBase } from "../common/policy_base";
import type { ModalSelectorData } from "../common/psst_utils";


export class TwitterPolicyScript extends PolicyScriptBase {
    waitForSettingAppliedWithTimeout(selector: string | undefined, turnOff: boolean, modalSelectors: ModalSelectorData[] | undefined): Promise<void> {
        return new Promise((resolve, reject) => {
            let intervalId: number | null = null;
            let attemptCount = 0;

            const wrappedResolve = () => {
            if (intervalId) clearInterval(intervalId);
            resolve();
            };

            const wrappedReject = (errorDescription: string|null = null) => {
              attemptCount++;
              if (attemptCount >=
                  TwitterPolicyScript.WAIT_FOR_PAGE_ATTEMPTS_COUNT) {
                if (intervalId) clearInterval(intervalId);
                reject(new Error(`Checkbox not found after ${
                    TwitterPolicyScript
                        .WAIT_FOR_PAGE_ATTEMPTS_COUNT} attempts. Error: ${errorDescription}`));
              }
            };

            intervalId = setInterval(() => {
            this.checkCheckboxes(wrappedResolve, wrappedReject, selector, turnOff);
            }, TwitterPolicyScript.WAIT_FOR_PAGE_TIMEOUT);
        });
    }

    private checkCheckboxes(resolve: () => void, reject: (errorDescription: string | null) => void, selector: string | undefined, turnOff: boolean) {
        if (!selector) {
            reject('No selector provided');
            return;
        }
        const checkbox = document.querySelector(selector) as HTMLInputElement | null;
        if (!checkbox || checkbox.type !== 'checkbox') {
            reject('No checkbox found');
            return;
        }

        if (turnOff) {
            if (checkbox.checked) {
                checkbox.click();
            }
        } else {
            if (!checkbox.checked) {
                checkbox.click();
            }
        }
        resolve();
    }
}

window.PolicyScriptInstance = new TwitterPolicyScript();

// See user.ts / webpack.config.js: the bundle's value is exposed through a
// default export, not a trailing IIFE (webpack's wrappers swallow `return`).
export default window.PolicyScriptInstance.applyPolicies();