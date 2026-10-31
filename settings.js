/**
 * TypoGuard — Site Exclusion & Settings
 * Phase 10
 *
 * Responsibility:
 * Manage user settings (capture toggle, per-site exclusions) and enforce
 * the protected-sites safety default: known banking/health domains are
 * NEVER captured, even before the user has configured anything.
 *
 * IMPORTANT:
 * This module does NOT:
 * - capture text
 * - store text
 * - communicate with external servers
 *
 * Consumers:
 * - discovery.js / capture.js call isEnabledForSite() synchronously (cached).
 * - content.js awaits ready() before registering editors.
 * - popup.js includes this file and drives the Settings tab through it.
 */

const TG_SETTINGS_KEY = 'tg_settings'; // same key storage.js reserves in STORAGE_KEYS

// Safety defaults — never capture on known banking/health domains, even
// before user settings exist (PRODUCT-BACKLOG safety default).
const TG_PROTECTED_SITES = [
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citibank.com',
  'capitalone.com',
  'hsbc.com',
  'barclays.co.uk',
  'paypal.com',
  'fidelity.com',
  'schwab.com',
  'vanguard.com',
  'coinbase.com',
  'healthportal.gov',
  'mychart.com',
];

const TG_DEFAULT_SETTINGS = {
  captureEnabled: true,
  excludedSites: [],
};

// Cached settings — loaded once, refreshed on every write. Discovery and
// capture read this synchronously; call ready() first to avoid a race.
let tgCachedSettings = { ...TG_DEFAULT_SETTINGS };

let tgSettingsReadyResolve;
const tgSettingsReady = new Promise((resolve) => {
  tgSettingsReadyResolve = resolve;
});

function tgNormalizeHost(host) {
  return String(host || '').toLowerCase().replace(/^www\./, '');
}

/**
 * Match a host against a site entry (exact host or any subdomain).
 * @param {string} host - normalized hostname
 * @param {string} site - entry like "example.com"
 * @returns {boolean}
 */
function tgHostMatchesSite(host, site) {
  const normalizedSite = tgNormalizeHost(site);
  return host === normalizedSite || host.endsWith('.' + normalizedSite);
}

/**
 * Whether capture is allowed on the given (or current) host.
 *
 * @param {string} [hostname] - defaults to location.hostname
 * @returns {boolean} true when capture is permitted
 */
function isEnabledForSite(hostname) {
  if (!tgCachedSettings.captureEnabled) {
    return false;
  }
  const host = tgNormalizeHost(hostname !== undefined ? hostname : location.hostname);
  if (!host) {
    return true; // e.g. file:// or exotic origins — default allow
  }
  for (const site of TG_PROTECTED_SITES) {
    if (tgHostMatchesSite(host, site)) {
      return false;
    }
  }
  for (const site of tgCachedSettings.excludedSites || []) {
    if (tgHostMatchesSite(host, site)) {
      return false;
    }
  }
  return true;
}

/**
 * Load settings from chrome.storage.local into the cache.
 * @returns {Promise<Object>} current settings
 */
async function loadSettings() {
  const result = await chrome.storage.local.get([TG_SETTINGS_KEY]);
  const stored = result[TG_SETTINGS_KEY] || {};
  tgCachedSettings = {
    ...TG_DEFAULT_SETTINGS,
    ...stored,
    excludedSites: Array.isArray(stored.excludedSites) ? stored.excludedSites : [],
  };
  return tgCachedSettings;
}

/**
 * Persist settings and refresh the cache.
 * @param {Object} patch - partial settings to merge
 * @returns {Promise<Object>} updated settings
 */
async function updateSettings(patch) {
  const merged = { ...tgCachedSettings, ...patch };
  if (!Array.isArray(merged.excludedSites)) {
    merged.excludedSites = [];
  }
  await chrome.storage.local.set({ [TG_SETTINGS_KEY]: merged });
  tgCachedSettings = merged;
  return tgCachedSettings;
}

function addExcludedSite(site) {
  const normalized = tgNormalizeHost(site);
  // Accept single-label hosts (e.g. "localhost") too — reject only empty
  // input, whitespace, or paths.
  if (!normalized || /\s/.test(normalized) || normalized.includes('/')) {
    return tgCachedSettings;
  }
  if (tgCachedSettings.excludedSites.some((s) => tgNormalizeHost(s) === normalized)) {
    return tgCachedSettings; // already present
  }
  return updateSettings({ excludedSites: [...tgCachedSettings.excludedSites, normalized] });
}

function removeExcludedSite(site) {
  const normalized = tgNormalizeHost(site);
  return updateSettings({
    excludedSites: tgCachedSettings.excludedSites.filter((s) => tgNormalizeHost(s) !== normalized),
  });
}

// Load cache immediately (content scripts run at document_idle; capture init
// awaits ready(), so no race with the first registration).
loadSettings().then(() => tgSettingsReadyResolve());

// Expose publicly (unique tg-prefixed names — content scripts share one world)
window.typoGuardSettings = {
  ready: () => tgSettingsReady,
  isEnabledForSite,
  getSettings: () => ({ ...tgCachedSettings, protectedSites: [...TG_PROTECTED_SITES] }),
  loadSettings,
  updateSettings,
  addExcludedSite,
  removeExcludedSite,
};
