/**
 * TypoGuard — Cloud Sync Module (Phase 1)
 * Optional encrypted sync between devices.
 * All encryption/decryption happens in-browser. No plaintext leaves the user's device.
 *
 * Storage format (chrome.storage.local under STORAGE_KEY):
 *   - Encrypted:   { iv: base64, ciphertext: base64, salt: base64 }
 *   - Unencrypted: raw JSON string (sync disabled / no passphrase yet)
 *
 * TODO(security): initializeSync() currently persists the raw passphrase in
 * chrome.storage.local ('sync_passphrase'). Storing the passphrase defeats
 * end-to-end encryption — anyone with storage access can re-derive the key.
 * Before sync ships, keep the derived key in memory only, or prompt per session.
 */

const STORAGE_KEY = 'tg_sync_state';

// Encryption utilities using CryptoSubtle
const ENCRYPTION_ALGO = 'AES-GCM';
const KEY_DERIVATION_ALGO = 'PBKDF2';

/**
 * Convert a base64 string to bytes.
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert bytes to a base64 string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Derive a crypto key from a passphrase using PBKDF2.
 *
 * @param {string} passphrase - User-provided passphrase
 * @param {string} salt - Base64-encoded salt (unique per user, stored unencrypted)
 * @returns {Promise<CryptoKey>} Derived crypto key
 */
async function deriveKey(passphrase, salt) {
  // PBKDF2 requires a BufferSource — decode the base64 salt here so every
  // caller can pass the base64 string that is stored in chrome.storage.
  const saltBytes = typeof salt === 'string' ? base64ToBytes(salt) : salt;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: KEY_DERIVATION_ALGO },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: KEY_DERIVATION_ALGO, salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
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
 * @param {Uint8Array|string} data - Data to encrypt
 * @returns {Promise<{iv: Uint8Array, ciphertext: Uint8Array}>} IV and ciphertext
 */
async function encryptData(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGO, iv },
    key,
    bytes
  );
  return { iv, ciphertext: new Uint8Array(encrypted) };
}

/**
 * Decrypt data using AES-GCM.
 *
 * @param {CryptoKey} key - Encryption key
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
    await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(state) });
    return;
  }

  // REUSE the stored salt — a fresh salt per save would make every previously
  // saved state undecryptable. Generate one only on first encrypted save.
  const existing = await chrome.storage.local.get([STORAGE_KEY]);
  const stored = existing[STORAGE_KEY];
  const salt = stored && stored.salt ? stored.salt : generateSalt();

  const key = await deriveKey(passphrase, salt);
  const encrypted = await encryptData(key, JSON.stringify(state));
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      iv: bytesToBase64(encrypted.iv),
      ciphertext: bytesToBase64(encrypted.ciphertext),
      salt: salt, // salt stored unencrypted (needed for re-derivation)
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
    // Unencrypted state is stored as a raw JSON string
    if (typeof stored !== 'string') {
      return null; // encrypted payload present — cannot decrypt without passphrase
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }

  try {
    if (typeof stored === 'string' || !stored.ciphertext) {
      return null; // stored unencrypted; nothing to decrypt
    }
    const key = await deriveKey(passphrase, stored.salt);
    const decrypted = await decryptData(key, {
      iv: base64ToBytes(stored.iv),
      ciphertext: base64ToBytes(stored.ciphertext),
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
  return bytesToBase64(array);
}

/**
 * Initialize sync for a user.
 * Call this explicitly (from settings UI) on first use — NOT on every page
 * load: unconditional initialization overwrote any previously saved state.
 *
 * @param {string} passphrase - User passphrase. NOTE: currently persisted in
 *   plain text under 'sync_passphrase' — see the security TODO in the header.
 * @returns {Promise<Object>} Initial sync state
 */
async function initializeSync(passphrase) {
  const existing = await chrome.storage.local.get([STORAGE_KEY]);
  if (existing[STORAGE_KEY]) {
    // Already initialized — load existing state
    return loadSyncState(passphrase);
  }

  if (passphrase) {
    await saveSyncState({}, passphrase);
  } else {
    // No passphrase yet — initialize empty unencrypted state (once)
    await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify({}) });
  }
  return {};
}

// Export public API
window.typoGuardSync = {
  initializeSync,
  saveSyncState,
  loadSyncState,
  deriveKey,
  generateSalt,
  bytesToBase64,
  base64ToBytes,
};
