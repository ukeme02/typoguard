# TypoGuard — Phase 3: Capture Engine

## Goal
Implement a robust, performant, and privacy-preserving engine to capture text from registered editors.

## Acceptance Criteria
- [ ] `capture.js` successfully listens to input/change events on all registered editors.
- [ ] Debouncing logic correctly throttles captures to avoid performance degradation.
- [ ] Data is correctly captured and buffered in `captureBuffer`.
- [ ] No data is sent to external servers.
- [ ] `captureEngine` API is correctly integrated with `content.js` to register/deregister capture listeners on editor lifecycle events.
- [ ] Verified via manual testing on `phase2-test.html`.

## Plan
1. **Integration**: Update `content.js` to subscribe `captureEngine` to `discovery.js`'s registration/deregistration events.
2. **Implementation**: Ensure `capture.js` correctly hooks into `registerEditor` events.
3. **Validation**: Test input capturing in `phase2-test.html`.
4. **Clean**: Ensure no memory leaks on deregistration.
