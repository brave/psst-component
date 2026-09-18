
// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { logger } from "../common/logger";
import { PolicyScriptBase } from "../common/policy_base";
import { waitForAttributeValue, waitForElement, type ModalSelectorData } from "../common/psst_utils";


export class ChatGptPolicyScript extends PolicyScriptBase {
    async waitForSettingAppliedWithTimeout(selectorData: ModalSelectorData | undefined, turnOff: boolean, modalSelectors: ModalSelectorData[] | undefined): Promise<void> {
        const errors = await this.clickModalSelectors(modalSelectors);

        return new Promise((resolve, reject) => {
          let timeoutId: number|null = null;
          let attemptCount = 0;

          const wrappedResolve = () => {
            if (timeoutId) clearTimeout(timeoutId);
            resolve();
          };

          // Schedules the next attempt only once the previous checkCheckboxes
          // call has settled (via wrappedResolve/wrappedReject below), rather
          // than on a fixed setInterval cadence. checkCheckboxes awaits
          // waitForElement/waitForAttributeValue, which can each take longer
          // than WAIT_FOR_PAGE_TIMEOUT; firing on a fixed interval regardless
          // of completion let two overlapping attempts both observe a stale
          // aria-checked value and both click, toggling the setting back to
          // its original state.
          const scheduleNextAttempt = () => {
            timeoutId = setTimeout(() => {
              this.checkCheckboxes(
                  wrappedResolve, wrappedReject, selectorData, turnOff);
            }, ChatGptPolicyScript.WAIT_FOR_PAGE_TIMEOUT);
          };

          const wrappedReject = (errorDescription: string|null = null) => {
            attemptCount++;
            if (attemptCount >=
                ChatGptPolicyScript.WAIT_FOR_PAGE_ATTEMPTS_COUNT) {
              reject(new Error(`Checkbox not found after ${
                  ChatGptPolicyScript
                      .WAIT_FOR_PAGE_ATTEMPTS_COUNT} attempts. Error: ${
                  errorDescription}`));
            } else {
              scheduleNextAttempt();
            }
          };

          if (!errors) {
            scheduleNextAttempt();
          } else {
            reject(new Error(`Modal selectors error: ${errors.join('; ')}`));
          }
        });
    }

    private async clickModalSelectors(modalSelectors: ModalSelectorData[] | undefined): Promise<string[]|undefined> {
        if (!modalSelectors || modalSelectors.length === 0) {
            if (__DEV__) logger.debug('No modal selectors provided');
            return undefined;
        }

        const errors: string[] = [];
        for (let index = 0; index < modalSelectors.length; index++) {
            const modalSelector = modalSelectors[index]
            if (__DEV__) logger.debug(`Run iteration: "${index + 1}/${modalSelectors.length}"`);
            if (modalSelector) {
                try {
                    const element = await waitForElement(modalSelector.selector);
                    element.dispatchEvent(new PointerEvent(modalSelector.event, {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true}));
                } catch (error) {
                    const errorMessage = `${index + 1}/${modalSelectors.length}: ${(error as Error).message}`;
                    if (__DEV__) logger.debug(errorMessage);
                    errors.push(errorMessage);
                }
            }
        }
        return errors.length > 0 ? errors : undefined;
    }

    private async checkCheckboxes(
        resolve: () => void, reject: (errorDescription: string|null) => void,
        selectorData: ModalSelectorData|undefined, turnOff: boolean) {
      if (!selectorData) {
        reject('No selector provided');
        return;
      }
      try {
        const element = await waitForElement(selectorData.selector);

        const click =
            () => {
              element.dispatchEvent(new PointerEvent('click', {
                bubbles: true,
                cancelable: true,
                button: 0,
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true
              }));
            }

        const target = turnOff ? 'false' : 'true';
        const isChecked = element.getAttribute('aria-checked') === 'true';
        if ((turnOff && isChecked) || (!turnOff && !isChecked)) {
          click();
          await waitForAttributeValue(element, 'aria-checked', target);
        }
        resolve();
      } catch (error) {
        reject((error as Error).message);
      }
    }
}

window.PolicyScriptInstance = new ChatGptPolicyScript();

// See user.ts / webpack.config.js: the bundle's value is exposed through a
// default export, not a trailing IIFE (webpack's wrappers swallow `return`).
export default window.PolicyScriptInstance.applyPolicies();
