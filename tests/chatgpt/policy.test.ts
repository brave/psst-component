// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatGptPolicyScript } from '../../src/chatgpt/policy';
import { PolicyScriptBase } from '../../src/common/policy_base';
import { ChatgptUserScript } from '../../src/chatgpt/user';
import { appendAriaCheckedElement, appendClickTarget } from '../common/policy_mocks';

const ATTEMPTS = PolicyScriptBase.WAIT_FOR_PAGE_ATTEMPTS_COUNT;
const TICK = PolicyScriptBase.WAIT_FOR_PAGE_TIMEOUT;
// Default timeouts baked into waitForElement/waitForAttributeValue
// (src/common/psst_utils.ts) - not exported, so mirrored here.
const ELEMENT_TIMEOUT = 5000;
const ATTRIBUTE_TIMEOUT = 2000;

// Each attempt now runs to completion (poll wait + however long
// checkCheckboxes itself takes) before the next one is scheduled, so the
// total time to exhaust all attempts is ATTEMPTS * (TICK + per-attempt work),
// not ATTEMPTS * TICK plus a single trailing timeout.
const REJECT_AFTER_ELEMENT_NEVER_FOUND = ATTEMPTS * (TICK + ELEMENT_TIMEOUT);
const REJECT_AFTER_ATTRIBUTE_NEVER_FLIPS = ATTEMPTS * (TICK + ATTRIBUTE_TIMEOUT);
const REJECT_AFTER_NO_SELECTOR = ATTEMPTS * TICK;

describe('ChatGptPolicyScript.waitForSettingAppliedWithTimeout', () => {
  let instance: ChatGptPolicyScript;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    instance = new ChatGptPolicyScript();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('no modal_selectors', () => {
    it('skips the modal phase and resolves once the toggle already matches turnOff=true', async () => {
      appendAriaCheckedElement('cb', false);

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, true, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
    });

    it('treats an empty modal_selectors array the same as undefined', async () => {
      appendAriaCheckedElement('cb', false);

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, true, []);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('modal_selectors', () => {
    it('dispatches the configured event on each modal selector already in the DOM, in order', async () => {
      const order: string[] = [];
      const step1 = appendClickTarget('step1');
      step1.element.addEventListener('pointerdown', () => order.push('step1'));
      const step2 = appendClickTarget('step2');
      step2.element.addEventListener('click', () => order.push('step2'));
      appendAriaCheckedElement('cb', false);

      const promise = instance.waitForSettingAppliedWithTimeout(
        { selector: '#cb', event: 'click' }, true,
        [{ selector: '#step1', event: 'pointerdown' }, { selector: '#step2', event: 'click' }],
      );
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(step1.events).toEqual(['pointerdown']);
      expect(step2.events).toEqual(['click']);
      expect(order).toEqual(['step1', 'step2']);
    });

    it('waits for a modal selector that appears asynchronously before dispatching its event', async () => {
      appendAriaCheckedElement('cb', false);
      let target: ReturnType<typeof appendClickTarget> | undefined;
      setTimeout(() => {
        target = appendClickTarget('late');
      }, 1000);

      const promise = instance.waitForSettingAppliedWithTimeout(
        { selector: '#cb', event: 'click' }, true,
        [{ selector: '#late', event: 'pointerdown' }],
      );
      await vi.advanceTimersByTimeAsync(3000);

      await expect(promise).resolves.toBeUndefined();
      expect(target?.events).toEqual(['pointerdown']);
    });

    it('rejects with "Modal selectors error" and never touches the toggle when a modal selector never appears', async () => {
      const cb = appendAriaCheckedElement('cb', true);
      const clickSpy = vi.fn();
      cb.addEventListener('click', clickSpy);

      const promise = instance.waitForSettingAppliedWithTimeout(
        { selector: '#cb', event: 'click' }, true,
        [{ selector: '#missing-modal-step', event: 'pointerdown' }],
      );
      const assertion = expect(promise).rejects.toThrow(
        'Modal selectors error: 1/1: The element not found within timeout',
      );
      await vi.advanceTimersByTimeAsync(ELEMENT_TIMEOUT);

      await assertion;
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('reports only the failing modal selector when one of several is missing', async () => {
      const found = appendClickTarget('found-step');
      appendAriaCheckedElement('cb', false);

      const promise = instance.waitForSettingAppliedWithTimeout(
        { selector: '#cb', event: 'click' }, true,
        [{ selector: '#found-step', event: 'click' }, { selector: '#missing-second-step', event: 'click' }],
      );
      const assertion = expect(promise).rejects.toThrow(
        'Modal selectors error: 2/2: The element not found within timeout',
      );
      await vi.advanceTimersByTimeAsync(ELEMENT_TIMEOUT);

      await assertion;
      expect(found.events).toEqual(['click']);
    });
  });

  describe('toggle checking (aria-checked)', () => {
    it('does not resolve before the first poll tick', async () => {
      appendAriaCheckedElement('cb', false);
      let settled = false;

      const promise = instance
        .waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, true, undefined)
        .finally(() => {
          settled = true;
        });

      await vi.advanceTimersByTimeAsync(TICK - 1);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await promise;
      expect(settled).toBe(true);
    });

    it('clicks and waits for aria-checked to flip to false when turnOff=true', async () => {
      const cb = appendAriaCheckedElement('cb', true);

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, true, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(cb.getAttribute('aria-checked')).toBe('false');
    });

    it('leaves an already-off toggle untouched when turnOff=true', async () => {
      const cb = appendAriaCheckedElement('cb', false);
      const clickSpy = vi.fn();
      cb.addEventListener('click', clickSpy);

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, true, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('clicks and waits for aria-checked to flip to true when turnOff=false', async () => {
      const cb = appendAriaCheckedElement('cb', false);

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, false, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(cb.getAttribute('aria-checked')).toBe('true');
    });

    it('leaves an already-on toggle untouched when turnOff=false', async () => {
      const cb = appendAriaCheckedElement('cb', true);
      const clickSpy = vi.fn();
      cb.addEventListener('click', clickSpy);

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, false, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('always dispatches a plain "click" event regardless of the configured selector event', async () => {
      const cb = appendAriaCheckedElement('cb', true);
      const seenTypes: string[] = [];
      for (const type of ['click', 'pointerdown', 'mousedown']) {
        cb.addEventListener(type, () => seenTypes.push(type));
      }

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'pointerdown' }, true, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(seenTypes).toEqual(['click']);
    });

    it('resolves once the toggle appears on a later poll attempt', async () => {
      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, true, undefined);

      // First tick: nothing in the DOM yet -> a failed attempt, no rejection.
      await vi.advanceTimersByTimeAsync(TICK);

      const cb = appendAriaCheckedElement('cb', true);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(cb.getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('rejection after exhausting attempts', () => {
    it('rejects when selectorData is undefined', async () => {
      const promise = instance.waitForSettingAppliedWithTimeout(undefined, true, undefined);
      const assertion = expect(promise).rejects.toThrow(
        `Checkbox not found after ${ATTEMPTS} attempts. Error: No selector provided`,
      );
      await vi.advanceTimersByTimeAsync(REJECT_AFTER_NO_SELECTOR);

      await assertion;
    });

    it('rejects when no element ever matches the selector', async () => {
      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#never-appears', event: 'click' }, true, undefined);
      const assertion = expect(promise).rejects.toThrow(
        `Checkbox not found after ${ATTEMPTS} attempts. Error: The element not found within timeout`,
      );
      await vi.advanceTimersByTimeAsync(REJECT_AFTER_ELEMENT_NEVER_FOUND);

      await assertion;
    });

    it('rejects when aria-checked never reaches the target value', async () => {
      appendAriaCheckedElement('cb', true, { toggles: false });

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, true, undefined);
      const assertion = expect(promise).rejects.toThrow(
        `Checkbox not found after ${ATTEMPTS} attempts. Error: Attribute "aria-checked" did not become "false" within ${ATTRIBUTE_TIMEOUT}ms`,
      );
      await vi.advanceTimersByTimeAsync(REJECT_AFTER_ATTRIBUTE_NEVER_FLIPS);

      await assertion;
    });

    it('does not reject before the attempt limit is reached', async () => {
      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#never-appears', event: 'click' }, true, undefined);
      let rejected = false;
      promise.catch(() => {
        rejected = true;
      });

      // One tick short of the final attempt maturing.
      await vi.advanceTimersByTimeAsync(REJECT_AFTER_ELEMENT_NEVER_FOUND - 1);
      expect(rejected).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await promise.catch(() => undefined);
      expect(rejected).toBe(true);
    });

    it('never overlaps two attempts, so a toggle that is merely slow to react is not double-clicked', async () => {
      // Regression test: checkCheckboxes used to be re-invoked on a fixed
      // setInterval regardless of whether the previous call had settled. If
      // the page took longer than one poll tick to reflect a click (e.g. a
      // debounced app state update), a second overlapping attempt would see
      // the stale aria-checked value and click again, toggling the setting
      // right back to its original (undesired) state.
      const cb = appendAriaCheckedElement('cb', true, { toggles: false });
      const clickSpy = vi.fn();
      cb.addEventListener('click', clickSpy);
      cb.addEventListener('click', () => {
        // The app reflects the click after a delay longer than one poll
        // tick, but still within waitForAttributeValue's own timeout.
        setTimeout(() => cb.setAttribute('aria-checked', 'false'), TICK + 500);
      });

      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#cb', event: 'click' }, true, undefined);
      await vi.advanceTimersByTimeAsync(TICK + (TICK + 500) + TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(cb.getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('end-to-end with the real chatgpt.com task definition', () => {
    /**
     * Builds a minimal DOM mirroring the real page structure targeted by the
     * "Disable Improve the model for everyone" task in src/chatgpt/user.ts,
     * so the modal_selectors chain from the real ChatgptUserScript output
     * drives real MutationObserver-based waits end to end.
     */
    function buildRealChatgptSettingsDom() {
      const profileButton = document.createElement('div');
      profileButton.setAttribute('data-testid', 'accounts-profile-button');
      const profileButtonInner = document.createElement('div');
      profileButtonInner.className = 'flex min-w-0 items-center gap-2';
      profileButton.appendChild(profileButtonInner);
      document.body.appendChild(profileButton);

      const settingsMenuItem = document.createElement('div');
      settingsMenuItem.setAttribute('data-testid', 'settings-menu-item');
      document.body.appendChild(settingsMenuItem);

      const dataControlsTab = document.createElement('div');
      dataControlsTab.setAttribute('data-testid', 'data-controls-tab');
      const dataControlsInner = document.createElement('div');
      dataControlsInner.className = 'min-w-0';
      const dataControlsLeaf = document.createElement('div');
      dataControlsInner.appendChild(dataControlsLeaf);
      dataControlsTab.appendChild(dataControlsInner);
      document.body.appendChild(dataControlsTab);

      const openModalButton = document.createElement('button');
      openModalButton.setAttribute('data-testid', 'improve-model-open-modal-button');
      const openModalButtonLabel = document.createElement('div');
      openModalButtonLabel.className = 'ps-3';
      openModalButton.appendChild(openModalButtonLabel);
      document.body.appendChild(openModalButton);

      const toggle = document.createElement('button');
      toggle.setAttribute('data-testid', 'improve-model-toggle');
      toggle.setAttribute('aria-checked', 'true');
      toggle.addEventListener('click', () => {
        const current = toggle.getAttribute('aria-checked') === 'true';
        toggle.setAttribute('aria-checked', String(!current));
      });
      document.body.appendChild(toggle);

      return { profileButtonInner, settingsMenuItem, dataControlsLeaf, openModalButtonLabel, toggle };
    }

    it('walks all 4 modal steps in order and turns the toggle off', async () => {
      // getSiteScriptData() is DOM-free (it's a static task description), so
      // no document.cookie/querySelector mocking is needed - and must be
      // avoided here, since mocking querySelector would also break the real
      // waitForElement calls the modal-selector walk depends on below.
      const userScriptInstance = new ChatgptUserScript();
      const siteData = (userScriptInstance as unknown as { getSiteScriptData: () => { tasks: unknown[] } }).getSiteScriptData();
      const task = (siteData as { tasks: Array<{ selector: { selector: string; event: string }; modal_selectors: Array<{ selector: string; event: string }>; turn_off: boolean }> }).tasks[0]!;

      const dom = buildRealChatgptSettingsDom();
      const order: string[] = [];
      dom.profileButtonInner.addEventListener('pointerdown', () => order.push('profile'));
      dom.settingsMenuItem.addEventListener('click', () => order.push('settings'));
      dom.dataControlsLeaf.addEventListener('mousedown', () => order.push('data-controls'));
      dom.openModalButtonLabel.addEventListener('click', () => order.push('open-modal'));

      const promise = instance.waitForSettingAppliedWithTimeout(task.selector, task.turn_off, task.modal_selectors);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(order).toEqual(['profile', 'settings', 'data-controls', 'open-modal']);
      expect(dom.toggle.getAttribute('aria-checked')).toBe('false');
    });
  });
});
