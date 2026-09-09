console.log("TypoGuard: content script loaded.");

// Initialize capture engine.
// All content_scripts share ONE isolated world, so this alias must not share a
// top-level name with any declaration in capture.js or discovery.js
// (see the captureEngine collision fix).
const captureAPI = window.typoGuardCaptureEngine;

if (!captureAPI) {
  console.error(
    "TypoGuard: capture engine not found — capture disabled. " +
    "Check manifest.json content_scripts order: discovery.js, capture.js, content.js."
  );
}

// M1 hooks are the ONLY capture attach path. registerAllEditors() below fires
// the 'registered' event for every editor present at startup; the
// MutationObserver fires it for editors added later. initEditorCapture is
// additionally idempotent (initializedEditorIds guard in capture.js).
const unregisterRegistered = onEditorsChanged("registered", (editorRecord) => {
  console.log(`TypoGuard: initializing capture for editor ${editorRecord.id}`);
  if (captureAPI) captureAPI.initEditorCapture(editorRecord);
});

const unregisterDeregistered = onEditorsChanged("deregistered", (editorRecord) => {
  console.log(`TypoGuard: destroying capture for editor ${editorRecord.id}`);
  if (captureAPI) captureAPI.destroyEditorCapture(editorRecord);
});

// Discovery initialization — AFTER hook subscriptions, so no event fires early.
const initialEditors = registerAllEditors();

console.log(
  "TypoGuard: registry initialized:",
  initialEditors.map(function (r) { return r.id + " (" + r.type + ")"; })
);

startEditorObserver();

console.log("TypoGuard: editor observer started.");
console.log("TypoGuard: registry size:", editorRegistry.size);