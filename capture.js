/**
 * TypoGuard — Capture Engine
 *
 * Phase 3
 *
 * Responsibility:
 * Capture and store user input from registered editors for recovery purposes.
 *
 * IMPORTANT:
 * This module does NOT:
 * - persist data (handled by Phase 5 Storage layer)
 * - determine what is sensitive (handled by Phase 4 Safety engine)
 * - communicate with external servers
 */

// Configuration
const CAPTURE_CONFIG = {
  maxCapturesPerEditor: 50,    // Circular buffer size
  maxCharsPerCapture: 10000,   // Maximum characters to store per capture
  debounceMs: 1000,            // Debounce idle captures
  maxWaitMs: 5000              // Maximum time between forced captures during typing
};

// Internal state
const captureBuffer = new Map(); // key: editorId, value: Array of capture objects
const captureSequence = new Map(); // key: editorId, value: next sequence number
const captureTimeouts = new Map(); // key: editorId, value: { idleTimeout, maxWaitTimeout }
const editorListeners = new Map(); // key: editorId, value: { inputHandler, changeHandler, blurHandler, visibilityHandler, pagehideHandler }
const initializedEditorIds = new Set(); // Track editors that have been initialized to prevent double-init

// Capture entry structure:
// {
//   text: string,
//   timestamp: number,
//   sequence: number,
//   pageUrl: string,
//   editorType: string
// }

// Public API (for other modules to interact with)
const captureEngine = {
  /**
   * Initialize capture for a registered editor
   * @param {Object} editorRecord - From editorRegistry
   */
  initEditorCapture: function(editorRecord) {
    const { id: editorId } = editorRecord;

    // Prevent double-initialization
    if (initializedEditorIds.has(editorId)) {
      return;
    }

    // Initialize buffer for this editor if not exists
    if (!captureBuffer.has(editorId)) {
      captureBuffer.set(editorId, []);
      captureSequence.set(editorId, 1);
    }

    // Set up listeners for this editor
    setupEditorListeners(editorRecord);

    // Perform initial capture of current content
    performCapture(editorRecord);

    // Mark as initialized
    initializedEditorIds.add(editorId);
  },

  /**
   * Detach capture listeners and cleanup for an editor
   * @param {Object} editorRecord - From editorRegistry
   */
  destroyEditorCapture: function(editorRecord) {
    const { id: editorId } = editorRecord;

    // Remove listeners (uses the record's own element — robust even if the
    // element was already deregistered from editorRegistry)
    removeEditorListeners(editorRecord);

    // Clear timeouts
    clearEditorTimeouts(editorId);

    // Note: We intentionally preserve the captured data in captureBuffer
    // and captureSequence for potential recovery even after editor deregistration
    // The storage layer (Phase 5) will handle when to actually persist/clear this data

    // Remove from initialized set
    initializedEditorIds.delete(editorId);
  },

  /**
   * Get captured data for an editor (for storage layer)
   * @param {string} editorId
   * @returns {Array} Array of capture objects
   */
  getCapturesForEditor: function(editorId) {
    return captureBuffer.get(editorId) || [];
  },

  /**
   * Clear all captured data (for testing or privacy).
   *
   * Semantics: wipes captured DATA and pending timers, but keeps listeners
   * attached and keeps editors initialized — capture continues seamlessly
   * for future input. Sequence counters are preserved so per-editor
   * sequences stay monotonic across wipes (recovery-ordering invariant).
   */
  clearAllCaptures: function() {
    // Clear pending timers FIRST so a pre-wipe snapshot cannot be re-saved
    // after the wipe (the old version iterated captureBuffer.keys() AFTER
    // clearing the buffer — a loop that could never run).
    for (const editorId of Array.from(captureTimeouts.keys())) {
      clearEditorTimeouts(editorId);
    }
    captureBuffer.clear();
  }
};

// Private helper functions
function setupEditorListeners(editorRecord) {
  const { id: editorId, element } = editorRecord;

  // Define named handler functions for symmetric removal
  const inputHandler = () => handleEditorInput(editorRecord);
  const changeHandler = () => handleEditorChange(editorRecord);
  const blurHandler = () => handleEditorBlur(editorRecord);
  const visibilityHandler = () => handleVisibilityChange(editorRecord);
  const pagehideHandler = () => handlePageHide(editorRecord);

  // Store handlers for symmetric removal
  editorListeners.set(editorId, {
    inputHandler,
    changeHandler,
    blurHandler,
    visibilityHandler,
    pagehideHandler
  });

  // Attach listeners
  element.addEventListener('input', inputHandler);
  element.addEventListener('change', changeHandler);
  element.addEventListener('blur', blurHandler);
  document.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('pagehide', pagehideHandler);
}

function removeEditorListeners(editorRecord) {
  const listeners = editorListeners.get(editorRecord.id);
  if (!listeners) return;

  const element = editorRecord.element;
  if (!element) return;

  element.removeEventListener('input', listeners.inputHandler);
  element.removeEventListener('change', listeners.changeHandler);
  element.removeEventListener('blur', listeners.blurHandler);
  document.removeEventListener('visibilitychange', listeners.visibilityHandler);
  window.removeEventListener('pagehide', listeners.pagehideHandler);

  editorListeners.delete(editorRecord.id);
}

function handleEditorInput(editorRecord) {
  scheduleDebouncedCapture(editorRecord);
}

function handleEditorChange(editorRecord) {
  scheduleDebouncedCapture(editorRecord);
}

function handleEditorBlur(editorRecord) {
  performCapture(editorRecord);
}

function handleVisibilityChange(editorRecord) {
  if (document.visibilityState === 'hidden') {
    performCapture(editorRecord);
  }
}

function handlePageHide(editorRecord) {
  performCapture(editorRecord);
}

function scheduleDebouncedCapture(editorRecord) {
  const editorId = editorRecord.id;
  let timeouts = captureTimeouts.get(editorId);
  if (!timeouts) {
    timeouts = { idleTimeout: null, maxWaitTimeout: null };
    captureTimeouts.set(editorId, timeouts);
  }

  // Idle capture: reset on every input event. Timer hygiene inside
  // performCapture also cancels the pending max-wait.
  if (timeouts.idleTimeout) clearTimeout(timeouts.idleTimeout);
  timeouts.idleTimeout = setTimeout(() => {
    performCapture(editorRecord);
    timeouts.idleTimeout = null;
  }, CAPTURE_CONFIG.debounceMs);

  // Max-wait: NOT reset by keystrokes. Starts once per typing burst and fires
  // mid-typing so continuous typing still captures at least every 5s
  // (protects against sudden power loss, which fires no unload events).
  if (!timeouts.maxWaitTimeout) {
    timeouts.maxWaitTimeout = setTimeout(() => {
      performCapture(editorRecord); // hygiene inside also cancels pending idle
      timeouts.maxWaitTimeout = null;
    }, CAPTURE_CONFIG.maxWaitMs);
  }
}

function clearEditorTimeouts(editorId) {
  const timeouts = captureTimeouts.get(editorId);
  if (timeouts) {
    if (timeouts.idleTimeout !== null) {
      clearTimeout(timeouts.idleTimeout);
      timeouts.idleTimeout = null;
    }
    if (timeouts.maxWaitTimeout !== null) {
      clearTimeout(timeouts.maxWaitTimeout);
      timeouts.maxWaitTimeout = null;
    }
  }
}

function performCapture(editorRecord) {
  const { id: editorId, element, type: editorType } = editorRecord;

  // TIMER HYGIENE (fixes duplicate captures): any capture — blur, visibility,
  // pagehide, idle, or max-wait — cancels still-pending timers so no
  // duplicate snapshot of the same content fires afterwards.
  const pendingTimeouts = captureTimeouts.get(editorId);
  if (pendingTimeouts) {
    if (pendingTimeouts.idleTimeout) {
      clearTimeout(pendingTimeouts.idleTimeout);
      pendingTimeouts.idleTimeout = null;
    }
    if (pendingTimeouts.maxWaitTimeout) {
      clearTimeout(pendingTimeouts.maxWaitTimeout);
      pendingTimeouts.maxWaitTimeout = null;
    }
  }

  // Get the current text content based on editor type
  let textContent = '';

  if (editorType === 'textarea') {
    textContent = element.value;
  } else if (editorType === 'contenteditable') {
    textContent = element.innerText;
  }

  // Apply character limit
  if (textContent.length > CAPTURE_CONFIG.maxCharsPerCapture) {
    textContent = textContent.substring(0, CAPTURE_CONFIG.maxCharsPerCapture);
  }

  // Create capture entry
  const captureEntry = {
    text: textContent,
    timestamp: Date.now(),
    sequence: getNextSequenceForEditor(editorId),
    pageUrl: location.href,
    editorType: editorType
  };

  // Add to buffer for this editor (self-healing: recreate the buffer if it
  // was cleared while capture remained live)
  let buffer = captureBuffer.get(editorId);
  if (!buffer) {
    buffer = [];
    captureBuffer.set(editorId, buffer);
  }
  buffer.push(captureEntry);

  // Prune buffer if it exceeds maximum size
  pruneCaptureBuffer(editorId);

  // Log for debugging (can be removed in production)
  // console.log(`TypoGuard: captured ${textContent.length} chars for editor ${editorId}`);
}

function getNextSequenceForEditor(editorId) {
  const sequence = captureSequence.get(editorId) || 1;
  captureSequence.set(editorId, sequence + 1);
  return sequence;
}

function pruneCaptureBuffer(editorId) {
  const buffer = captureBuffer.get(editorId);
  if (!buffer) return;

  // If buffer exceeds maximum size, remove oldest entries
  if (buffer.length > CAPTURE_CONFIG.maxCapturesPerEditor) {
    const excess = buffer.length - CAPTURE_CONFIG.maxCapturesPerEditor;
    buffer.splice(0, excess); // Remove from beginning (oldest)
  }
}

// Initialize the capture engine on load
// We'll expose the captureEngine globally so content.js can access it
window.typoGuardCaptureEngine = captureEngine;