---
phase: 1
slug: build-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^2.0.5 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run build && npm run typecheck && npm run lint && npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck && npm run lint && npm run test`
- **After every plan wave:** Run `npm run build && npm run typecheck && npm run lint && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | BLD-01, BLD-02 | structural | `ls src/index.ts src/adapters/react.ts tests/intentmap.test.ts tests/tokenizer.test.ts` | W0 | pending |
| 01-02 | 02 | 1 | BLD-03, BLD-07 | build | `npm run build && ls dist/index.js dist/index.cjs dist/index.d.ts dist/adapters/react.js dist/adapters/react.cjs dist/adapters/react.d.ts` | W0 | pending |
| 01-03 | 03 | 1 | BLD-04, BLD-05, BLD-06 | automated | `npm run typecheck && npm run lint && npm run test` | existing | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed.

- [x] `vitest.config.ts` — correctly configured for `tests/**/*.test.ts`
- [x] `tests/intentmap.test.ts` — 26 existing tests cover BLD-06
- [x] `tests/tokenizer.test.ts` — tokenizer unit tests
- [x] All dev dependencies declared in package.json

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Verify dist/ file listing has expected structure | BLD-03, BLD-07 | Structural check, not behavior | `ls -la dist/` and `ls -la dist/adapters/` after build |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
