console.log("TypoGuard: content script loaded.");

const initialEditors = discoverEditors()
  .map(describeEditor)
  .filter(Boolean);

console.log(
  "TypoGuard: initial editor descriptions:",
  initialEditors
);

startEditorObserver();

console.log("TypoGuard: editor observer started.");
