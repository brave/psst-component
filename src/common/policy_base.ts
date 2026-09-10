// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type {PolicyScriptInputData} from './declarations';
import {logger} from './logger';
import {calculateProgress, type ModalSelectorData, moveCurrentTask, normalizeModalSelector, PSST_STORAGE_KEY, type PsstData, PsstState, type Task} from './psst_utils';


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

    abstract waitForSettingAppliedWithTimeout(selector: ModalSelectorData | undefined, turn_off: boolean, modal_selectors: ModalSelectorData[] | undefined): Promise<void>;

  async applyPolicies(): Promise<PolicyScriptResult> {
    if (__DEV__)
      logger.info('Starting applyPolicies with params:', JSON.stringify(this.params));
    const psstObj = this.loadPsstDataFromStorage();
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

    try {
      const current_task = psstObj.current_task;
      const selector = normalizeModalSelector(
          current_task?.selector as ModalSelectorData | string | undefined);
      const modal_selectors = current_task?.modal_selectors?.map(
          modalSelector => normalizeModalSelector(
              modalSelector as ModalSelectorData | string | undefined) as
              ModalSelectorData);
      await this.waitForSettingAppliedWithTimeout(
          selector, current_task?.turn_off ?? false, modal_selectors);
      moveCurrentTask(psstObj, undefined);
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
    psstObj.progress = calculateProgress(psstObj);

    if (psstObj.state === PsstState.COMPLETED) {
      // Clean up storage on finish
      this.cleanPsstDataStorage();
    } else {
      this.savePsstDataToStorage(psstObj);
    }

    return {next_url: nextUrl, psst: psstObj};
  }


  protected getParams(): PolicyScriptInputData {
    return this.params;
  }

  protected loadPsstDataFromStorage(): PsstData|undefined {
    try {
      const stored = sessionStorage.getItem(PSST_STORAGE_KEY);
      if (!stored) {
        if (__DEV__) logger.info('No existing PsstData found in sessionStorage.');
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
      if (__DEV__) logger.error('Failed to parse PsstData from sessionStorage:', error);
      return undefined;
    }
  }

  protected savePsstDataToStorage(psstData: PsstData): void {
    try {
      if (__DEV__) logger.info('Saving PsstData to sessionStorage:', JSON.stringify(psstData));
      sessionStorage.setItem(PSST_STORAGE_KEY, JSON.stringify(psstData));
    } catch (error) {
      if (__DEV__) logger.error('Failed to save PsstData to sessionStorage:', error);
    }
  }

  protected cleanPsstDataStorage(): void {
    try {
      if (__DEV__) logger.info('Clean PsstData to sessionStorage');
      sessionStorage.removeItem(PSST_STORAGE_KEY);
    } catch (error) {
      if (__DEV__) logger.error('Failed to clean PsstData in the sessionStorage:', error);
    }
  }

  private parseParams(): PolicyScriptInputData {
    // The host assigns `window.__bravePsstParams` before injecting the bundle,
    // older hosts instead inject `params`
    const hostParams = typeof window !== 'undefined' ? window.__bravePsstParams : undefined;
    const legacyParams = typeof params !== 'undefined' ? params : undefined;
    const rawParams = hostParams ?? legacyParams ?? '{}';
    if (__DEV__)
      logger.debug('Parsing PolicyScriptInputData from params:', JSON.stringify(rawParams));
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