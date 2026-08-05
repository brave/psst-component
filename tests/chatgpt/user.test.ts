// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UserScriptData } from '../../src/common/declarations';
import { PSST_LOCALSTORAGE_KEY, PsstState } from '../../src/common/psst_utils';
import { ChatgptUserScript } from '../../src/chatgpt/user';
import { fakeElementWithText, mockDocumentCookie, mockQuerySelector } from '../common/dom_mocks';

const AUTH_INFO_COOKIE_NAME = 'oai-client-auth-info';
const USER_IDENTIFIER_SELECTOR = '[data-testid="accounts-profile-button"] .truncate';

/** Builds a valid `oai-client-auth-info` cookie string for the given name. */
function authInfoCookie(name: unknown): string {
  const value = encodeURIComponent(JSON.stringify({ user: { name } }));
  return `${AUTH_INFO_COOKIE_NAME}=${value}`;
}

describe('ChatgptUserScript.getUserId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cookie extraction (oai-client-auth-info)', () => {
    it('returns the trimmed name from a well-formed cookie without falling back to the DOM', () => {
      mockDocumentCookie(authInfoCookie(' Ada Lovelace '));
      const querySelectorSpy = mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('Ada Lovelace');
      expect(querySelectorSpy).not.toHaveBeenCalled();
    });

    it('picks the right cookie among several, ignoring similarly-named ones', () => {
      mockDocumentCookie(`${AUTH_INFO_COOKIE_NAME}-extra=bogus; foo=bar; ${authInfoCookie('Real User')}`);
      mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('Real User');
    });

    it('falls back to the DOM when the cookie is absent', () => {
      mockDocumentCookie('foo=bar; other=baz');
      mockQuerySelector(fakeElementWithText(' DOM User '));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when the cookie value is not valid JSON', () => {
      mockDocumentCookie(`${AUTH_INFO_COOKIE_NAME}=not-json`);
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when the cookie JSON has no user.name', () => {
      mockDocumentCookie(`${AUTH_INFO_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ user: {} }))}`);
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when user.name is not a string', () => {
      mockDocumentCookie(authInfoCookie(42));
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when user.name is blank after trimming', () => {
      mockDocumentCookie(authInfoCookie('   '));
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });
  });

  describe('DOM fallback (accounts-profile-button)', () => {
    beforeEach(() => {
      // No auth-info cookie present, forcing every case in here down the DOM path.
      mockDocumentCookie('');
    });

    it('returns the trimmed textContent of the matched element', () => {
      mockQuerySelector(fakeElementWithText('  Jane Doe  '));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('Jane Doe');
    });

    it('queries with the expected selector', () => {
      const spy = mockQuerySelector(fakeElementWithText('Jane Doe'));

      const instance = new ChatgptUserScript();
      instance.getUserId();
      expect(spy).toHaveBeenCalledWith(USER_IDENTIFIER_SELECTOR);
    });

    it('returns undefined when no element matches the selector', () => {
      mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBeUndefined();
    });

    it('returns undefined when the matched element has no textContent', () => {
      mockQuerySelector(fakeElementWithText(null));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBeUndefined();
    });

    it('returns undefined when the matched element textContent is blank after trimming', () => {
      mockQuerySelector(fakeElementWithText('   '));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBeUndefined();
    });
  });
});

describe('ChatgptUserScript.getTasks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a UserScriptData object with the correct shape on success', () => {
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;

    expect(data).toBeDefined();
    expect(data).toHaveProperty('user_id', 'Ada Lovelace');
    expect(data).toHaveProperty('share_experience_link', '');
    expect(data).toHaveProperty('site_name', 'chatgpt.com');
    expect(data).toHaveProperty('tasks');
  });

  it('returns undefined when no user id can be resolved (cookie and DOM both fail)', () => {
    mockDocumentCookie('');
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    expect(instance.getTasks()).toBeUndefined();
  });

  it('contains exactly the "improve the model" task with all required fields', () => {
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks).toHaveLength(1);
    const [task] = data.tasks;
    expect(task.uid).toBe('1');
    expect(task.url).toBe('https://chatgpt.com/');
    expect(task.selector).toEqual({ selector: 'button[data-testid="improve-model-toggle"]', event: 'click' });
    expect(task.modal_selectors).toHaveLength(4);
    expect(task.turn_off).toBe(true);
    expect(task.error_description).toBeUndefined();
  });

  it('propagates getUserId result into user_id', () => {
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.user_id).toBe(instance.getUserId());
  });

  it('sets initial_execution to true when no psst state is stored', () => {
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(true);
  });

  it('sets initial_execution to false when psst state is STARTED', () => {
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);
    localStorage.setItem(PSST_LOCALSTORAGE_KEY, JSON.stringify({ state: PsstState.STARTED }));

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(false);
  });

  it('sets initial_execution to true when psst state is COMPLETED', () => {
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);
    localStorage.setItem(PSST_LOCALSTORAGE_KEY, JSON.stringify({ state: PsstState.COMPLETED }));

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(true);
  });
});
