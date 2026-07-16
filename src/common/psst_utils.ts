// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import { logger } from "./logger";

export  interface Task {
  uid: string;
  url: string;
  description: string;
  selector: string;
  turn_off: boolean;
  error_description: string | undefined;
}

export enum PsstState {
    STARTED = 'started',
    COMPLETED = 'completed',
}

export interface PsstData {
    applied_tasks: Task[];
    current_task: Task | undefined;
    progress: number;
    start_url: string;
    state: PsstState;
    tasks_list: Task[];
}

export const PSST_LOCALSTORAGE_KEY = 'psst';

export const isInitialExecution = () => {
  if (typeof localStorage === 'undefined') {
    return true;
  }

  const stored = localStorage.getItem(PSST_LOCALSTORAGE_KEY);
  if (stored === null) {
    return true;
  }

  try {
    const parsed = JSON.parse(stored);
    return parsed.state === PsstState.COMPLETED;
  } catch (error) {
    if (__DEV__) logger.error('Failed to parse PsstData from localStorage:', error);
    return true;
  }
}
  
export const moveCurrentTask = (psstObj: PsstData | undefined, errorMessage: string | undefined) => {
  if (!psstObj?.current_task) {
    return;
  }
  
  const completedTask: Task = {
    uid: psstObj.current_task.uid,
    url: psstObj.current_task.url,
    description: psstObj.current_task.description,
    selector: psstObj.current_task.selector,
    turn_off: psstObj.current_task.turn_off,
    error_description: errorMessage
  };
  
  psstObj.applied_tasks.push(completedTask);
};

const getAvailableTasks = (psst: PsstData | undefined) => {
  return (psst?.tasks_list?.length ?? 0) + (psst?.current_task ? 1 : 0);
};

const getProcessedTasks = (psst: PsstData | undefined) => {
  return psst?.applied_tasks?.length ?? 0;
};

export const calculateProgress = (psstObj: PsstData | undefined) => {
  const processed = Number(getProcessedTasks(psstObj)) || 0;
  const available = Number(getAvailableTasks(psstObj)) || 0;
  const total = processed + available;

  return total === 0 ? 0 : Math.round((processed / total) * 100);
};