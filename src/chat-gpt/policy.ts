
// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { PolicyScriptBase } from "../common/policy_base";


export class ChatGptPolicyScript extends PolicyScriptBase {
    // The "Improve the model for everyone" switch is hidden inside a
    // collapsed row; this chevron reveals it before the switch selector
    // resolves to anything.
    private static readonly EXPAND_SELECTOR = '#radix-_r_98_-content-DataControls > section > div:nth-child(2) > div > button > div > div.text-token-text-secondary.flex.min-h-\\[38px\\].items-center.ps-3 > svg';

    waitForSettingAppliedWithTimeout(selector: string | undefined, turnOff: boolean): Promise<void> {
        return new Promise((resolve, reject) => {
            if (selector && !document.querySelector(selector)) {
                const expandTrigger = document.querySelector(ChatGptPolicyScript.EXPAND_SELECTOR);
                if (expandTrigger instanceof HTMLElement) {
                    expandTrigger.click();
                }
            }

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
                reject(new Error(`Toggle not found after ${
                    ChatGptPolicyScript
                        .WAIT_FOR_PAGE_ATTEMPTS_COUNT} attempts. Error: ${errorDescription}`));
              }
            };

            intervalId = setInterval(() => {
            this.checkToggle(wrappedResolve, wrappedReject, selector, turnOff);
            }, ChatGptPolicyScript.WAIT_FOR_PAGE_TIMEOUT);
        });
    }

    private checkToggle(resolve: () => void, reject: (errorDescription: string | null) => void, selector: string | undefined, turnOff: boolean) {
        if (!selector) {
            reject('No selector provided');
            return;
        }
        const toggle = document.querySelector(selector);
        if (!toggle) {
            reject('No toggle found');
            return;
        }

        const switchButton = toggle.closest('button');
        if (!switchButton) {
            reject('No switch button found');
            return;
        }

        const isChecked = switchButton.getAttribute('aria-checked') === 'true';
        if (turnOff ? isChecked : !isChecked) {
            switchButton.click();
        }
        resolve();
    }
}

window.PolicyScriptInstance = new ChatGptPolicyScript();

// See user.ts / webpack.config.js: the bundle's value is exposed through a
// default export, not a trailing IIFE (webpack's wrappers swallow `return`).
export default window.PolicyScriptInstance.applyPolicies();
