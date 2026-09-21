// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isInitialExecution, isTaskAvailableForCountry, PSST_STORAGE_KEY, PsstState } from '../../src/common/psst_utils';
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

describe('isTaskAvailableForCountry', () => {
  it('is available when countryId is undefined, even for a restricted task', () => {
    const task = makeTask({
      available_for_countries: ['us'],
      unavailable_for_countries: ['DE']
    });

    expect(isTaskAvailableForCountry(task, undefined)).toBe(true);
  });

  it('is unavailable when the countryId is in unavailable_for_countries', () => {
    const task = makeTask({ unavailable_for_countries: ['us'] });

    expect(isTaskAvailableForCountry(task, 'us')).toBe(false);
  });

  it('is available when the countryId is not in unavailable_for_countries', () => {
    const task = makeTask({ unavailable_for_countries: ['DE'] });

    expect(isTaskAvailableForCountry(task, 'us')).toBe(true);
  });

  it('is available when the countryId is in available_for_countries', () => {
    const task = makeTask({ available_for_countries: ['us'] });

    expect(isTaskAvailableForCountry(task, 'us')).toBe(true);
  });

  it('is unavailable when the countryId is not in available_for_countries', () => {
    const task = makeTask({ available_for_countries: ['DE'] });

    expect(isTaskAvailableForCountry(task, 'us')).toBe(false);
  });

  it('is available when neither available_for_countries nor unavailable_for_countries is set', () => {
    const task = makeTask();

    expect(isTaskAvailableForCountry(task, 'us')).toBe(true);
  });

  it('matches unavailable_for_countries regardless of countryId casing', () => {
    const task = makeTask({ unavailable_for_countries: ['us'] });

    expect(isTaskAvailableForCountry(task, 'US')).toBe(false);
  });

  it('matches available_for_countries regardless of list entry casing', () => {
    const task = makeTask({ available_for_countries: ['US'] });

    expect(isTaskAvailableForCountry(task, 'us')).toBe(true);
  });

  it('ignores surrounding whitespace when matching countryId', () => {
    const task = makeTask({ available_for_countries: ['us'] });

    expect(isTaskAvailableForCountry(task, ' us ')).toBe(true);
  });
});

describe('isInitialExecution', () => {
  // jsdom's default test URL (see vitest.config.ts jsdom environment).
  const CURRENT_URL = window.location.href;

  const storeStartedFlow = (overrides: Record<string, unknown> = {}) => {
    sessionStorage.setItem(PSST_STORAGE_KEY, JSON.stringify({
      state: PsstState.STARTED,
      updated_at: Date.now(),
      start_url: CURRENT_URL,
      ...overrides
    }));
  };

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns false for an active flow on its expected start_url', () => {
    storeStartedFlow();

    expect(isInitialExecution()).toBe(false);
  });

  it('returns false for an active flow whose current_task.url matches the current page', () => {
    // start_url deliberately points elsewhere: current_task should take
    // precedence over it when both are present.
    storeStartedFlow({
      start_url: 'https://example.com/unrelated-start-page',
      current_task: makeTask({ url: CURRENT_URL })
    });

    expect(isInitialExecution()).toBe(false);
  });

  it('returns true when current_task.url points elsewhere even though start_url matches', () => {
    // current_task takes precedence over a matching start_url, so a stale
    // current_task still forces a restart.
    storeStartedFlow({
      start_url: CURRENT_URL,
      current_task: makeTask({ url: 'https://example.com/some-other-step' })
    });

    expect(isInitialExecution()).toBe(true);
  });

  it('returns true when the stored flow has expired', () => {
    // Well beyond the staleness window, regardless of its exact value.
    storeStartedFlow({ updated_at: Date.now() - 60_000 });

    expect(isInitialExecution()).toBe(true);
  });

  it('returns false when the stored flow is recent', () => {
    // Well within the staleness window.
    storeStartedFlow({ updated_at: Date.now() - 1_000 });

    expect(isInitialExecution()).toBe(false);
  });

  it('returns true when updated_at is missing', () => {
    const { updated_at, ...withoutUpdatedAt } = { updated_at: Date.now(), state: PsstState.STARTED, start_url: CURRENT_URL };
    sessionStorage.setItem(PSST_STORAGE_KEY, JSON.stringify(withoutUpdatedAt));

    expect(isInitialExecution()).toBe(true);
  });

  it('returns true when the stored pathname differs from the current page', () => {
    storeStartedFlow({ start_url: new URL('/other-page', CURRENT_URL).toString() });

    expect(isInitialExecution()).toBe(true);
  });

  it('returns true when the stored origin differs from the current page', () => {
    storeStartedFlow({ start_url: 'https://malicious.example/' });

    expect(isInitialExecution()).toBe(true);
  });

  it('returns true when neither current_task.url nor start_url is set', () => {
    storeStartedFlow({ start_url: '' });

    expect(isInitialExecution()).toBe(true);
  });
});
