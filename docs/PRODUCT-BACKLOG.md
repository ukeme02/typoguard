# PRODUCT-BACKLOG.md

Backlog is a parking lot, not a promise. Nothing here is scheduled; v1 roadmap lives in docs/ARCHITECTURE.md.

## v1 (current MVP)
- Editor discovery (Discovers and registers textarea and contenteditable editors; depends on DOM access; risk: missing editors in shadow DOM or dynamically added without robust MutationObserver)
- Capture engine (Captures and stores user input for recovery; depends on editor discovery; risk: excessive storage usage or performance impact)
- Safety / sensitive-field engine (Masks or excludes sensitive inputs like passwords; depends on capture engine; risk: false positives/negatives in field detection)
- Storage layer (Manages persistent storage of drafts using chrome.storage.local; depends on safety engine; risk: storage quota exceeded or data corruption)
- End-to-end recovery (Restores drafts after browser crash or tab closure; depends on storage layer; risk: recovery failure leading to data loss)
- Recovery banner / UI (Shows non-intrusive recovery options to user; depends on end-to-end recovery; risk: UI blocking or annoying user if overused)
- SPA & dynamic-page hardening (Handles single-page app navigations and dynamic content; depends on recovery banner; risk: missing recovery during route changes or framework updates)
- Popup & history (Provides UI for managing drafts and history; depends on SPA hardening; risk: history sync issues across tabs or extension instances)
- Site exclusion & settings (Allows users to exclude sites and configure behavior; depends on popup; risk: settings not persisting or conflicting with page-specific rules)
- Security & privacy audit (Reviews extension for data leaks and privacy compliance; depends on settings; risk: overlooking obscure data exfiltration vectors)
- Compatibility testing (Tests across major browsers and popular sites; depends on audit; risk: false sense of security from limited test coverage)
- Documentation (Write user guides, developer docs, and inline comments; depends on compatibility testing; risk: outdated or unclear documentation)
- Chrome Web Store preparation (Prepare store listing, assets, and privacy policy; depends on documentation; risk: store rejection due to policy violations or incomplete submission)
- Release candidate (Final polish, beta testing, and stable release; depends on store prep; risk: last-minute critical bugs discovered in beta)

## v1.x candidates
- Draft roaming via chrome.storage.sync (small-scale cross-desktop sync without a backend; encrypt before storing; watch quota limits)
- Recovery stats ("saved you N times this month")
- Export draft to clipboard or file
- Safety defaults: never capture on known banking/health domains even before user settings exist

## v2 candidates
- Opt-in account sync with end-to-end encryption (encrypt locally so server never sees plaintext; depends on v1 shipping and real user demand)
- Desktop draft roaming across devices with TypoGuard installed

## v3 / ideas
- Android companion app (Flutter) — note: Chrome on Android cannot run extensions, so mobile needs a companion app or PWA
- Firefox/Edge ports (MV3 is largely portable)
- Landing page for install links and the privacy story
- Live cross-device input mirroring — flag: keylogger-adjacent, conflicts with the privacy model in section 3.2 of the architecture doc; only reconsider with explicit user consent design