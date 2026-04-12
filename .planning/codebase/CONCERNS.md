# Codebase Concerns

**Analysis Date:** 2026-04-12

## Tech Debt

**Flat file layout vs expected `src/` directory structure:**
- Issue: All source files (`.ts`) live at the project root, but the build config (`tsup.config.ts` line 5-6), tsconfig (`tsconfig.json` line 16 `rootDir: "src"`), vitest config (`vitest.config.ts` line 8 `include: ['tests/**/*.test.ts']` and line 11 `include: ['src/**/*.ts']`), and lint scripts (`package.json` line 67 `biome check ./src ./tests`) all expect files under `src/` and `tests/` directories. The actual files are at the project root with test files like `intentmap.test.ts` and `tokenizer.test.ts` also at root level, not under `tests/`.
- Files: `tsup.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`
- Impact: Build (`npm run build`), typecheck (`npm run typecheck`), lint (`npm run lint`), and test (`npm run test`) commands will fail. The package is not buildable or publishable in its current state. Every tool in the pipeline references paths that do not exist.
- Fix approach: Move all source `.ts` files into `src/` (with `react.ts` into `src/adapters/react.ts`), and test files into `tests/`. Update import paths accordingly. Alternatively, reconfigure all tool configs to reference root-level files.

**React adapter path mismatch in tsup config:**
- Issue: `tsup.config.ts` defines entry `'adapters/react': 'src/adapters/react.ts'` but the actual file is `react.ts` at the project root. The `package.json` exports map references `./dist/adapters/react.js` which will never be produced by the build.
- Files: `tsup.config.ts` (line 6), `react.ts`, `package.json` (lines 42-51)
- Impact: The `intentmap/react` subpath export is non-functional. Consumers importing from `intentmap/react` will get a module not found error.
- Fix approach: Either move `react.ts` to `src/adapters/react.ts` to match tsup config, or update tsup entry to point to root `react.ts` with output name `adapters/react`.

**Placeholder author and repository metadata:**
- Issue: `package.json` contains placeholder values: `"author": "Your Name <you@example.com>"`, `"url": "https://github.com/yourusername/intentmap.git"`, and the same placeholder in `tsup.config.ts` banner, `CHANGELOG.md` links, and `README.md`.
- Files: `package.json` (lines 5, 19, 24), `tsup.config.ts` (line 20), `CHANGELOG.md` (line 34)
- Impact: Package cannot be published to npm with placeholder author. Links in npm/GitHub will be broken. Unprofessional appearance.
- Fix approach: Replace all `yourusername` and `Your Name <you@example.com>` with actual author/org details before first publish.

**`config.json` at project root with unclear purpose:**
- Issue: A file named `config.json` exists at the project root with changesets configuration content (identical to what would normally be `.changeset/config.json`). It is unclear if changesets is properly configured since the standard `.changeset/` directory does not exist.
- Files: `config.json`
- Impact: `npm run release` and `npm run version` scripts reference `changesets/cli` but the config is not in the expected location (`.changeset/config.json`). The `release.yml` workflow references `changesets/action` which expects `.changeset/` directory structure. Release pipeline will likely fail.
- Fix approach: Move `config.json` to `.changeset/config.json` and remove from project root.

## Known Bugs

**Matcher returns `null` intent with `matched: true` when scores object is empty:**
- Issue: In `matcher.ts` line 56-62, when no intents are registered, `sorted` is an empty array. The destructuring `sorted[0] ?? [null, 0]` correctly falls back, but then `matched = topScore > threshold` evaluates to `0 > 0.25` which is `false`. However, if `defaultThreshold` is set to `0`, then `0 > 0` is `false` -- this edge case is correct. The real bug is that if someone registers an intent but then removes all patterns, the intent name still exists in `thresholds` but not in `store`, so `scores` is empty, `topIntent` is `null`, but `topScore` is `0`. If threshold is negative (impossible via normal API but possible via direct config), `matched` would be `true` with `intent: null`.
- Files: `matcher.ts` (lines 56-62)
- Symptoms: In edge cases with threshold=0 and no registered intents, `matched` could be `false` correctly but the code flow is fragile.
- Trigger: Call `match()` after removing all intents via `removeIntent()` on an instance with `defaultThreshold: 0`.
- Workaround: Always ensure at least one intent is registered before matching.

**`bind()` cleanup function uses reference equality for function comparison:**
- Issue: In `IntentMap.ts` lines 96-103, the cleanup function returned by `bind()` compares cleanup functions using `includes()` (reference equality). If `bind()` is called on the same element twice and the first cleanup is called, it correctly removes its own functions. However, if bind is called multiple times without cleanup, the array keeps growing with identical-purpose listeners.
- Files: `IntentMap.ts` (lines 94-104)
- Symptoms: Multiple `bind()` calls on the same element without cleanup lead to duplicate event listeners firing for the same events, causing `emit()` to be called multiple times per input event.
- Trigger: Call `im.bind(element)` twice on the same element without calling the first cleanup function in between.
- Workaround: Always call the cleanup function before rebinding, or check if the element is already bound.

**`extractText()` falls back to `innerText` without null safety on `textContent`:**
- Issue: In `IntentMap.ts` line 149, `target.innerText ?? target.textContent ?? ''` -- `textContent` can be `null` on certain node types, but the `??` handles this correctly. However, `innerText` triggers a layout reflow in browsers which is a performance concern for high-frequency events like `input`.
- Files: `IntentMap.ts` (lines 135-150)
- Symptoms: Performance degradation when binding to elements that fire frequently (e.g., `input` events on text fields) because `innerText` forces synchronous layout calculation.
- Trigger: Use `bind()` on an element without a `value` property or `data-intent` attribute, causing the fallback to `innerText`.
- Workaround: Provide a custom `extractor` in `BindOptions` to avoid the `innerText` fallback.

## Security Considerations

**No input sanitization or length limits on match input:**
- Risk: `match()` accepts arbitrary strings with no length validation. Extremely long strings could cause excessive memory usage during tokenization and vector construction. The tokenizer creates arrays and Maps proportional to input length.
- Files: `matcher.ts` (line 38), `tokenizer.ts` (lines 9-16), `embeddings.ts` (lines 4-21)
- Current mitigation: None
- Recommendations: Add a maximum input length check (e.g., 10,000 characters) in `match()` and return a low-confidence no-match for oversized inputs.

**Regex-based tokenization could be exploited with crafted input:**
- Risk: The regex `text.replace(/[^\w\s]/g, ' ').split(/\s+/)` in `tokenizer.ts` line 12 is not vulnerable to ReDoS, but inputs with extremely long "words" (e.g., a single 1MB string of alphanumeric characters with no spaces) would produce very large tokens that inflate vector size.
- Files: `tokenizer.ts` (line 11-15)
- Current mitigation: None
- Recommendations: Add token length limits (e.g., skip tokens longer than 50 characters).

**`emit()` passes through raw DOM Event objects to user handlers:**
- Risk: While not a direct security vulnerability, handlers registered via `on()` receive the original DOM `Event` object, which contains a reference to the full DOM tree via `event.target`. In sandboxed or cross-origin iframe scenarios, this could leak DOM references.
- Files: `IntentMap.ts` (line 83), `react.ts` (line 44)
- Current mitigation: None; this is by design.
- Recommendations: Document that handlers receive the raw Event and consumers should be aware of this in security-sensitive contexts. Low priority.

## Performance Bottlenecks

**`bestKeywordScore()` is O(n*m) per intent, called for every intent on every match:**
- Problem: On every `match()` call, `bestKeywordScore()` iterates all pattern entries for each intent and computes keyword overlap. With many intents and many patterns, this scales linearly with total patterns across all intents.
- Files: `embeddings.ts` (lines 100-108), `matcher.ts` (lines 44-49)
- Cause: No pre-built index for keyword lookup. Each call creates a new `Set` from `inputTokens` per pattern entry.
- Improvement path: Pre-build a reverse index mapping stems to intent names. For small to medium use cases (under 100 patterns total), this is fine. For larger deployments, build a `Map<string, Set<string>>` (stem to intents) at `addIntent()` time.

**Average vector recomputation on cache miss:**
- Problem: `VectorStore.getAverage()` recomputes the average of all pattern vectors for an intent when the cache is invalidated. After `train()` is called, the cache is invalidated and the next `match()` recomputes.
- Files: `embeddings.ts` (lines 87-95)
- Cause: `add()` in VectorStore deletes the cache entry, so every training call invalidates the cache for that intent.
- Improvement path: Acceptable for current scale. For frequent training, use incremental averaging instead of full recomputation.

**Tokenization is called twice per match:**
- Problem: In `matcher.ts` lines 39-40, `buildVector()` internally calls `tokenize()` and `stem()`, and then `match()` calls `tokenize()` and `stem()` again immediately after for `inputStems`. The input is tokenized and stemmed twice on every match call.
- Files: `matcher.ts` (lines 39-40), `embeddings.ts` (lines 4-5)
- Cause: `buildVector()` is a standalone function that does its own tokenization, and `match()` needs stems separately for keyword scoring.
- Improvement path: Refactor so that `buildVector()` accepts pre-tokenized stems, or have `match()` tokenize once and pass the result to both `buildVector()` and `bestKeywordScore()`.

## Fragile Areas

**Stemmer is simplistic and language-specific:**
- Files: `tokenizer.ts` (lines 38-50)
- Why fragile: The `stem()` function uses basic suffix stripping with length guards. It produces incorrect stems for many common English words. Examples: "running" becomes "runn" (not "run"), "bought" stays "bought" (no past tense handling for irregular verbs), "items" becomes "item" (correct) but "bus" becomes "bu" (incorrect, length guard is >4 so "bus" at 3 chars is safe, but "buses" becomes "bus" which is actually correct). More critically, "caring" becomes "car" (removes "ing" from length 6, but the stem should be "care"), "hoped" becomes "hop" (removes "ed" from length 5, should be "hope").
- Safe modification: Only add new suffix rules or increase length guards. Do not change existing rules without re-running all tests and checking confidence scores.
- Test coverage: `tokenizer.test.ts` has no tests for `stem()`, meaning regressions in stemming logic would go undetected.

**Scoring weights are hardcoded constants:**
- Files: `matcher.ts` (lines 5-6)
- Why fragile: `COSINE_WEIGHT = 0.35` and `KEYWORD_WEIGHT = 0.65` are module-level constants with no way to configure them. Changing these values changes every match result. The weights were chosen empirically but are not documented or justified.
- Safe modification: Make these configurable via `IntentConfig` before changing values.
- Test coverage: Tests verify specific match results that depend on these exact weights. Changing weights will break tests.

**React hook `useIntentMap` ignores config changes after initial render:**
- Files: `react.ts` (lines 5-12)
- Why fragile: The hook uses `useRef` to store the IntentMapInstance and only creates it once (`if (!ref.current)`). If the `config` prop changes (e.g., new intents added), the instance is never recreated. This is a common React pattern for avoiding unnecessary re-creation, but it means dynamic config changes are silently ignored.
- Safe modification: Compare config references or use a memoization key to trigger re-creation.
- Test coverage: No React tests exist at all. The hooks are completely untested.

**`useIntent` has unstable handler reference by default:**
- Files: `react.ts` (lines 14-24)
- Why fragile: The `deps` parameter defaults to `[]`, meaning the handler closure is captured once. If the handler references component state or props, it will see stale values. The effect depends on `[im, intent, ...deps]` but not on `handler` itself, so handler identity changes do not re-subscribe.
- Safe modification: Consumers must pass all referenced values in `deps`. This is documented nowhere and is a footgun.

## Scaling Limits

**In-memory-only intent storage:**
- Current capacity: Limited only by JavaScript heap size. Each intent pattern creates a TokenVector (Map) and stem array.
- Limit: For browser usage, practical limit is roughly 1,000-5,000 intents with 10-50 patterns each before noticeable memory pressure. No persistence mechanism exists -- all training is lost on page reload.
- Scaling path: Add optional serialization/deserialization (`toJSON()`/`fromJSON()`) to persist trained models to localStorage or IndexedDB. Consider a web worker for matching to avoid blocking the main thread at scale.

**Synchronous blocking match:**
- Current capacity: `match()` is synchronous and runs on the main thread. For small input strings and moderate intent counts (under 100), execution is sub-millisecond.
- Limit: With hundreds of intents and long input strings, tokenization + vector computation + cosine similarity for each intent will block the main thread. No batching or throttling is built in.
- Scaling path: Add an async `matchAsync()` method that runs in a web worker. For the `bind()` method, add built-in debounce/throttle options to avoid matching on every keystroke.

## Dependencies at Risk

**No runtime dependencies (positive), but dev toolchain is version-pinned:**
- Risk: All dev dependencies use caret ranges (^). `@biomejs/biome ^1.8.3` could have breaking changes in 2.x. `tsup ^8.2.4` is actively developed and may change plugin/output behavior.
- Impact: Build pipeline could break on `npm ci` if lockfile is not committed.
- Migration plan: Commit `package-lock.json` (currently absent) to pin exact versions. The lockfile is critical for reproducible builds.

**No `package-lock.json` committed:**
- Risk: `node_modules` does not exist and no lockfile is present. `npm ci` (used in `release.yml` line 21) requires a lockfile and will fail without one.
- Impact: CI/CD pipeline will fail. Local development may get different dependency versions across machines.
- Migration plan: Run `npm install` to generate `package-lock.json` and commit it.

## Missing Critical Features

**No `.gitignore` file:**
- Problem: The project has no `.gitignore`. `node_modules/`, `dist/`, coverage reports, and `.env` files would be committed accidentally. The `.npmignore` only controls what npm publishes, not what git tracks.
- Blocks: Clean repository management. Contributors will likely commit build artifacts and dependencies.

**No LICENSE file:**
- Problem: `package.json` declares `"license": "MIT"` and `.npmignore` lists it in the `files` array, but no `LICENSE` file exists at the project root. npm will show a warning on publish. MIT license technically requires including the license text.
- Blocks: Proper open-source licensing. Cannot publish to npm without license file warning.

**No error handling or validation on public API:**
- Problem: `createIntentMap()`, `match()`, `on()`, `bind()`, `addIntent()`, and `train()` perform no input validation. Passing `null`, `undefined`, or malformed objects will cause cryptic runtime errors deep in the tokenizer or matcher.
- Blocks: Usability and debuggability for library consumers. Better DX requires descriptive error messages at API boundaries.

**No debounce/throttle for DOM binding:**
- Problem: `bind()` attaches raw event listeners with no rate limiting. For `input` events on text fields, `match()` is called on every keystroke. The demo `SearchBar.tsx` calls `im.match()` on every `onChange` without debouncing.
- Blocks: Production readiness for real-time input scenarios. Without debounce, matching runs on every character typed, wasting CPU and potentially causing UI jank with many intents.

## Test Coverage Gaps

**Zero tests for React hooks (`useIntentMap`, `useIntent`, `useIntentBind`):**
- What's not tested: All three React hooks in `react.ts`. No tests verify correct initialization, handler registration, cleanup on unmount, or re-render behavior.
- Files: `react.ts`
- Risk: The most complex and fragile part of the library (React integration with lifecycle management) has zero test coverage. Hook bugs like stale closures, missing cleanup, or double-initialization will only be caught in consumer code.
- Priority: High

**No tests for `stem()` function:**
- What's not tested: The `stem()` function in `tokenizer.ts` which directly affects all scoring. No tests verify correct stemming of any word.
- Files: `tokenizer.ts` (lines 38-50), `tokenizer.test.ts`
- Risk: Any change to the stemmer (even unintentional refactoring) could silently change match results for all consumers. The stemmer has known edge cases ("caring" -> "car", "hoped" -> "hop") that are undocumented and untested.
- Priority: High

**No tests for `bind()` and DOM integration:**
- What's not tested: `IntentMap.bind()` method, the `extractText()` helper, and the full DOM event-to-match-to-emit flow. Tests exist for `match()` and `on()/emit()` separately but not for the binding layer that connects them.
- Files: `IntentMap.ts` (lines 61-104, 135-150)
- Risk: The DOM binding is the primary use case for the library and is completely untested. Event listener attachment, cleanup, and text extraction could all break silently.
- Priority: High

**No tests for `SearchBar.tsx` component:**
- What's not tested: The example/demo React component that exercises the full API surface.
- Files: `SearchBar.tsx`
- Risk: Low -- this is a demo file, not library code. But it would catch integration regressions.
- Priority: Low

**No negative/edge case tests:**
- What's not tested: Empty string input, very long input, special characters, Unicode text, emoji, null/undefined parameters, calling methods after `destroy()`, concurrent `train()` and `match()` calls.
- Files: `intentmap.test.ts`, `tokenizer.test.ts`
- Risk: Edge cases in production input (especially user-generated text with emoji, CJK characters, or mixed scripts) could produce unexpected tokenization results.
- Priority: Medium

**No tests for scoring calibration:**
- What's not tested: Whether confidence scores fall within expected ranges, whether threshold tuning produces correct accept/reject boundaries, whether the blended score formula (0.35 cosine + 0.65 keyword) produces well-calibrated probabilities.
- Files: `matcher.ts`
- Risk: Score calibration drift between versions could cause consumers' threshold settings to become invalid, silently breaking their intent detection.
- Priority: Medium

---

*Concerns audit: 2026-04-12*
