// Detection logic. Pure functions — no I/O.
// Returns { matched: bool, detector: string, reason: string, blockType: 'page'|'domain', value: string }

const patterns = (typeof window !== 'undefined' ? window.ESystemPatterns : require('./patterns.js'));

function detectUrl(rawUrl, urlKeywords) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    for (const kw of urlKeywords) {
      if (host.includes(kw)) {
        return { matched: true, detector: 'url-keyword', reason: `URL hostname matches "${kw}"`, blockType: 'domain', value: host };
      }
    }
  } catch {}
  return { matched: false };
}

function detectText(text, textKeywords) {
  if (!text || text.length > patterns.MAX_META_LEN) return { matched: false };
  const lower = text.toLowerCase();
  for (const kw of textKeywords) {
    if (lower.includes(kw)) {
      return { matched: true, detector: 'text-pattern', reason: `Page text matches "${kw}"`, blockType: 'page', value: text.slice(0, 200) };
    }
  }
  return { matched: false };
}

function extractTextFromDoc(doc, limit = 5000) {
  if (!doc) return '';
  let buf = '';
  for (const sel of patterns.TEXT_SELECTORS) {
    let nodes;
    try { nodes = doc.querySelectorAll(sel); } catch { continue; }
    for (const n of nodes) {
      const t = (n.tagName === 'META')
        ? (n.getAttribute('content') || '')
        : (n.innerText || n.textContent || '');
      if (t && t.length <= patterns.MAX_META_LEN) {
        buf += ' ' + t.trim();
        if (buf.length > limit) return buf.slice(0, limit);
      }
    }
  }
  return buf;
}

// Top-level: scan the current document for any matching signal.
// customWords is the array of user-added detection words (already lowercased).
// Returns null if no match, or { url, blockType, detector, reason }
function scanDocument(doc, location, urlKeywords, textKeywords) {
  // 1. URL
  const urlHit = detectUrl(location, urlKeywords);
  if (urlHit.matched) {
    return {
      url: location,
      block_type: urlHit.blockType,
      detector: urlHit.detector,
      reason: urlHit.reason,
    };
  }

  // 2. Metadata + text
  const text = extractTextFromDoc(doc);
  const textHit = detectText(text, textKeywords);
  if (textHit.matched) {
    return {
      url: location,
      block_type: textHit.blockType,
      detector: textHit.detector,
      reason: textHit.reason,
    };
  }

  return null;
}

// Check if a URL is on the local blocklist (used by background worker)
function matchBlocklist(rawUrl, blocklist) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    const path = u.pathname;
    const fullUrl = u.href;

    // 1. Exact URL match (page type)
    for (const e of blocklist.personal || []) {
      if (e.block_type === 'page' && e.url === fullUrl) {
        return { blockType: 'page', reason: e.reason, detector: e.detector };
      }
    }

    // 2. Exact domain match (domain type)
    for (const e of blocklist.personal || []) {
      if (e.block_type === 'domain' && e.url === host) {
        return { blockType: 'domain', reason: e.reason, detector: e.detector };
      }
    }

    // 3. Host match (host type) — matches domain and ALL subdomains
    for (const e of blocklist.personal || []) {
      if (e.block_type === 'host' && (host === e.url || host.endsWith('.' + e.url))) {
        return { blockType: 'host', reason: e.reason, detector: e.detector };
      }
    }

    // 4. Built-in domains (exact)
    if ((blocklist.built_in?.domains || []).includes(host)) {
      return { blockType: 'domain', reason: 'Built-in community blocklist', detector: 'built-in' };
    }

    // 5. Built-in hosts (any subdomain)
    for (const h of blocklist.built_in?.hosts || []) {
      if (host === h || host.endsWith('.' + h)) {
        return { blockType: 'host', reason: 'Built-in community blocklist', detector: 'built-in' };
      }
    }
  } catch {}
  return null;
}

const api = { detectUrl, detectText, extractTextFromDoc, scanDocument, matchBlocklist };

if (typeof window !== 'undefined') window.ESystemDetector = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
