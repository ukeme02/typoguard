# TypoGuard — Phase 6: End-to-End Recovery

## Goal
Make captured text actually recoverable — users can open the TypoGuard popup, see their saved editors, and restore text back into the page.

## Acceptance Criteria
- [ ] `popup.html` created with editor list, capture preview, restore button, clear-all button
- [ ] `popup.js` loads captures from chrome.storage.local and renders them
- [ ] `inject-restore.js` content script listens for restore messages and injects text into editors
- [ ] `manifest.json` includes `"action"` for popup, `"tabs"` permission, and `inject-restore.js` content script
- [ ] `discovery.js` marks elements with `data-tg-id` attribute for restore lookup
- [ ] `capture.js` saves metadata (pageUrl, editorType) alongside captures
- [ ] Popup opens via extension icon click
- [ ] Clicking "Restore Text" sends message to active tab and injects text into matching editor
- [ ] "Clear All Data" wipes both memory and storage
- [ ] Empty state shows when no captures exist
- [ ] Stats show editor count and capture count

## Files
| File | Purpose |
|------|---------|
| `popup.html` | Recovery UI — editor list, capture preview, restore button |
| `popup.js` | Loads storage, renders UI, handles restore + clear |
| `inject-restore.js` | Content script — injects restored text into page editors |
| `discovery.js` | Added `data-tg-id` attribute on registered editors |

## Test Plan
1. Load extension in Chrome
2. Type in a textarea on any page → capture is saved to storage
3. Click the TypoGuard extension icon → popup opens
4. See the editor listed with capture preview
5. Click "Restore Text" → text is injected back into the editor on the active tab
6. Click "Clear All Data" → all captures wiped from storage
