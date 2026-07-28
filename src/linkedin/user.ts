// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/

import type {UserScriptData} from '../common/declarations';
import { logger } from '../common/logger';
import {UserScriptBase} from '../common/user_base';

const LIAP_COOKIE_NAME = 'liap';
const CACHE_COOKIE_NAME = 'psst_linkedin_uid';
const CACHE_TTL_SECONDS = 60;

interface CachedUid {
  uid: string;
}

function readCookie(name: string): string|undefined {
  const prefix = `${name}=`;
  const cookie = document.cookie.split('; ').find(row => row.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) || undefined : undefined;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${name}=${value}; max-age=${maxAgeSeconds}; path=/`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; max-age=0; path=/`;
}

export class LinkedinUserScript extends UserScriptBase {
  readonly version = 1;
  readonly includeUrlPatterns: string[] = ['https://www.linkedin.com/*'];
  readonly excludeUrlPatterns: string[] = [];
  readonly userScript: string = 'user.js';
  readonly policyScript: string = 'policy.js';

  getUserId(): string|undefined {
    try {
      if (readCookie(LIAP_COOKIE_NAME) !== 'true') {
        deleteCookie(CACHE_COOKIE_NAME);
        return undefined;
      }

      const cachedUid = this.readCachedUid();
      if (cachedUid) {
        return cachedUid;
      }

      const profileLink = document.querySelector('a[href*="/in/"]');
      if (profileLink && profileLink instanceof HTMLAnchorElement) {
        const match = profileLink.href.match(/\/in\/([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          const cached: CachedUid = {uid: match[1]};
          writeCookie(
              CACHE_COOKIE_NAME, encodeURIComponent(JSON.stringify(cached)),
              CACHE_TTL_SECONDS);
          return match[1];
        }
      }
      return undefined;
    } catch (error) {
      const errorMessage =
          error instanceof Error ? error.message : String(error);
      if (__DEV__) logger.error(`Error extracting LinkedIn UID: ${errorMessage}`);
      return undefined;
    }
  }

  private readCachedUid(): string|undefined {
    const raw = readCookie(CACHE_COOKIE_NAME);
    if (!raw) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      const uid = (parsed as Partial<CachedUid>|null)?.uid;
      return typeof uid === 'string' && uid ? uid : undefined;
    } catch (error) {
      if (__DEV__)
        logger.error('Failed to parse psst_linkedin_uid cookie:', error);
      return undefined;
    }
  }

  protected getSiteScriptData():
      Omit<UserScriptData, 'user_id'|'initial_execution'> {
    return {
      share_experience_link: '',
      site_name: 'linkedin.com',
      tasks: [
        {
          uid: '1',
          url: 'https://www.linkedin.com/mypreferences/d/member-cookies',
          description: 'Disable all non-essential cookies',
          selector: {selector: 'input[role="switch"]#nonEssentialCookieConsent', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '2',
          url: 'https://www.linkedin.com/mypreferences/d/settings/policy-and-academic-research',
          description:
              'Disable sharing your data for research with trusted third parties',
          selector: {selector: 'input[role="switch"][aria-labelledby="allowAnonymizedDataResearch"]', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '3',
          url: 'https://www.linkedin.com/mypreferences/d/settings/ads-inferred-location',
          description:
              'Disable personalizing ads based on inferred city location',
          selector: {selector: 'input[role="switch"][aria-labelledby="allowIpToPersonalizeAds"]', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '4',
          url: 'https://www.linkedin.com/mypreferences/d/interest-categories',
          description: 'Disable personalizing ads based on inferred interests and traits',
          selector: {selector: 'input[role="switch"][aria-labelledby="adsPrivacyAllowInterestsAndBehaviors"]', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '5',
          url: 'https://www.linkedin.com/mypreferences/d/settings/ads-by-age',
          description: 'Disable personalizing ads based on age range',
          selector: {selector: 'input[role="switch"][aria-labelledby="allowAdsByAge"]', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '6',
          url: 'https://www.linkedin.com/mypreferences/d/settings/ads-by-gender',
          description: 'Disable personalizing ads based on inferred gender',
          selector: {selector: 'input[role="switch"][aria-labelledby="allowAdsByGender"]', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '7',
          url: 'https://www.linkedin.com/mypreferences/d/settings/ads-beyond-linkedin',
          description: 'Disable personalized ads off of LinkedIn',
          selector: {selector: 'input[role="switch"][aria-labelledby="allowLinkedInAudienceNetwork"]', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '8',
          url: 'https://www.linkedin.com/mypreferences/d/settings/ads-interactions-with-business',
          description: 'Disable personalized ads based on data given to businesses',
          selector: {selector: 'input[role="switch"][aria-labelledby="allowUseOfThirdPartyData"]', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '9',
          url: 'https://www.linkedin.com/mypreferences/d/settings/ads-related-actions',
          description: 'Disable using your data for ad insights',
          selector: {selector: 'input[role="switch"][aria-labelledby="allowConversionTrackings"]', event: 'click'},
          modal_selectors: undefined,
          turn_off: true,
          error_description: undefined
        }
      ]
    };
  }
}


window.UserScriptInstance = new LinkedinUserScript();

// The bundle's value is surfaced via a default export (see webpack.config.js
// `output.library`). A trailing IIFE cannot work here: webpack wraps every
// entry in its own non-returning function wrappers, so a `return` never
// reaches the script's completion value.
export default window.UserScriptInstance.getTasks();
