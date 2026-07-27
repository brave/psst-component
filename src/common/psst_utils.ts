// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import {logger} from './logger';

export interface Task {
  uid: string;
  url: string;
  description: string;
  modal_selectors: string[] | undefined;
  selector: string;
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
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// Usage Example
// (async () => {
//   try {
//     const modalBtn = await waitForElement('#modal-trigger');
//     // Ensure the element is an HTMLElement before clicking
//     if (modalBtn instanceof HTMLElement) {
//       modalBtn.click();
//       console.log('Modal triggered successfully.');
//     }
//   } catch (error) {
//     console.error('Failed to find modal trigger:', error);
//   }
// })();

export const calculateProgress = (psstObj: PsstData | undefined) => {
  const processed = Number(getProcessedTasks(psstObj)) || 0;
  const available = Number(getAvailableTasks(psstObj)) || 0;
  const total = processed + available;

  return total === 0 ? 0 : Math.round((processed / total) * 100);
};