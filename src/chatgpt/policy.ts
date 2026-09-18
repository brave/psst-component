
// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { logger } from "../common/logger";
import { PolicyScriptBase } from "../common/policy_base";
import { waitForAttributeValue, waitForElement, type ModalSelectorData } from "../common/psst_utils";


export class ChatGptPolicyScript extends PolicyScriptBase {
    // Number of times to re-resolve a modal selector when the element
    // `waitForElement` returned has been detached from the DOM by the time we
    // are about to dispatch on it (e.g. a tab switch re-renders the target
    // between resolution and dispatch).
    private static readonly CLICK_STALE_ELEMENT_RETRIES = 3;

    // Dispatching a bare 'pointerdown'/'mousedown' with no matching "up"/
    // click can leave the page's own gesture or navigation-blocker state half
    // -armed (observed live as a React Router "only one blocker at a time"
    // error right before the next step's click was silently swallowed).
    // Completing the natural event sequence for "down" events resolves that
    // state before moving on, the same way it would after a real click.
    private static readonly GESTURE_COMPLETIONS: Record<string, string[]> = {
        pointerdown: ['pointerup', 'click'],
        mousedown: ['mouseup', 'click'],
    };

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
            if (__DEV__) logger.debug(`Attempt:${attemptCount}`);
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
                    if (__DEV__) logger.debug(`Run clickWhenConnected`);
                    await this.clickWhenConnected(modalSelector);
                } catch (error) {
                    const errorMessage = `${index + 1}/${modalSelectors.length}: ${(error as Error).message}`;
                    if (__DEV__) logger.debug(errorMessage);
                    errors.push(errorMessage);
                }
            }
        }
        return errors.length > 0 ? errors : undefined;
    }

    // waitForElement can resolve with an element from a transient render (e.g.
    // a tab-switch re-render triggered by the previous modal selector) that
    // gets replaced again before this coroutine's next line runs. Dispatching
    // on that now-detached node is a silent no-op, so re-check `isConnected`
    // right before dispatch and re-resolve the selector against the live DOM
    // if it went stale.
    private async clickWhenConnected(modalSelector: ModalSelectorData): Promise<void> {
        for (let attempt = 1; attempt <= ChatGptPolicyScript.CLICK_STALE_ELEMENT_RETRIES; attempt++) {
            const element = await waitForElement(modalSelector.selector);
            if (element.isConnected) {
                if (__DEV__) logger.debug(`Pre dispatchPointerEventSequence ${element}`);
                await this.dispatchPointerEventSequence(element, modalSelector.event);
                return;
            }
            if (__DEV__) logger.debug(`Element for selector "${modalSelector.selector}" went stale before dispatch (attempt ${attempt}/${ChatGptPolicyScript.CLICK_STALE_ELEMENT_RETRIES})`);
        }
        throw new Error(`Element for selector "${modalSelector.selector}" went stale before it could be clicked`);
    }

    // Deferring each dispatch to the next macrotask (rather than firing
    // immediately after waitForElement resolves) gives a pending
    // render/animation/effect from the previous step time to finish first -
    // dispatching synchronously right after resolution was observed to
    // silently no-op live on macOS Brave even though the element existed and
    // was connected.
    private async dispatchPointerEventSequence(element: HTMLElement, event: string): Promise<void> {
        const options = {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true};
        await this.nextTick();
        if (__DEV__) logger.debug(`dispatchPointerEventSequence event:${event} element:${element}`);
        element.dispatchEvent(new PointerEvent(event, options));
        for (const followUp of ChatGptPolicyScript.GESTURE_COMPLETIONS[event] ?? []) {
            await this.nextTick();
            if (__DEV__) logger.debug(`dispatchPointerEventSequence followUp event:"${followUp}"`);
            element.dispatchEvent(new PointerEvent(followUp, options));
        }
    }

    private nextTick(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, 0));
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

        if (__DEV__) logger.debug(`checkCheckboxes element:${element}`);
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
        if (__DEV__) logger.debug(`checkCheckboxes error:${error}`);
        reject((error as Error).message);
      }
    }
}

window.PolicyScriptInstance = new ChatGptPolicyScript();

// See user.ts / webpack.config.js: the bundle's value is exposed through a
// default export, not a trailing IIFE (webpack's wrappers swallow `return`).
export default window.PolicyScriptInstance.applyPolicies();
