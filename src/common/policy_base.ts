// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type {PolicyScriptInputData} from './declarations';
import {logger} from './logger';
import {calculateProgress, moveCurrentTask, PSST_LOCALSTORAGE_KEY, type PsstData, PsstState, type Task} from './psst_utils';


export interface PolicyScriptResult {
  next_url: string|undefined;
  psst: PsstData;
}

export abstract class PolicyScriptBase {
  static readonly WAIT_FOR_PAGE_TIMEOUT = 1000;
  static readonly WAIT_FOR_PAGE_ATTEMPTS_COUNT = 6;

  protected params: PolicyScriptInputData;

  constructor() {
    this.params = this.parseParams();
  }

  abstract waitForSettingAppliedWithTimeout(
      selector: string|undefined, turn_off: boolean|undefined): Promise<void>;

  async applyPolicies(): Promise<PolicyScriptResult> {
    if (__DEV__)
      logger.info('Starting applyPolicies with params:', this.params);
    const psstObj = this.loadPsstDataFromLocalStorage();
    if (!psstObj || this.getParams().initial_execution) {
      const firstTask = this.getParams().tasks[0];
      const initialPsstData: PsstData = {
        state: PsstState.STARTED,
        applied_tasks: [],
        current_task: firstTask,
        progress: 0,
        start_url: window.location.href,
        tasks_list: this.getParams().tasks.slice(1)
      };
      this.savePsstDataToStorage(initialPsstData);

      const result: PolicyScriptResult = {
        next_url: firstTask?.url ?? undefined,
        psst: initialPsstData
      };
      return result;
    }

    if (psstObj.state === PsstState.COMPLETED) {
      return {next_url: undefined, psst: psstObj};
    }

    try {
      const current_task = psstObj.current_task 
      await this.waitForSettingAppliedWithTimeout(
              current_task?.selector, current_task?.turn_off)
      moveCurrentTask(psstObj, undefined)
    } catch (error) {
      moveCurrentTask(psstObj, (error as Error).message);
    }

    const next_task = psstObj.tasks_list[0] || null;
    const hasMoreTasks = next_task !== null;

    // Update state atomically
    Object.assign(psstObj, {
      tasks_list: hasMoreTasks ? psstObj.tasks_list.slice(1) : [],
      current_task: next_task,
      state: hasMoreTasks ? psstObj.state : PsstState.COMPLETED
    });

    const nextUrl = hasMoreTasks ? next_task.url : psstObj.start_url;
    psstObj.progress = calculateProgress(psstObj)

                           this.savePsstDataToStorage(psstObj);
    const result: PolicyScriptResult = {next_url: nextUrl, psst: psstObj};
    return result;
  }


  protected getParams(): PolicyScriptInputData {
    return this.params;
  }

  protected loadPsstDataFromLocalStorage(): PsstData|undefined {
    try {
      const stored = localStorage.getItem(PSST_LOCALSTORAGE_KEY);
      if (!stored) {
        if (__DEV__) logger.info('No existing PsstData found in localStorage.');
        return undefined;
      }

      const parsed = JSON.parse(stored);

      return {
        applied_tasks: parsed.applied_tasks ?? [],
        current_task: parsed.current_task ?? undefined,
        progress: parsed.progress ?? 0,
        start_url: parsed.start_url ?? '',
        state: parsed.state ?? PsstState.STARTED,
        tasks_list: parsed.tasks_list ?? []
      } as PsstData;
    } catch (error) {
      logger.error('Failed to parse PsstData from localStorage:', error);
      return undefined;
    }
  }

  protected savePsstDataToStorage(psstData: PsstData): void {
    try {
      if (__DEV__) logger.info('Saving PsstData to localStorage:', psstData);
      localStorage.setItem(PSST_LOCALSTORAGE_KEY, JSON.stringify(psstData));
    } catch (error) {
      logger.error('Failed to save PsstData to localStorage:', error);
    }
  }

  private parseParams(): PolicyScriptInputData {
    // The host injects `params` as a lexical global (see policy.js, which
    // reads `params.tasks` directly). It is NOT a property of
    // window/globalThis, so we must reference the bare identifier and resolve
    // it via the scope chain. Guard with `typeof` so a missing binding yields a
    // fallback instead of a ReferenceError.
    const rawParams = (typeof params !== 'undefined' && params) ||
        (typeof window !== 'undefined' && (window as any).params) ||
        (typeof globalThis !== 'undefined' && (globalThis as any).params) ||
        '{}';
    if (__DEV__)
      logger.info('Parsing PolicyScriptInputData from params:', rawParams);
    const parsed =
        typeof rawParams === 'string' ? JSON.parse(rawParams) : rawParams;

    return {
      initial_execution: parsed.initial_execution ?? false,
      site_name: parsed.site_name ?? '',
      tasks: parsed.tasks ?? [],
      user_id: parsed.user_id ?? ''
    } as PolicyScriptInputData;
  }
}