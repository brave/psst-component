// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, afterEach } from 'vitest';
import { UserScriptBase } from '../../src/common/user_base';
import type { UserScriptData } from '../../src/common/declarations';
import type { Task } from '../../src/common/psst_utils';
import { getSHA } from '../../src/common/psst_utils';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  uid: '1',
  url: 'https://example.com/settings',
  description: 'test task',
  modal_selectors: undefined,
  selector: { selector: '#toggle', event: 'click' },
  available_for_countries: undefined,
  unavailable_for_countries: undefined,
  turn_off: true,
  error_description: undefined,
  ...overrides
});

class TestUserScript extends UserScriptBase {
  readonly version = 1;
  readonly includeUrlPatterns: string[] = [];
  readonly excludeUrlPatterns: string[] = [];
  readonly userScript = 'user.js';
  readonly policyScript = 'policy.js';

  constructor(
      private readonly tasks: Task[],
      private readonly userId: string|undefined = 'user-1') {
    super();
  }

  getUserId(): string|undefined {
    return this.userId;
  }

  protected getSiteScriptData() {
    return {
      share_experience_link: 'https://example.com/intent?text=$1',
      site_name: 'example.com',
      tasks: this.tasks
    };
  }
}

// The host prepends `const params = {...}` before the bundle in production;
// in tests there's no such lexical binding, so parseParams() falls through to
// its window/globalThis fallback. Set it there to simulate the host passing
// UserScriptInputData through.
const setGlobalParams = (value: unknown) => {
  (window as any).__bravePsstParams = value;
};

describe('UserScriptBase country filtering', () => {
  afterEach(() => {
    delete (window as any).__bravePsstParams;
  });

  it('defaults countryId to undefined when no params global is set, keeping all tasks regardless of country restrictions', () => {
    const instance = new TestUserScript([
      makeTask({ uid: '1' }),
      makeTask({ uid: '2', available_for_countries: ['us'] }),
      makeTask({ uid: '3', unavailable_for_countries: ['us'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1', '2', '3']);
  });

  it('keeps all tasks, including country-restricted ones, when params.countryId is explicitly undefined', () => {
    setGlobalParams({ countryId: undefined });
    const instance = new TestUserScript([
      makeTask({ uid: '1' }),
      makeTask({ uid: '2', available_for_countries: ['us'] }),
      makeTask({ uid: '3', unavailable_for_countries: ['us'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1', '2', '3']);
  });

  it('reads countryId from a params global object and keeps only matching available_for_countries tasks', () => {
    setGlobalParams({ countryId: 'us' });
    const instance = new TestUserScript([
      makeTask({ uid: '1', available_for_countries: ['us'] }),
      makeTask({ uid: '2', available_for_countries: ['DE'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1']);
  });

  it('reads countryId from a JSON-stringified params global', () => {
    setGlobalParams(JSON.stringify({ countryId: 'us' }));
    const instance = new TestUserScript([
      makeTask({ uid: '1', available_for_countries: ['us'] }),
      makeTask({ uid: '2', available_for_countries: ['DE'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1']);
  });

  it('excludes tasks whose unavailable_for_countries includes the current country', () => {
    setGlobalParams({ countryId: 'us' });
    const instance = new TestUserScript([
      makeTask({ uid: '1', unavailable_for_countries: ['us'] }),
      makeTask({ uid: '2', unavailable_for_countries: ['DE'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['2']);
  });

  it('keeps tasks with no country restrictions regardless of countryId', () => {
    setGlobalParams({ countryId: 'FR' });
    const instance = new TestUserScript([makeTask({ uid: '1' })]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1']);
  });
});

describe('UserScriptBase user_id hashing', () => {
  afterEach(() => {
    delete (window as any).__bravePsstParams;
  });

  it('replaces the raw user id with its SHA-256 hex hash', () => {
    const instance = new TestUserScript([makeTask({ uid: '1' })], 'user-1');

    const data = instance.getTasks() as UserScriptData;

    // Known SHA-256("user-1") test vector, verified independently via
    // `printf '%s' "user-1" | sha256sum`.
    expect(data.user_id)
        .toEqual(
            'c6c289e49e9c05b2145860387b73bcb18df43fb09a1e4a4a9713c76c88bb541b');
    expect(data.user_id).not.toEqual('user-1');
  });

  it('matches the getSHA helper output for the same user id', () => {
    const instance = new TestUserScript([makeTask({ uid: '1' })], 'user-1');

    const data = instance.getTasks() as UserScriptData;

    expect(data.user_id).toEqual(getSHA('user-1'));
  });

  it('produces different hashes for different user ids', () => {
    const instanceA =
        new TestUserScript([makeTask({ uid: '1' })], 'user-1');
    const instanceB =
        new TestUserScript([makeTask({ uid: '1' })], 'user-2');

    const dataA = instanceA.getTasks() as UserScriptData;
    const dataB = instanceB.getTasks() as UserScriptData;

    expect(dataA.user_id).not.toEqual(dataB.user_id);
  });

  it('produces the same hash on repeated calls for the same user id', () => {
    const instance = new TestUserScript([makeTask({ uid: '1' })], 'user-1');

    const first = (instance.getTasks() as UserScriptData).user_id;
    const second = (instance.getTasks() as UserScriptData).user_id;

    expect(first).toEqual(second);
  });
});
