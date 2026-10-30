# TypoGuard — Phase 7: Recovery Banner / Inline UI

## Goal
Detect text loss in real-time and offer inline recovery via a non-popup banner, plus keyboard shortcut for quick restore.

## Acceptance Criteria
- [ ] `recovery-banner.js` created with `showBanner`, `hideBanner`, `checkTextLoss`, `detectTextLoss`, `restore`, `quickRestore`
- [ ] `window.typoGuardRecoveryBanner` exposed globally
- [ ] `manifest.json` includes `recovery-banner.js` in content scripts
- [ ] `content.js` calls `checkTextLoss` on page load after editor registration
- [ ] Banner appears when text loss > 50% and > 100 chars lost
- [ ] Banner has Restore and Dismiss buttons
- [ ] Banner auto-dismisses after 10 seconds
- [ ] Keyboard shortcut Ctrl+Shift+R / Cmd+Shift+R triggers quick restore
- [ ] Restored text gets green outline visual feedback
- [ ] Toast notifications for restore feedback
- [ ] Dark mode support for banner and toast
- [ ] Tested: type text, clear it, reload page → banner appears offering restore

## Files
| File | Purpose |
|------|---------|
| `recovery-banner.js` | Banner UI, text loss detection, keyboard shortcut, toast notifications |
| `content.js` | Added text loss check on page load |
| `manifest.json` | Added `recovery-banner.js` to content scripts |

## Test Plan
1. Load extension in Chrome
2. Type substantial text (>100 chars) in a textarea on any page
3. Clear the textarea or reload the page
4. Verify: recovery banner appears offering to restore
5. Click "Restore" → text is restored with green outline
6. Press Ctrl+Shift+R → quick restore of most recent capture
7. Click "Dismiss" → banner goes away, doesn't reappear for that editor
