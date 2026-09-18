
// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { logger } from "../common/logger";
import { PolicyScriptBase } from "../common/policy_base";
import type { ModalSelectorData } from "../common/psst_utils";

export class TwitterPolicyScript extends PolicyScriptBase {
    waitForSettingAppliedWithTimeout(selectorData: ModalSelectorData | undefined, turnOff: boolean, modalSelectors: ModalSelectorData[] | undefined): Promise<void> {
        return new Promise((resolve, reject) => {
            let intervalId: number | null = null;
            let attemptCount = 0;

            const wrappedResolve = () => {
            if (intervalId) clearInterval(intervalId);
            resolve();
            };

            const wrappedReject = (errorDescription: string|null = null) => {
              attemptCount++;

              if (__DEV__)
                  logger.info(`waitForSettingAppliedWithTimeout try:${attemptCount} errorDescription:${errorDescription}`);

              if (attemptCount >=
                  TwitterPolicyScript.WAIT_FOR_PAGE_ATTEMPTS_COUNT) {
                if (intervalId) clearInterval(intervalId);
                reject(new Error(`Checkbox not found after ${
                    TwitterPolicyScript
                        .WAIT_FOR_PAGE_ATTEMPTS_COUNT} attempts. Error: ${errorDescription}`));
              }
            };

            intervalId = setInterval(() => {
            this.checkCheckboxes(wrappedResolve, wrappedReject, selectorData, turnOff);
            }, TwitterPolicyScript.WAIT_FOR_PAGE_TIMEOUT);
        });
    }

    private checkCheckboxes(resolve: () => void, reject: (errorDescription: string | null) => void, selectorData: ModalSelectorData | undefined, turnOff: boolean) {
        if (!selectorData) {
            reject('No selector provided');
            return;
        }
        const checkbox = document.querySelector(selectorData.selector) as HTMLInputElement | null;
        if (__DEV__)
            logger.info(`checkCheckboxes selector:${selectorData.selector} checkbox:${checkbox}`);

        if (!checkbox || checkbox.type !== 'checkbox') {
            this.logAllInputs();
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

    private logAllInputs(): void {
        const inputs: NodeListOf<HTMLInputElement> =
        document.querySelectorAll('input');

        if (__DEV__)
        logger.info(`[PSST] logAllInputs found ${inputs.length} input element(s)`);

        inputs.forEach((el: HTMLInputElement, index: number) => {
            const attrs: Record<string, string> = {};
            for (const attr of Array.from(el.attributes)) {
            attrs[attr.name] = attr.value;
            }

            const visible: boolean = !!(
            el.offsetWidth ||
            el.offsetHeight ||
            el.getClientRects().length
            );

            if (__DEV__)
            logger.info(
            `[PSST] input[${index}] ` +
                `tag:${el.tagName} ` +
                `type:${el.type} ` +
                `checked:${el.checked} ` +
                `visible:${visible} ` +
                `attributes:${JSON.stringify(attrs)}`,
            );
        });
    }

}

window.PolicyScriptInstance = new TwitterPolicyScript();

// See user.ts / webpack.config.js: the bundle's value is exposed through a
// default export, not a trailing IIFE (webpack's wrappers swallow `return`).
export default window.PolicyScriptInstance.applyPolicies();