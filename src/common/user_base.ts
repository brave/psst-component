// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type {UserScriptData, UserScriptInputData} from './declarations';
import {logger} from './logger';
import {isInitialExecution, isTaskAvailableForCountry} from './psst_utils';

export abstract class UserScriptBase {
  abstract readonly version: number;
  abstract readonly includeUrlPatterns: string[];
  abstract readonly excludeUrlPatterns: string[];
  abstract readonly userScript: string;
  abstract readonly policyScript: string;

  protected params: UserScriptInputData;

  constructor() {
    this.params = this.parseParams();
  }

  abstract getUserId(): string|undefined;

  protected abstract getSiteScriptData():
      Omit<UserScriptData, 'user_id'|'initial_execution'>;

  getTasks(): UserScriptData|undefined {
    try {
      const userId = this.getUserId();
      if (__DEV__) logger.info('Getting tasks for user ID:', userId);

      if (!userId) {
        if (__DEV__) logger.debug('Do not continue with tasks as no signed in user');
        return undefined;
      }

      const userData: UserScriptData = {
        user_id: userId,
        initial_execution: isInitialExecution(),
        ...this.getSiteScriptData()
      };

      const countryId = this.getParams().countryId;
      if (__DEV__)
        logger.info('countryId:', JSON.stringify(countryId));

      userData.tasks = userData.tasks.filter(
          task => isTaskAvailableForCountry(task, countryId));

      if (__DEV__)
        logger.info('Constructed UserScriptData:', JSON.stringify(userData));
      return userData;
    } catch (error) {
      if (__DEV__) logger.error('Failed to construct UserScriptData:', error);
      return undefined;
    }
  }

  protected getParams(): UserScriptInputData {
    return this.params;
  }

  private parseParams(): UserScriptInputData {
    // The host assigns `window.__bravePsstParams` before injecting the bundle (see
    // user.js, which reads `params.countryId` directly). Guard with `typeof`
    // so a missing binding yields a fallback instead of a ReferenceError.
    const rawParams = (typeof window !== 'undefined' && window.__bravePsstParams) ||
        '{}';
    if (__DEV__)
      logger.info('Parsing UserScriptInputData from params:', JSON.stringify(rawParams));
    const parsed =
        typeof rawParams === 'string' ? JSON.parse(rawParams) : rawParams;

    return {
      countryId: parsed.countryId
    } as UserScriptInputData;
  }
}
