
// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { logger } from "../common/logger";
import { PolicyScriptBase } from "../common/policy_base";
import { waitForElement } from "../common/psst_utils";


export class ChatGptPolicyScript extends PolicyScriptBase {
    async waitForSettingAppliedWithTimeout(selector: string | undefined, turnOff: boolean, modalSelectors: string[] | undefined): Promise<void> {
        await this.clickModalSelectors(modalSelectors);

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

    private async clickModalSelectors(modalSelectors: string[] | undefined): Promise<void> {
        if (!modalSelectors || modalSelectors.length === 0) {
            if (__DEV__) logger.error('No modal selectors provided');
            return;
        }

        for (let index = 0; index < modalSelectors.length; index++) {
            const modalSelector = modalSelectors[index]
            if (modalSelector) {
                const element = await waitForElement(modalSelector);
                if (__DEV__) logger.debug(`Clicked modal selector ${index + 1}/${modalSelectors.length}: "${modalSelector}"`);
                element.click();
            }
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
