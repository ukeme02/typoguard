/**
 * TypoGuard — Editor Discovery & Registry
 *
 * Phase 2.5
 *
 * Responsibility:
 * Detect, identify, validate, and register supported
 * editing surfaces. Maintain a registry of live editors.
 *
 * IMPORTANT:
 * This module does NOT:
 * - capture text
 * - store text
 * - listen for typing
 * - communicate with a server
 */

const SUPPORTED_EDITOR_SELECTOR = [
  "textarea",
  '[contenteditable="true"]'
].join(",");

/**
 * The editor registry.
 * Key: Element
 * Value: editor record
 */
const editorRegistry = new Map();

let nextEditorId = 1;

/**
 * Determine the type of supported editor.
 *
 * @param {Element} element
 * @returns {string|null}
 */
function getEditorType(element) {
  if (element instanceof HTMLTextAreaElement) {
    return "textarea";
  }

  if (
    element instanceof HTMLElement &&
    element.getAttribute("contenteditable") === "true"
  ) {
    return "contenteditable";
  }

  return null;
}

/**
 * Check whether an editor is usable by the user.
 *
 * @param {Element} element
 * @returns {boolean}
 */
function isEditorUsable(element) {
  if (element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) {
      return false;
    }
  }

  if (element.hidden) {
    return false;
  }

  let node = element;

  while (node instanceof Element) {
    const style = window.getComputedStyle(node);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    ) {
      return false;
    }

    if (node.getAttribute("aria-hidden") === "true") {
      return false;
    }

    node = node.parentElement;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  return true;
}

/**
 * Find all supported editors currently present on the page.
 *
 * @returns {Element[]}
 */
function discoverEditors() {
  return Array.from(
    document.querySelectorAll(SUPPORTED_EDITOR_SELECTOR)
  );
}

/**
 * Register an element in the editor registry.
 * Returns the editor record, or null if the element
 * is not a usable editor or is already registered.
 *
 * @param {Element} element
 * @returns {Object|null}
 */
function registerEditor(element) {
  if (editorRegistry.has(element)) {
    return null; // duplicate — already registered
  }

  const type = getEditorType(element);

  if (!type) {
    return null;
  }

  if (!isEditorUsable(element)) {
    return null;
  }

  const record = {
    id: "tg-editor-" + nextEditorId,
    element,
    type,
    registeredAt: Date.now()
  };

  nextEditorId++;

  editorRegistry.set(element, record);

  return record;
}

/**
 * Register all currently present editors.
 *
 * @returns {Object[]} newly registered editor records
 */
function registerAllEditors() {
  const newlyRegistered = [];

  for (const element of discoverEditors()) {
    const record = registerEditor(element);

    if (record) {
      newlyRegistered.push(record);
    }
  }

  return newlyRegistered;
}

/**
 * Deregister editors that are no longer in the document.
 *
 * @returns {Object[]} removed editor records
 */
function deregisterRemovedEditors() {
  const removed = [];

  for (const [element, record] of editorRegistry) {
    if (!document.contains(element)) {
      editorRegistry.delete(element);
      removed.push(record);
    }
  }

  return removed;
}

/**
 * Get the registry record for an element.
 *
 * @param {Element} element
 * @returns {Object|undefined}
 */
function getEditorRecord(element) {
  return editorRegistry.get(element);
}

/**
 * Handle a DOM mutation by syncing the registry
 * with the current DOM.
 *
 * @param {MutationRecord[]} mutations
 */
function handleMutations(mutations) {
  let relevantChange = false;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (containsEditor(node)) {
        relevantChange = true;
      }
    }

    for (const node of mutation.removedNodes) {
      if (containsEditor(node)) {
        relevantChange = true;
      }
    }
  }

  if (relevantChange) {
    const added = registerAllEditors();
    const removed = deregisterRemovedEditors();

    if (added.length > 0) {
      console.log(
        "TypoGuard: editors registered:",
        added.map(function (r) { return r.id + " (" + r.type + ")"; })
      );
    }

    if (removed.length > 0) {
      console.log(
        "TypoGuard: editors deregistered:",
        removed.map(function (r) { return r.id + " (" + r.type + ")"; })
      );
    }
  }
}

/**
 * Check whether a node (or its subtree) is or contains
 * a supported editor.
 *
 * @param {Node} node
 * @returns {boolean}
 */
function containsEditor(node) {
  if (!(node instanceof Element)) {
    return false;
  }

  if (node.matches(SUPPORTED_EDITOR_SELECTOR)) {
    return true;
  }

  return node.querySelector(SUPPORTED_EDITOR_SELECTOR) !== null;
}

/**
 * Start watching the document for dynamically
 * added or removed editors.
 */
function startEditorObserver() {
  const observer = new MutationObserver(handleMutations);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}
