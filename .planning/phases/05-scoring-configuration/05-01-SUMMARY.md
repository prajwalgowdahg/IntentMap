---
phase: 05-scoring-configuration
plan: 01
subsystem: scoring
tags: [types, validation, configuration]
dependency_graph:
  requires: []
  provides: [IntentConfig.weights, IntentConfig.stemmer, normalizeWeights, Matcher.weights, Matcher.stemmer]
  affects: [src/types.ts, src/index.ts, src/IntentMap.ts, src/matcher.ts]
tech-stack:
  added: [IntentWeights interface, IntentScoreBreakdown interface, normalizeWeights function]
  patterns: [config-layer validation before construction, weight normalization to sum=1.0]
key-files:
  created:
    - tests/scoring-config.test.ts
  modified:
    - src/types.ts
    - src/index.ts
    - src/IntentMap.ts
    - src/matcher.ts
decisions:
  - normalizeWeights returns default 0.35/0.65 when weights undefined
  - single weight infers other as 1-provided; both weights normalize by dividing by sum
  - Matcher stores weights as instance field replacing COSINE_WEIGHT/KEYWORD_WEIGHT constants
  - stemmer spread-conditionally to satisfy exactOptionalPropertyTypes
metrics:
  duration: 4min
  completed: 2026-04-13
---

# Phase 5 Plan 01: Scoring Configuration Summary

Weights and stemmer configuration added to IntentConfig with full validation, normalization, and passthrough to Matcher engine layer.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend types and add weight validation | 774d68d | src/types.ts, src/index.ts, tests/scoring-config.test.ts |
| 2 | Pass weights and stemmer through IntentMap to Matcher | 068a5b0 | src/matcher.ts, src/IntentMap.ts |

## Changes Made

### src/types.ts
- Added `IntentWeights` interface (`{ cosine?: number; keyword?: number }`)
- Added `weights?: IntentWeights` and `stemmer?: (word: string) => string` to `IntentConfig`
- Added `IntentScoreBreakdown` interface for future use

### src/index.ts
- Added `normalizeWeights()` function: handles undefined (defaults 0.35/0.65), single-weight inference, both-weight normalization, and validation (negative, NaN, zero-sum)
- Added weights object validation and stemmer function validation in `createIntentMap()`

### src/IntentMap.ts
- Constructor computes cosine/keyword from config.weights (falling back to 0.35/0.65)
- Passes `weights` and `stemmer` to Matcher constructor

### src/matcher.ts
- Removed `COSINE_WEIGHT` and `KEYWORD_WEIGHT` constants
- Constructor accepts `weights: { cosine: number; keyword: number }` and optional `stemmer`
- `match()` uses `this.weights.cosine` and `this.weights.keyword` instead of constants

### tests/scoring-config.test.ts
- 11 TDD tests: valid weights, single-weight inference, both-weight normalization, negative/NaN/zero-sum rejection, default preservation, stemmer validation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript exactOptionalPropertyTypes incompatibility**
- **Found during:** Task 2
- **Issue:** Passing `config.stemmer` (which is `T | undefined`) to an optional parameter fails with `exactOptionalPropertyTypes: true`
- **Fix:** Used spread-conditional `...(config.stemmer ? { stemmer: config.stemmer } : {})` and widened Matcher's `stemmer` field type to include `undefined`
- **Files modified:** src/IntentMap.ts, src/matcher.ts
- **Commit:** 068a5b0

## Verification

- All 88 tests pass (77 existing + 11 new)
- TypeScript typecheck clean
- Default behavior unchanged (0.35/0.65 when weights omitted)

## Self-Check: PASSED

- All 5 modified/created files verified present
- Both task commits verified in git log (774d68d, 068a5b0)
