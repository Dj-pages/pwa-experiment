// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[App] Service Worker registered! Scope:', reg.scope);
      updateSWStatus('✅ Service Worker Registered');

      // ── Listen for messages FROM service worker ──────────────────
      // This is how SW communicates back to UI!
      navigator.serviceWorker.addEventListener('message', event => {
        console.log('[App] Message from SW:', event.data);
        if (event.data.type === 'SYNC_COMPLETE') {
          // Update ALL pending messages to sent
          document.querySelectorAll('.msg-status.pending').forEach(el => {
            el.textContent = '✅ Sent';
            el.className = 'msg-status sent';
          });
          log('✅ All pending messages synced successfully!');
          updateSyncStatus('✅ Sync Complete!');
        }
      });

    } catch (err) {
      console.error('[App] SW registration failed:', err);
      updateSWStatus('❌ Registration Failed: ' + err.message);
    }
  });
}

// ── Register Background Sync ──────────────────────────────────────────────────
async function registerSync() {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-messages');
    log('🔄 Background Sync registered! Will fire when online.');
    updateSyncStatus('🔄 Sync Registered — waiting for connection...');
  } catch (err) {
    log('❌ Sync registration failed: ' + err.message);
  }
}

// ── Simulate sending a message ────────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const msg = input.value.trim();
  if (!msg) return;

  const msgId = 'msg-' + Date.now();
  addMessageToUI(msg, 'pending', msgId);
  input.value = '';

  if (navigator.onLine) {
    // Online — send immediately
    setTimeout(() => {
      updateMessageStatus(msgId, 'sent');
      log('📤 Online! Message sent immediately: ' + msg);
    }, 500);
  } else {
    // Offline — queue for sync
    log('📦 Offline! Message queued for sync: ' + msg);
    await registerSync();
  }
}

// ── Network status listeners ──────────────────────────────────────────────────
window.addEventListener('online', async () => {
  updateNetworkStatus(true);
  log('🌐 Back online! Triggering sync...');
  // Auto trigger sync when back online
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-messages');
  } catch (err) {
    console.log('Sync trigger failed:', err);
  }
});

window.addEventListener('offline', () => {
  updateNetworkStatus(false);
  log('📵 Gone offline! Messages will be queued.');
});

// ── UI Helper functions ───────────────────────────────────────────────────────
function log(message) {
  const logDiv = document.getElementById('log');
  const time = new Date().toLocaleTimeString();
  logDiv.innerHTML = `<div class="log-entry">[${time}] ${message}</div>` + logDiv.innerHTML;
}

function updateSWStatus(msg) {
  document.getElementById('swStatus').textContent = msg;
}

function updateSyncStatus(msg) {
  document.getElementById('syncStatus').textContent = msg;
}

function updateNetworkStatus(online) {
  const el = document.getElementById('networkStatus');
  el.textContent = online ? '🌐 Online' : '📵 Offline';
  el.className = online ? 'status online' : 'status offline';
}

function addMessageToUI(msg, status, id) {
  const list = document.getElementById('messageList');
  const item = document.createElement('div');
  item.className = 'message-item';
  item.id = id;
  item.innerHTML = `
    <span class="msg-text">${msg}</span>
    <span class="msg-status ${status}">${status === 'pending' ? '⏳ Pending' : '✅ Sent'}</span>
  `;
  list.prepend(item);
}

function updateMessageStatus(id, status) {
  const item = document.getElementById(id);
  if (item) {
    const statusEl = item.querySelector('.msg-status');
    statusEl.textContent = '✅ Sent';
    statusEl.className = 'msg-status sent';
  }
}

// Set initial network status
updateNetworkStatus(navigator.onLine);