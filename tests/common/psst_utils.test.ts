// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect } from 'vitest';
import { isTaskAvailableForCountry } from '../../src/common/psst_utils';
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
