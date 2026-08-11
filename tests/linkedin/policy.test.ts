// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LinkedInPolicyScript } from '../../src/linkedin/policy';
import { PolicyScriptBase } from '../../src/common/policy_base';
import { appendCheckbox } from '../common/policy_mocks';

const ATTEMPTS = PolicyScriptBase.WAIT_FOR_PAGE_ATTEMPTS_COUNT;
const TICK = PolicyScriptBase.WAIT_FOR_PAGE_TIMEOUT;
const SELECTOR = { selector: '#toggle', event: 'click' };

describe('LinkedInPolicyScript.waitForSettingAppliedWithTimeout', () => {
  let instance: LinkedInPolicyScript;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    instance = new LinkedInPolicyScript();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('turnOff = true (setting should end up unchecked)', () => {
    it('unchecks a checked checkbox', async () => {
      const checkbox = appendCheckbox('toggle', true);

      const promise = instance.waitForSettingAppliedWithTimeout(SELECTOR, true, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(checkbox.checked).toBe(false);
    });

    it('leaves an already-unchecked checkbox untouched', async () => {
      const checkbox = appendCheckbox('toggle', false);
      const clickSpy = vi.spyOn(checkbox, 'click');

      const promise = instance.waitForSettingAppliedWithTimeout(SELECTOR, true, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(checkbox.checked).toBe(false);
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('turnOff = false (setting should end up checked)', () => {
    it('checks an unchecked checkbox', async () => {
      const checkbox = appendCheckbox('toggle', false);

      const promise = instance.waitForSettingAppliedWithTimeout(SELECTOR, false, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(checkbox.checked).toBe(true);
    });

    it('leaves an already-checked checkbox untouched', async () => {
      const checkbox = appendCheckbox('toggle', true);
      const clickSpy = vi.spyOn(checkbox, 'click');

      const promise = instance.waitForSettingAppliedWithTimeout(SELECTOR, false, undefined);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(checkbox.checked).toBe(true);
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('polling behaviour', () => {
    it('does not resolve before the first interval tick', async () => {
      appendCheckbox('toggle', true);
      let settled = false;

      const promise = instance
        .waitForSettingAppliedWithTimeout(SELECTOR, true, undefined)
        .finally(() => {
          settled = true;
        });

      await vi.advanceTimersByTimeAsync(TICK - 1);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await promise;
      expect(settled).toBe(true);
    });

    it('resolves once the checkbox appears on a later attempt', async () => {
      const promise = instance.waitForSettingAppliedWithTimeout(SELECTOR, true, undefined);

      // First tick: nothing in the DOM yet -> a failed attempt, no rejection.
      await vi.advanceTimersByTimeAsync(TICK);

      const checkbox = appendCheckbox('toggle', true);
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(checkbox.checked).toBe(false);
    });
  });

  describe('rejection after exhausting attempts', () => {
    it('rejects when the selector is undefined', async () => {
      const promise = instance.waitForSettingAppliedWithTimeout(undefined, true, undefined);
      const assertion = expect(promise).rejects.toThrow(
        `Checkbox not found after ${ATTEMPTS} attempts. Error: No selector provided`,
      );

      await vi.advanceTimersByTimeAsync(TICK * ATTEMPTS);
      await assertion;
    });

    it('rejects when no element matches the selector', async () => {
      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#missing', event: 'click' }, true, undefined);
      const assertion = expect(promise).rejects.toThrow(
        `Checkbox not found after ${ATTEMPTS} attempts. Error: No checkbox found`,
      );

      await vi.advanceTimersByTimeAsync(TICK * ATTEMPTS);
      await assertion;
    });

    it('rejects when the matched element is not a checkbox', async () => {
      const text = document.createElement('input');
      text.type = 'text';
      text.id = 'toggle';
      document.body.appendChild(text);

      const promise = instance.waitForSettingAppliedWithTimeout(SELECTOR, true, undefined);
      const assertion = expect(promise).rejects.toThrow(
        `Checkbox not found after ${ATTEMPTS} attempts. Error: No checkbox found`,
      );

      await vi.advanceTimersByTimeAsync(TICK * ATTEMPTS);
      await assertion;
    });

    it('does not reject before the attempt limit is reached', async () => {
      const promise = instance.waitForSettingAppliedWithTimeout({ selector: '#missing', event: 'click' }, true, undefined);
      let rejected = false;
      promise.catch(() => {
        rejected = true;
      });

      // One tick short of the limit.
      await vi.advanceTimersByTimeAsync(TICK * (ATTEMPTS - 1));
      expect(rejected).toBe(false);

      // Settle the promise so it doesn't leak as an unhandled rejection.
      await vi.advanceTimersByTimeAsync(TICK);
      await promise.catch(() => undefined);
      expect(rejected).toBe(true);
    });
  });

  describe('modal_selectors (unsupported on linkedin)', () => {
    it('accepts a modal_selectors argument but never waits on or clicks it', async () => {
      const checkbox = appendCheckbox('toggle', false);
      const modalClickSpy = vi.fn();
      // Deliberately never appended to document.body: if LinkedInPolicyScript
      // ever started waiting on modal_selectors like chatgpt does, this
      // missing element would make the promise hang or reject instead of
      // resolving on the very next tick.
      const modal = document.createElement('div');
      modal.id = 'modal-step';
      modal.addEventListener('click', modalClickSpy);

      const promise = instance.waitForSettingAppliedWithTimeout(
        SELECTOR, false, [{ selector: '#modal-step', event: 'click' }],
      );
      await vi.advanceTimersByTimeAsync(TICK);

      await expect(promise).resolves.toBeUndefined();
      expect(checkbox.checked).toBe(true);
      expect(modalClickSpy).not.toHaveBeenCalled();
    });
  });
});
