// Thin wrapper around chrome.storage.local with typed getters.
// Used by background, content, popup, options.

const KEY = {
  config: 'config',           // { backendUrl, apiKey, enabled }
  blocklist: 'blocklist',     // { built_in: {domains, hosts}, personal: [], custom_words: [] }
  syncedAt: 'syncedAt',       // ISO timestamp
  stats: 'stats',             // { blocksToday, blocksTotal, lastResetDate }
  pausedUntil: 'pausedUntil', // ISO timestamp
};

const DEFAULTS = {
  config: { backendUrl: '', apiKey: '', enabled: true },
  blocklist: { built_in: { domains: [], hosts: [] }, personal: [], custom_words: [] },
  syncedAt: null,
  stats: { blocksToday: 0, blocksTotal: 0, lastResetDate: new Date().toDateString() },
  pausedUntil: null,
};

async function get(key) {
  const k = typeof key === 'string' ? key : null;
  const result = await browserAPI.storage.local.get(k);
  if (k) return result[k] ?? DEFAULTS[k];
  // Whole-object fetch
  return { ...DEFAULTS, ...result };
}

async function set(key, value) {
  return browserAPI.storage.local.set({ [key]: value });
}

async function remove(key) {
  return browserAPI.storage.local.remove(key);
}

async function clear() {
  return browserAPI.storage.local.clear();
}

// In Firefox content scripts, the global `chrome` is `browser`.
// In Chrome, it's `chrome`. Background scripts and pages use the same.
const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);

if (typeof window !== 'undefined') window.ESystemStorage = { get, set, remove, clear, KEY, DEFAULTS };
if (typeof module !== 'undefined' && module.exports) module.exports = { get, set, remove, clear, KEY, DEFAULTS };
