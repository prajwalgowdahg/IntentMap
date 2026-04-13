# Requirements: intentMap

**Defined:** 2026-04-12
**Core Value:** `match(input)` returns a reliable, confidence-scored intent -- fast, offline, zero deps.

## v1 Requirements

### Build & Structure

- [x] **BLD-01**: Source files moved to `src/` directory with React adapter at `src/adapters/react.ts`
- [x] **BLD-02**: Test files moved to `tests/` directory with updated import paths
- [x] **BLD-03**: `npm run build` produces working ESM + CJS output in `dist/`
- [x] **BLD-04**: `npm run typecheck` passes with strict mode and all safety flags
- [x] **BLD-05**: `npm run lint` passes against `src/` and `tests/`
- [x] **BLD-06**: `npm run test` passes with all existing tests
- [x] **BLD-07**: `intentmap/react` subpath export resolves correctly from built output

### Package Infrastructure

- [x] **PKG-01**: `.gitignore` added covering `node_modules/`, `dist/`, `.env`, coverage
- [x] **PKG-02**: `LICENSE` file created with MIT text
- [x] **PKG-03**: `package-lock.json` generated and committed
- [x] **PKG-04**: Changeset config moved from root `config.json` to `.changeset/config.json`
- [x] **PKG-05**: Placeholder `yourusername` and `Your Name` metadata replaced with real values

### Input Validation

- [x] **VAL-01**: `createIntentMap()` validates config object shape and throws descriptive `TypeError` on invalid input
- [x] **VAL-02**: `match()` validates input is a string and throws `TypeError` with message like `match() expected a string, got null`
- [x] **VAL-03**: `on()` validates intent name is string and handler is function
- [x] **VAL-04**: `addIntent()` validates name, patterns, and options
- [x] **VAL-05**: `train()` validates intent name exists and examples is a non-empty array
- [x] **VAL-06**: `bind()` validates element is an HTMLElement and options are valid
- [x] **VAL-07**: `match()` enforces max input length (10,000 chars) returning no-match for oversized input
- [x] **VAL-08**: All public methods guard against calls after `destroy()` with descriptive error

### Bug Fixes

- [x] **BUG-01**: Duplicate DOM event listeners prevented when `bind()` called multiple times on same element
- [x] **BUG-02**: `extractText()` prefers `textContent` over `innerText` to avoid layout reflow
- [x] **BUG-03**: Tokenization computed once per `match()` call instead of twice
- [x] **BUG-04**: `sorted[0]` edge case in matcher handled when no intents registered (return no-match cleanly)
- [x] **BUG-05**: `removeIntent()` also cleans up associated handlers, DOM bindings, and vector store entries

### DOM Binding

- [x] **DOM-01**: `BindOptions` includes `debounce?: number` option
- [x] **DOM-02**: Debounce implemented with `setTimeout`/`clearTimeout`, cleaned up on unbind and destroy
- [x] **DOM-03**: Debounce timeout cleared when element is unbound or instance destroyed

### React Adapter

- [x] **RCT-01**: `useIntentMap` accepts optional `key` prop to trigger instance re-creation
- [x] **RCT-02**: `useIntent` uses `useRef` for handler to prevent stale closure without re-subscription
- [x] **RCT-03**: `useIntentBind` properly cleans up on unmount
- [x] **RCT-04**: All hooks handle destroyed instance gracefully

### Scoring

- [x] **SCR-01**: `IntentConfig` accepts optional `weights?: { cosine?: number; keyword?: number }`
- [x] **SCR-02**: Weights normalized internally to sum to 1.0, defaulting to 0.35/0.65
- [ ] **SCR-03**: `MatchResult` includes optional `debug` field with per-intent scoring breakdown when `debug: true`
- [x] **SCR-04**: `IntentConfig` accepts optional `stemmer?: (word: string) => string` for custom stemming

### Test Coverage

- [ ] **TST-01**: React hook tests with `@testing-library/react` or `renderHook` for all three hooks
- [ ] **TST-02**: DOM binding tests using jsdom for `bind()`, text extraction, cleanup, and debounce
- [ ] **TST-03**: `stem()` unit tests covering known edge cases (caring, hoped, running, buses, etc.)
- [ ] **TST-04**: Edge case tests: empty string, very long input, Unicode/emoji, post-destroy calls, concurrent train/match
- [ ] **TST-05**: Scoring calibration tests verifying confidence ranges and threshold boundaries
- [ ] **TST-06**: All existing 26 tests continue to pass after refactor

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Serialization

- **SER-01**: `toJSON()` method for serializing trained state
- **SER-02**: `fromJSON()` static method or factory for restoring state
- **SER-03**: `localStorage`/`IndexedDB` integration example

### Advanced Features

- **ADV-01**: `matchAsync()` using web worker for large-scale deployments
- **ADV-02**: Ranked results helper or `topN` option
- **ADV-03**: Pre-built keyword reverse index for >100 intent deployments

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full NLP pipeline (POS, NER, parsing) | Breaks zero-dep promise; use `compromise` or `natural` instead |
| Cloud API / LLM integration | Destroys offline/local core identity |
| Multi-language stemming | Deep rabbit hole; custom stemmer option is the extension point |
| Built-in UI components | Different product; `SearchBar.tsx` stays as demo only |
| Vue/Svelte/Angular adapters | Community can build these; only React is committed |
| Analytics / telemetry | Violates offline promise and user trust |
| YAML/JSON config loading | TypeScript programmatic API is better DX |
| Persistence layer | Application logic, not library logic |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BLD-01 | Phase 1 | Complete |
| BLD-02 | Phase 1 | Complete |
| BLD-03 | Phase 1 | Complete |
| BLD-04 | Phase 1 | Complete |
| BLD-05 | Phase 1 | Complete |
| BLD-06 | Phase 1 | Complete |
| BLD-07 | Phase 1 | Complete |
| PKG-01 | Phase 2 | Complete |
| PKG-02 | Phase 2 | Complete |
| PKG-03 | Phase 2 | Complete |
| PKG-04 | Phase 2 | Complete |
| PKG-05 | Phase 2 | Complete |
| VAL-01 | Phase 2 | Complete |
| VAL-02 | Phase 2 | Complete |
| VAL-03 | Phase 2 | Complete |
| VAL-04 | Phase 2 | Complete |
| VAL-05 | Phase 2 | Complete |
| VAL-06 | Phase 2 | Complete |
| VAL-07 | Phase 2 | Complete |
| VAL-08 | Phase 2 | Complete |
| BUG-01 | Phase 3 | Complete |
| BUG-02 | Phase 3 | Complete |
| BUG-03 | Phase 3 | Complete |
| BUG-04 | Phase 3 | Complete |
| BUG-05 | Phase 3 | Complete |
| DOM-01 | Phase 3 | Complete |
| DOM-02 | Phase 3 | Complete |
| DOM-03 | Phase 3 | Complete |
| RCT-01 | Phase 4 | Complete |
| RCT-02 | Phase 4 | Complete |
| RCT-03 | Phase 4 | Complete |
| RCT-04 | Phase 4 | Complete |
| SCR-01 | Phase 5 | Complete |
| SCR-02 | Phase 5 | Complete |
| SCR-03 | Phase 5 | Pending |
| SCR-04 | Phase 5 | Complete |
| TST-01 | Phase 6 | Pending |
| TST-02 | Phase 6 | Pending |
| TST-03 | Phase 6 | Pending |
| TST-04 | Phase 6 | Pending |
| TST-05 | Phase 6 | Pending |
| TST-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
