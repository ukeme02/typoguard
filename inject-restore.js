/**
 * TypoGuard — Restore Injection
 * Phase 6
 *
 * Listens for restore messages from the popup and injects text
 * back into the matching editor on the page.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'typoguard-restore') {
    return;
  }

  const { editorId, text } = request;

  if (!editorId || !text) {
    sendResponse({ success: false, error: 'Missing editorId or text' });
    return;
  }

  try {
    // Find the editor element by its TypoGuard ID
    // We look for elements that have a data-tg-id attribute matching editorId
    // Or we match by the most recently used editor on this page
    const editorElement = findEditorElement(editorId);

    if (!editorElement) {
      sendResponse({ success: false, error: 'Editor not found on this page' });
      return;
    }

    // Restore the text
    if (editorElement.tagName === 'TEXTAREA') {
      editorElement.value = text;
      editorElement.dispatchEvent(new Event('input', { bubbles: true }));
      editorElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (editorElement.isContentEditable) {
      editorElement.innerText = text;
      editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    }

    sendResponse({ success: true, editorId });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }

  return true; // Keep channel open for async response
});

/**
 * Find an editor element by its TypoGuard ID.
 * Since content.js doesn't store IDs on elements, we match by:
 * 1. data-tg-id attribute (if we add it in discovery.js)
 * 2. Fallback: the last focused/used textarea or contenteditable on the page
 */
function findEditorElement(editorId) {
  // Try data-tg-id attribute first
  const byId = document.querySelector(`[data-tg-id="${editorId}"]`);
  if (byId) return byId;

  // Fallback: find the most recently active editor
  const editors = document.querySelectorAll('textarea, [contenteditable="true"]');
  if (editors.length > 0) {
    return editors[editors.length - 1];
  }

  return null;
}