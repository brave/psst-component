// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import { vi, type MockInstance } from 'vitest';

/**
 * Mocks the `document.cookie` getter to return a fixed string, mirroring
 * what the injected scripts read on the live page. Restored by
 * `vi.restoreAllMocks()`.
 */
export function mockDocumentCookie(cookieString: string): MockInstance {
  return vi.spyOn(document, 'cookie', 'get').mockReturnValue(cookieString);
}

/**
 * Mocks `document.querySelector` to return a fixed element (or null),
 * mirroring how the injected scripts look up elements on the live page.
 * Restored by `vi.restoreAllMocks()`.
 */
export function mockQuerySelector(result: Element | null): MockInstance {
  return vi.spyOn(document, 'querySelector').mockReturnValue(result);
}

/**
 * Spies on the `document.cookie` setter without overriding its behavior, so
 * writes (e.g. deleting or caching a cookie) can be asserted on via
 * `.mock.calls` while `mockDocumentCookie`'s getter override remains the
 * single source of truth for what the script reads back.
 */
export function spyOnDocumentCookieWrites(): MockInstance {
  return vi.spyOn(document, 'cookie', 'set');
}

/**
 * Builds a minimal fake element exposing only `textContent`, matching the
 * subset of the DOM API the injected scripts actually read off a matched
 * element.
 */
export function fakeElementWithText(textContent: string | null): Element {
  return { textContent } as unknown as Element;
}
