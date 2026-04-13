---
phase: 04-react-adapter
plan: 01
subsystem: ui
tags: [react, hooks, useRef, stale-closure, cleanup, lifecycle]

# Dependency graph
requires:
  - phase: 03-engine-dom-fixes
    provides: IntentMap class with destroy(), bind() with debounce, duplicate bind guard
provides:
  - Hardened useIntentMap hook with key-based re-creation
  - Stale-closure-safe useIntent hook with useRef handler wrapper
  - Leak-free useIntentBind hook with unbind cleanup
  - isAlive accessor on IntentMapInstance interface and IntentMap class
affects: [06-test-coverage, examples]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRef handler wrapper: store latest handler in ref, subscribe with stable wrapper to avoid re-subscription"
    - "isAlive guard: check readonly property before calling core methods, warn and return early if destroyed"

key-files:
  created: []
  modified:
    - src/types.ts
    - src/IntentMap.ts
    - src/adapters/react.ts

key-decisions:
  - "useRef wrapper pattern for useIntent handler avoids stale closures without re-subscription"
  - "useIntentMap uses key ref comparison to detect key changes and re-create instance"
  - "useIntentBind stores unbind function in ref and calls it in useEffect cleanup"
  - "All hooks check im.isAlive before calling core methods; destroyed instances produce console.warn"

patterns-established:
  - "isAlive guard: hooks check im.isAlive before calling im.on/im.bind; warn and early-return if destroyed"
  - "Stable wrapper: useRef stores latest handler, stable callback subscribed to event emitter"
  - "Key-based re-creation: useIntentMap compares key ref to detect changes, destroys old instance"

requirements-completed: [RCT-01, RCT-02, RCT-03, RCT-04]

# Metrics
duration: 3min
completed: 2026-04-13
---

# Phase 4 Plan 1: React Adapter Summary

**Hardened all three React hooks with useRef stale-closure fix, key-based re-creation, unbind cleanup, and isAlive destroyed-state guards**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-13T12:11:56Z
- **Completed:** 2026-04-13T12:14:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `isAlive` readonly accessor to IntentMapInstance interface and IntentMap class for safe destroyed-state checks
- Rewrote `useIntentMap` with optional `key` parameter; re-creates instance on key change, ignores config identity changes
- Rewrote `useIntent` with useRef handler wrapper; removed `deps` parameter; dependency array is `[im, intent]` only
- Rewrote `useIntentBind` to store unbind from `im.bind()` and call it in useEffect cleanup; wildcard subscription cleaned up

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isAlive to IntentMapInstance interface and IntentMap class** - `6a4f04f` (feat)
2. **Task 2: Rewrite all three React hooks and update example** - `168b844` (feat)

## Files Created/Modified
- `src/types.ts` - Added `readonly isAlive: boolean` to IntentMapInstance interface
- `src/IntentMap.ts` - Added `get isAlive()` getter returning `!this.destroyed`
- `src/adapters/react.ts` - Complete rewrite of all three hooks with stale closure fix, cleanup, and destroyed-state handling

## Decisions Made
- Used useRef wrapper pattern for useIntent handler to avoid stale closures without re-subscription
- useIntentMap compares key ref to detect key changes, destroys old instance before creating new one
- useIntentBind stores unbind function in ref and calls it in both the bindRef callback and useEffect cleanup
- All hooks check im.isAlive before calling core methods and log console.warn if destroyed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 4 complete. React adapter hardened with all four RCT requirements satisfied.
- Phase 5 (Scoring Configuration) is independent and ready to execute.
- Phase 6 (Test Coverage) should add comprehensive React hook tests using renderHook.

---
*Phase: 04-react-adapter*
*Completed: 2026-04-13*

## Self-Check: PASSED

- All 3 modified files verified present (src/types.ts, src/IntentMap.ts, src/adapters/react.ts)
- Both task commits verified in git log (6a4f04f, 168b844)
- SUMMARY.md file verified present
