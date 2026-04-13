# Phase 1: Build Pipeline - Research

**Researched:** 2026-04-13
**Domain:** TypeScript library build tooling (tsup, vitest, biome, tsc)
**Confidence:** HIGH

## Summary

This phase is a **file restructure** that moves source files from the project root into `src/`, tests into `tests/`, and examples into `examples/`. The critical finding is that **all build tool configs already reference the target structure** -- tsup points at `src/index.ts`, vitest at `tests/**/*.test.ts`, tsconfig has `rootDir: "src"`, and the lint script references `./src ./tests`. The restructure is primarily a file-move-and-update-imports operation with minimal config changes.

The only files that need import path changes are `demo.ts` and `SearchBar.tsx` (examples), which currently use bare package specifiers (`'intentmap'`, `'intentmap/react'`) that must become relative paths (`'../src/index.js'`, `'../src/adapters/react.js'`). All internal source imports already use correct `./` relative paths with `.js` extensions, and test imports already point to `../src/`.

The changeset config relocation (`config.json` -> `.changeset/config.json`) is the one config modification that does not naturally follow from the restructure.

**Primary recommendation:** Batch-move all files, update exactly two files' imports (demo.ts, SearchBar.tsx), create `.changeset/config.json`, then run all four commands to verify.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Move `demo.ts` and `SearchBar.tsx` to `examples/` directory
- Examples excluded from typecheck (not in tsconfig include)
- Examples included in lint (biome check covers `examples/`)
- Example imports updated to use `../src/` relative paths with `.js` extension
- Success = all four commands exit cleanly (build, typecheck, lint, test)
- Additionally verify dist/ file listing shows expected output files (index.js, index.cjs, index.d.ts, adapters/react.js, adapters/react.cjs)
- No smoke test against dist/ output
- Minimal approach: move files to match configs, fix only what breaks
- Exception: move `config.json` to `.changeset/config.json` now
- Don't proactively clean up configs that are working
- Tests use `../src/` relative imports with `.js` extension (matches existing codebase convention)

### Claude's Discretion
- Exact import granularity in test files (barrel vs direct)
- Order of file moves (batch vs incremental)
- Whether to update biome lint targets to include `examples/` in the npm script

### Deferred Ideas (OUT OF SCOPE)
- None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BLD-01 | Source files moved to `src/` directory with React adapter at `src/adapters/react.ts` | File mapping table below; all 6 source files + adapter identified |
| BLD-02 | Test files moved to `tests/` directory with updated import paths | Test imports already reference `../src/` -- no changes needed |
| BLD-03 | `npm run build` produces working ESM + CJS output in `dist/` | tsup config analysis; entry points, formats, dts all pre-configured |
| BLD-04 | `npm run typecheck` passes with strict mode and all safety flags | tsconfig strict flags documented; rootDir/include already set to `src` |
| BLD-05 | `npm run lint` passes against `src/` and `tests/` | biome config analysis; lint script targets already correct |
| BLD-06 | `npm run test` passes with all existing tests | vitest config analysis; test discovery glob already matches target |
| BLD-07 | `intentmap/react` subpath export resolves correctly from built output | package.json exports map analysis; tsup entry point produces correct dist files |
</phase_requirements>

## Standard Stack

### Core (already in package.json)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | ^8.2.4 | Build ESM + CJS + .d.ts from TypeScript | Zero-config bundler on esbuild; handles dual format, declarations, subpath exports |
| typescript | ^5.5.4 | Type checking (`tsc --noEmit`) | Language standard; strict mode with safety flags already configured |
| vitest | ^2.0.5 | Test runner | Fast, ESM-native, vite-powered; already configured with correct test discovery |
| @biomejs/biome | ^1.8.3 | Linting + formatting | Single-tool replacement for ESLint+Prettier; already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | ^2.0.5 | Code coverage reporting | `npm run test:coverage` -- not needed for this phase |
| @changesets/cli | ^2.27.7 | Version management and publishing | Config relocation only this phase; `npm run version`/`npm run release` |
| react | ^18.3.1 (dev/peer) | React adapter type checking | Required for `react.ts` to typecheck; peer dep for consumers |
| @types/react | ^18.3.3 | React type definitions | Required by tsup for .d.ts generation of React adapter |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsup | unbuild, pkgroll, tsconfig-paths | tsup already configured and working -- no reason to switch |
| biome | ESLint + Prettier | biome already configured; migrating away would be regression |

**Installation:**
```bash
npm install
```
(All dependencies declared in package.json. No new packages needed for this phase.)

## Architecture Patterns

### Current File Layout (Root -- Broken)
```
/
├── index.ts           # barrel export
├── IntentMap.ts       # main class
├── types.ts           # TypeScript interfaces
├── matcher.ts         # scoring engine
├── embeddings.ts      # vector math
├── tokenizer.ts       # text processing
├── react.ts           # React hooks (should be in src/adapters/)
├── intentmap.test.ts  # core tests
├── tokenizer.test.ts  # tokenizer tests
├── demo.ts            # usage example
├── SearchBar.tsx      # React example component
├── config.json        # changeset config (wrong location)
└── ...configs
```

### Target File Layout (After Restructure)
```
/
├── src/
│   ├── index.ts           # barrel export (from root)
│   ├── IntentMap.ts       # main class (from root)
│   ├── types.ts           # TypeScript interfaces (from root)
│   ├── matcher.ts         # scoring engine (from root)
│   ├── embeddings.ts      # vector math (from root)
│   ├── tokenizer.ts       # text processing (from root)
│   └── adapters/
│       └── react.ts       # React hooks (from root react.ts)
├── tests/
│   ├── intentmap.test.ts  # core tests (from root)
│   └── tokenizer.test.ts  # tokenizer tests (from root)
├── examples/
│   ├── demo.ts            # usage example (from root)
│   └── SearchBar.tsx      # React example (from root)
├── .changeset/
│   └── config.json        # changeset config (from root config.json)
└── ...configs (unchanged)
```

### File Move Map with Import Impact

| Source File | Destination | Internal Imports Need Change? | Details |
|-------------|-------------|-------------------------------|---------|
| `index.ts` | `src/index.ts` | NO | Imports `./IntentMap.js`, `./types.js` -- relative, still correct |
| `IntentMap.ts` | `src/IntentMap.ts` | NO | Imports `./matcher.js`, `./types.js` -- relative, still correct |
| `types.ts` | `src/types.ts` | NO | No imports |
| `matcher.ts` | `src/matcher.ts` | NO | Imports `./embeddings.js`, `./tokenizer.js`, `./types.js` -- relative |
| `embeddings.ts` | `src/embeddings.ts` | NO | Imports `./tokenizer.js`, `./types.js` -- relative |
| `tokenizer.ts` | `src/tokenizer.ts` | NO | No imports |
| `react.ts` | `src/adapters/react.ts` | NO | Imports `../index.js`, `../types.js` -- going up one dir to src/ is still correct |
| `intentmap.test.ts` | `tests/intentmap.test.ts` | NO | Already imports from `../src/index.js` |
| `tokenizer.test.ts` | `tests/tokenizer.test.ts` | NO | Already imports from `../src/tokenizer.js` |
| `demo.ts` | `examples/demo.ts` | YES | `'intentmap'` -> `'../src/index.js'` |
| `SearchBar.tsx` | `examples/SearchBar.tsx` | YES | `'intentmap/react'` -> `'../src/adapters/react.js'`, `'intentmap'` -> `'../src/index.js'` |
| `config.json` | `.changeset/config.json` | N/A | No imports; just file move |

**Critical finding:** Only 2 files (demo.ts, SearchBar.tsx) need import path changes. All other files use correct relative paths already.

### Pattern: Subpath Export with tsup

The `intentmap/react` subpath export pattern:

```typescript
// tsup.config.ts -- entry uses object with nested key
entry: {
  index: 'src/index.ts',
  'adapters/react': 'src/adapters/react.ts',
}
```

This produces:
```
dist/
├── index.js          # ESM main
├── index.cjs         # CJS main
├── index.d.ts        # TypeScript declarations (ESM)
├── index.d.cts       # TypeScript declarations (CJS)
├── adapters/
│   ├── react.js      # ESM React subpath
│   ├── react.cjs     # CJS React subpath
│   ├── react.d.ts    # TypeScript declarations (ESM)
│   └── react.d.cts   # TypeScript declarations (CJS)
```

The `package.json` exports map already correctly references these paths. No changes needed.

### Anti-Patterns to Avoid

- **Moving files incrementally with partial commits:** Moving files one-at-a-time leaves the build broken between moves. Move all source files as one batch.
- **Updating config files that already reference the target structure:** tsup, vitest, tsconfig, biome, and npm scripts already point at `src/` and `tests/`. Only move the files; do not touch configs (exception: changeset config relocation).
- **Using barrel imports in tests when direct imports exist:** The existing tests import specific functions (`createIntentMap`, `defineIntent`, `tokenize`, etc.). Keep this pattern; do not switch to wildcard imports.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dual ESM/CJS output | Custom rollup/webpack config | tsup | tsup handles format splitting, declaration generation, and banner injection |
| Type declaration generation | Manual .d.ts files | tsup `dts: true` | tsup uses rollup-plugin-dts internally for correct declaration bundling |
| Test discovery | Custom glob-based runner | vitest `include` config | vitest already configured with `tests/**/*.test.ts` glob |
| Import path resolution | Custom resolver | TypeScript `NodeNext` moduleResolution | Already configured; `.js` extensions in imports enable ESM CJS interop |

**Key insight:** The project's configs are already correctly configured for the target structure. The restructure is almost entirely a file-move operation. The only "hand-rolling" is updating 2 example files' import paths and creating the `.changeset/` directory.

## Common Pitfalls

### Pitfall 1: react.ts Relative Path Depth
**What goes wrong:** After moving `react.ts` to `src/adapters/react.ts`, its imports of `../index.js` and `../types.js` might appear to break because the file is now one directory deeper.
**Why it happens:** `react.ts` currently imports `'../index.js'` and `'../types.js'` from the root, which resolves to `<root>/index.js`. After moving to `src/adapters/react.ts`, `../index.js` resolves to `src/index.js` -- which is correct.
**How to avoid:** Verify that `../` from `src/adapters/` points to `src/`, which is where `index.ts` and `types.ts` will live. This is already correct; no change needed.
**Warning signs:** If `npm run build` fails with "cannot resolve ../index.js" after the move, the adapter file is not at `src/adapters/react.ts`.

### Pitfall 2: Examples Not Excluded from TypeScript
**What goes wrong:** `tsc --noEmit` might try to typecheck `examples/demo.ts` and `examples/SearchBar.tsx`, which import from `intentmap` (bare package specifier) that does not resolve locally.
**Why it happens:** tsconfig `include: ["src"]` only covers `src/`, but if the include is too broad, examples get typechecked.
**How to avoid:** The existing tsconfig explicitly `include: ["src"]` and `exclude: ["node_modules", "dist", "tests", "examples"]`. Examples are already excluded. No change needed.
**Warning signs:** `npm run typecheck` errors mentioning `examples/` files.

### Pitfall 3: Missing `.changeset/` Directory
**What goes wrong:** `@changesets/cli` expects its config at `.changeset/config.json` (default location). The project currently has `config.json` at the root, which is a non-standard location.
**Why it happens:** The changeset config was placed at the root instead of in `.changeset/`.
**How to avoid:** Create the `.changeset/` directory and move `config.json` there. Also create an empty `.changeset/README.md` file (changesets expects this).
**Warning signs:** `npx changeset` commands fail or warn about missing config.

### Pitfall 4: node_modules Missing (npm install Required)
**What goes wrong:** The project has no `node_modules/` and no `package-lock.json`. All four commands will fail until dependencies are installed.
**Why it happens:** Dependencies were never installed (or were gitignored and lost).
**How to avoid:** Run `npm install` as the very first step before any verification. This also generates `package-lock.json`.
**Warning signs:** `npm run build` fails with "Cannot find module 'tsup'".

### Pitfall 5: biome lint Targets Missing `examples/`
**What goes wrong:** The decision says "Examples included in lint (biome check covers `examples/`)". The current lint script is `biome check ./src ./tests` -- it does not include `examples/`.
**Why it happens:** The script was written before the restructure was planned.
**How to avoid:** Update the lint/format scripts in package.json to include `./examples`, or update biome.json with appropriate file targeting. This is at Claude's discretion.
**Warning signs:** `npm run lint` passes but does not check `examples/` files.

### Pitfall 6: SearchBar.tsx Uses Default Export
**What goes wrong:** `SearchBar.tsx` uses `export default function SearchBar()`. If biome's rules flag default exports, this could cause lint failures.
**Why it happens:** The codebase convention is "named exports only (no defaults except SearchBar.tsx)" per CONTEXT.md.
**How to avoid:** The existing biome config uses `recommended: true` which does not prohibit default exports. This should pass as-is.
**Warning signs:** `npm run lint` fails on `SearchBar.tsx` with a default export warning.

## Code Examples

### Moving Source Files (bash commands)

```bash
# Create target directories
mkdir -p src/adapters tests examples .changeset

# Move source files to src/
mv index.ts src/
mv IntentMap.ts src/
mv types.ts src/
mv matcher.ts src/
mv embeddings.ts src/
mv tokenizer.ts src/

# Move React adapter to src/adapters/
mv react.ts src/adapters/react.ts

# Move test files to tests/
mv intentmap.test.ts tests/
mv tokenizer.test.ts tests/

# Move examples
mv demo.ts examples/
mv SearchBar.tsx examples/

# Move changeset config
mv config.json .changeset/config.json
```

### Updated examples/demo.ts imports

```typescript
// BEFORE:
import { createIntentMap, defineIntent } from 'intentmap'

// AFTER:
import { createIntentMap, defineIntent } from '../src/index.js'
```

### Updated examples/SearchBar.tsx imports

```typescript
// BEFORE:
import { useIntentMap, useIntent } from 'intentmap/react'
import { defineIntent } from 'intentmap'

// AFTER:
import { useIntentMap, useIntent } from '../src/adapters/react.js'
import { defineIntent } from '../src/index.js'
```

### Optional: Updated lint script in package.json

```json
{
  "scripts": {
    "lint": "biome check ./src ./tests ./examples",
    "lint:fix": "biome check --write ./src ./tests ./examples",
    "format": "biome format --write ./src ./tests ./examples"
  }
}
```

### Verification Commands

```bash
# Install dependencies (must be first)
npm install

# Build: produces dist/ with ESM + CJS + declarations
npm run build

# Typecheck: strict mode, no emit
npm run typecheck

# Lint: biome check against src, tests, (optionally examples)
npm run lint

# Test: vitest runs all tests
npm run test

# Verify dist output file structure
ls -la dist/
ls -la dist/adapters/
```

### Expected dist/ Output After Build

```
dist/
├── index.js
├── index.js.map
├── index.cjs
├── index.cjs.map
├── index.d.ts
├── index.d.ts.map
├── index.d.cts
├── index.d.cts.map
└── adapters/
    ├── react.js
    ├── react.js.map
    ├── react.cjs
    ├── react.cjs.map
    ├── react.d.ts
    ├── react.d.ts.map
    ├── react.d.cts
    └── react.d.cts.map
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESLint + Prettier | Biome | Biome 1.x (2023-2024) | Single tool, faster, less config |
| tsc for building | tsup (esbuild) | tsup 7+ (2023) | 10-100x faster builds |
| Jest | Vitest | Vitest 1-2 (2023-2024) | ESM-native, vite-powered |
| Root-level source files | `src/` directory | Standard practice | Better organization, cleaner package publishing |

**Deprecated/outdated:**
- None applicable. All tools in this project are current-generation.

## Open Questions

1. **Should `examples/` be added to lint targets?**
   - What we know: The CONTEXT.md says "Examples included in lint (biome check covers `examples/`)". The current script does NOT include `examples/`.
   - What's unclear: Whether to update the npm script or biome config.
   - Recommendation: Update the npm lint/format scripts to include `./examples`. This is at Claude's discretion.

2. **Should `.changeset/README.md` be created?**
   - What we know: `@changesets/cli` expects a `.changeset/` directory with a README.md file for storing changeset files.
   - What's unclear: Whether this is needed for the build pipeline phase or just publishing.
   - Recommendation: Create it as part of the config relocation -- it's a natural part of setting up `.changeset/` properly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.0.5 |
| Config file | `vitest.config.ts` (exists, correctly configured) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BLD-01 | Source files at correct paths | Manual verification | `ls src/index.ts src/adapters/react.ts` | N/A (structural) |
| BLD-02 | Test files at correct paths | Manual verification | `ls tests/intentmap.test.ts tests/tokenizer.test.ts` | N/A (structural) |
| BLD-03 | Build produces ESM + CJS | Smoke test | `npm run build && ls dist/index.js dist/index.cjs dist/index.d.ts` | N/A (structural) |
| BLD-04 | Typecheck passes strict | Automated | `npm run typecheck` | N/A (uses tsc) |
| BLD-05 | Lint passes | Automated | `npm run lint` | N/A (uses biome) |
| BLD-06 | All 26 tests pass | Automated (unit) | `npm run test` | YES (intentmap.test.ts, tokenizer.test.ts) |
| BLD-07 | React subpath export resolves | Smoke test | `npm run build && ls dist/adapters/react.js dist/adapters/react.cjs dist/adapters/react.d.ts` | N/A (structural) |

### Sampling Rate
- **Per task commit:** `npm run typecheck && npm run lint && npm run test`
- **Per wave merge:** `npm run build && npm run typecheck && npm run lint && npm run test`
- **Phase gate:** Full suite green + `ls` verification of dist/ output

### Wave 0 Gaps
None -- existing test infrastructure covers BLD-06. All other requirements are verified via build/lint/typecheck commands (tool-enforced, not test-framework). No new test files needed for this phase.

## Sources

### Primary (HIGH confidence)
- Direct code analysis: All source files, configs, and imports read and verified
- `package.json` -- dependency versions, scripts, exports map
- `tsup.config.ts` -- entry points, formats, dts, external packages
- `tsconfig.json` -- strict flags, module resolution, include/exclude
- `vitest.config.ts` -- test discovery glob, coverage config
- `biome.json` -- linter rules, formatter settings
- `01-CONTEXT.md` -- user-locked decisions and constraints

### Secondary (MEDIUM confidence)
- tsup documentation (training data) -- entry point object syntax, dts options, format splitting
- biome documentation (training data) -- recommended rules, check command behavior
- Vitest documentation (training data) -- config format, test discovery

### Tertiary (LOW confidence)
- Web search was unavailable (rate-limited). All findings based on direct code analysis and tool documentation knowledge.
- tsup ^8.2.4 is the declared version; no verification of post-8.2.4 breaking changes was possible.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies declared in package.json, configs verified by reading actual files
- Architecture: HIGH - Complete import graph analyzed; only 2 files need import changes confirmed by direct file reads
- Pitfalls: HIGH - Pitfalls identified from direct code analysis, not documentation assumptions
- Validation: HIGH - Test infrastructure already exists and correctly configured

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable tooling, unlikely to change significantly)
