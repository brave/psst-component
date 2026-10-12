module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: 'standard',
  'plugins': [
    'licenses'
  ],
  overrides: [
    {
      env: {
        node: true
      },
      files: [
        '.eslintrc.{js,cjs}'
      ],
      parserOptions: {
        sourceType: 'script'
      }
    },
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'licenses/header': [
      2,
      {
        'tryUseCreatedYear': true,
        'comment': {
          'allow': 'both',
          'prefer': 'line'
        },
        'header': [
          'Copyright (c) {YEAR} The Brave Authors. All rights reserved.',
          'This Source Code Form is subject to the terms of the Mozilla Public',
          'License, v. 2.0. If a copy of the MPL was not distributed with this file,',
          'You can obtain one at https://mozilla.org/MPL/2.0/.'
        ],
      }
    ],
  }
}
