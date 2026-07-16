// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

/**
 * Extracts and returns the Twitter user ID
 * Returns the dictionary object:
 * {
 *  "user": <twid>,
 *  "tasks": {
 *      {
 *        url:<setting url, MUST BE UNIQUE>,
 *        description:<setting description>},
 *      },
 *       ....
 *  }
 * }
 * In case the twid extracting is impossible it must return null
 */

import type {UserScriptData} from '../common/declarations';
import {logger} from '../common/logger';
import {UserScriptBase} from '../common/user_base';

const TWID_COOKIE_NAME = 'twid';

export class TwitterUserScript extends UserScriptBase {
  readonly version = 5;
  readonly includeUrlPatterns: string[] = ['https://x.com/*'];
  readonly excludeUrlPatterns: string[] = [];
  readonly userScript: string = 'user.js';
  readonly policyScript: string = 'policy.js';

  getUserId(): string|undefined {
    const twidCookie = document.cookie.split('; ').find(
        row => row.startsWith(TWID_COOKIE_NAME + '='));
    if (!twidCookie) {
      if (__DEV__)
        logger.error(`Cookie with name ${TWID_COOKIE_NAME} not found.`);
      return undefined;
    }
    const [, value] = twidCookie.split('=');
    return value || undefined;
  }

  protected getSiteScriptData():
      Omit<UserScriptData, 'user_id'|'initial_execution'> {
    return {
      share_experience_link: 'https://x.com/intent/post?text=$1',
      site_name: 'x.com',
      tasks: [
        {
          uid: '1',
          url: 'https://x.com/settings/location',
          description: 'Disable attaching location information to posts',
          selector:
              '#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > section:nth-child(2) > div.css-175oi2r.r-qocrb3.r-14lw9ot.r-1h0z5md.r-1jx8gzb.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div > div.css-175oi2r.r-w7s2jr.r-14lw9ot.r-3pj75a > div > label > div > div.css-175oi2r.r-lrvibr > input',
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '2',
          url: 'https://x.com/settings/data_sharing_with_business_partners',
          description:
              'Disable sharing additional information with X’s business partners.',
          selector:
              '#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > section:nth-child(2) > div.css-175oi2r.r-qocrb3.r-14lw9ot.r-1h0z5md.r-1jx8gzb.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div.css-175oi2r.r-w7s2jr.r-14lw9ot.r-3pj75a > div > div > label > div > div.css-175oi2r.r-lrvibr > input',
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '3',
          url: 'https://x.com/settings/off_twitter_activity',
          description:
              'Disable personalization based on your inferred identity',
          selector:
              '#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > section:nth-child(2) > div.css-175oi2r.r-qocrb3.r-14lw9ot.r-1h0z5md.r-1jx8gzb.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div.css-175oi2r.r-w7s2jr.r-14lw9ot.r-3pj75a > div > div > label > div > div.css-175oi2r.r-lrvibr > input',
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '4',
          url: 'https://x.com/settings/ads_preferences',
          description: 'Disable personalized ads',
          selector:
              '#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > section:nth-child(2) > div.css-175oi2r.r-qocrb3.r-14lw9ot.r-1h0z5md.r-1jx8gzb.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div.css-175oi2r.r-w7s2jr.r-14lw9ot.r-3pj75a > div > div > label > div > div.css-175oi2r.r-lrvibr > input',
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '5',
          url: 'https://x.com/settings/ads_preferences12345',
          description: 'It should be failed',
          selector: '#blabla',
          turn_off: true,
          error_description: undefined
        }
      ]
    };
  }
}


window.UserScriptInstance = new TwitterUserScript();

// The bundle's value is surfaced via a default export (see webpack.config.js
// `output.library`). A trailing IIFE cannot work here: webpack wraps every
// entry in its own non-returning function wrappers, so a `return` never
// reaches the script's completion value.
export default window.UserScriptInstance.getTasks();
