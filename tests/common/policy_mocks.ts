// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * Real DOM helpers for policy script tests. Unlike `dom_mocks.ts` (which
 * stubs `document.querySelector`/`document.cookie` for user scripts), policy
 * scripts drive `waitForElement`/`waitForAttributeValue`, which are built on
 * MutationObserver. Mocking `querySelector` would bypass that machinery
 * entirely, so these helpers build real elements in the jsdom document
 * instead, keeping the observers genuinely in play.
 */

export interface ClickTarget {
  element: HTMLElement;
  /** Event types dispatched on the element, in the order they arrived. */
  events: string[];
}

/**
 * Appends an `aria-checked` element (standing in for the toggle-style
 * controls chatgpt.com uses instead of native checkboxes) to `document.body`.
 * By default a 'click' listener toggles `aria-checked`, mirroring how the
 * real page reacts to the PointerEvent the policy script dispatches. Pass
 * `toggles: false` to simulate a page where the click has no effect.
 */
export function appendAriaCheckedElement(
  id: string,
  checked: boolean,
  { toggles = true }: { toggles?: boolean } = {},
): HTMLElement {
  const element = document.createElement('button');
  element.id = id;
  element.setAttribute('aria-checked', String(checked));
  if (toggles) {
    element.addEventListener('click', () => {
      const current = element.getAttribute('aria-checked') === 'true';
      element.setAttribute('aria-checked', String(!current));
    });
  }
  document.body.appendChild(element);
  return element;
}

/**
 * Appends a native `<input type="checkbox">` to `document.body`, standing in
 * for the real checkboxes twitter.com/linkedin.com use (as opposed to
 * chatgpt.com's aria-checked toggle buttons). jsdom natively toggles
 * `.checked` in response to `.click()`, so - unlike
 * `appendAriaCheckedElement` - no manual listener is needed to simulate the
 * page reacting to the click.
 */
export function appendCheckbox(id: string, checked: boolean): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;
  document.body.appendChild(input);
  return input;
}

/**
 * Appends an element to `document.body` that records every event type
 * dispatched on it, standing in for a modal_selectors step target.
 */
export function appendClickTarget(id: string): ClickTarget {
  const element = document.createElement('div');
  element.id = id;
  const events: string[] = [];
  for (const type of ['click', 'pointerdown', 'mousedown']) {
    element.addEventListener(type, () => events.push(type));
  }
  document.body.appendChild(element);
  return { element, events };
}
