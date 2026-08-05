// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UserScriptData } from '../../src/common/declarations';
import type { Task } from '../../src/common/psst_utils';
import { PSST_LOCALSTORAGE_KEY, PsstState } from '../../src/common/psst_utils';
import { LinkedinUserScript } from '../../src/linkedin/user';
import { mockDocumentCookie, spyOnDocumentCookieWrites } from '../common/dom_mocks';

const SIGNED_USER_LS_KEY_NAME = 'voyager';
const CACHE_COOKIE_NAME = 'psst_linkedin_uid';

/** Marks the page as signed in, the way LinkedIn's own app state does. */
function markSignedIn() {
  localStorage.setItem(SIGNED_USER_LS_KEY_NAME, '1');
}

/** Builds the encoded cache cookie value getUserId()/readCachedUid() expect. */
function cachedUidCookie(uid: unknown): string {
  return `${CACHE_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ uid }))}`;
}

/** Appends a profile link matching the `a[href*="/in/"]` DOM fallback selector. */
function appendProfileLink(href: string): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.href = href;
  document.body.appendChild(anchor);
  return anchor;
}

describe('LinkedinUserScript.getUserId', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('not signed in', () => {
    it('returns undefined and deletes the cache cookie when no voyager key is present', () => {
      mockDocumentCookie(cachedUidCookie('should-be-ignored'));
      const writeSpy = spyOnDocumentCookieWrites();

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBeUndefined();
      expect(writeSpy).toHaveBeenCalledWith(`${CACHE_COOKIE_NAME}=; max-age=0; path=/`);
    });

    it('treats unrelated localStorage keys as not signed in', () => {
      localStorage.setItem('some_other_key', '1');
      mockDocumentCookie('');

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBeUndefined();
    });
  });

  describe('signed in, cached uid present', () => {
    it('returns the cached uid without touching the DOM', () => {
      markSignedIn();
      mockDocumentCookie(cachedUidCookie('cached_user'));
      const querySelectorSpy = vi.spyOn(document, 'querySelector');
      // No profile link appended - if the cache were skipped, the DOM
      // fallback below would have nothing to find.

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBe('cached_user');
      expect(querySelectorSpy).not.toHaveBeenCalled();
    });

    it('falls back to the DOM when the cache cookie is not valid JSON', () => {
      markSignedIn();
      mockDocumentCookie(`${CACHE_COOKIE_NAME}=not-json`);
      appendProfileLink('https://www.linkedin.com/in/dom-user/');

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBe('dom-user');
    });

    it('falls back to the DOM when the cached JSON has no uid', () => {
      markSignedIn();
      mockDocumentCookie(`${CACHE_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({}))}`);
      appendProfileLink('https://www.linkedin.com/in/dom-user/');

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBe('dom-user');
    });

    it('falls back to the DOM when the cached uid is not a string', () => {
      markSignedIn();
      mockDocumentCookie(cachedUidCookie(42));
      appendProfileLink('https://www.linkedin.com/in/dom-user/');

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBe('dom-user');
    });

    it('falls back to the DOM when the cache cookie is present but empty', () => {
      markSignedIn();
      mockDocumentCookie(`${CACHE_COOKIE_NAME}=`);
      appendProfileLink('https://www.linkedin.com/in/dom-user/');

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBe('dom-user');
    });
  });

  describe('signed in, DOM fallback (a[href*="/in/"])', () => {
    beforeEach(() => {
      markSignedIn();
      // No cache cookie, forcing every case in here down the DOM path.
      mockDocumentCookie('');
    });

    it('extracts the uid from a realistic profile link and caches it', () => {
      const writeSpy = spyOnDocumentCookieWrites();
      appendProfileLink('https://www.linkedin.com/in/john-doe-123/');

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBe('john-doe-123');
      expect(writeSpy).toHaveBeenCalledWith(
        `${CACHE_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ uid: 'john-doe-123' }))}; max-age=6000; path=/`,
      );
    });

    it('returns undefined when no profile link is present', () => {
      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBeUndefined();
    });

    it('returns undefined when the matched link has no uid segment after /in/', () => {
      appendProfileLink('https://www.linkedin.com/in/');

      const instance = new LinkedinUserScript();
      expect(instance.getUserId()).toBeUndefined();
    });
  });
});

describe('LinkedinUserScript.getTasks', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function signInWithCachedUid(uid: string) {
    markSignedIn();
    mockDocumentCookie(cachedUidCookie(uid));
  }

  it('returns a UserScriptData object with the correct shape on success', () => {
    signInWithCachedUid('test_user');

    const instance = new LinkedinUserScript();
    const data = instance.getTasks() as UserScriptData;

    expect(data).toBeDefined();
    expect(data).toHaveProperty('user_id', 'test_user');
    expect(data).toHaveProperty('share_experience_link', '');
    expect(data).toHaveProperty('site_name', 'linkedin.com');
    expect(data).toHaveProperty('tasks');
  });

  it('returns undefined when not signed in', () => {
    mockDocumentCookie('');

    const instance = new LinkedinUserScript();
    expect(instance.getTasks()).toBeUndefined();
  });

  it('contains 13 task entries, none using modal_selectors', () => {
    signInWithCachedUid('test_user');

    const instance = new LinkedinUserScript();
    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks).toHaveLength(13);
    for (const task of data.tasks) {
      expect(task.modal_selectors).toBeUndefined();
    }
  });

  it('each task has all required fields', () => {
    signInWithCachedUid('test_user');

    const instance = new LinkedinUserScript();
    const data = instance.getTasks() as UserScriptData;
    const requiredFields: (keyof Task)[] = ['uid', 'url', 'description', 'selector', 'turn_off'];

    for (const task of data.tasks) {
      for (const field of requiredFields) {
        expect(task).toHaveProperty(String(field));
      }
    }
  });

  it('all task UIDs are unique', () => {
    signInWithCachedUid('test_user');

    const instance = new LinkedinUserScript();
    const data = instance.getTasks() as UserScriptData;
    const uids = data.tasks.map(t => t.uid);
    expect(uids.length).toBe(new Set(uids).size);
  });

  it('propagates getUserId result into user_id', () => {
    signInWithCachedUid('test_user');

    const instance = new LinkedinUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.user_id).toBe(instance.getUserId());
  });

  it('sets initial_execution to true when no psst state is stored', () => {
    signInWithCachedUid('test_user');

    const instance = new LinkedinUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(true);
  });

  it('sets initial_execution to false when psst state is STARTED', () => {
    signInWithCachedUid('test_user');
    localStorage.setItem(PSST_LOCALSTORAGE_KEY, JSON.stringify({ state: PsstState.STARTED }));

    const instance = new LinkedinUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(false);
  });

  it('sets initial_execution to true when psst state is COMPLETED', () => {
    signInWithCachedUid('test_user');
    localStorage.setItem(PSST_LOCALSTORAGE_KEY, JSON.stringify({ state: PsstState.COMPLETED }));

    const instance = new LinkedinUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(true);
  });
});
