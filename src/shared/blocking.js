// Blocking logic. Given a matched URL, navigates the tab to the backend's /block page.
// Works across Chrome (MV3), Brave, and Firefox.

const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);

function buildBlockUrl({ backendUrl, originalUrl, domain, reason, detector }) {
  const base = (backendUrl || '').replace(/\/+$/, '');
  const params = new URLSearchParams();
  if (originalUrl) params.set('url', originalUrl);
  if (domain) params.set('domain', domain);
  if (reason) params.set('reason', reason);
  if (detector) params.set('detector', detector);
  return `${base}/block?${params.toString()}`;
}

async function blockTab(tabId, originalUrl, domain, reason, detector) {
  const { config } = await browserAPI.storage.local.get('config');
  if (!config?.backendUrl) return false;
  const url = buildBlockUrl({
    backendUrl: config.backendUrl,
    originalUrl,
    domain,
    reason: reason || 'Page is on your blocklist',
    detector: detector || 'blocklist',
  });
  try {
    await browserAPI.tabs.update(tabId, { url });
    return true;
  } catch (e) {
    console.error('[ESystem] block failed:', e);
    return false;
  }
}

const api = { blockTab, buildBlockUrl };

if (typeof window !== 'undefined') window.ESystemBlocking = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
