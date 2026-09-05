# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Principles

TypoGuard follows a strict phased development process as documented in `docs/ARCHITECTURE.md`:

1. **Define**: Determine exactly what the phase must accomplish.
2. **Implement**: Write only the code necessary for that milestone.
3. **Test**: Run deliberate tests against the intended behavior.
4. **Inspect**: Review the implementation for architectural or security problems.
5. **Commit**: Create a meaningful Git commit.
6. **Push**: Synchronize the repository with GitHub.
7. **Update tracker**: Record what was completed.
8. **Proceed**: Only then begin the next phase.

A phase is complete only when: `CODE + TEST + VERIFICATION + CLEAN REPOSITORY = COMPLETE`.

The current phase is documented in `docs/ARCHITECTURE.md` under "HANDOVER STATUS".

## Project Structure

- `manifest.json`: Chrome Extension Manifest V3 configuration.
- `content.js`: Main content script that initializes the editor registry and starts the MutationObserver.
- `discovery.js`: Editor discovery and registration logic (supports `textarea` and `[contenteditable="true"]`).
- `editor-discovery.js`: Helper function for finding textareas (used in testing/debugging).
- `docs/ARCHITECTURE.md`: Authoritative roadmap, development control process, engineering rule, and current checkpoint.
- `phase2-test.html`: Manual test page for verifying editor discovery behavior.

## Common Development Tasks

### Loading the Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" in the top-right toggle.
3. Click "Load unpacked" and select the `TypoGuard` directory (this repository).
4. The extension will be loaded and active on all websites due to `<all_urls>` match.

### Testing Changes
1. After modifying code, reload the extension in `chrome://extensions` by clicking the refresh icon.
2. Open any webpage and check the JavaScript console for TypoGuard logs (e.g., "TypoGuard: content script loaded").
3. For isolated testing of editor discovery, open `phase2-test.html` in a browser and observe the console output.

### Verifying Editor Registration
- The extension logs registered editors to the console on initialization and when dynamic changes occur.
- Look for logs like: "TypoGuard: editors registered: [\"tg-editor-1 (textarea)\", ...]".

### Current Phase Work
As of the latest checkpoint, the immediate next task is **Phase 2 — Editor Discovery**. Work should focus on:
- Ensuring the discovery module correctly identifies and registers usable editors.
- Filtering out unusable editors (disabled, read-only, hidden, zero-size).
- Handling dynamically added/removed editors via MutationObserver.
- Maintaining a clean editor registry.

Refer to `docs/ARCHITECTURE.md` for the detailed phase roadmap and acceptance criteria.

## Code Architecture

### Editor Discovery Flow
1. `content.js` calls `registerAllEditors()` from `discovery.js` to find existing editors.
2. `startEditorObserver()` sets up a MutationObserver to watch for DOM changes.
3. On each mutation, `handleMutations` checks for added/removed nodes that match the editor selector.
4. If changes are detected, it re-runs `registerAllEditors()` and `deregisterRemovedEditors()`.
5. The `editorRegistry` (a Map) tracks live editors by element key, storing records with `id`, `element`, `type`, and `timestamp`.

### Supported Editors
- `<textarea>` elements that are not disabled or read-only.
- Elements with `contenteditable="true"` that are visible and not obscured by CSS/attributes.

### Privacy & Security Principles
- All processing occurs locally; no data leaves the browser.
- Only editor metadata (ID, type, timestamp) is stored—never user text content.
- Sensitive fields (e.g., password inputs) are implicitly excluded by focusing only on textarea and contenteditable editors.