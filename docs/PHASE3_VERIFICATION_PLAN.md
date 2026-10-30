# TypoGuard — Phase 3: Capture Engine Verification Plan

## Goal
Verify that the Capture Engine correctly samples and buffers text from supported editors.

## Test Steps
1.  **Load the extension** in Chrome (ensure manifest is loaded).
2.  **Open `phase2-test.html`** in a new tab.
3.  **Check Console**: Observe logs for:
    -   `TypoGuard: content script loaded.`
    -   `TypoGuard: initializing capture for editor X` (should see this for the static textarea and contenteditable).
4.  **Test Capture**:
    -   Type in the `test-textarea`.
    -   Type in the `test-editor` (contenteditable).
    -   Wait for the debounce period (default 1000ms).
5.  **Inspect State**:
    -   Use the browser console to query `window.typoGuardCaptureEngine.getCapturesForEditor(editorId)`.
    -   *Note: You may need to inspect the `editorRegistry` first via `typoGuardDebug()` to get the correct `editorId`.*
6.  **Verify Buffer**: Confirm that the returned array contains capture objects with the expected text content and correct sequence numbers.
7.  **Dynamic Test**: Click "Add editor dynamically" and verify that the "initializing capture" log appears for the new editor.
8.  **Deregistration**: Click "Remove last dynamic editor" and verify the "destroying capture" log appears.
