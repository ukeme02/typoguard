# TypoGuard Phase 3 - Capture Engine: Complete Milestone Plan

This document combines Part 1 and Part 2 to provide the complete milestone plan for Phase 3 (Capture Engine) following the Define→Implement→Test→Inspect→Commit→Push→Update-tracker process.

## Phase 3 Overview
Based on PRODUCT-BACKLOG.md and ARCHITECTURE.md, Phase 3 (Capture Engine) must:
- Capture and store user input for recovery
- Depend on the editor discovery functionality completed in Phase 2
- Mitigate risks of excessive storage usage or performance impact

## The Phased Development Process
Following CLAUDE.md and ARCHITECTURE.md strictly:
1. **Define**: Determine exactly what the phase must accomplish
2. **Implement**: Write only the code necessary for that milestone
3. **Test**: Run deliberate tests against the intended behavior
4. **Inspect**: Review the implementation for architectural or security problems
5. **Commit**: Create a meaningful Git commit
6. **Push**: Synchronize the repository with GitHub
7. **Update tracker**: Record what was completed
8. **Proceed**: Only then begin the next phase

---

## Part 1: Definition and Initial Implementation Approach

### 1. DEFINE: What Phase 3 Must Accomplish

#### Primary Objectives:
1. Capture user input from all registered editors (textarea and contenteditable elements)
2. Store captured data temporarily for recovery purposes
3. Integrate with existing editor discovery without modifying its core functionality
4. Implement storage limits to prevent excessive storage usage
5. Ensure minimal performance impact on the host page
6. Maintain privacy by not capturing sensitive field data (to be handled in Phase 4)

#### Specific Requirements:
- Capture text changes (input events) from registered editors
- Store data with association to editor ID and timestamp
- Implement a circular buffer or similar mechanism to limit storage per editor
- Provide interface for Phase 5 (Storage layer) to persist data
- Provide interface for Phase 6 (End-to-end recovery) to retrieve data
- Do NOT capture:
  - Password fields (handled by Phase 4 Safety engine)
  - Form values outside of editors
  - Non-text content

#### Success Criteria (for completion):
- CODE: Capture engine implemented and integrated
- TEST: Deliberate tests verify capture functionality works correctly
- VERIFICATION: Manual verification shows capture works with real editors
- CLEAN REPOSITORY: No lint errors, tests pass, repository in clean state

### 2. IMPLEMENT: Implementation Approach

#### Overall Architecture:
We'll extend the existing system by:
1. Creating a new `capture.js` module that handles input capture
2. Modifying `content.js` to initialize and coordinate the capture engine
3. Enhancing `discovery.js` to provide capture hooks during editor registration/deregistration
4. Using the existing `editorRegistry` to associate captured data with editors

#### Key Components to Create/Modify:

**A. New File: `capture.js`**
- Responsible for setting up input listeners on editors
- Storing captured text data with metadata
- Managing storage limits per editor
- Providing API for storage layer to access captured data

**B. Modifications to `content.js`**
- Import and initialize capture engine
- Coordinate between editor discovery and capture engine
- Handle editor registration/deregistration events for capture

**C. Enhancements to `discovery.js`**
- Add callbacks for when editors are registered/deregistered
- Allow capture engine to attach/detach listeners
- Maintain separation of concerns (discovery still doesn't handle capture)

#### Implementation Details:

1. **Data Structure for Captured Content:**
   ```javascript
   // Per-editor storage
   const captureBuffer = new Map(); // key: editorId, value: Array of captures
   
   // Each capture entry:
   {
     text: string,           // The captured text content
     timestamp: number,      // When capture occurred
     sequence: number,       // Monotonic per-editor counter (never derived from buffer length)
     pageUrl: string,        // location.href at capture time
     editorType: string      // From the editor record ('textarea' or 'contenteditable')
   }
   ```
   
   **Note on CONTENTEDITABLE:** Capture via `element.innerText` (not `textContent`) for rendered-text fidelity including line breaks; the layout-cost tradeoff is acceptable under debouncing.

2. **Storage Limits:**
   - Maximum N captures per editor (configurable, e.g., 50)
   - Maximum M characters per capture (configurable, e.g., 10000)
   - Circular buffer implementation: when limit reached, oldest captures are removed

3. **Event Handling:**
   - Debounce idle captures at 1000ms
   - During continuous typing, force a capture at least every 5000ms (debounce with max-wait) because sudden power loss fires no blur/unload events — periodic capture during typing is the only protection for TypoGuard's core scenario
   - Also capture on visibilitychange→hidden and pagehide as best-effort sync points
   - Listen for `input` and `change` events on editors with proper listener hygiene (named handler references stored per editor for symmetric add/removeEventListener)

4. **Integration Points:**
   - When editor is registered: attach input listeners, initialize buffer
   - When editor is deregistered: detach listeners, preserve buffer for recovery
   - When editor content changes: capture new state

---

## Part 2: Testing, Inspection, and Completion Procedures

### 3. TEST: Deliberate Tests Against Intended Behavior

#### Test Strategy:
1. **Unit Tests**: Test capture.js functions in isolation
2. **Integration Tests**: Test interaction between discovery, capture, and storage layers
3. **Manual Verification**: Real-browser testing with test pages
4. **Performance Tests**: Verify storage limits and minimal performance impact

#### Test Files to Create:
- `test/capture-tests.html` - Manual test page for capture functionality
- Extension of existing `discovery-tests.html` to include capture verification

#### Specific Test Cases:

**A. Core Capture Functionality:**
1. Capture text changes from textarea elements
2. Capture text changes from contenteditable elements
3. Capture on input, change, and blur events
4. Proper association of captured data with editor ID
5. Timestamp and sequence numbering accuracy

**B. Storage Limits and Buffer Management:**
1. Circular buffer correctly removes oldest entries when limit reached
2. Character limit per capture is respected
3. Storage limits are configurable per editor
4. Memory usage stays within defined bounds

**C. Integration with Editor Discovery:**
1. Capture engine initializes when editor is registered
2. Capture engine detaches listeners when editor is deregistered
3. Captured data persists across editor deregistration (for recovery)
4. No memory leaks when editors are frequently added/removed

**D. Privacy and Safety (Preparation for Phase 4):**
1. No capture of password fields (type=password) - note password inputs are trivially excluded because <input> elements are not registered editors (discovery registers textarea/contenteditable only)
2. No capture of hidden/disabled/read-only editors
3. Ability to exclude specific editors from capture (hook for Phase 4)

**E. Performance:**
1. Minimal impact on page responsiveness during rapid typing
2. Efficient event handling (debouncing where appropriate)
3. Storage operations don't block UI thread

#### Manual Test Procedure:
1. Load test page with various editor types
2. Type content and verify it's captured
3. Add/remove editors dynamically and verify capture starts/stops
4. Test storage limits by typing large amounts
5. Verify captured data survives editor removal (for recovery)
6. Check console for expected logs and no errors

#### Known Limitations
- Editor IDs are not stable across DOM removal/re-insertion (backlog item); an SPA re-inserted editor starts a new buffer — accepted for Phase 3.

### 4. INSPECT: Review for Architectural or Security Problems

#### Inspection Checklist:
Before considering Phase 3 complete, we'll inspect for:

**Architectural Concerns:**
- [ ] Does capture engine maintain separation of concerns?
- [ ] Is there tight coupling between capture and discovery modules?
- [ ] Does the design allow for easy replacement of storage mechanism (for Phase 5)?
- [ ] Are interfaces well-defined and minimal?
- [ ] Does the implementation follow existing code patterns in the repo?

**Security/Privacy Concerns:**
- [ ] Does capture engine avoid capturing sensitive data (preparation for Phase 4)?
- [ ] Is captured data stored only in memory (not persisted yet - that's Phase 5)?
- [ ] Are there any potential XSS vectors in how we handle captured text?
- [ ] Does the implementation follow the privacy principles from CLAUDE.md?
- [ ] Are we capturing only text content, not HTML or other potentially dangerous content?

**Performance Concerns:**
- [ ] Does capture introduce measurable latency to user input?
- [ ] Are we using efficient data structures (Map, circular buffers)?
- [ ] Are event listeners properly cleaned up to prevent memory leaks?
- [ ] Does storage limiting work effectively to prevent unbounded growth?

**Code Quality:**
- [ ] Does code follow existing JS style in the project?
- [ ] Are functions properly scoped and named?
- [ ] Is there adequate commenting for complex logic?
- [ ] Have we avoided global variables?
- [ ] Is error handling appropriate?

#### Inspection Process:
1. Self-review using the checklist above
2. Run pre-flight check (`scripts/check.sh`) to ensure no regressions
3. check.sh privacy scan will legitimately flag .value/.innerText in capture.js; update scripts/check.sh with an explicit allowlist permitting these reads ONLY in capture.js, still banned everywhere else.
4. Confirm no network calls were accidentally added

### 5. COMMIT: Create a Meaningful Git Commit

#### Commit Message Format:
```
feat(capture): implement capture engine for TypoGuard

- Add capture.js module to handle input capture from editors
- Modify content.js to initialize and coordinate capture engine
- Enhance discovery.js with registration/deregistration hooks
- Implement circular buffer storage with configurable limits
- Ensure integration with existing editor discovery
- Add test/capture-tests.html for manual verification
- Pass all pre-flight checks
```

#### Commit Content Should Include:
1. New file: `capture.js`
2. Modified file: `content.js`
3. Modified file: `discovery.js` (adding hooks)
4. Modified file: `manifest.json` (add capture.js to content_scripts, ordered after discovery.js)
5. New test file: `test/capture-tests.html`
6. Any necessary updates to documentation (if required)
7. NO changes to files outside the scope of Phase 3 capture engine

### 6. PUSH: Synchronize Repository with GitHub

#### Push Procedure:
1. Ensure local commit is clean and passes all checks
2. Push to remote repository: `git push origin main`
3. Verify GitHub shows the new commit
4. Confirm GitHub Actions (if any) pass
5. Ensure no merge conflicts

#### Verification Steps:
- `git status` shows clean working tree after push
- GitHub reflects the latest commit
- Repository builds and passes checks on GitHub side

### 7. UPDATE TRACKER: Record What Was Completed

#### Tracker Update:
Per ARCHITECTURE.md and CLAUDE.md, we update the tracker in `docs/ARCHITECTURE.md` under "HANDOVER STATUS".

#### Specific Update:
Change the status of Phase 3 from "⏳" to "🟢 COMPLETE" with a brief verification note.

Example update to `docs/ARCHITECTURE.md`:
```
🟢 Phase 3 — Capture Engine — COMPLETE (verified via manual verification + capture-tests.html)
```

#### Additional Tracking:
- Update any personal/project tracking if used
- Ensure the update reflects what was actually verified
- Only mark complete when: CODE + TEST + VERIFICATION + CLEAN REPOSITORY = COMPLETE

### 8. PROCEED: Begin Next Phase Only After Completion

Per the development principles: "Only then begin the next phase."

We will NOT begin Phase 4 until:
- All checks in Part 2 (Test, Inspect, Commit, Push, Update-tracker) are passed
- The repository is in a clean state
- Phase 3 is fully verified as complete

---

## Initial Implementation Files Outline

### A. New File: `capture.js`
```javascript
/**
 * TypoGuard — Capture Engine
 *
 * Phase 3
 *
 * Responsibility:
 * Capture and store user input from registered editors for recovery purposes.
 * 
 * IMPORTANT:
 * This module does NOT:
 * - persist data (handled by Phase 5 Storage layer)
 * - determine what is sensitive (handled by Phase 4 Safety engine)
 * - communicate with external servers */
```

### B. Modifications to `content.js`:
- Add import for capture engine
- Initialize capture engine after editor discovery
- Coordinate between discovery events and capture engine

### C. Enhancements to `discovery.js`:
- Add callback registration system
- Export functions for editor registration/deregistration events
- Allow capture.js to register for these events
- Keep discovery.js focused solely on discovery logic

### D. New Test File: `test/capture-tests.html`:
- Similar structure to discovery-tests.html
- Test various editor types
- Verify capture behavior
- Test storage limits
- Test integration with dynamic editor addition/removal

---
**This completes the complete milestone plan for Phase 3 - Capture Engine.**
**Please review the entire plan (both parts) and confirm approval before implementation begins.**