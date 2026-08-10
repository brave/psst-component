// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, afterEach } from 'vitest';
import { UserScriptBase } from '../../src/common/user_base';
import type { UserScriptData } from '../../src/common/declarations';
import type { Task } from '../../src/common/psst_utils';

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
      makeTask({ uid: '2', available_for_countries: ['US'] }),
      makeTask({ uid: '3', unavailable_for_countries: ['US'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1', '2', '3']);
  });

  it('keeps all tasks, including country-restricted ones, when params.countryId is explicitly undefined', () => {
    setGlobalParams({ countryId: undefined });
    const instance = new TestUserScript([
      makeTask({ uid: '1' }),
      makeTask({ uid: '2', available_for_countries: ['US'] }),
      makeTask({ uid: '3', unavailable_for_countries: ['US'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1', '2', '3']);
  });

  it('reads countryId from a params global object and keeps only matching available_for_countries tasks', () => {
    setGlobalParams({ countryId: 'US' });
    const instance = new TestUserScript([
      makeTask({ uid: '1', available_for_countries: ['US'] }),
      makeTask({ uid: '2', available_for_countries: ['DE'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1']);
  });

  it('reads countryId from a JSON-stringified params global', () => {
    setGlobalParams(JSON.stringify({ countryId: 'US' }));
    const instance = new TestUserScript([
      makeTask({ uid: '1', available_for_countries: ['US'] }),
      makeTask({ uid: '2', available_for_countries: ['DE'] }),
    ]);

    const data = instance.getTasks() as UserScriptData;

    expect(data.tasks.map(task => task.uid)).toEqual(['1']);
  });

  it('excludes tasks whose unavailable_for_countries includes the current country', () => {
    setGlobalParams({ countryId: 'US' });
    const instance = new TestUserScript([
      makeTask({ uid: '1', unavailable_for_countries: ['US'] }),
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
