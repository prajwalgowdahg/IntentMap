# Stack Research

**Domain:** Production-quality TypeScript npm library (offline intent matching)
**Researched:** 2026-04-12
**Confidence:** HIGH (well-established tooling, slow-moving ecosystem)

## Current Stack (Keep)

| Tool | Version | Role | Verdict |
|------|---------|------|---------|
| TypeScript | ^5.5.4 | Language | KEEP — strict mode with excellent type safety flags |
| tsup | ^8.2.4 | Build (ESM+CJS+dts) | KEEP — ideal for zero-dep libraries, fast builds |
| Vitest | ^2.0.5 | Testing | KEEP — fast, native TS, good coverage tooling |
| Biome | ^1.8.3 | Linting + formatting | KEEP — replaces ESLint+Prettier, fast |
| @changesets/cli | ^2.27.7 | Versioning + publishing | KEEP — standard for TS libraries |
| React | ^18.3.1 (dev/peer) | Adapter types | KEEP — optional peer dep, correct pattern |

## Stack Changes Needed

| Change | Current | Target | Why |
|--------|---------|--------|-----|
| Move source to `src/` | Files at root | `src/index.ts`, `src/core/`, `src/adapters/react.ts` | All tool configs already expect this. tsup, tsconfig, vitest, biome all reference `src/`. |
| Move tests to `tests/` | `*.test.ts` at root | `tests/**/*.test.ts` | vitest config already expects this. |
| Add `package-lock.json` | Missing | Committed | `npm ci` in CI requires it. Reproducible builds. |
| Changeset config location | `config.json` at root | `.changeset/config.json` | Standard location expected by changesets CLI and GitHub Action. |
| Add `@testing-library/react` | Not present | Dev dependency | Required for testing React hooks properly. |
| Add `jsdom` environment | Not configured | vitest config for DOM tests | Required for `bind()` and DOM integration tests. |

## What NOT to Use

| Tool | Why Avoid |
|------|-----------|
| ESLint + Prettier | Already have Biome. Don't duplicate. |
| Rollup/Vite | tsup (esbuild-based) is faster and simpler for libraries. No need for Rollup's complexity. |
| Jest | Vitest is faster, native ESM, already configured. No reason to switch. |
| Webpack | Not needed for library builds. tsup handles everything. |
| Babel | TypeScript compiler handles all transpilation. No need for Babel. |

## Recommended File Structure

```
intentMap/
├── src/
│   ├── index.ts          # Public API: createIntentMap, defineIntent
│   ├── IntentMap.ts       # Core orchestrator
│   ├── matcher.ts         # Scoring algorithm
│   ├── embeddings.ts      # Vector store + TF-IDF
│   ├── tokenizer.ts       # Text processing
│   ├── types.ts           # Shared types
│   ├── validate.ts        # Input validation helpers (NEW)
│   └── adapters/
│       └── react.ts       # React hooks
├── tests/
│   ├── tokenizer.test.ts
│   ├── intentmap.test.ts
│   ├── bind.test.ts       # NEW: DOM binding tests
│   ├── hooks.test.tsx     # NEW: React hook tests
│   └── edge-cases.test.ts # NEW: Edge case tests
├── .changeset/
│   └── config.json
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── biome.json
├── .gitignore
├── LICENSE
├── README.md
└── CHANGELOG.md
```

---
*Stack research: 2026-04-12*
