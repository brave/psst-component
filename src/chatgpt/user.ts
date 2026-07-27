// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type { UserScriptData } from '../common/declarations';
import { logger } from '../common/logger';
import type { UserScriptInterface } from '../common/user_base';

// chatgpt.com has no readable (non-HttpOnly) session cookie, so the user is
// identified by the display name rendered in the account menu instead.
const USER_IDENTIFIER_SELECTOR = '#radix-_R_3alalpakoac97l35_ > div.flex.min-w-0.items-center.gap-2 > div.min-w-0 > div.flex.min-w-0.grow.items-center.gap-2\\.5 > div';

export class ChatgptUserScript implements UserScriptInterface {
    readonly version = 1;
    readonly includeUrlPatterns: string[] = ['https://chatgpt.com/*'];
    readonly excludeUrlPatterns: string[] = [];
    readonly userScript: string = 'user.js';
    readonly policyScript: string = 'policy.js';

    getUserId(): string | undefined {
        const userElement = document.querySelector(USER_IDENTIFIER_SELECTOR);
        if (!userElement || !userElement.textContent) {
            if (__DEV__) logger.error(`User identifier element not found for selector ${USER_IDENTIFIER_SELECTOR}.`);
            return undefined;
        }
        return userElement.textContent.trim() || undefined;
    }

    getTasks(): UserScriptData | undefined {
        if (__DEV__) logger.info('Getting tasks for user ID:', this.getUserId());
        const userData: UserScriptData = {
            user_id: this.getUserId(),
            share_experience_link: "https://x.com/intent/post?text=$1",
            site_name: 'chatgpt.com',
            tasks: [
            {
                uid: '1',
                url: 'https://chatgpt.com/',
                description: 'Disable "Improve the model for everyone" so conversations are not used to train OpenAI models',
                selector: '#radix-_r_av_ > div > div.pb-8 > div > div.flex.items-center.gap-1 > button > span',
                modal_selectors: [
                 '#radix-_R_3alalpakoac97l35_ > div.flex.min-w-0.items-center.gap-2 > div.min-w-0 > div.not-group-data-disabled\:text-token-text-tertiary.leading-dense.mb-0\.5.text-xs.whitespace-normal.group-data-sheet-item\:mt-0\.5.group-data-sheet-item\:mb-0.dark\:group-hover\:text-token-text-secondary.dark\:group-focus-visible\:text-token-text-secondary.dark\:group-data-\[highlighted\]\:text-token-text-secondary.dark\:group-data-\[state\=open\]\:text-token-text-secondary',
                 '#radix-_R_dalan5aj19h4ukcmH1_ > div > div:nth-child(6)',
                 '#radix-_r_as_-trigger-DataControls > div.flex.min-w-0.grow.items-center.gap-2\.5',
                 '#radix-_r_as_-content-DataControls > section > div:nth-child(2) > div > button > div > div.text-token-text-secondary.flex.min-h-\[38px\].items-center.ps-3'
                ],
                turn_off: true,
                error_description: undefined
            }
            ]
        };

        if (__DEV__) logger.info('Constructed UserScriptData:', userData);
        return userData;
    }

}


window.UserScriptInstance = new ChatgptUserScript();

// The bundle's value is surfaced via a default export (see webpack.config.js
// `output.library`). A trailing IIFE cannot work here: webpack wraps every
// entry in its own non-returning function wrappers, so a `return` never
// reaches the script's completion value.
export default window.UserScriptInstance.getTasks();
