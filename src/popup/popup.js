// Popup script. Runs in the popup window context.
const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);

const $ = (id) => document.getElementById(id);

async function init() {
  const { config, stats, syncedAt, pausedUntil, blocklist } = await browserAPI.storage.local.get([
    'config', 'stats', 'syncedAt', 'pausedUntil', 'blocklist',
  ]);

  const status = $('status');
  if (!config?.backendUrl || !config?.apiKey) {
    status.textContent = 'Not configured. Open Settings to connect.';
    status.className = 'status status--setup';
  } else if (pausedUntil && new Date(pausedUntil) > new Date()) {
    const until = new Date(pausedUntil);
    status.textContent = `Paused until ${until.toLocaleTimeString()}`;
    status.className = 'status status--paused';
  } else {
    const count = (blocklist?.personal?.length ?? 0) + (blocklist?.built_in?.domains?.length ?? 0) + (blocklist?.built_in?.hosts?.length ?? 0);
    status.textContent = `Active — ${count.toLocaleString()} rules loaded`;
    status.className = 'status status--active';
  }

  $('blocksToday').textContent = (stats?.blocksToday ?? 0).toLocaleString();
  $('blocksTotal').textContent = (stats?.blocksTotal ?? 0).toLocaleString();
  $('lastSync').textContent = syncedAt ? timeAgo(new Date(syncedAt)) : 'never';
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

$('syncBtn').addEventListener('click', async () => {
  const btn = $('syncBtn');
  btn.disabled = true;
  btn.textContent = 'Syncing...';
  const res = await browserAPI.runtime.sendMessage({ type: 'sync-now' });
  btn.disabled = false;
  btn.textContent = res?.ok ? '✓ Synced' : '✗ Failed';
  setTimeout(() => { btn.textContent = 'Sync now'; init(); }, 1500);
});

$('settingsBtn').addEventListener('click', () => {
  browserAPI.runtime.openOptionsPage();
});

init();
