# Phase 1: Build Pipeline - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure source files into `src/`, tests into `tests/`, and get all four tooling commands (`build`, `typecheck`, `lint`, `test`) passing against the correctly structured layout. This unblocks all subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Example file treatment
- Move `demo.ts` and `SearchBar.tsx` to `examples/` directory
- Examples excluded from typecheck (not in tsconfig include)
- Examples included in lint (biome check covers `examples/`)
- Example imports updated to use `../src/` relative paths with `.js` extension

### Build verification
- Success = all four commands exit cleanly (build, typecheck, lint, test)
- Additionally verify dist/ file listing shows expected output files (index.js, index.cjs, index.d.ts, adapters/react.js, adapters/react.cjs)
- No smoke test against dist/ output — that's overkill for this phase

### Config alignment
- Minimal approach: move files to match configs, fix only what breaks
- Exception: move `config.json` to `.changeset/config.json` now (natural to do during restructure)
- Don't proactively clean up configs that are working

### Test import migration
- Tests use `../src/` relative imports with `.js` extension (matches existing codebase convention)
- Import granularity (barrel vs direct module) left to Claude's discretion per test file

### Claude's Discretion
- Exact import granularity in test files (barrel vs direct)
- Order of file moves (batch vs incremental)
- Whether to update biome lint targets to include `examples/` in the npm script

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tsup.config.ts`: Already configured with correct entry points (`src/index.ts`, `src/adapters/react.ts`) — no changes needed
- `vitest.config.ts`: Already references `tests/**/*.test.ts` for test discovery — no changes needed
- `tsconfig.json`: Already has `rootDir: "src"` and `include: ["src"]` — no changes needed
- `biome.json`: Lint scripts in package.json reference `./src ./tests` — may need `examples` added
- `.npmignore`: Already excludes `examples/` from published package

### Established Patterns
- All local imports use `.js` extension (NodeNext ESM convention)
- Type-only imports use `import type` syntax
- Named exports only (no defaults except SearchBar.tsx)
- Relative path imports, no aliases

### Integration Points
- `src/index.ts` is the main barrel file (exports IntentMap, createIntentMap, defineIntent, all types)
- `src/adapters/react.ts` is the React subpath entry (imports from `../index.js`)
- `package.json` exports map `.` -> dist/index.js/cjs and `./react` -> dist/adapters/react.js/cjs

</code_context>

<specifics>
## Specific Ideas

- The file layout mismatch is the critical blocker for all other phases — everything else builds on this
- All configs already reference the intended structure, so the restructure should "just work" once files are moved and imports updated

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-build-pipeline*
*Context gathered: 2026-04-13*
