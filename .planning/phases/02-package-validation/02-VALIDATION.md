---
phase: 2
slug: package-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 2 — Validation Strategy

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

- **After every task commit:** Run `npm run typecheck && npm run test`
- **After every plan wave:** Run `npm run build && npm run typecheck && npm run lint && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PKG-01, PKG-02, PKG-03, PKG-04, PKG-05 | structural | `test -f LICENSE && test -f package-lock.json && grep -c prajwalhg package.json` | W0 | pending |
| 02-02-01 | 02 | 1 | VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06, VAL-07, VAL-08 | unit | `npm run test` | existing | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `vitest.config.ts` — correctly configured
- [x] `tests/intentmap.test.ts` — existing tests must still pass
- [x] `tests/tokenizer.test.ts` — existing tests must still pass
- [x] All dev dependencies installed

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Verify error messages include [intentmap] prefix | VAL-01-08 | Message format verification | `node -e "const {createIntentMap} = require('./dist/index.cjs'); try { createIntentMap() } catch(e) { console.log(e.message) }"` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
