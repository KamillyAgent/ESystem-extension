// Background service worker. Runs across all tabs.
// Responsibilities:
//   1. On every navigation, check the URL against the local blocklist cache.
//      If matched, redirect the tab to the backend's /block page.
//   2. Maintain the local blocklist cache; sync from backend every 6h.
//   3. Handle "Sync now" and "Pause 1h" commands from popup/options.

import { api } from '../shared/api.js';

const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);
const ALARM_SYNC = 'esystem-sync';
const SYNC_PERIOD_MIN = 360; // 6 hours

// ---- Initialization ---------------------------------------------------------

browserAPI.runtime.onInstalled.addListener(() => {
  scheduleSync();
});

browserAPI.runtime.onStartup.addListener(() => {
  scheduleSync();
});

if (browserAPI.alarms) {
  browserAPI.alarms.create(ALARM_SYNC, { periodInMinutes: SYNC_PERIOD_MIN });
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_SYNC) syncNow();
  });
}

// ---- Navigation blocking ----------------------------------------------------

browserAPI.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // only main frame
  if (!shouldAct(details.url)) return;
  const result = await checkUrl(details.url);
  if (result) {
    await blockTab(details.tabId, details.url, result);
    bumpStats();
  }
});

browserAPI.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!shouldAct(details.url)) return;
  const result = await checkUrl(details.url);
  if (result) {
    await blockTab(details.tabId, details.url, result);
    bumpStats();
  }
});

function shouldAct(url) {
  if (!url) return false;
  if (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) return false;
  if (url.startsWith('about:') || url.startsWith('chrome://') || url.startsWith('edge://')) return false;
  return /^https?:\/\//.test(url);
}

async function checkUrl(rawUrl) {
  const { config, blocklist, pausedUntil } = await browserAPI.storage.local.get(['config', 'blocklist', 'pausedUntil']);
  if (pausedUntil && new Date(pausedUntil) > new Date()) return null;
  if (!config?.enabled) return null;
  if (!config?.backendUrl) return null;

  // Load detector (it's a content-script module, so we need to inline the logic here)
  // For background, we re-implement the simple URL check + blocklist match
  const bl = blocklist || { built_in: { domains: [], hosts: [] }, personal: [] };
  return matchBlocklist(rawUrl, bl);
}

function matchBlocklist(rawUrl, blocklist) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    const fullUrl = u.href;

    for (const e of blocklist.personal || []) {
      if (e.block_type === 'page' && e.url === fullUrl) {
        return { reason: e.reason, detector: e.detector, domain: host };
      }
    }
    for (const e of blocklist.personal || []) {
      if (e.block_type === 'domain' && e.url === host) {
        return { reason: e.reason, detector: e.detector, domain: host };
      }
    }
    for (const e of blocklist.personal || []) {
      if (e.block_type === 'host' && (host === e.url || host.endsWith('.' + e.url))) {
        return { reason: e.reason, detector: e.detector, domain: host };
      }
    }
    if ((blocklist.built_in?.domains || []).includes(host)) {
      return { reason: 'Built-in community blocklist', detector: 'built-in', domain: host };
    }
    for (const h of blocklist.built_in?.hosts || []) {
      if (host === h || host.endsWith('.' + h)) {
        return { reason: 'Built-in community blocklist', detector: 'built-in', domain: host };
      }
    }
  } catch {}
  return null;
}

async function blockTab(tabId, originalUrl, { reason, detector, domain }) {
  const { config } = await browserAPI.storage.local.get('config');
  if (!config?.backendUrl) return;
  const base = config.backendUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    url: originalUrl,
    domain: domain || '',
    reason: reason || 'Page is on your blocklist',
    detector: detector || 'blocklist',
  });
  try {
    await browserAPI.tabs.update(tabId, { url: `${base}/block?${params}` });
  } catch (e) {
    console.error('[ESystem] block tab failed:', e);
  }
}

// ---- Sync -------------------------------------------------------------------

function scheduleSync() {
  // No-op for now — alarms are set in onInstalled
}

async function syncNow() {
  const { config } = await browserAPI.storage.local.get('config');
  if (!config?.backendUrl || !config?.apiKey) return { ok: false, reason: 'not_configured' };
  try {
    const data = await api.sync();
    await browserAPI.storage.local.set({
      blocklist: {
        built_in: data.built_in || { domains: [], hosts: [] },
        personal: data.personal || [],
        custom_words: data.custom_words || [],
      },
      syncedAt: data.synced_at,
    });
    return { ok: true, syncedAt: data.synced_at };
  } catch (e) {
    console.error('[ESystem] sync failed:', e);
    return { ok: false, reason: e.message };
  }
}

// ---- Stats ------------------------------------------------------------------

async function bumpStats() {
  const { stats } = await browserAPI.storage.local.get('stats');
  const today = new Date().toDateString();
  const s = stats || { blocksToday: 0, blocksTotal: 0, lastResetDate: today };
  if (s.lastResetDate !== today) {
    s.blocksToday = 0;
    s.lastResetDate = today;
  }
  s.blocksToday += 1;
  s.blocksTotal = (s.blocksTotal || 0) + 1;
  await browserAPI.storage.local.set({ stats: s });
}

// ---- Message router (for popup + options) -----------------------------------

browserAPI.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'sync-now') {
        sendResponse(await syncNow());
      } else if (msg.type === 'whoami') {
        sendResponse(await api.whoami());
      } else if (msg.type === 'verify-config') {
        // Set the config, then verify
        if (msg.config) {
          await browserAPI.storage.local.set({ config: { ...msg.config, enabled: true } });
        }
        try {
          const me = await api.whoami();
          sendResponse({ ok: true, account: me });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
      } else if (msg.type === 'set-pause') {
        if (msg.minutes && msg.minutes > 0) {
          const until = new Date(Date.now() + msg.minutes * 60_000).toISOString();
          await browserAPI.storage.local.set({ pausedUntil: until });
          sendResponse({ ok: true, pausedUntil: until });
        } else {
          await browserAPI.storage.local.remove('pausedUntil');
          sendResponse({ ok: true, pausedUntil: null });
        }
      } else if (msg.type === 'sign-out') {
        await browserAPI.storage.local.clear();
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: 'unknown_message' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true; // keep channel open for async response
});
