/**
 * TypoGuard — Cloud Sync Module (Phase 1)
 * Optional encrypted sync between devices.
 * All encryption/decryption happens in-browser. No plaintext leaves the user's device.
 */

const STORAGE_KEY = 'tg_sync_state';

// Encryption utilities using CryptoSubtle
const ENCRYPTION_ALGO = 'AES-GCM';
const KEY_DERIVATION_ALGO = 'PBKDF2';

/**
 * Derive a crypto key from a passphrase using PBKDF2.
 *
 * @param {string} passphrase - User-provided passphrase
 * @param {string} salt - Unique salt per user (stored unencrypted)
 * @returns {Promise<CryptoKey>} Derived crypto key
 */
async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: KEY_DERIVATION_ALGO },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: KEY_DERIVATION_ALGO, salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ENCRYPTION_ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM.
 *
 * @param {CryptoKey} key - Encryption key
 * @param {Uint8Array} data - Data to encrypt
 * @returns {Promise<{iv: Uint8Array, ciphertext: Uint8Array}>} IV and ciphertext
 */
async function encryptData(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGO, iv },
    key,
    data
  );
  return { iv, ciphertext: new Uint8Array(encrypted) };
}

/**
 * Decrypt data using AES-GCM.
 *
 * @param {CryptoKey} key - Decryption key
 * @param {Object} data - {iv: Uint8Array, ciphertext: Uint8Array}
 * @returns {Promise<Uint8Array>} Decrypted data
 */
async function decryptData(key, data) {
  const { iv, ciphertext } = data;
  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGO, iv },
    key,
    ciphertext
  );
  return new Uint8Array(decrypted);
}

/**
 * Save sync state to chrome.storage.local.
 *
 * @param {Object} state - Sync state object
 * @param {string} passphrase - User passphrase (to re-encrypt before storing)
 */
async function saveSyncState(state, passphrase) {
  if (!passphrase) {
    // Store unencrypted if no passphrase (disabled sync)
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return;
  }

  const key = await deriveKey(passphrase, generateSalt());
  const encrypted = await encryptData(key, JSON.stringify(state));
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      salt: state.salt, // salt stored unencrypted (needed for re-derivation)
    },
  });
}

/**
 * Load and decrypt sync state.
 *
 * @param {string} passphrase - User passphrase
 * @returns {Promise<Object | null>} Decrypted sync state or null if failed
 */
async function loadSyncState(passphrase) {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  const stored = data[STORAGE_KEY];
  if (!stored) return null;

  if (!passphrase) {
    // Return unencrypted state if no passphrase
    try {
      return JSON.parse(stored[STORAGE_KEY] || '{}');
    } catch (e) {
      return null;
    }
  }

  try {
    const key = await deriveKey(passphrase, stored.salt);
    const decrypted = await decryptData(key, {
      iv: stored.iv,
      ciphertext: stored.ciphertext,
    });
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (e) {
    console.error('Sync: Failed to decrypt state', e);
    return null;
  }
}

/**
 * Generate a random salt for key derivation.
 *
 * @returns {string} Base64-encoded salt
 */
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Initialize sync for a user.
 * Call this once on first use. Sets up passphrase prompt and initial state.
 */
async function initializeSync() {
  const hasPassphrase = await chrome.storage.local.get('sync_passphrase');
  if (hasPassphrase.sync_passphrase) {
    // Sync already initialized; load state
    return loadSyncState(hasPassphrase.sync_passphrase);
  }
  // No passphrase yet — prompt user (UI handled externally)
  // Initialize empty state
  await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify({}) });
  return {};
}

// Export public API
window.typoGuardSync = {
  initializeSync,
  saveSyncState,
  loadSyncState,
  deriveKey,
  generateSalt,
};

// Initialize on load
initializeSync();