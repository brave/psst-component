// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UserScriptData } from '../../src/common/declarations';
import { PSST_STORAGE_KEY, PsstState } from '../../src/common/psst_utils';
import { ChatgptUserScript } from '../../src/chatgpt/user';
import { fakeElementWithText, mockClientBootstrap, mockDocumentCookie, mockQuerySelector } from '../common/dom_mocks';

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
      mockClientBootstrap('session-user-id', 'Ada Lovelace');
      mockDocumentCookie(authInfoCookie(' Ada Lovelace '));
      const querySelectorSpy = mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('Ada Lovelace');
      expect(querySelectorSpy).not.toHaveBeenCalled();
    });

    it('picks the right cookie among several, ignoring similarly-named ones', () => {
      mockClientBootstrap('session-user-id', 'Real User');
      mockDocumentCookie(`${AUTH_INFO_COOKIE_NAME}-extra=bogus; foo=bar; ${authInfoCookie('Real User')}`);
      mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('Real User');
    });

    it('falls back to the DOM when the cookie is absent', () => {
      mockClientBootstrap(undefined, undefined);
      mockDocumentCookie('foo=bar; other=baz');
      mockQuerySelector(fakeElementWithText(' DOM User '));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when the cookie value is not valid JSON', () => {
      mockClientBootstrap(undefined, undefined);
      mockDocumentCookie(`${AUTH_INFO_COOKIE_NAME}=not-json`);
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when the cookie JSON has no user.name', () => {
      mockClientBootstrap(undefined, undefined);
      mockDocumentCookie(`${AUTH_INFO_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ user: {} }))}`);
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when user.name is not a string', () => {
      mockClientBootstrap(undefined, undefined);
      mockDocumentCookie(authInfoCookie(42));
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when user.name is blank after trimming', () => {
      mockClientBootstrap(undefined, undefined);
      mockDocumentCookie(authInfoCookie('   '));
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });
  });

  describe('session-based identity resolution', () => {
    it('returns the session name when a session is present but the cookie is absent', () => {
      mockClientBootstrap('session-user-id', 'session-user-name');
      mockDocumentCookie('');
      const querySelectorSpy = mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('session-user-name');
      expect(querySelectorSpy).not.toHaveBeenCalled();
    });

    it('returns the session name when the cookie is present but unparsable, without falling back to the DOM', () => {
      mockClientBootstrap('session-user-id', 'session-user-name');
      mockDocumentCookie(`${AUTH_INFO_COOKIE_NAME}=not-json`);
      const querySelectorSpy = mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('session-user-name');
      expect(querySelectorSpy).not.toHaveBeenCalled();
    });

    it('returns the session name even when it differs from a stale cached cookie name', () => {
      mockClientBootstrap('session-user-id', 'New Name');
      mockDocumentCookie(authInfoCookie('Old Name'));
      const querySelectorSpy = mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('New Name');
      expect(querySelectorSpy).not.toHaveBeenCalled();
    });

    it('returns the session id when the session has an id but no name', () => {
      mockClientBootstrap('session-user-id', undefined);
      mockDocumentCookie('');
      const querySelectorSpy = mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('session-user-id');
      expect(querySelectorSpy).not.toHaveBeenCalled();
    });

    it('does not use a stale cookie when there is no active session (avoids a false sign-in positive)', () => {
      mockClientBootstrap(undefined, undefined);
      mockDocumentCookie(authInfoCookie('Ada Lovelace'));
      mockQuerySelector(null);

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBeUndefined();
    });

    it('falls back to the DOM when there is no active session and a stale cookie is present', () => {
      mockClientBootstrap(undefined, undefined);
      mockDocumentCookie(authInfoCookie('Ada Lovelace'));
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });

    it('falls back to the DOM when the client-bootstrap element contains invalid JSON', () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(
        { textContent: 'not-valid-json' } as unknown as HTMLElement);
      mockDocumentCookie('');
      mockQuerySelector(fakeElementWithText('DOM User'));

      const instance = new ChatgptUserScript();
      expect(instance.getUserId()).toBe('DOM User');
    });
  });

  describe('DOM fallback (accounts-profile-button)', () => {
    beforeEach(() => {
      // No session and no auth-info cookie, forcing every case in here down the DOM path.
      mockClientBootstrap(undefined);
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
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a UserScriptData object with the correct shape on success', () => {
    mockClientBootstrap('session-user-id', 'Ada Lovelace');
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

  it('returns undefined when no user id can be resolved (session, cookie and DOM all fail)', () => {
    mockClientBootstrap(undefined);
    mockDocumentCookie('');
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    expect(instance.getTasks()).toBeUndefined();
  });

  it('contains the "improve the model", "measurement" and "personalized" tasks with all required fields', () => {
    mockClientBootstrap('session-user-id');
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks).toHaveLength(3);
    const [improveModelTask, measurementTask, personalizedTask] = data.tasks;

    expect(improveModelTask.uid).toBe('1');
    expect(improveModelTask.url).toBe('https://chatgpt.com/settings/data-controls');
    expect(improveModelTask.selector.event).toBe('click');
    expect(improveModelTask.selector.selector).toMatch(/^button\[type="button"\]\[role="switch"\]:is\(.*\)$/);
    expect(improveModelTask.selector.selector).toContain(`[aria-label="${CSS.escape('Allow chats to improve the model')}"]`);
    expect(improveModelTask.modal_selectors).toBeUndefined();
    expect(improveModelTask.available_for_countries).toBeUndefined();
    expect(improveModelTask.turn_off).toBe(true);
    expect(improveModelTask.error_description).toBeUndefined();

    expect(measurementTask.uid).toBe('2');
    expect(measurementTask.url).toBe('https://chatgpt.com/settings/data-controls?view=marketing-privacy');
    expect(measurementTask.selector.event).toBe('click');
    expect(measurementTask.selector.selector).toMatch(/^button\[type="button"\]\[role="switch"\]:is\(.*\)$/);
    expect(measurementTask.selector.selector).toContain(`[aria-label="${CSS.escape('Allow marketing measurement')}"]`);
    expect(measurementTask.modal_selectors).toBeUndefined();
    expect(measurementTask.available_for_countries).toEqual(['us']);
    expect(measurementTask.turn_off).toBe(true);
    expect(measurementTask.error_description).toBeUndefined();

    expect(personalizedTask.uid).toBe('3');
    expect(personalizedTask.url).toBe('https://chatgpt.com/settings/data-controls?view=marketing-privacy');
    expect(personalizedTask.selector.event).toBe('click');
    expect(personalizedTask.selector.selector).toMatch(/^button\[type="button"\]\[role="switch"\]:is\(.*\)$/);
    expect(personalizedTask.selector.selector).toContain(`[aria-label="${CSS.escape('Allow personalized marketing')}"]`);
    expect(personalizedTask.modal_selectors).toBeUndefined();
    expect(personalizedTask.available_for_countries).toEqual(['us']);
    expect(personalizedTask.turn_off).toBe(true);
    expect(personalizedTask.error_description).toBeUndefined();
  });

  it('propagates getUserId result into user_id', () => {
    mockClientBootstrap('session-user-id');
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.user_id).toBe(instance.getUserId());
  });

  it('sets initial_execution to true when no psst state is stored', () => {
    mockClientBootstrap('session-user-id');
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(true);
  });

  it('sets initial_execution to false when psst state is STARTED', () => {
    mockClientBootstrap('session-user-id');
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);
    sessionStorage.setItem(PSST_STORAGE_KEY, JSON.stringify({
      state: PsstState.STARTED,
      start_url: window.location.href,
      updated_at: Date.now(),
    }));

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(false);
  });

  it('sets initial_execution to true when psst state is COMPLETED', () => {
    mockClientBootstrap('session-user-id');
    mockDocumentCookie(authInfoCookie('Ada Lovelace'));
    mockQuerySelector(null);
    sessionStorage.setItem(PSST_STORAGE_KEY, JSON.stringify({ state: PsstState.COMPLETED }));

    const instance = new ChatgptUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(true);
  });
});
