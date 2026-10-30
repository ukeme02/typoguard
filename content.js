console.log("TypoGuard: content script loaded.");

// Initialize capture engine.
// All content_scripts share ONE isolated world, so this alias must not share a
// top-level name with any declaration in capture.js or discovery.js
// (see the captureEngine collision fix).
const captureAPI = window.typoGuardCaptureEngine;
const editorEvents = window.typoGuardEditorEvents;
const discoveryAPI = window.typoGuardDiscovery;

if (!captureAPI) {
  console.error(
    "TypoGuard: capture engine not found — capture disabled. " +
    "Check manifest.json content_scripts order: discovery.js, capture.js, content.js."
  );
}

if (!editorEvents) {
  console.error(
    "TypoGuard: editor events not found — discovery hooks unavailable. " +
    "Check manifest.json content_scripts order: discovery.js, capture.js, content.js."
  );
}

if (!discoveryAPI) {
  console.error(
    "TypoGuard: discovery API not found — cannot initialize editors. " +
    "Check manifest.json content_scripts order: discovery.js, capture.js, content.js."
  );
}

// M1 hooks are the ONLY capture attach path. registerAllEditors() below fires
// the 'registered' event for every editor present at startup; the
// MutationObserver fires it for editors added later. initEditorCapture is
// additionally idempotent (initializedEditorIds guard in capture.js).
const unregisterRegistered = editorEvents.onEditorsChanged("registered", (editorRecord) => {
  console.log(`TypoGuard: initializing capture for editor ${editorRecord.id}`);
  if (captureAPI) captureAPI.initEditorCapture(editorRecord);
});

const unregisterDeregistered = editorEvents.onEditorsChanged("deregistered", (editorRecord) => {
  console.log(`TypoGuard: destroying capture for editor ${editorRecord.id}`);
  if (captureAPI) captureAPI.destroyEditorCapture(editorRecord);
});

// Discovery initialization — AFTER hook subscriptions, so no event fires early.
const initialEditors = discoveryAPI.registerAllEditors();

console.log(
  "TypoGuard: registry initialized:",
  initialEditors.map(function (r) { return r.id + " (" + r.type + ")"; })
);

discoveryAPI.startEditorObserver();

console.log("TypoGuard: editor observer started.");
console.log("TypoGuard: registry size:", discoveryAPI.getEditorRegistrySize());

// Phase 7: Check for text loss on page load
// Load stored captures and check if any editor has lost text
(async function checkForTextLoss() {
  if (!window.typoGuardRecoveryBanner) {
    console.warn("TypoGuard: recovery banner not available");
    return;
  }
  try {
    const result = await chrome.storage.local.get(['tg_captures']);
    const allCaptures = result.tg_captures || {};
    const records = Array.from(discoveryAPI.getEditorRegistry().values());
    await window.typoGuardRecoveryBanner.checkTextLoss(records, allCaptures);
  } catch (err) {
    console.error("TypoGuard: text loss check failed:", err.message);
  }
})();