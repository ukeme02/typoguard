/**
 * TypoGuard — Storage Layer
 * Phase 5
 *
 * Responsibility:
 * Persist captured editor data to chrome.storage.local for recovery.
 * Manages storage quotas, cleanup, and data lifecycle.
 *
 * IMPORTANT:
 * This module does NOT:
 * - capture text directly
 * - communicate with external servers
 * - decrypt or expose data to third parties
 */

// Storage keys
const STORAGE_KEYS = {
  captures: 'tg_captures',           // { editorId: [captureEntry, ...] }
  metadata: 'tg_metadata',           // { editorId: { pageUrl, editorType, lastUpdated } }
  settings: 'tg_settings',           // user settings
};

// Storage limits
const STORAGE_CONFIG = {
  maxCapturesPerEditor: 100,         // Max captures to keep per editor
  maxEditorsStored: 500,             // Max editors to track
  maxTotalSizeBytes: 5 * 1024 * 1024, // ~5MB total storage limit
  cleanupIntervalMs: 300000,         // Clean up every 5 minutes
};

/**
 * Load all stored captures from chrome.storage.local.
 * @returns {Promise<Object>} Map of editorId to capture array
 */
async function loadCaptures() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.captures);
  return result[STORAGE_KEYS.captures] || {};
}

/**
 * Save captures for a specific editor to storage.
 * Merges with existing captures and prunes if over limit.
 *
 * @param {string} editorId
 * @param {Array} newCaptures - New capture entries to add
 */
async function saveCapturesForEditor(editorId, newCaptures) {
  const allCaptures = await loadCaptures();
  const existing = allCaptures[editorId] || [];

  // Merge new captures
  const merged = [...existing, ...newCaptures];

  // Sort by timestamp ascending (oldest first) so the LAST entry is always
  // the latest — the recovery banner (checkTextLoss, triggerQuickRestore) and
  // the popup both read captures[captures.length - 1] as the newest capture.
  merged.sort((a, b) => a.timestamp - b.timestamp);

  // Prune to max per editor — drop the OLDEST entries from the front
  if (merged.length > STORAGE_CONFIG.maxCapturesPerEditor) {
    merged.splice(0, merged.length - STORAGE_CONFIG.maxCapturesPerEditor);
  }

  allCaptures[editorId] = merged;

  await chrome.storage.local.set({ [STORAGE_KEYS.captures]: allCaptures });
}

/**
 * Load metadata for all stored editors.
 * @returns {Promise<Object>} Map of editorId to metadata
 */
async function loadMetadata() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.metadata);
  return result[STORAGE_KEYS.metadata] || {};
}

/**
 * Save metadata for an editor.
 *
 * @param {string} editorId
 * @param {Object} metadata - { pageUrl, editorType, lastUpdated, title }
 */
async function saveMetadata(editorId, metadata) {
  const allMetadata = await loadMetadata();
  allMetadata[editorId] = {
    ...allMetadata[editorId],
    ...metadata,
    lastUpdated: Date.now(),
  };

  // Prune if too many editors
  const keys = Object.keys(allMetadata);
  if (keys.length > STORAGE_CONFIG.maxEditorsStored) {
    // Remove oldest editors
    keys.sort((a, b) => allMetadata[a].lastUpdated - allMetadata[b].lastUpdated);
    const toRemove = keys.slice(0, keys.length - STORAGE_CONFIG.maxEditorsStored);
    for (const key of toRemove) {
      delete allMetadata[key];
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.metadata]: allMetadata });
}

/**
 * Get all captures for a specific editor.
 *
 * @param {string} editorId
 * @returns {Promise<Array>} Array of capture entries
 */
async function getCapturesForEditor(editorId) {
  const allCaptures = await loadCaptures();
  return allCaptures[editorId] || [];
}

/**
 * Delete all captures and metadata for an editor (privacy cleanup).
 *
 * @param {string} editorId
 */
async function clearEditorData(editorId) {
  const [allCaptures, allMetadata] = await Promise.all([
    loadCaptures(),
    loadMetadata(),
  ]);

  delete allCaptures[editorId];
  delete allMetadata[editorId];

  await Promise.all([
    chrome.storage.local.set({ [STORAGE_KEYS.captures]: allCaptures }),
    chrome.storage.local.set({ [STORAGE_KEYS.metadata]: allMetadata }),
  ]);
}

/**
 * Clear ALL stored data (full privacy reset).
 */
async function clearAllData() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.captures,
    STORAGE_KEYS.metadata,
    STORAGE_KEYS.settings,
  ]);
}

/**
 * Get storage usage stats.
 * @returns {Promise<Object>} { usedBytes, totalBytes, items }
 */
async function getStorageStats() {
  const result = await chrome.storage.local.getBytesInUse();
  const allCaptures = await loadCaptures();
  const allMetadata = await loadMetadata();
  const itemCount = Object.keys(allCaptures).length + Object.keys(allMetadata).length;

  return {
    usedBytes: result,
    totalBytes: STORAGE_CONFIG.maxTotalSizeBytes,
    itemCount,
    editorCount: Object.keys(allCaptures).length,
  };
}

// Public API
window.typoGuardStorage = {
  loadCaptures,
  saveCapturesForEditor,
  loadMetadata,
  saveMetadata,
  getCapturesForEditor,
  clearEditorData,
  clearAllData,
  getStorageStats,
  STORAGE_KEYS,
  STORAGE_CONFIG,
};