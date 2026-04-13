# Project Research Summary

**Project:** intentMap
**Domain:** Zero-dependency TypeScript npm library (offline intent matching with TF-IDF vector scoring)
**Researched:** 2026-04-12
**Confidence:** HIGH

## Executive Summary

intentMap is a brownfield TypeScript library at v0.1.0 that functionally works but has a broken build pipeline -- all tool configs (tsup, tsconfig, vitest) reference a `src/` directory that does not exist. The library's core value is synchronous, offline intent matching using blended cosine similarity (35%) and keyword overlap (65%), with optional React hooks. The primary challenge is not building new features but restructuring existing, working code into a production-ready package that earns developer trust.

The recommended approach is a phased refactor that fixes the file layout first (unblocking everything else), then layers in input validation, bug fixes, and test coverage. The existing codebase is small (~500 lines of TS across 7 source files) and the algorithm is sound -- the work is primarily structural and quality assurance. All four research streams converge on the same conclusion: file restructure is the critical path dependency, and after that, input validation and comprehensive tests are the highest-value investments.

Key risks are concentrated in two areas: (1) the React hooks have stale closure and cleanup bugs that require careful lifecycle management (useRef pattern, not dependency array changes), and (2) any changes to the stemmer or scoring weights will silently shift all match scores, so snapshot-based regression testing is essential before touching those components. The zero-dependency constraint means all fixes must be hand-rolled, but the scope is small enough that this is straightforward.

## Key Findings

### Recommended Stack

The current toolchain is correct and should be kept entirely. The stack needs no technology changes -- only structural fixes to make the existing tools work. TypeScript 5.5 with strict mode, tsup for dual ESM/CJS builds, Vitest for testing, Biome for linting/formatting, and Changesets for versioning are all well-suited for a zero-dep library. The only additions needed are `@testing-library/react` (for React hook tests) and `jsdom` (for DOM binding tests), both as dev dependencies.

**Core technologies:**
- TypeScript ^5.5.4: Language with strict mode -- already configured, no changes needed
- tsup ^8.2.4: Build tool for ESM+CJS+dts -- ideal for zero-dep libraries, fast esbuild-based builds
- Vitest ^2.0.5: Test runner -- fast, native TS support, needs jsdom environment added for DOM tests
- Biome ^1.8.3: Linter and formatter -- replaces ESLint+Prettier, already configured
- @changesets/cli ^2.27.7: Versioning and publishing -- standard for TS libraries, config needs relocation
- React ^18.3.1: Optional peer dependency for adapter types -- correct pattern

### Expected Features

**Must have (table stakes):**
- Working build pipeline (fix file layout, all commands pass) -- nothing else matters without this
- Input validation with descriptive errors -- biggest trust signal for a utility library
- Package infrastructure (.gitignore, LICENSE, package-lock.json, real metadata) -- bare minimum for npm
- Destroy-state guard -- prevents silent post-teardown bugs
- Debounce option for `bind()` -- the primary use case is real-time text input
- Test coverage to 80%+ (React hooks, DOM binding, stemmer, edge cases)
- Configurable scoring weights -- makes the library adaptable to different domains

**Should have (competitive):**
- Debug mode with scoring breakdown -- DX differentiator vs opaque NLP services
- Safe React hooks (stale closure fix, cleanup, key-based re-creation) -- no competition in this niche
- Custom stemmer option -- extensibility without multi-language support
- Sub-10KB gzipped bundle -- genuine differentiator vs natural (~3MB), compromise (~300KB)

**Defer (v1.1+):**
- `toJSON()`/`fromJSON()` serialization -- design internal state for it now, build later
- `matchAll()`/ranked results helper -- API sugar, not essential
- `matchAsync()`/web worker -- only if real-world perf data demands it
- Framework adapters beyond React -- maintenance burden without proportional value

### Architecture Approach

The target architecture is a layered, single-direction dependency flow within `src/`, organized into four tiers: `core/` (orchestration and matching), `engine/` (pure data transformations), `utils/` (cross-cutting validation and errors), and `adapters/` (framework-specific integrations). Data flows strictly downward: core calls engine, engine never calls core. Adapters import only from the public barrel (`index.ts`), never from engine internals. This clean DAG has two leaf modules (tokenizer.ts, types.ts) that depend on nothing.

**Major components:**
1. `src/core/IntentMap.ts` -- Orchestrator: event system, DOM binding, lifecycle, delegates to matcher
2. `src/core/matcher.ts` -- Scoring engine: blended cosine + keyword, threshold logic, single-tokenization optimization
3. `src/engine/vector-store.ts` -- VectorStore: TF-IDF vectorization, cosine similarity, keyword overlap
4. `src/engine/tokenizer.ts` -- Text processing: tokenize, stem, n-grams (leaf module, no dependencies)
5. `src/utils/validate.ts` + `src/utils/errors.ts` -- Boundary validation and custom error classes
6. `src/adapters/react.ts` -- React hooks isolated behind subpath export (`intentmap/react`)

### Critical Pitfalls

1. **Moving files breaks import paths silently** -- After moving to `src/`, run `tsc --noEmit` immediately to catch every broken import before touching any logic. Move leaf modules first (types, tokenizer), then inward-to-outward.

2. **React hook stale closure introduces new bugs** -- Adding `handler` to `useEffect` dependency arrays causes re-subscription on every render. Use `useRef` pattern: store handler in ref, subscribe once, call `ref.current()` in callback.

3. **Stemmer changes silently shift all match scores** -- Snapshot current match results for all existing test inputs BEFORE touching the stemmer. After changes, compare. Score shifts must be intentional and documented.

4. **Configurable weights must not change default behavior** -- Default to `undefined` in config, apply 0.35/0.65 only when undefined. When explicitly set, normalize. Test that explicit 0.35/0.65 produces identical scores to no config.

5. **Debounce creates cleanup complexity** -- Store timeout IDs per element. Clear them in `bind()` cleanup and `destroy()`. Test cleanup explicitly to prevent use-after-free on unbound elements.

## Implications for Roadmap

Based on the convergence of all four research streams, the recommended phase structure follows the dependency chain identified in FEATURES.md and the build order from ARCHITECTURE.md:

### Phase 1: File Restructure + Build Fix
**Rationale:** Every other phase depends on the build working. This is the critical path blocker identified across all research files.
**Delivers:** Working `npm run build`, `test`, `typecheck`, `lint`. Files in correct directories.
**Addresses:** Table stakes features #2 (working build), #7 (TypeScript types), #11 (dual ESM+CJS build).
**Avoids:** Pitfall #1 (import path breakage) by moving leaf modules first and verifying with `tsc --noEmit`.
**Pattern:** Move types.ts and tokenizer.ts first (leaf modules, zero import breakage), then vector-store, matcher, IntentMap, index, adapters, tests.

### Phase 2: Package Infrastructure + Validation
**Rationale:** These are low-complexity, high-trust-signal changes that should land before any behavioral changes. Validation at API boundaries is a prerequisite for the destroy-state guard and engine fixes.
**Delivers:** .gitignore, LICENSE, package-lock.json, real metadata, input validation on all public methods, IntentMapError class, destroy-state guard.
**Addresses:** Table stakes #1 (validation), #3 (LICENSE), #4 (.gitignore), #5 (lockfile), #8 (error messages), #9 (destroy guard).
**Avoids:** Pitfall #2 (changing API breaks existing tests) by fixing layout first, then adding validation separately.
**Uses:** Validation pattern from ARCHITECTURE.md Pattern 1 (validation at API boundaries only).

### Phase 3: Engine Fixes + Scoring Config
**Rationale:** Behavioral changes to the matching engine. Must come after validation is in place so test failures are clearly from engine changes, not from missing input checks.
**Delivers:** Single-tokenization optimization, configurable scoring weights, bind() duplicate listener fix, innerText/textContent preference.
**Addresses:** Table stakes #10 (debounce option -- can be bundled with bind fix), #12 (configurable weights).
**Avoids:** Pitfall #4 (stemmer changes shift scores) by snapshotting before changes. Pitfall #7 (weights change defaults) by defaulting to undefined.
**Research flag:** Standard patterns -- engine is pure computation, well-understood domain.

### Phase 4: Test Coverage Expansion
**Rationale:** Comprehensive tests require working build, validation, and engine fixes to test against. This phase locks in correctness before the more complex React work.
**Delivers:** 80%+ coverage including React hooks, DOM binding, stemmer, edge cases (Unicode, empty input, post-destroy, concurrent ops), scoring calibration.
**Addresses:** Table stakes #6 (comprehensive test suite).
**Avoids:** Pitfall #5 (validation changes error behavior) -- tests written against validated API.
**Research flag:** Needs jsdom setup for DOM tests and @testing-library/react for hook tests. Standard patterns for unit tests.

### Phase 5: React Adapter Hardening
**Rationale:** React hooks have the highest risk (lifecycle bugs, stale closures). Isolating this work in its own phase means failures are clearly from React concerns, not from core changes.
**Delivers:** Fixed useIntentMap config staleness, useIntent stale closure fix (useRef pattern), useIntentBind cleanup + debounce, dedicated React tests.
**Addresses:** Differentiator #3 (safe React hooks).
**Avoids:** Pitfall #3 (hook refactoring introduces bugs) by using useRef pattern. Pitfall #6 (debounce cleanup).
**Research flag:** This phase likely needs deeper research during planning. React hook lifecycle patterns are subtle and the stale closure fix has multiple valid approaches. Verify with `renderHook` from @testing-library/react.

### Phase 6: DX Polish + Release Prep
**Rationale:** Final phase before v1.0. Debug mode, custom stemmer option, README, CHANGELOG, and any remaining polish.
**Delivers:** Debug mode with scoring breakdown, custom stemmer config option, README documentation, verified bundle size, CI pipeline fully green.
**Addresses:** Differentiators #2 (debug mode), #4 (zero-dep promise verified), #6 (sub-10KB verified), #10 (custom stemmer).
**Research flag:** Standard patterns -- documentation and configuration surface design.

### Phase Ordering Rationale

- The ordering follows the strict dependency chain: layout fix unblocks build, build unblocks validation, validation unblocks engine changes, engine changes unblock comprehensive tests, tests enable safe React refactoring.
- Architecture's core/engine/utils split means Phases 2-3 can partially overlap (validation in utils, engine in engine) but should not be interleaved within the same commit to keep test failures diagnosable.
- React work is deliberately last because it depends on a stable core API and comprehensive tests to verify hook behavior against.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (React Adapter):** Hook lifecycle patterns are subtle. Stale closure fix has multiple valid approaches (useRef vs useReducer vs useSyncExternalStore). The correct approach depends on React version compatibility targets.
- **Phase 3 (Scoring Config):** Weight normalization strategy needs a design decision -- normalize to sum to 1.0, or accept raw weights and scale internally? The answer affects backward compatibility guarantees.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Restructure):** File moves with import updates are mechanical. Follow the leaf-first order from ARCHITECTURE.md.
- **Phase 2 (Infrastructure):** .gitignore, LICENSE, lockfile, validation helpers are all boilerplate.
- **Phase 4 (Tests):** Unit test patterns for matching/tokenization are straightforward. jsdom setup is well-documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All tools are established, slow-moving ecosystem. Current toolchain is correct; no technology swaps needed. Based on direct codebase analysis of all config files. |
| Features | HIGH | Feature gap analysis is based on direct codebase audit (7 source files, 2 test files). npm DX expectations are well-established community standards. Competitive landscape assessment is MEDIUM (no direct competitor in lightweight offline intent matching). |
| Architecture | HIGH | Dependency graph derived from direct source file analysis. Tool configs read and verified against actual file layout. Build order is based on actual import chains in the codebase. |
| Pitfalls | HIGH | Pitfalls are common refactoring patterns, well-documented in TypeScript ecosystem. Phase-specific risk assessment directly maps to the identified dependency chain. |

**Overall confidence:** HIGH

### Gaps to Address

- **React hook fix approach:** The research identifies the stale closure problem but does not conclusively determine whether `useRef`, `useReducer`, or `useSyncExternalStore` is the best fix. This needs a design decision during Phase 5 planning, likely after testing which approach works with the React 18 concurrent features the project targets.
- **Bundle size verification:** Research estimates sub-10KB gzipped based on ~500 lines of TS, but this has not been measured. Actual bundle analysis should happen in Phase 6 to verify the differentiator claim.
- **Performance baseline:** No benchmarking data exists for current match latency. Before declaring synchronous matching sufficient, Phase 3 should establish baseline numbers to validate the "sub-millisecond for under 100 intents" assumption.

## Sources

### Primary (HIGH confidence)
- Direct codebase audit: all 7 TypeScript source files, 2 test files, package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, biome.json
- Codebase documentation: .planning/codebase/ARCHITECTURE.md, .planning/codebase/STRUCTURE.md, .planning/codebase/CONCERNS.md
- Project scope: .planning/PROJECT.md

### Secondary (MEDIUM confidence)
- npm library packaging and DX expectations: established community standards, well-documented patterns
- TypeScript library build patterns: standard tsup + vitest + changesets workflow
- Competitive landscape: `natural` (~3MB), `compromise` (~300KB), `nlp.js` -- no direct competitor in lightweight offline intent matching niche

### Tertiary (LOW confidence)
- React hook stale closure best practice for React 18 concurrent mode -- multiple valid approaches exist, needs validation during Phase 5
- Performance characteristics at scale (1000+ intents) -- extrapolated from algorithmic complexity, not measured

---
*Research completed: 2026-04-12*
*Ready for roadmap: yes*
