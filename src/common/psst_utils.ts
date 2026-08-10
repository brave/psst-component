// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import {logger} from './logger';

export interface ModalSelectorData {
  selector: string,
  event: string
}

export interface Task {
  uid: string;
  url: string;
  description: string;
  modal_selectors: ModalSelectorData[] | undefined;
  selector: ModalSelectorData;
  /**
   * available_for_countries and unavailable_for_countries it is array of country codes
   * in the format of lowercase ISO 3166-1 alpha-2. Example: us, br, in.
   */
  available_for_countries: string[] | undefined;
  unavailable_for_countries: string[] | undefined;
  turn_off: boolean;
  error_description: string|undefined;
}

export enum PsstState {
  STARTED = 'started',
  COMPLETED = 'completed',
}

export interface PsstData {
  applied_tasks: Task[];
  current_task: Task|undefined;
  progress: number;
  start_url: string;
  state: PsstState;
  tasks_list: Task[];
}

export const PSST_LOCALSTORAGE_KEY = 'psst';

export const isInitialExecution =
    () => {
      if (typeof localStorage === 'undefined') {
        return true;
      }

      const stored = localStorage.getItem(PSST_LOCALSTORAGE_KEY);
      if (stored === null) {
        return true;
      }

      try {
        const parsed: unknown = JSON.parse(stored);
        const state = (parsed as {state?: unknown} | null | undefined)?.state;
        return state !== PsstState.STARTED;
      } catch (error) {
        if (__DEV__)
          logger.error('Failed to parse PsstData from localStorage:', error);
        return true;
      }
    }

/**
 * Converts a legacy string selector (from a Task persisted before selectors
 * became `{selector, event}` objects) into the current ModalSelectorData
 * shape, so older in-progress runs stored in localStorage don't crash when
 * policy scripts access `.selector`/`.event`.
 */
export const normalizeModalSelector =
    (selector: ModalSelectorData|string|undefined): ModalSelectorData|
    undefined => {
      if (typeof selector === 'string') {
        return {selector, event: 'click'};
      }
      return selector;
    };

export const moveCurrentTask =
    (psstObj: PsstData|undefined, errorMessage: string|undefined) => {
      if (!psstObj?.current_task) {
        return;
      }

      const completedTask: Task = {
        uid: psstObj.current_task.uid,
        url: psstObj.current_task.url,
        description: psstObj.current_task.description,
        selector: psstObj.current_task.selector,
        turn_off: psstObj.current_task.turn_off,
        modal_selectors: psstObj.current_task.modal_selectors,
        available_for_countries: psstObj.current_task.available_for_countries,
        unavailable_for_countries: psstObj.current_task.unavailable_for_countries,
        error_description: errorMessage
      };

      psstObj.applied_tasks.push(completedTask);
    };

const getAvailableTasks = (psst: PsstData|undefined) => {
  return (psst?.tasks_list?.length ?? 0) + (psst?.current_task ? 1 : 0);
};

const getProcessedTasks = (psst: PsstData|undefined) => {
  return psst?.applied_tasks?.length ?? 0;
};

/**
 * Waits for an element matching the selector to appear in the DOM.
 * Uses MutationObserver for efficiency, falling back to a timeout if not found.
 *
 * @param selector - CSS selector string (e.g., '#modal-trigger')
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise resolving to the found HTMLElement
 * @throws Error if the element is not found within the timeout
 */
export async function waitForElement(
  selector: string,
  timeout: number = 5000
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    // Check immediately
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      return resolve(element);
    }

    // If not found, set up an observer
    const observer = new MutationObserver((mutations, obs) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`The element not found within timeout`));
    }, timeout);
  });
}

/**
 * Waits for an element's attribute to reach an expected value.
 * Uses MutationObserver for efficiency, falling back to a timeout if not reached.
 *
 * @param element - the element to observe
 * @param attribute - attribute name to watch (e.g. 'aria-checked')
 * @param expectedValue - the value to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 2000)
 * @throws Error if the attribute does not reach expectedValue within the timeout
 */
export async function waitForAttributeValue(
  element: HTMLElement,
  attribute: string,
  expectedValue: string,
  timeout: number = 2000
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (element.getAttribute(attribute) === expectedValue) {
      return resolve();
    }

    const observer = new MutationObserver(() => {
      if (element.getAttribute(attribute) === expectedValue) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(element, {attributes: true, attributeFilter: [attribute]});

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Attribute "${attribute}" did not become "${expectedValue}" within ${timeout}ms`));
    }, timeout);
  });
}

export const calculateProgress = (psstObj: PsstData | undefined) => {
  const processed = Number(getProcessedTasks(psstObj)) || 0;
  const available = Number(getAvailableTasks(psstObj)) || 0;
  const total = processed + available;

  return total === 0 ? 0 : Math.round((processed / total) * 100);
};

/**
 * Determines if a task is available for a specific country.
 *
 * Logic:
 * 1. If countryId is undefined (unknown country), default to true (do not restrict).
 * 2. If unavailable_for_countries is defined and contains the countryId, return false.
 * 3. If available_for_countries is defined:
 *    - If it contains the countryId, return true.
 *    - If it does NOT contain the countryId, return false.
 * 4. If available_for_countries is undefined, default to true (assuming open access).
 *
 * @param task The task to check
 * @param countryId The country ID to check against, or undefined if unknown
 * @returns boolean
 */
export function isTaskAvailableForCountry(
  task: Task,
  countryId: string|undefined
): boolean {
  // 1. Unknown country: don't restrict availability.
  if (countryId === undefined) {
    return true;
  }

  // 2. Check explicit blocklist (unavailable)
  if (task.unavailable_for_countries?.includes(countryId)) {
    return false;
  }

  // 3. Check explicit allowlist (available)
  if (task.available_for_countries) {
    return task.available_for_countries.includes(countryId);
  }

  // 4. Default case: if no allowlist is defined and not blocked, it's available
  return true;
}