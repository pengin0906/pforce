/* Notifications */

// ===========================================
// Phase 4: 通知・アラート
// ===========================================
function generateVisitReminders() {
  const visits = store.Visit_Record__c || [];
  if (!store.Notification__c) store.Notification__c = [];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

  // 既存通知IDのセット
  const existingIds = new Set(store.Notification__c.map(n => n.Related_Record_Id__c + ':' + n.Notification_Type__c));

  visits.forEach(v => {
    // 明日の訪問予定リマインダー
    if (v.Next_Visit_Date__c === tomorrowStr && !existingIds.has(v.id + ':訪問リマインダー')) {
      store.Notification__c.push({
        id: 'NTF' + Math.random().toString(36).substr(2, 9),
        Name: '訪問リマインダー: ' + resolveRef(v.Doctor__c, 'Doctor__c'),
        Message__c: `明日 ${v.Next_Visit_Date__c} に訪問予定があります。${v.Next_Action__c ? 'アクション: ' + v.Next_Action__c : ''}`,
        Notification_Type__c: '訪問リマインダー',
        Related_Record_Id__c: v.id,
        Related_Object__c: 'Visit_Record__c',
        Recipient__c: v.OwnerId || '',
        Is_Read__c: false,
        Due_Date__c: v.Next_Visit_Date__c,
        Priority__c: '中',
        CreatedDate: today
      });
    }
    // フォローアップ期限超過
    if (v.Next_Visit_Date__c && v.Next_Visit_Date__c < today && !existingIds.has(v.id + ':フォローアップ期限')) {
      store.Notification__c.push({
        id: 'NTF' + Math.random().toString(36).substr(2, 9),
        Name: 'フォローアップ期限超過: ' + resolveRef(v.Doctor__c, 'Doctor__c'),
        Message__c: `${v.Next_Visit_Date__c} のフォローアップが未実施です。ドクター: ${resolveRef(v.Doctor__c, 'Doctor__c')}`,
        Notification_Type__c: 'フォローアップ期限',
        Related_Record_Id__c: v.id,
        Related_Object__c: 'Visit_Record__c',
        Recipient__c: v.OwnerId || '',
        Is_Read__c: false,
        Due_Date__c: v.Next_Visit_Date__c,
        Priority__c: '高',
        CreatedDate: today
      });
    }
  });
}

function getUnreadNotifCount() {
  const uid = window.currentUser?.id;
  return (store.Notification__c || []).filter(n => !n.Is_Read__c && (!n.Recipient__c || n.Recipient__c === uid)).length;
}

function renderNotifBell() {
  const unread = getUnreadNotifCount();
  return `<span class="notif-bell" onclick="toggleNotifPanel()" style="cursor:pointer;position:relative;margin-right:12px;font-size:18px">
    🔔${unread > 0 ? `<span class="notif-badge">${unread}</span>` : ''}
  </span>`;
}

function toggleNotifPanel() {
  let panel = document.getElementById('notif-panel');
  if (panel) { panel.remove(); return; }

  const uid = window.currentUser?.id;
  const notifs = (store.Notification__c || [])
    .filter(n => !n.Recipient__c || n.Recipient__c === uid)
    .sort((a,b) => (b.CreatedDate||'').localeCompare(a.CreatedDate||''))
    .slice(0, 20);

  let html = `<div id="notif-panel" class="notif-panel">
    <div class="notif-header"><h4 style="margin:0">通知</h4><button class="btn btn-sm" onclick="document.getElementById('notif-panel').remove()">✕</button></div>`;

  if (notifs.length === 0) {
    html += `<div class="notif-empty">通知はありません</div>`;
  } else {
    notifs.forEach(n => {
      const cls = n.Is_Read__c ? 'notif-read' : 'notif-unread';
      const icon = n.Priority__c === '高' ? '🔴' : n.Priority__c === '中' ? '🟡' : '🔵';
      html += `<div class="notif-item ${cls}" onclick="markNotifRead('${n.id}');${n.Related_Object__c && n.Related_Record_Id__c ? `showDetail('${n.Related_Object__c}','${n.Related_Record_Id__c}')` : ''};document.getElementById('notif-panel').remove()">
        <div>${icon} <strong>${escHtml(n.Name)}</strong></div>
        <div style="font-size:12px;color:#555;margin-top:2px">${escHtml(n.Message__c||'')}</div>
        <div style="font-size:11px;color:#999;margin-top:4px">${escHtml(n.Due_Date__c||'')} | ${escHtml(n.Notification_Type__c||'')}</div>
      </div>`;
    });
  }
  html += `</div>`;

  document.getElementById('topbar').style.position = 'relative';
  document.getElementById('topbar').insertAdjacentHTML('beforeend', html);
}
