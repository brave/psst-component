# psst-component-test-typescript

A TypeScript project for experimenting with component-based architecture and bundling using Webpack. Each supported website gets its own privacy "user" and "policy" scripts, which are bundled independently for injection.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Project Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd psst-component-test-typescript
   ```

2. **Install dependencies**

   ```bash
   npm ci
   ```

## Building the Project

To type-check and compile the TypeScript source files:

```bash
npm run build
```

This uses `tsc` with `tsconfig.json` and emits compiled output (plus declaration files) to `out/`. Only `src/` is compiled — tests are excluded from the build.

## Generating Bundles

To generate bundled JavaScript files using Webpack:

```bash
npm run bundle        # development build (alias for bundle:dev)
npm run bundle:dev    # development build — logging enabled
npm run bundle:prod   # production build — minified, logging stripped
```

The mode is passed to Webpack via `--mode` and controls both minification and the `__DEV__` flag used for logging (see [Logging](#logging)).

Bundling is driven by `webpack.config.js`, which **auto-discovers every website** under `src/` and emits one bundle per script:

```
out/scripts/<website>/<script>.js
```

For example, the `twitter` website produces:

```
out/scripts/twitter/user.js
out/scripts/twitter/policy.js
```

Every top-level `*.ts` file in a website folder becomes its own bundle entry. The shared `src/common/` folder is not a website and is only included where it is imported.

Each bundle is wrapped in an IIFE and read by its **completion value** rather than any export, since the script is injected directly into an isolated world shared with other Brave-injected scripts (see the `output` comment in `webpack.config.js` and `scripts/webpack/wrap-psst-result-plugin.js` for the full mechanics).

### `out/psst.json`

`npm run bundle:dev` and `npm run bundle:prod` also run `scripts/generate-psst-config.ts` first (wired up as the `prebundle:dev` / `prebundle:prod` npm lifecycle hooks — note that plain `npm run bundle` does **not** trigger it, since it isn't aliased through `bundle:dev`). That script instantiates every website's `*UserScript` class and writes their metadata (`include`/`exclude` URL patterns, `version`, script filenames) to `out/psst.json`, which the host uses to decide which script to inject on which page.

## Script Parameters (Host → Script Communication)

Both `user.js` and `policy.js` are injected as plain text into an isolated world — they have no module system and no way to receive arguments directly. Instead, the host **prepends a `const params = {...};` statement to the top of the bundle's source before injecting it**. Because the bundle is compiled with `output.iife: true`, that statement sits *outside* the bundle's own closure but in the same lexical scope, so every module inside the bundle can still read the bare `params` identifier via the scope chain — without it ever touching `window` or leaking into the surrounding page.

Each script parses this global defensively via a `parseParams()` method (see `UserScriptBase`/`PolicyScriptBase` in `src/common/`), which:

1. Prefers the bare `params` identifier (the production path).
2. Falls back to `window.params` / `globalThis.params` (useful for tests, which have no bundler-prepended binding).
3. Falls back to `'{}'` if nothing is set.
4. `JSON.parse`s the result if it came through as a string.

### `user.js` parameters — `UserScriptInputData`

```ts
export interface UserScriptInputData {
  countryId: string | undefined;
}
```

- `countryId` — the user's current country, supplied by the host. **If it is `undefined` (unknown country), no country-based filtering is applied and every task is treated as available.**

`UserScriptBase.getTasks()` uses `countryId` together with `isTaskAvailableForCountry` (`src/common/psst_utils.ts`) to filter each site's task list before returning it, based on two optional fields on `Task`:

- `available_for_countries` — an allow-list; if set, only tasks whose list includes `countryId` are kept.
- `unavailable_for_countries` — a block-list; tasks whose list includes `countryId` are always dropped, even if also present in `available_for_countries`.

If neither field is set, the task is available everywhere.

### `policy.js` parameters — `PolicyScriptInputData`

`PolicyScriptInputData` extends `UserScriptData` (i.e. it's the `user_id`, `site_name`, `tasks`, etc. that `user.js` produced, plus `initial_execution`). It's the output of the user script, filtered and forwarded back in by the host as the input to the policy script, which then walks `tasks` one at a time to apply/verify each privacy setting (see `PolicyScriptBase.applyPolicies()`).

## Logging

The project ships a small development-only logger at `src/common/logger.ts`. Logging is **active in development builds and completely removed from production builds** — neither the `console` calls nor the messages passed to them end up in the production bundle.

This is driven by `__DEV__`, a compile-time constant injected by Webpack's `DefinePlugin`:

- `npm run bundle:dev` → `__DEV__` is `true`, logging runs.
- `npm run bundle:prod` → `__DEV__` is `false`; the minifier eliminates the dead branches, so nothing about logging ships.

### Usage

Import the logger and **always guard the call site with `if (__DEV__)`**:

```ts
import { logger } from "../common/logger";

if (__DEV__) logger.debug('applying task', task);
if (__DEV__) logger.error('Failed to save PsstData to localStorage:', error);
```

Available methods: `logger.log`, `logger.info`, `logger.warn`, `logger.error`, `logger.debug`. Messages are automatically prefixed with `[psst]`.

> Why the `if (__DEV__)` guard? Without it, the call survives in production as a no-op, but its *arguments* (message strings, any computed values) are still compiled in and evaluated at runtime. Wrapping the call lets the minifier delete the entire statement — arguments included.

`__DEV__` is declared as a global in `src/common/declarations.ts` (so TypeScript accepts it) and defined as `true` for the test suite in `vitest.config.ts`, so logging is active while tests run.

## Running Tests

Tests run with [Vitest](https://vitest.dev/) in a `jsdom` environment (configured in `vitest.config.ts`):

```bash
npm test
```

Test files live under `tests/` and are matched by `tests/**/*.test.ts`. They are excluded from `npm run build` and `npm run bundle`, so they never end up in `out/`.

Per-website tests live under `tests/<website>/` (one `user.test.ts` and one `policy.test.ts` per website), mirroring `src/<website>/`. Shared logic lives in `src/common/` and is covered under `tests/common/`, which also holds shared test helpers (`dom_mocks.ts`, `policy_mocks.ts`) used across website test suites.

## Scripts

- `npm run build` — Type-check and compile TypeScript (`src/` only) to `out/`
- `npm run bundle` — Bundle each website's scripts with Webpack to `out/scripts/<website>/` (development)
- `npm run bundle:dev` — Development bundle (logging enabled); also regenerates `out/psst.json`
- `npm run bundle:prod` — Production bundle (minified, logging stripped); also regenerates `out/psst.json`
- `npm test` — Run the Vitest test suite

## Project Structure

```
psst-component-test-typescript/
├── src/
│   ├── common/              # Shared base definitions/interfaces (not a website)
│   │   ├── declarations.ts  # Shared types + ambient globals (__DEV__, params, ...)
│   │   ├── logger.ts        # Dev-only logger, stripped from production builds
│   │   ├── psst_utils.ts    # PsstData/Task types + shared helpers (localStorage, country filtering, ...)
│   │   ├── user_base.ts     # UserScriptBase — parses `params`, builds UserScriptData
│   │   └── policy_base.ts   # PolicyScriptBase — parses `params`, applies tasks one at a time
│   ├── twitter/              # A concrete website implementation
│   │   ├── user.ts
│   │   └── policy.ts
│   ├── linkedin/
│   └── chatgpt/
├── scripts/
│   ├── generate-psst-config.ts  # Produces out/psst.json (run via prebundle:dev/prebundle:prod)
│   └── webpack/
│       └── wrap-psst-result-plugin.js  # Makes each bundle's completion value readable by the host
├── tests/
│   ├── common/            # Tests + shared mocks for src/common/
│   ├── twitter/            # Tests for each supported website
│   ├── linkedin/
│   └── chatgpt/
├── package.json
├── tsconfig.json      # Build config (compiles src/ only)
├── tsconfig.test.json # Type-checking config that also covers tests/
├── vitest.config.ts   # Test runner config (jsdom environment)
├── webpack.config.js  # Auto-discovers websites and bundles per script
└── ...
```

`common` contains the base definitions shared by every website implementation — `UserScriptBase` and `PolicyScriptBase` (see [Script Parameters](#script-parameters-host--script-communication) above), plus shared types and utilities.

Each supported website lives in its own folder (e.g. `twitter`). A website provides:

- a **user** script implementing `UserScriptBase` (extracts the user id and exposes the list of privacy tasks, filtered by country), and
- a **policy** script extending `PolicyScriptBase` (applies the privacy settings task by task).

Each website manages its own privacy settings because they differ per site.

`tests` contains tests for each supported website, mirroring the `src/<website>/` layout, plus `tests/common/` for the shared base classes and utilities.

## Adding a New Website

No build or bundle configuration changes are required:

1. Create a new folder under `src/`, e.g. `src/<website>/`.
2. Add the website's scripts (e.g. `user.ts` extending `UserScriptBase`, and `policy.ts` extending `PolicyScriptBase`).
3. For each `Task`, optionally set `available_for_countries` / `unavailable_for_countries` if a setting doesn't apply everywhere — leave both `undefined` for a task that's available in every country.
4. (Optional) Add tests under `tests/<website>/`.

Running `npm run bundle` will automatically produce `out/scripts/<website>/` with one `*.js` file per script in the folder.

> Note: any non-website helper folders added under `src/` should be listed in `NON_WEBSITE_DIRS` in `webpack.config.js` so they are not treated as a bundle target (the shared `common` folder is already excluded).

## Notes

- Edit `webpack.config.js` to customize the bundling process.
- Edit `tsconfig.json` to change TypeScript compiler options.

## License

MIT
