console.log("TypoGuard: content script loaded.");

const editors = discoverEditors();

const editorDescriptions = editors
  .map(describeEditor)
  .filter(Boolean);

console.log(
  "TypoGuard: editor descriptions:",
  editorDescriptions
);