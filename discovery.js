/**
 * TypoGuard — Editor Discovery
 *
 * Phase 2.3
 *
 * Responsibility:
 * Detect, identify, and validate supported editing surfaces.
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
 * An editor that is disabled, hidden, or collapsed
 * is not worth registering.
 *
 * @param {Element} element
 * @returns {boolean}
 */
function isEditorUsable(element) {
  // Textarea-specific states
  if (element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) {
      return false;
    }
  }

  // Hidden via the standard attribute
  if (element.hidden) {
    return false;
  }

  // Check visibility up the ancestor chain
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

  // Collapsed to zero size
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
 * Convert a DOM element into a TypoGuard editor descriptor.
 * Returns null for elements that are not usable editors.
 *
 * @param {Element} element
 * @returns {Object|null}
 */
function describeEditor(element) {
  const type = getEditorType(element);

  if (!type) {
    return null;
  }

  if (!isEditorUsable(element)) {
    return null;
  }

  return {
    element,
    type
  };
}
/**
 * TypoGuard — Dynamic Editor Detection
 *
 * Phase 2.4
 *
 * Watches for editors added to or removed from the DOM
 * after initial page load.
 *
 * IMPORTANT:
 * Still does NOT:
 * - capture text
 * - store text
 * - listen for typing
 * - communicate with a server
 */

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
 * Handle a DOM mutation by re-scanning for editors.
 *
 * For Phase 2 we re-run the full discovery. This is simple
 * and correct; optimization (incremental scanning) comes
 * later, once the registry exists.
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
    const editors = discoverEditors()
      .map(describeEditor)
      .filter(Boolean);

    console.log(
      "TypoGuard: editors re-discovered after DOM change:",
      editors
    );
  }
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
