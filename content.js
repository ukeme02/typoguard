console.log("TypoGuard: content script loaded.");

const initialEditors = registerAllEditors();

console.log(
  "TypoGuard: registry initialized:",
  initialEditors.map(function (r) { return r.id + " (" + r.type + ")"; })
);

startEditorObserver();

console.log("TypoGuard: editor observer started.");

console.log(
  "TypoGuard: registry size:",
  editorRegistry.size
);
