// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type {UserScriptData} from './declarations';
import {logger} from './logger';
import {isInitialExecution} from './psst_utils';

export abstract class UserScriptBase {
  abstract readonly version: number;
  abstract readonly includeUrlPatterns: string[];
  abstract readonly excludeUrlPatterns: string[];
  abstract readonly userScript: string;
  abstract readonly policyScript: string;

  abstract getUserId(): string|undefined;

  protected abstract getSiteScriptData():
      Omit<UserScriptData, 'user_id'|'initial_execution'>;

  getTasks(): UserScriptData|undefined {
    try {
      const userId = this.getUserId();
      if (__DEV__) logger.info('Getting tasks for user ID:', userId);

      const userData: UserScriptData = {
        user_id: userId,
        initial_execution: isInitialExecution(),
        ...this.getSiteScriptData()
      };
      if (__DEV__)
        logger.info('Constructed UserScriptData:', JSON.stringify(userData));
      return userData;
    } catch (error) {
      if (__DEV__) logger.error('Failed to construct UserScriptData:', error);
      return undefined;
    }
  }
}
