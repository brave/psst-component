// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * Generates out/psst.json by discovering every website under src/ and
 * instantiating its UserScript class to extract metadata.
 *
 * Run with: npm run generate-psst-config
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Browser-global shims
//
// Each website's user.ts is authored for the browser bundle: at module load it
// runs `window.UserScriptInstance = new ...UserScript()` and calls
// `getTasks()`, which reads DOM globals like `document.cookie` or
// `document.querySelector`, and it references `__DEV__` (injected by
// webpack's DefinePlugin). Requiring the source under Node would otherwise
// throw on these undefined globals before we can read the class metadata, so
// stub them out. These must be set BEFORE any user.ts is required.
// ---------------------------------------------------------------------------

const g = globalThis as Record<string, unknown>;
g.__DEV__ = false;
g.window = g.window ?? g;
g.document = g.document ?? { cookie: '', querySelector: () => null };

// ---------------------------------------------------------------------------
// Resolve paths — use __dirname directly (CommonJS, no import.meta.url needed)
// ---------------------------------------------------------------------------

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR  = path.resolve(ROOT_DIR, 'src');
const OUT_DIR = path.resolve(ROOT_DIR, 'out');
const OUT_FILE = path.join(OUT_DIR, 'psst.json');

const NON_WEBSITE_DIRS = new Set(['common']);

// ---------------------------------------------------------------------------
// Types (mirrors psst.json schema)
// ---------------------------------------------------------------------------

interface PsstEntry {
  name:          string;
  include:       string[];
  exclude:       string[];
  version:       number;
  user_script:   string;
  policy_script: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWebsiteNames(): string[] {
  return fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !NON_WEBSITE_DIRS.has(e.name))
    .map(e => e.name);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const websites = getWebsiteNames();

  if (websites.length === 0) {
    console.warn('No website implementations found under src/. Nothing to generate.');
    process.exit(0);
  }

  const entries: PsstEntry[] = [];

  for (const website of websites) {
    const userScriptPath = path.join(SRC_DIR, website, 'user.ts');

    if (!fs.existsSync(userScriptPath)) {
      console.warn(` [SKIP] ${website}: no user.ts found`);
      continue;
    }

    // ts-node compiles .ts on-the-fly, so we can require the source directly.
    const absolutePath = path.join(SRC_DIR, website, 'user.ts');

    let mod: Record<string, unknown>;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require(absolutePath);
    } catch (err) {
      console.error(` [ERROR] Failed to require ${absolutePath}:`, err);
      continue;
    }

    const className = `${capitalize(website)}UserScript`;
    const UserScriptClass = mod[className] as (new () => {
      version:            number;
      includeUrlPatterns: string[];
      excludeUrlPatterns: string[];
      userScript:         string;
      policyScript:       string;
    }) | undefined;

    if (typeof UserScriptClass !== 'function') {
      console.error(
        ` [ERROR] ${website}: expected a class named "${className}" but it was not found.`
      );
      continue;
    }

    const instance = new UserScriptClass();

    const entry: PsstEntry = {
      name:          website,
      include:       instance.includeUrlPatterns,
      exclude:       instance.excludeUrlPatterns,
      version:       instance.version,
      user_script:   instance.userScript,
      policy_script: instance.policyScript,
    };

    entries.push(entry);
    console.log(` [OK] ${website} — include: ${entry.include.join(', ')}, version: ${entry.version}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} to ${OUT_FILE}`);
}

main().catch(err => {
  console.error('generate-psst-config failed:', err);
  process.exit(1);
});