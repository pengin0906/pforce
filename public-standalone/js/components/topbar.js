/* Topbar Component */

// --- Render: Topbar ---
function renderTopbar(title, icon, actions='') {
  const tb = document.getElementById('topbar');
  const bell = typeof renderNotifBell === 'function' ? renderNotifBell() : '';
  tb.innerHTML = `<h1><span class="icon">${icon||''}</span>${title}</h1>
    <div class="user-area">${actions}${bell}<span>${window.currentUser?.displayName||'Demo User'}</span><span class="badge badge-admin">${window.currentUser?.profile||'System_Admin'}</span></div>`;
}

function markNotifRead(id) {
  const n = (store.Notification__c || []).find(x => x.id === id);
  if (n) n.Is_Read__c = true;
}
