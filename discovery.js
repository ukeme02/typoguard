/**
 * TypoGuard — Editor Discovery
 *
 * Phase 2.2
 *
 * Responsibility:
 * Detect and identify supported editing surfaces.
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
 * Convert a DOM element into a basic TypoGuard editor descriptor.
 *
 * @param {Element} element
 * @returns {Object|null}
 */
function describeEditor(element) {
  const type = getEditorType(element);

  if (!type) {
    return null;
  }

  return {
    element,
    type
  };
}