# TypoGuard — Phase 4: Safety / Sensitive-Field Engine

## Goal
Prevent TypoGuard from capturing sensitive input fields (passwords, credit cards, secrets, tokens, PII) to protect user privacy.

## Acceptance Criteria
- [ ] `safety.js` created with `isSensitiveField(element)` function
- [ ] `window.typoGuardSafety.isSensitiveField` is exposed globally
- [ ] `discovery.js` calls safety check before registering any editor
- [ ] Sensitive fields are logged as blocked (not silently skipped)
- [ ] Password `<input type="password">` is NOT registered
- [ ] Fields with `autocomplete="current-password"` are NOT registered
- [ ] Fields with name/id/placeholder containing "password", "secret", "token", "ssn", "credit-card", etc. are NOT registered
- [ ] Normal textareas and contenteditable elements are still registered normally
- [ ] Tested via `phase2-test.html` with mixed sensitive and non-sensitive fields
- [ ] Verified in browser console that sensitive fields show "blocking sensitive field" log

## Test Plan
1. Load extension in Chrome
2. Open `phase2-test.html` with added sensitive test fields
3. Open DevTools Console
4. Verify:
   - Normal textarea → "TypoGuard: initializing capture for editor X"
   - Password input → "TypoGuard: blocking sensitive field from capture: input#password"
   - Secret textarea → "TypoGuard: blocking sensitive field from capture: textarea#secret-key"
5. Run `typoGuardDebug()` to confirm sensitive editors are NOT in registry

## Implementation Notes
- Safety check happens BEFORE editor is added to registry, so capture engine never sees sensitive fields
- `window.typoGuardSafety` is null-checked in discovery.js for safety during development
- Patterns cover: input types, autocomplete values, name/id/placeholder/aria-label keywords, form context
