// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UserScriptData } from '../../src/common/declarations';
import type { Task } from '../../src/common/psst_utils';
import { PSST_LOCALSTORAGE_KEY, PsstState } from '../../src/common/psst_utils';
import { TwitterUserScript } from '../../src/twitter/user';
import { mockDocumentCookie } from '../common/dom_mocks';

const TWID_COOKIE_NAME = 'twid';

describe('TwitterUserScript.getUserId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the twid cookie value when present', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=abc123; foo=bar`);

    const instance = new TwitterUserScript();
    expect(instance.getUserId()).toBe('abc123');
  });

  it('returns undefined when the twid cookie is absent', () => {
    mockDocumentCookie('foo=bar; other=baz');

    const instance = new TwitterUserScript();
    expect(instance.getUserId()).toBeUndefined();
  });

  it('returns undefined when twid is present but empty', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=`);

    const instance = new TwitterUserScript();
    expect(instance.getUserId()).toBeUndefined();
  });

  it('returns the raw cookie value without URL-decoding it', () => {
    // Unlike chatgpt's cookie parsing (which decodeURIComponent's the
    // value), TwitterUserScript.getUserId() never decodes - the encoded
    // string is returned verbatim.
    mockDocumentCookie(`${TWID_COOKIE_NAME}=t%3A12345`);

    const instance = new TwitterUserScript();
    expect(instance.getUserId()).toBe('t%3A12345');
  });

  it('ignores similarly-named cookies', () => {
    mockDocumentCookie('twid_extra=other; twid=real_value');

    const instance = new TwitterUserScript();
    expect(instance.getUserId()).toBe('real_value');
  });

  it('truncates the value at a second "=" (naive split, not a real cookie parser)', () => {
    // getUserId() does `twidCookie.split('=')` and destructures only the
    // second element, so a value containing its own "=" is silently cut off
    // after the first segment. Documented here as the actual current
    // behavior, not as an endorsement of it.
    mockDocumentCookie(`${TWID_COOKIE_NAME}=abc=123`);

    const instance = new TwitterUserScript();
    expect(instance.getUserId()).toBe('abc');
  });
});

describe('TwitterUserScript.getTasks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a UserScriptData object with the correct shape on success', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=test_user`);

    const instance = new TwitterUserScript();
    const data = instance.getTasks() as UserScriptData;

    expect(data).toBeDefined();
    expect(data).toHaveProperty('user_id', 'test_user');
    expect(data).toHaveProperty('share_experience_link', 'https://x.com/intent/post?text=$1');
    expect(data).toHaveProperty('site_name', 'x.com');
    expect(data).toHaveProperty('tasks');
  });

  it('returns undefined when no twid cookie is present', () => {
    mockDocumentCookie('');

    const instance = new TwitterUserScript();
    expect(instance.getTasks()).toBeUndefined();
  });

  it('contains 4 task entries, none using modal_selectors', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=test_user`);

    const instance = new TwitterUserScript();
    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks).toHaveLength(4);
    for (const task of data.tasks) {
      expect(task.modal_selectors).toBeUndefined();
    }
  });

  it('each task has all required fields', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=test_user`);

    const instance = new TwitterUserScript();
    const data = instance.getTasks() as UserScriptData;
    const requiredFields: (keyof Task)[] = ['uid', 'url', 'description', 'selector', 'turn_off'];

    for (const task of data.tasks) {
      for (const field of requiredFields) {
        expect(task).toHaveProperty(String(field));
      }
    }
  });

  it('all task UIDs are unique', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=test_user`);

    const instance = new TwitterUserScript();
    const data = instance.getTasks() as UserScriptData;
    const uids = data.tasks.map(t => t.uid);
    expect(uids.length).toBe(new Set(uids).size);
  });

  it('propagates getUserId result into user_id', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=test_user`);

    const instance = new TwitterUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.user_id).toBe(instance.getUserId());
  });

  it('sets initial_execution to true when no psst state is stored', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=test_user`);

    const instance = new TwitterUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(true);
  });

  it('sets initial_execution to false when psst state is STARTED', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=test_user`);
    localStorage.setItem(PSST_LOCALSTORAGE_KEY, JSON.stringify({ state: PsstState.STARTED }));

    const instance = new TwitterUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(false);
  });

  it('sets initial_execution to true when psst state is COMPLETED', () => {
    mockDocumentCookie(`${TWID_COOKIE_NAME}=test_user`);
    localStorage.setItem(PSST_LOCALSTORAGE_KEY, JSON.stringify({ state: PsstState.COMPLETED }));

    const instance = new TwitterUserScript();
    const data = instance.getTasks() as UserScriptData;
    expect(data.initial_execution).toBe(true);
  });
});
