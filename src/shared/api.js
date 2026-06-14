// API client. Always uses the configured backend URL + key from storage.
// All methods throw on transport error; non-2xx returns { error } from the backend.

const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);

async function getConfig() {
  const cfg = await browserAPI.storage.local.get('config');
  return cfg.config || { backendUrl: '', apiKey: '', enabled: true };
}

async function authHeaders() {
  const cfg = await getConfig();
  if (!cfg.apiKey) throw new Error('no_api_key');
  return { Authorization: `Bearer ${cfg.apiKey}` };
}

function buildUrl(path, base) {
  const b = (base || '').replace(/\/+$/, '');
  return `${b}${path.startsWith('/') ? path : '/' + path}`;
}

async function request(method, path, body) {
  const cfg = await getConfig();
  if (!cfg.backendUrl) throw new Error('no_backend_url');
  const url = buildUrl(path, cfg.backendUrl);

  const init = {
    method,
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(url, init);
  if (res.status === 401) throw new Error('invalid_key');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `http_${res.status}`);
  }
  return res.json();
}

export const api = {
  whoami: () => request('GET', '/api/v1/whoami'),
  sync: () => request('GET', '/api/v1/sync'),
  block: (data) => request('POST', '/api/v1/block', data),
  words: () => request('GET', '/api/v1/words'),
};

if (typeof window !== 'undefined') window.ESystemAPI = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
