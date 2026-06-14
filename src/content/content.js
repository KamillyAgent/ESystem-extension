// Content script: scans the document for NSFW signals and reports findings to the backend.
// Also observes DOM mutations (debounced) so SPAs and dynamically loaded content are caught.

(async function () {
  // Bail if we're running on the block page itself or an extension page
  const here = location.href;
  if (here.startsWith('chrome-extension://') || here.startsWith('moz-extension://') || here.startsWith('chrome://')) return;

  const storage = window.ESystemStorage;
  const api = window.ESystemAPI;
  const detector = window.ESystemDetector;
  const patterns = window.ESystemPatterns;

  // Load config + blocklist + custom_words (refreshed by background)
  const state = await storage.get(['config', 'blocklist']);
  if (!state.config?.enabled) return;
  if (!state.config?.backendUrl || !state.config?.apiKey) return;

  const bl = state.blocklist || { built_in: { domains: [], hosts: [] }, personal: [], custom_words: [] };
  const urlKw = patterns.URL_KEYWORDS;
  const textKw = patterns.getCombinedKeywords(bl.custom_words || []);

  // Skip if already in blocklist (avoids redundant reports + immediate redirect by background)
  const alreadyBlocked = detector.matchBlocklist(here, bl);
  if (alreadyBlocked) {
    // The background worker should redirect. As a fallback, do it now.
    if (window.ESystemBlocking) {
      await window.ESystemBlocking.blockTab(undefined, here, location.hostname, alreadyBlocked.reason, alreadyBlocked.detector)
        .catch(() => {});
    }
    return;
  }

  // Initial scan
  let reported = false;
  async function reportOnce(scan) {
    if (reported || !scan) return;
    reported = true;
    try {
      await api.block(scan);
    } catch (e) {
      // Silent — extension shouldn't disturb the user
      console.debug('[ESystem] report failed:', e.message);
    }
  }

  const initial = detector.scanDocument(document, here, urlKw, textKw);
  reportOnce(initial);

  // MutationObserver: re-scan on DOM changes (debounced)
  let pending = null;
  const observer = new MutationObserver(() => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(async () => {
      const cfg = await storage.get('config');
      if (!cfg.config?.enabled) return;
      const found = detector.scanDocument(document, location.href, urlKw, textKw);
      if (found) reportOnce(found);
    }, 500);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // SPA route change detection (history API)
  let lastHref = location.href;
  const routeObserver = new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      const found = detector.scanDocument(document, location.href, urlKw, textKw);
      if (found) reportOnce(found);
    }
  });
  routeObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
