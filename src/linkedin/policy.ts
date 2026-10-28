
// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { PolicyScriptBase } from "../common/policy_base";
import {logger} from '../common/logger';
import { waitForElementWithRetry, type ModalSelectorData } from "../common/psst_utils";

export class LinkedInPolicyScript extends PolicyScriptBase {
    async waitForSettingAppliedWithTimeout(selectorData: ModalSelectorData | undefined, turnOff: boolean, modalSelectors: ModalSelectorData[] | undefined): Promise<void> {
        const targetSelector = selectorData?.selector;
        if (!this.isFallbackPage() && targetSelector) {
            if (__DEV__) logger.debug(`Starts to wait for element:${targetSelector} on the page: ${location.href}`);
            await waitForElementWithRetry(targetSelector);
        }
        
        return new Promise((resolve, reject) => {
            let intervalId: number | null = null;
            let attemptCount = 0;

            const wrappedResolve = () => {
            if (intervalId) clearInterval(intervalId);
            resolve();
            };

            const wrappedReject = (errorDescription: string|null = null) => {
              attemptCount++;

              if (this.isFallbackPage()) {
                const message = 'Skipped fallback page';
                if (__DEV__) logger.debug(message);
                if (intervalId) clearInterval(intervalId);
                reject(new Error(message));
              } else if (
                  attemptCount >=
                  LinkedInPolicyScript.WAIT_FOR_PAGE_ATTEMPTS_COUNT) {
                if (intervalId) clearInterval(intervalId);
                reject(new Error(`Checkbox not found after ${
                    LinkedInPolicyScript
                        .WAIT_FOR_PAGE_ATTEMPTS_COUNT} attempts. Error: ${
                    errorDescription}`));
              }
            };

            intervalId = setInterval(() => {
            this.checkCheckboxes(wrappedResolve, wrappedReject, selectorData, turnOff);
            }, LinkedInPolicyScript.WAIT_FOR_PAGE_TIMEOUT);
        });
    }

    private checkCheckboxes(resolve: () => void, reject: (errorDescription: string | null) => void, selectorData: ModalSelectorData | undefined, turnOff: boolean) {
        if (!selectorData) {
            reject('No selector provided');
            return;
        }
        const checkbox = document.querySelector(selectorData.selector) as HTMLInputElement | null;
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

    private readonly fallbackUrls: URL[] = [
      new URL('https://www.linkedin.com/mypreferences/page-not-found'),
    ];
    private isFallbackPage(): boolean {
      return this.fallbackUrls.some(u => u.href === location.href);
    }
}

window.PolicyScriptInstance = new LinkedInPolicyScript();

// See user.ts / webpack.config.js: the bundle's value is exposed through a
// default export, not a trailing IIFE (webpack's wrappers swallow `return`).
export default window.PolicyScriptInstance.applyPolicies();
