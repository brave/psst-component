'use strict'

const { defineConfig } = require('eslint/config')
const neostandard = require('neostandard')
const licenses = require('eslint-plugin-licenses')

const TS_FILES = ['src/**/*.ts', 'scripts/**/*.ts']

module.exports = defineConfig([
  ...neostandard({
    ts: true,
    env: ['browser']
  }),
  {
    files: TS_FILES,
    plugins: { licenses },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'licenses/header': [2, {
        tryUseCreatedYear: true,
        comment: { allow: 'both', prefer: 'line' },
        header: [
          'Copyright (c) {YEAR} The Brave Authors. All rights reserved.',
          'This Source Code Form is subject to the terms of the Mozilla Public',
          'License, v. 2.0. If a copy of the MPL was not distributed with this file,',
          'You can obtain one at https://mozilla.org/MPL/2.0/.'
        ]
      }]
    }
  }
])
