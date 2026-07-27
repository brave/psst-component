
// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { logger } from "../common/logger";
import { PolicyScriptBase } from "../common/policy_base";
import { waitForElement } from "../common/psst_utils";


export class ChatGptPolicyScript extends PolicyScriptBase {
    waitForSettingAppliedWithTimeout(selector: string | undefined, turnOff: boolean): Promise<void> {
        return new Promise((resolve, reject) => {
            let intervalId: number | null = null;
            let attemptCount = 0;

            this.openSettingsMenu();

            const wrappedResolve = () => {
            if (intervalId) clearInterval(intervalId);
            resolve();
            };

            const wrappedReject = (errorDescription: string|null = null) => {
              attemptCount++;
              if (attemptCount >=
                  ChatGptPolicyScript.WAIT_FOR_PAGE_ATTEMPTS_COUNT) {
                if (intervalId) clearInterval(intervalId);
                reject(new Error(`Checkbox not found after ${
                    ChatGptPolicyScript
                        .WAIT_FOR_PAGE_ATTEMPTS_COUNT} attempts. Error: ${errorDescription}`));
              }
            };

            intervalId = setInterval(() => {
            this.checkCheckboxes(wrappedResolve, wrappedReject, selector, turnOff);
            }, ChatGptPolicyScript.WAIT_FOR_PAGE_TIMEOUT);
        });
    }

    private async openSettingsMenu() {
        const menuOpenBtnSelector = '#radix-_R_3alalpakoac97l35_ > div.flex.min-w-0.items-center.gap-2 > div.min-w-0 > div.not-group-data-disabled\:text-token-text-tertiary.leading-dense.mb-0\.5.text-xs.whitespace-normal.group-data-sheet-item\:mt-0\.5.group-data-sheet-item\:mb-0.dark\:group-hover\:text-token-text-secondary.dark\:group-focus-visible\:text-token-text-secondary.dark\:group-data-\[highlighted\]\:text-token-text-secondary.dark\:group-data-\[state\=open\]\:text-token-text-secondary';
        const menuOpenBtn = await waitForElement(menuOpenBtnSelector);

        if (menuOpenBtn instanceof HTMLElement) {
            if (__DEV__) logger.info('Found the menu open button');
            menuOpenBtn.click();
        } else {
            if (__DEV__) logger.info('Not found the menu open button');
        }

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

window.PolicyScriptInstance = new ChatGptPolicyScript();

// See user.ts / webpack.config.js: the bundle's value is exposed through a
// default export, not a trailing IIFE (webpack's wrappers swallow `return`).
export default window.PolicyScriptInstance.applyPolicies();
