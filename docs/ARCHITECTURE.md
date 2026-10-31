# TypoGuard Architecture

> Rewritten 2026-10-31 — the previous file had corrupted mixed encoding (UTF-8 +
> UTF-16 chunks) and an out-of-date tracker. Content is faithful to the original
> roadmap with statuses updated.

## 1. DEVELOPMENT ROADMAP

| Phase | Component | Status |
|-------|-----------|--------|
| 0 | Project setup & repository | ✅ COMPLETE |
| 1 | Manifest & extension skeleton | ✅ COMPLETE |
| 2 | Editor discovery | ✅ COMPLETE |
| 3 | Capture engine | ✅ COMPLETE |
| 4 | Safety / sensitive-field engine | ✅ COMPLETE |
| 5 | Storage layer | ✅ COMPLETE |
| 6 | End-to-end recovery | ✅ COMPLETE |
| 7 | Recovery banner / UI | ✅ COMPLETE |
| 8 | SPA & dynamic-page hardening | ✅ COMPLETE |
| 9 | Popup & history | ✅ COMPLETE |
| 10 | Site exclusion & settings | ✅ COMPLETE |
| 11 | Security & privacy audit | ⬜ NOT STARTED |
| 12 | Compatibility testing | ⬜ NOT STARTED |
| 13 | Documentation | ⬜ NOT STARTED |
| 14 | Chrome Web Store preparation | ⬜ NOT STARTED |
| 15 | Release candidate | ⬜ NOT STARTED |

Parallel workstream:

- Cloud sync (Phase 1 of sync workstream) — IN PROGRESS. `sync.js` provides
  opt-in passphrase-encrypted state (AES-GCM, PBKDF2 key derivation, salt
  reuse). No backend is wired yet. SECURITY TODO: `initializeSync()` must stop
  persisting the raw passphrase in chrome.storage.local before sync ships.

---

## 2. DEVELOPMENT CONTROL PROCESS

TypoGuard is developed using controlled checkpoints. For every phase:

Define → Implement → Test → Inspect → Commit → Push → Update tracker → Proceed.

---

## 3. ENGINEERING RULE

A phase is not complete because the code was written.

```
CODE + TEST + VERIFICATION + CLEAN REPOSITORY = COMPLETE
```

This rule governs the entire TypoGuard development process. (Lesson recorded
2026-10-31: the "Phase 4 Mobile" commit shipped without running
`scripts/check.sh` and left `capture.js` with a syntax error that disabled the
entire extension until the audit-fix commit `2882db7`.)

---

## 4. HANDOVER STATUS

### Completed
- Phase 0 — Project Setup & Repository
- Phase 1 — Manifest & Extension Skeleton
- Phase 2 — Editor Discovery (verified via manual verification + discovery-tests.html)
- Phase 3 — Capture Engine (verified via capture engine integration)
- Phase 4 — Safety / Sensitive-Field Engine (sensitive fields blocked from capture)
- Phase 5 — Storage Layer (captures persisted to chrome.storage.local)
- Phase 6 — End-to-end Recovery (popup UI + restore injection)
- Phase 7 — Recovery Banner / UI (banner + quick restore, Ctrl+Shift+R)
- Phase 8 — SPA & dynamic-page hardening (permanent editor IDs)
- Phase 9 — Popup & history (tabbed interface + history + export + keyboard shortcut)

### Audit fixes (2026-10-31, commit 2882db7)
Full audit repaired: capture.js syntax error (extension was dead on load),
popup.js rewrite, invalid `syncHTML` permission removed, manifest script order
fixed (recovery-banner.js before content.js), storage order fixed (last capture
= latest), permanent-ID collisions fixed, sync.js crypto bugs fixed. Verified
by `node --check` on all files, `scripts/check.sh`, and the automated
`test/e2e-tests.html` harness (24/24 assertions, run in-browser over localhost).

### Immediate next task
**Phase 11 — Security & privacy audit**:
- Review every module against the Core Principles (local-only, no network).
- Verify sensitive-field coverage (Phase 4 engine) against real-world forms.
- Confirm no text content is logged in production console output.

### Phase 10 — COMPLETE (2026-10-31)
- `settings.js`: capture toggle, user exclusion list, protected-site defaults
  (banking/health domains never captured, even pre-configuration). Cached for
  synchronous checks; `ready()` promise for content.js init ordering.
- `discovery.js` + `capture.js`: registration and capture gated on settings.
- `content.js`: async init — settings load before the first registration.
- Popup: Settings tab (capture toggle, exclusion add/remove, protected list).
- Verified: `test/e2e-tests.html` section 8 (T8.1–T8.8) — full suite 32/32 PASS.

### Deferred Items / Backlog
- Visibility edge-case filtering (revisit Phase 8)
- Mutation rescan performance (Phase 8)
- Stable editor IDs across DOM moves (Phase 3 — partially addressed; IDs are
  stable per fingerprint + collision counter, not across full DOM moves)

### Direction (product)
Secure clipboard vault expansion (text + screenshots) for Android and Windows;
E2EE local vault → sync backend (Prisma/Postgres metadata + object storage for
encrypted blobs) → optional Google Drive "bring your own vault" adapter. See
docs/PRODUCT-BACKLOG.md.

## Core Principles

- Local-only storage
- No network requests
- No global keyboard capture
- Capture only textarea and contenteditable editors
- Sensitive-field protection
- Explicit user-controlled restoration
- Open source

## Architecture

Manifest V3 + Vanilla JavaScript + chrome.storage.local
