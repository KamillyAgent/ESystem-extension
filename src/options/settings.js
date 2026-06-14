// Settings page. Lets the user enter backend URL + API key, verify, and manage pause state.
const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);
const $ = (id) => document.getElementById(id);

async function load() {
  const { config, pausedUntil, syncedAt, blocklist } = await browserAPI.storage.local.get([
    'config', 'pausedUntil', 'syncedAt', 'blocklist',
  ]);
  if (config?.backendUrl) $('backendUrl').value = config.backendUrl;
  if (config?.apiKey) $('apiKey').value = config.apiKey;

  // Pre-fill the dashboard link
  if (config?.backendUrl) {
    $('dashboardLink').href = `${config.backendUrl.replace(/\/+$/, '')}/dashboard`;
  } else {
    $('dashboardLink').href = 'https://esystem.masud.app/dashboard';
  }

  if (pausedUntil && new Date(pausedUntil) > new Date()) {
    $('pausedStatus').textContent = `Paused until ${new Date(pausedUntil).toLocaleString()}`;
  } else {
    $('pausedStatus').textContent = 'Blocking is active.';
  }

  if (syncedAt) {
    $('accLastSync').textContent = new Date(syncedAt).toLocaleString();
  } else {
    $('accLastSync').textContent = 'never';
  }

  if (blocklist) {
    const size = (blocklist.personal?.length || 0)
      + (blocklist.built_in?.domains?.length || 0)
      + (blocklist.built_in?.hosts?.length || 0);
    $('accListSize').textContent = size.toLocaleString();
  } else {
    $('accListSize').textContent = '—';
  }
}

function setStatus(text, kind) {
  const el = $('status');
  el.textContent = text;
  el.className = `status status--${kind}`;
}

$('saveBtn').addEventListener('click', async () => {
  const backendUrl = $('backendUrl').value.trim().replace(/\/+$/, '');
  const apiKey = $('apiKey').value.trim();
  if (!backendUrl.startsWith('https://')) {
    setStatus('Backend URL must start with https://', 'err');
    return;
  }
  if (!apiKey.startsWith('esk_')) {
    setStatus('API key should start with "esk_"', 'err');
    return;
  }

  $('saveBtn').disabled = true;
  $('saveBtn').textContent = 'Verifying...';
  setStatus('', 'ok');

  const res = await browserAPI.runtime.sendMessage({
    type: 'verify-config',
    config: { backendUrl, apiKey, enabled: true },
  });

  $('saveBtn').disabled = false;
  $('saveBtn').textContent = 'Save & verify';

  if (res?.ok) {
    setStatus(`Connected as ${res.account.email} (key: ${res.account.key.label})`, 'ok');
    $('accEmail').textContent = res.account.email;
    $('accKey').textContent = res.account.key.label;
    $('dashboardLink').href = `${backendUrl}/dashboard`;
    // Trigger a sync so the blocklist loads
    await browserAPI.runtime.sendMessage({ type: 'sync-now' });
    load();
  } else {
    const err = res?.error || 'unknown';
    const msg = {
      'invalid_key': 'API key not recognized. Double-check it on your dashboard.',
      'no_api_key': 'Missing API key.',
      'no_backend_url': 'Missing backend URL.',
      'fetch failed': 'Could not reach the backend. Check the URL and your network.',
    }[err] || `Verification failed: ${err}`;
    setStatus(msg, 'err');
  }
});

$('signOutBtn').addEventListener('click', async () => {
  if (!confirm('Sign out? This clears all stored config and blocklist from this device.')) return;
  await browserAPI.runtime.sendMessage({ type: 'sign-out' });
  $('backendUrl').value = '';
  $('apiKey').value = '';
  $('accEmail').textContent = '—';
  $('accKey').textContent = '—';
  $('accListSize').textContent = '—';
  $('accLastSync').textContent = 'never';
  setStatus('Signed out. All local data cleared.', 'ok');
});

$('syncNowBtn').addEventListener('click', async () => {
  $('syncNowBtn').disabled = true;
  $('syncNowBtn').textContent = 'Syncing...';
  const res = await browserAPI.runtime.sendMessage({ type: 'sync-now' });
  $('syncNowBtn').disabled = false;
  $('syncNowBtn').textContent = 'Sync now';
  if (res?.ok) {
    setStatus(`Synced at ${new Date(res.syncedAt).toLocaleString()}`, 'ok');
    load();
  } else {
    setStatus(`Sync failed: ${res?.reason || 'unknown'}`, 'err');
  }
});

document.querySelectorAll('[data-pause]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const minutes = parseInt(btn.dataset.pause, 10);
    const res = await browserAPI.runtime.sendMessage({ type: 'set-pause', minutes });
    if (res?.ok) {
      load();
    }
  });
});

load();
