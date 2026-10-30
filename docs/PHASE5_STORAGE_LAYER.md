# TypoGuard — Phase 5: Storage Layer

## Goal
Persist captured editor data to chrome.storage.local so it survives browser restarts and can be recovered later.

## Acceptance Criteria
- [ ] `storage.js` created with full CRUD API for captures and metadata
- [ ] `window.typoGuardStorage` exposed globally
- [ ] `manifest.json` includes `"permissions": ["storage"]`
- [ ] `capture.js` auto-saves each capture to storage after `performCapture`
- [ ] `capture.js` `clearAllCaptures()` also clears persisted storage
- [ ] Storage quotas enforced: max 100 captures per editor, 500 editors, ~5MB total
- [ ] Oldest captures pruned when limits exceeded
- [ ] `getStorageStats()` returns usage info
- [ ] Tested: data persists after page reload / browser restart
- [ ] Tested: `clearAllCaptures()` wipes both memory and storage

## Storage Schema
```
chrome.storage.local:
  tg_captures: {
    "tg-editor-1": [
      { text: "...", timestamp: 1234567890, sequence: 1, pageUrl: "...", editorType: "textarea" },
      ...
    ],
    "tg-editor-2": [...]
  }
  tg_metadata: {
    "tg-editor-1": { pageUrl: "...", editorType: "textarea", lastUpdated: 1234567890 },
    ...
  }
  tg_settings: { ... } // reserved for future settings
```

## Test Plan
1. Load extension in Chrome
2. Type in an editor on any page
3. Wait for debounce capture (1 second after typing stops)
4. Check DevTools Application → Storage → Local Storage for `tg_captures`
5. Refresh the page — data should still be there
6. Call `typoGuardCaptureEngine.clearAllCaptures()` in console — storage should be wiped
