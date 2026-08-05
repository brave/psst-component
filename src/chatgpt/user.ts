// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type { UserScriptData } from '../common/declarations';
import { logger } from '../common/logger';
import { UserScriptBase } from '../common/user_base';

// The display name rendered in the account menu is used as a fallback when
// the oai-client-auth-info cookie is missing or unparsable.
const USER_IDENTIFIER_SELECTOR = '[data-testid="accounts-profile-button"] .truncate';
const AUTH_INFO_COOKIE_NAME = 'oai-client-auth-info';

interface AuthInfoCookie {
    user?: {
        name?: string;
    };
}

export class ChatgptUserScript extends UserScriptBase {
    readonly version = 1;
    readonly includeUrlPatterns: string[] = ['https://chatgpt.com/*'];
    readonly excludeUrlPatterns: string[] = [];
    readonly userScript: string = 'user.js';
    readonly policyScript: string = 'policy.js';

    getUserId(): string | undefined {
        const nameFromCookie = this.getUserNameFromAuthInfoCookie();
        if (nameFromCookie) {
            if (__DEV__) logger.debug(`Extracted user name:${nameFromCookie ?? 'N/A'}`);
            return nameFromCookie;
        }

        const userElement = document.querySelector(USER_IDENTIFIER_SELECTOR);
        if (!userElement || !userElement.textContent) {
            if (__DEV__) logger.error(`User identifier element not found for selector ${USER_IDENTIFIER_SELECTOR}.`);
            return undefined;
        }
        if (__DEV__) logger.debug(`userElement.textContent:${userElement?.textContent ?? 'N/A'}`);
        return userElement.textContent.trim() || undefined;
    }

    private getUserNameFromAuthInfoCookie(): string | undefined {
        const prefix = `${AUTH_INFO_COOKIE_NAME}=`;
        const rawCookie = document.cookie.split('; ').find(row => row.startsWith(prefix));
        if (!rawCookie) {
            return undefined;
        }
        try {
            const value = rawCookie.slice(prefix.length);
            const data: AuthInfoCookie = JSON.parse(decodeURIComponent(value));
            const name = data.user?.name;
            return typeof name === 'string' ? name.trim() || undefined : undefined;
        } catch (error) {
            if (__DEV__) logger.error(`Failed to parse ${AUTH_INFO_COOKIE_NAME} cookie:`, error);
            return undefined;
        }
    }

    protected getSiteScriptData():
      Omit<UserScriptData, 'user_id'|'initial_execution'> {
        return {
            share_experience_link: "",
            site_name: 'chatgpt.com',
            tasks: [
            {
                uid: '1',
                url: 'https://chatgpt.com/',
                description: 'Disable "Improve the model for everyone"',
                selector: {selector: 'button[data-testid="improve-model-toggle"]', event: 'click'},
                modal_selectors: [
                 /*Select main menu*/
                 {selector: '[data-testid="accounts-profile-button"] > div.flex.min-w-0.items-center.gap-2', event: 'pointerdown'},
                 /*Select Settings menu item*/
                 {selector: '[data-testid="settings-menu-item"]', event: 'click'},
                 /*Select Data controls tab*/
                 {selector: "[data-testid='data-controls-tab'] > div.min-w-0 > div", event: 'mousedown'},
                 /*Click on the improve the model button*/
                 {selector: 'button[data-testid="improve-model-open-modal-button"] div.ps-3', event: 'click'},
                ],
                available_for_countries: undefined,
                unavailable_for_countries: undefined,
                turn_off: true,
                error_description: undefined
            }
            ]
        };
    }
}

window.UserScriptInstance = new ChatgptUserScript();

// The bundle's value is surfaced via a default export (see webpack.config.js
// `output.library`). A trailing IIFE cannot work here: webpack wraps every
// entry in its own non-returning function wrappers, so a `return` never
// reaches the script's completion value.
export default window.UserScriptInstance.getTasks();
