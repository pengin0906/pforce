/* ============================================
   genmine CRM - UI Engine
   Metadata-driven generic renderers
   部門別ダッシュボード・MR別ビュー対応
   ============================================ */

// --- Salesforce Key Prefix Map ---
const SF_KEY_PREFIXES = {
  Account:'001',Contact:'003',Lead:'00Q',Opportunity:'006',
  Case:'500',Task:'00T',Event:'00U',Product2:'01t',Campaign:'701',
  Medical_Institution__c:'a0A',Doctor__c:'a0B',
  Pharma_Opportunity__c:'a0C',Genomic_Project__c:'a0D',
  Visit_Record__c:'a0E',Specimen__c:'a0F',
  MA_Activity__c:'a0G',Seminar__c:'a0H',
  Lab__c:'a0I',Joint_Research__c:'a0J',
  Testing_Order__c:'a0K',PMDA_Submission__c:'a0L',
  Seminar_Attendee__c:'a0M',Bento_Order__c:'a0N',
  Daily_Report__c:'a0O',Approval_Request__c:'a0P',
  Competitive_Intel__c:'a0Q',Expense_Report__c:'a0R'
};

// --- Map Edit State ---
let mapEditMode = false;
let mapInstance = null;
let mapMarkers = [];

// --- Dynamic Date Helpers ---
const _now = new Date();
const _todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
const _curMonth = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}`;
const _curMonthFirst = _curMonth + '-01';

// --- Data Store ---
const store = {};
function initStore() {
  ALL_OBJECTS.forEach(obj => {
    store[obj.apiName] = JSON.parse(JSON.stringify(SAMPLE_DATA[obj.apiName] || []));
  });
}

// --- Utility Functions ---
function fmt(v, type) {
  if (v == null || v === '') return '-';
  switch(type) {
    case 'Currency': return '¥' + Number(v).toLocaleString();
    case 'Percent': return v + '%';
    case 'Number': return Number(v).toLocaleString();
    case 'Checkbox': return v ? '✓' : '✗';
    case 'Date': return v;
    case 'DateTime': return v;
    default: return String(v);
  }
}

function resolveRef(val, refObj) {
  if (!val) return '-';
  const data = store[refObj] || [];
  const rec = data.find(r => r.id === val);
  if (!rec) return val;
  return rec.Name || rec.LastName || val;
}

function getObjDef(apiName) {
  return ALL_OBJECTS.find(o => o.apiName === apiName);
}

function getUserName(uid) {
  const u = USERS.find(u => u.id === uid);
  return u ? u.name : uid || '-';
}

function getInstitutionName(instId) {
  const inst = (store.Medical_Institution__c || []).find(i => i.id === instId);
  return inst ? inst.Name : '-';
}

// Salesforce-compatible 18-char ID generator
function genId(prefix) {
  const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const CHECKSUM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
  let random = '';
  for (let i = 0; i < 12; i++) random += BASE62[Math.floor(Math.random() * 62)];
  const id15 = (prefix || '000').substring(0, 3) + random;
  let checksum = '';
  for (let g = 0; g < 3; g++) {
    let bits = 0;
    for (let i = 0; i < 5; i++) {
      const ch = id15[g * 5 + i];
      if (ch >= 'A' && ch <= 'Z') bits |= (1 << i);
    }
    checksum += CHECKSUM_CHARS[bits];
  }
  return id15 + checksum;
}

function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// --- Render: Sidebar ---
function renderSidebar() {
  const sb = document.getElementById('sidebar');
  let html = `<div class="sidebar-brand"><h2>genmine CRM</h2><small>遺伝子パネル検査 SFA</small></div>`;

  // Dashboard Views
  html += `<div class="nav-group"><div class="nav-group-title">ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="home" onclick="navigate('home')"><span class="icon">🏠</span>ホーム（個人）</div>`;
  html += `<div class="nav-item" data-view="sales-dashboard" onclick="navigate('sales-dashboard')"><span class="icon">💼</span>営業ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="ma-dashboard" onclick="navigate('ma-dashboard')"><span class="icon">🎤</span>MA活動ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="seminar-dashboard" onclick="navigate('seminar-dashboard')"><span class="icon">📚</span>勉強会ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="testing-dashboard" onclick="navigate('testing-dashboard')"><span class="icon">🧪</span>検査ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="pmda-dashboard" onclick="navigate('pmda-dashboard')"><span class="icon">🏛️</span>PMDAダッシュボード</div>`;
  html += `<div class="nav-item" data-view="pathology-review" onclick="navigate('pathology-review')"><span class="icon">🔬</span>病理レビュー</div>`;
  html += `<div class="nav-item" data-view="exec-dashboard" onclick="navigate('exec-dashboard')"><span class="icon">📊</span>経営者ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="compliance-dashboard" onclick="navigate('compliance-dashboard')"><span class="icon">⚖️</span>コンプライアンス</div>`;
  html += `<div class="nav-item" data-view="competitive-intel" onclick="navigate('competitive-intel')"><span class="icon">🔍</span>競合情報</div>`;
  html += `</div>`;

  // 個人ダッシュボード（ダッシュボードの直下に配置）
  html += `<div class="nav-group"><div class="nav-group-title">個人ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="mr-dashboard" onclick="navigate('mr-dashboard')"><span class="icon">💼</span>MR個人ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="msl-dashboard" onclick="navigate('msl-dashboard')"><span class="icon">🎤</span>MA個人ダッシュボード</div>`;
  html += `</div>`;

  // Workflow
  html += `<div class="nav-group"><div class="nav-group-title">ワークフロー</div>`;
  html += `<div class="nav-item" data-view="daily-report" onclick="navigate('daily-report')"><span class="icon">📝</span>日報</div>`;
  html += `<div class="nav-item" data-view="approval-queue" onclick="navigate('approval-queue')"><span class="icon">✅</span>承認キュー</div>`;
  html += `<div class="nav-item" data-view="expense-report" onclick="navigate('expense-report')"><span class="icon">💴</span>経費精算</div>`;
  html += `<div class="nav-item" data-view="doctor-assign" onclick="navigate('doctor-assign')"><span class="icon">🔄</span>担当割当・引き継ぎ</div>`;
  html += `<div class="nav-item" data-view="workflow" onclick="navigate('workflow')"><span class="icon">⚙️</span>ワークフロー管理</div>`;
  html += `</div>`;

  // Tools
  html += `<div class="nav-group"><div class="nav-group-title">ツール</div>`;
  html += `<div class="nav-item" data-view="schedule" onclick="navigate('schedule')"><span class="icon">📅</span>スケジュール帳</div>`;
  html += `<div class="nav-item" data-view="calendar" onclick="navigate('calendar')"><span class="icon">🗓️</span>月間カレンダー</div>`;
  html += `<div class="nav-item" data-view="pipeline" onclick="navigate('pipeline')"><span class="icon">📈</span>パイプライン</div>`;
  html += `<div class="nav-item" data-view="map-view" onclick="navigate('map-view')"><span class="icon">🗺️</span>マップ</div>`;
  html += `<div class="nav-item" data-view="doctor-360" onclick="navigate('doctor-360')"><span class="icon">👨‍⚕️</span>Doctor 360°</div>`;
  html += `<div class="nav-item" data-view="kol-map" onclick="navigate('kol-map')"><span class="icon">🌟</span>KOLマップ</div>`;
  html += `<div class="nav-item" data-view="territory" onclick="navigate('territory')"><span class="icon">🗾</span>テリトリー分析</div>`;
  html += `<div class="nav-item" data-view="specimen-tracker" onclick="navigate('specimen-tracker')"><span class="icon">📦</span>検体トラッカー</div>`;
  html += `<div class="nav-item" data-view="visit-target" onclick="navigate('visit-target')"><span class="icon">🎯</span>巡回目標管理</div>`;
  html += `<div class="nav-item" data-view="seminar-attendees" onclick="navigate('seminar-attendees')"><span class="icon">👥</span>セミナー参加者管理</div>`;
  html += `<div class="nav-item" data-view="visit-map" onclick="navigate('visit-map')"><span class="icon">📍</span>訪問マップ</div>`;
  html += `<div class="nav-item" data-view="visit-calendar" onclick="navigate('visit-calendar')"><span class="icon">🗓️</span>訪問カレンダー</div>`;
  html += `</div>`;

  // Objects
  html += `<div class="nav-group"><div class="nav-group-title">オブジェクト</div>`;
  CUSTOM_OBJECTS.forEach(obj => {
    const cnt = (store[obj.apiName]||[]).length;
    html += `<div class="nav-item" data-view="obj:${obj.apiName}" onclick="navigate('obj','${obj.apiName}')"><span class="icon">${obj.icon}</span>${obj.label}<span class="count">${cnt}</span></div>`;
  });
  html += `</div>`;

  // Standard Objects (collapsed)
  html += `<div class="nav-group"><div class="nav-group-title">標準オブジェクト</div>`;
  SF_STANDARD_OBJECTS.forEach(obj => {
    const cnt = (store[obj.apiName]||[]).length;
    html += `<div class="nav-item" data-view="obj:${obj.apiName}" onclick="navigate('obj','${obj.apiName}')"><span class="icon">${obj.icon}</span>${obj.label}<span class="count">${cnt}</span></div>`;
  });
  html += `</div>`;

  // Reports
  html += `<div class="nav-group"><div class="nav-group-title">レポート</div>`;
  html += `<div class="nav-item" data-view="report-testing" onclick="navigate('report-testing')"><span class="icon">📊</span>月次検査出件レポート</div>`;
  html += `<div class="nav-item" data-view="report-sales" onclick="navigate('report-sales')"><span class="icon">📈</span>営業成績レポート</div>`;
  html += `<div class="nav-item" data-view="visit-report" onclick="navigate('visit-report')"><span class="icon">📋</span>訪問レポート</div>`;
  html += `</div>`;

  sb.innerHTML = html;
}

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

// ===========================================
// HOME - 個人ダッシュボード (MR/MA別)
// ===========================================
function renderHome() {
  const uid = window.currentUser?.id || 'U002';
  const user = USERS.find(u => u.id === uid) || USERS[1];
  renderTopbar(`${user.name} のダッシュボード`, '🏠');

  const myDoctors = (store.Doctor__c||[]).filter(d => d.OwnerId === uid);
  const myVisits = (store.Visit_Record__c||[]).filter(v => v.OwnerId === uid);
  const myPharma = (store.Pharma_Opportunity__c||[]).filter(p => p.OwnerId === uid);
  const myTasks = (store.Task||[]).filter(t => t.OwnerId === uid);
  const myEvents = (store.Event||[]).filter(e => e.OwnerId === uid);
  const activePipeline = myPharma.filter(p => !['受注','失注'].includes(p.Phase__c)).reduce((s,p) => s+(p.Amount__c||0),0);
  const kols = myDoctors.filter(d => d.KOL_Score__c >= 80);

  let html = `<div class="kpi-row cols-4">
    <div class="kpi-card blue"><div class="kpi-val">${myDoctors.length}</div><div class="kpi-label">担当ドクター</div></div>
    <div class="kpi-card green"><div class="kpi-val">${kols.length}</div><div class="kpi-label">KOL数</div></div>
    <div class="kpi-card purple"><div class="kpi-val">¥${(activePipeline/1000000).toFixed(0)}M</div><div class="kpi-label">パイプライン</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${myVisits.filter(v=>v.Visit_Date__c>=_curMonthFirst).length}</div><div class="kpi-label">今月訪問</div></div>
  </div>`;

  // 担当ドクター一覧（所属病院名付き）
  html += `<div class="card"><div class="card-header"><h3>👨‍⚕️ 担当ドクター</h3></div><table><thead><tr><th>氏名</th><th>所属病院</th><th>診療科</th><th>関係構築度</th><th>最終訪問</th><th>KOLスコア</th></tr></thead><tbody>`;
  myDoctors.forEach(d => {
    const inst = getInstitutionName(d.Institution__c);
    const cls = getObjDef('Doctor__c').statusMap[d.Relationship_Level__c] || 's-gray';
    html += `<tr onclick="showDetail('Doctor__c','${d.id}')">
      <td><span class="cell-link">${d.Name}</span><div class="sub-text">🏥 ${inst}</div></td>
      <td>${inst}</td><td>${d.Department__c||'-'}</td>
      <td><span class="status ${cls}">${d.Relationship_Level__c}</span></td>
      <td>${d.Last_Visit_Date__c||'-'}</td><td>${d.KOL_Score__c||0}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // パイプライン
  if (myPharma.length) {
    html += `<div class="card"><div class="card-header"><h3>💊 製薬商談パイプライン</h3></div><table><thead><tr><th>商談名</th><th>製薬企業</th><th>フェーズ</th><th>金額</th><th>クローズ予定</th></tr></thead><tbody>`;
    myPharma.forEach(p => {
      const cls = getObjDef('Pharma_Opportunity__c').statusMap[p.Phase__c] || 's-gray';
      html += `<tr onclick="showDetail('Pharma_Opportunity__c','${p.id}')"><td><span class="cell-link">${p.Name}</span></td><td>${p.Pharma_Company__c}</td><td><span class="status ${cls}">${p.Phase__c}</span></td><td>${fmt(p.Amount__c,'Currency')}</td><td>${p.Close_Date__c||'-'}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // ToDo & スケジュール
  html += `<div class="chart-grid">`;
  html += `<div class="card"><div class="card-header"><h3>✅ ToDo</h3></div><ul class="timeline">`;
  myTasks.filter(t=>t.Status!=='完了').forEach(t => {
    html += `<li><div class="tl-time">${t.ActivityDate||'-'} <span class="status ${t.Priority==='高'?'s-red':'s-blue'}">${t.Priority}</span></div><div class="tl-text">${t.Subject}</div></li>`;
  });
  html += `</ul></div>`;
  html += `<div class="card"><div class="card-header"><h3>📅 今後の予定</h3></div><ul class="timeline">`;
  myEvents.sort((a,b)=>(a.StartDateTime||'').localeCompare(b.StartDateTime||'')).forEach(e => {
    html += `<li><div class="tl-time">${e.StartDateTime||'-'}</div><div class="tl-text">${e.Subject} @ ${e.Location||'-'}</div></li>`;
  });
  html += `</ul></div></div>`;

  document.getElementById('content').innerHTML = html;
}

// ===========================================
// 営業ダッシュボード
// ===========================================
function renderSalesDashboard() {
  renderTopbar('営業ダッシュボード', '💼');
  const salesUsers = USERS.filter(u => u.team === 'Sales');
  const pharma = store.Pharma_Opportunity__c || [];
  const doctors = store.Doctor__c || [];
  const visits = store.Visit_Record__c || [];

  const totalPipeline = pharma.filter(p=>!['受注','失注'].includes(p.Phase__c)).reduce((s,p)=>s+(p.Amount__c||0),0);
  const wonAmount = pharma.filter(p=>p.Phase__c==='受注').reduce((s,p)=>s+(p.Amount__c||0),0);

  let html = `<div class="kpi-row cols-4">
    <div class="kpi-card blue"><div class="kpi-val">¥${(totalPipeline/100000000).toFixed(1)}億</div><div class="kpi-label">パイプライン合計</div></div>
    <div class="kpi-card green"><div class="kpi-val">¥${(wonAmount/100000000).toFixed(1)}億</div><div class="kpi-label">受注済</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${doctors.length}</div><div class="kpi-label">管理ドクター数</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${visits.filter(v=>v.Visit_Date__c>=_curMonthFirst).length}</div><div class="kpi-label">今月チーム訪問</div></div>
  </div>`;

  // Charts
  html += `<div class="chart-grid">
    <div class="chart-card"><h4>製薬商談パイプライン（フェーズ別金額）</h4><canvas id="sales-pipe"></canvas></div>
    <div class="chart-card"><h4>ドクター関係構築度</h4><canvas id="sales-rel"></canvas></div>
  </div>`;

  // MR別実績
  html += `<div class="card"><div class="card-header"><h3>MR別実績</h3></div><table><thead><tr><th>担当者</th><th>役割</th><th>パイプライン</th><th>受注額</th><th>担当ドクター</th><th>今月訪問</th></tr></thead><tbody>`;
  salesUsers.forEach(u => {
    const myPipe = pharma.filter(p=>p.OwnerId===u.id&&!['受注','失注'].includes(p.Phase__c)).reduce((s,p)=>s+(p.Amount__c||0),0);
    const myWon = pharma.filter(p=>p.OwnerId===u.id&&p.Phase__c==='受注').reduce((s,p)=>s+(p.Amount__c||0),0);
    const myDocs = doctors.filter(d=>d.OwnerId===u.id).length;
    const myVisits = visits.filter(v=>v.OwnerId===u.id&&v.Visit_Date__c>=_curMonthFirst).length;
    html += `<tr><td>${u.photo} ${u.name}</td><td>${u.role}</td><td>¥${(myPipe/1000000).toFixed(0)}M</td><td>¥${(myWon/1000000).toFixed(0)}M</td><td>${myDocs}</td><td>${myVisits}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // ファネル
  const phases = ['リード','ヒアリング','提案','セキュリティ審査','契約交渉','受注','失注'];
  const maxAmt = Math.max(...phases.map(p=>pharma.filter(x=>x.Phase__c===p).reduce((s,x)=>s+(x.Amount__c||0),0)),1);
  html += `<div class="card"><div class="card-header"><h3>セールスファネル</h3></div>`;
  phases.forEach(p => {
    const amt = pharma.filter(x=>x.Phase__c===p).reduce((s,x)=>s+(x.Amount__c||0),0);
    const cnt = pharma.filter(x=>x.Phase__c===p).length;
    const w = Math.max(amt/maxAmt*100,10);
    html += `<div class="funnel-row"><div class="funnel-label">${p}</div><div class="funnel-bar" style="width:${w}%">${cnt}件</div><div class="funnel-val">¥${(amt/1000000).toFixed(0)}M</div></div>`;
  });
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(() => {
    const colors = ['#90a4ae','#42a5f5','#ffa726','#ab47bc','#26a69a','#66bb6a','#ef5350'];
    new Chart(document.getElementById('sales-pipe'),{
      type:'bar',data:{labels:phases,datasets:[{label:'金額',data:phases.map(p=>pharma.filter(x=>x.Phase__c===p).reduce((s,x)=>s+(x.Amount__c||0),0)),backgroundColor:colors}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'¥'+(v/1000000)+'M'}}}}
    });
    const levels = ['未接触','初回面談済','関心あり','検討中','推進者','ファン（KOL）'];
    new Chart(document.getElementById('sales-rel'),{
      type:'doughnut',data:{labels:levels,datasets:[{data:levels.map(l=>doctors.filter(d=>d.Relationship_Level__c===l).length),backgroundColor:['#bdbdbd','#42a5f5','#ffa726','#ab47bc','#26a69a','#66bb6a']}]},
      options:{responsive:true,plugins:{legend:{position:'right'}}}
    });
  },100);
}

// ===========================================
// MA活動ダッシュボード
// ===========================================
function renderMADashboard() {
  renderTopbar('MA活動ダッシュボード', '🎤');
  const acts = store.MA_Activity__c||[];
  const seminars = store.Seminar__c||[];
  const maUsers = USERS.filter(u=>u.team==='MA');

  let html = `<div class="kpi-row cols-4">
    <div class="kpi-card blue"><div class="kpi-val">${acts.length}</div><div class="kpi-label">MA活動総数</div></div>
    <div class="kpi-card green"><div class="kpi-val">${seminars.length}</div><div class="kpi-label">勉強会総数</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${acts.filter(a=>a.Status__c==='報告完了'||a.Status__c==='実施済').length}</div><div class="kpi-label">完了済活動</div></div>
    <div class="kpi-card orange"><div class="kpi-val">¥${([...acts,...seminars].reduce((s,x)=>s+(x.Budget__c||0),0)/10000).toFixed(0)}万</div><div class="kpi-label">活動予算計</div></div>
  </div>`;

  html += `<div class="chart-grid">
    <div class="chart-card"><h4>活動種別内訳</h4><canvas id="ma-types"></canvas></div>
    <div class="chart-card"><h4>活動ステータス</h4><canvas id="ma-status"></canvas></div>
  </div>`;

  // MSL別実績
  html += `<div class="card"><div class="card-header"><h3>MSL別活動</h3></div><table><thead><tr><th>担当者</th><th>MA活動数</th><th>勉強会数</th><th>予算</th></tr></thead><tbody>`;
  maUsers.forEach(u => {
    const myActs = acts.filter(a=>a.OwnerId===u.id).length;
    const mySems = seminars.filter(s=>s.OwnerId===u.id).length;
    const myBudget = [...acts.filter(a=>a.OwnerId===u.id),...seminars.filter(s=>s.OwnerId===u.id)].reduce((s,x)=>s+(x.Budget__c||0),0);
    html += `<tr><td>${u.photo} ${u.name}</td><td>${myActs}</td><td>${mySems}</td><td>¥${(myBudget/10000).toFixed(0)}万</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 直近活動一覧
  html += `<div class="card"><div class="card-header"><h3>直近のMA活動</h3></div><table><thead><tr><th>活動名</th><th>種別</th><th>ドクター</th><th>実施日</th><th>ステータス</th></tr></thead><tbody>`;
  acts.sort((a,b)=>(b.Date__c||'').localeCompare(a.Date__c||'')).forEach(a => {
    const cls = getObjDef('MA_Activity__c').statusMap[a.Status__c]||'s-gray';
    html += `<tr onclick="showDetail('MA_Activity__c','${a.id}')"><td><span class="cell-link">${a.Name}</span></td><td>${a.Activity_Type__c||'-'}</td><td>${resolveRef(a.Doctor__c,'Doctor__c')}</td><td>${a.Date__c||'-'}</td><td><span class="status ${cls}">${a.Status__c}</span></td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(() => {
    const types = ['学術講演','アドバイザリーボード','文献レビュー','KOL面談','学会ブース','メディカルライティング','トレーニング'];
    new Chart(document.getElementById('ma-types'),{type:'doughnut',data:{labels:types,datasets:[{data:types.map(t=>acts.filter(a=>a.Activity_Type__c===t).length),backgroundColor:['#42a5f5','#66bb6a','#ffa726','#ab47bc','#26a69a','#ef5350','#78909c']}]},options:{responsive:true,plugins:{legend:{position:'right'}}}});
    const statuses = ['計画中','準備中','実施済','報告完了','中止'];
    new Chart(document.getElementById('ma-status'),{type:'bar',data:{labels:statuses,datasets:[{data:statuses.map(s=>acts.filter(a=>a.Status__c===s).length),backgroundColor:['#bdbdbd','#42a5f5','#66bb6a','#26a69a','#ef5350']}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  },100);
}

// ===========================================
// 勉強会ダッシュボード
// ===========================================
function renderSeminarDashboard() {
  renderTopbar('勉強会ダッシュボード', '📚');
  const seminars = store.Seminar__c||[];
  const attendees = store.Seminar_Attendee__c||[];
  const bentos = store.Bento_Order__c||[];

  const totalAttendees = seminars.reduce((s,sem)=>s+(sem.Attendees__c||0),0);
  const avgSatisfaction = seminars.filter(s=>s.Satisfaction__c).length?Math.round(seminars.filter(s=>s.Satisfaction__c).reduce((s,x)=>s+x.Satisfaction__c,0)/seminars.filter(s=>s.Satisfaction__c).length):0;
  const totalBentoCost = bentos.reduce((s,b)=>s+(b.Total__c||0),0);

  let html = `<div class="kpi-row cols-4">
    <div class="kpi-card blue"><div class="kpi-val">${seminars.length}</div><div class="kpi-label">勉強会総数</div></div>
    <div class="kpi-card green"><div class="kpi-val">${totalAttendees}</div><div class="kpi-label">延べ参加者数</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${avgSatisfaction}%</div><div class="kpi-label">平均満足度</div></div>
    <div class="kpi-card orange"><div class="kpi-val">¥${(totalBentoCost).toLocaleString()}</div><div class="kpi-label">弁当手配費用</div></div>
  </div>`;

  // Charts
  html += `<div class="chart-grid">
    <div class="chart-card"><h4>勉強会ステータス</h4><canvas id="sem-status"></canvas></div>
    <div class="chart-card"><h4>形式別内訳</h4><canvas id="sem-format"></canvas></div>
  </div>`;

  // 勉強会一覧
  html += `<div class="card"><div class="card-header"><h3>勉強会一覧</h3><button class="btn btn-sm btn-primary" onclick="renderSeminarAttendees()">👥 参加者管理</button></div><table><thead><tr><th>勉強会名</th><th>形式</th><th>講師</th><th>開催日</th><th>会場</th><th>ステータス</th><th>参加者</th></tr></thead><tbody>`;
  seminars.sort((a,b)=>(a.Date__c||'').localeCompare(b.Date__c||'')).forEach(s => {
    const cls = getObjDef('Seminar__c').statusMap[s.Status__c]||'s-gray';
    const speaker = resolveRef(s.Speaker__c,'Doctor__c');
    html += `<tr onclick="showDetail('Seminar__c','${s.id}')"><td><span class="cell-link">${s.Name}</span></td><td>${s.Format__c||'-'}</td><td>${speaker}</td><td>${s.Date__c||'-'}</td><td>${s.Venue__c||'-'}</td><td><span class="status ${cls}">${s.Status__c}</span></td><td>${s.Attendees__c||0}/${s.Capacity__c||0}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 弁当手配状況
  html += `<div class="card"><div class="card-header"><h3>🍱 弁当手配状況</h3></div><table><thead><tr><th>手配名</th><th>関連セミナー</th><th>業者</th><th>数量</th><th>合計</th><th>ステータス</th><th>配達日</th></tr></thead><tbody>`;
  bentos.forEach(b => {
    const cls = getObjDef('Bento_Order__c').statusMap[b.Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Bento_Order__c','${b.id}')"><td><span class="cell-link">${b.Name}</span></td><td>${resolveRef(b.Seminar__c,'Seminar__c')}</td><td>${b.Vendor__c||'-'}</td><td>${b.Quantity__c||0}</td><td>${fmt(b.Total__c,'Currency')}</td><td><span class="status ${cls}">${b.Status__c}</span></td><td>${b.Delivery_Date__c||'-'}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(() => {
    const statuses = ['企画中','講師調整中','集客中','準備完了','開催済','フォロー中','完了'];
    new Chart(document.getElementById('sem-status'),{type:'bar',data:{labels:statuses,datasets:[{data:statuses.map(s=>seminars.filter(x=>x.Status__c===s).length),backgroundColor:['#bdbdbd','#42a5f5','#ffa726','#26a69a','#66bb6a','#ab47bc','#66bb6a']}]},options:{responsive:true,plugins:{legend:{display:false}}}});
    const formats = ['院内勉強会','Web講演会','地域セミナー','学術講演会','ハンズオン','ランチョンセミナー','ハイブリッド'];
    new Chart(document.getElementById('sem-format'),{type:'doughnut',data:{labels:formats,datasets:[{data:formats.map(f=>seminars.filter(x=>x.Format__c===f).length),backgroundColor:['#42a5f5','#66bb6a','#ffa726','#ab47bc','#26a69a','#ef5350','#78909c']}]},options:{responsive:true,plugins:{legend:{position:'right'}}}});
  },100);
}

// ===========================================
// 検査ダッシュボード
// ===========================================
function renderTestingDashboard() {
  renderTopbar('検査ダッシュボード', '🧪');
  const orders = store.Testing_Order__c||[];
  const specimens = store.Specimen__c||[];
  const monthly = typeof MONTHLY_TESTING_DATA !== 'undefined' ? MONTHLY_TESTING_DATA : [];

  const activeOrders = orders.filter(o=>!['完了','キャンセル'].includes(o.Status__c)).length;
  const completedOrders = orders.filter(o=>o.Status__c==='完了').length;
  const avgTAT = orders.filter(o=>o.TAT_Days__c).length ? Math.round(orders.filter(o=>o.TAT_Days__c).reduce((s,o)=>s+o.TAT_Days__c,0)/orders.filter(o=>o.TAT_Days__c).length*10)/10 : 0;
  const usReviewing = orders.filter(o=>o.US_Review_Status__c==='US審査中').length;

  let html = `<div class="kpi-row cols-4">
    <div class="kpi-card blue"><div class="kpi-val">${activeOrders}</div><div class="kpi-label">進行中オーダー</div></div>
    <div class="kpi-card green"><div class="kpi-val">${completedOrders}</div><div class="kpi-label">完了済</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${avgTAT}日</div><div class="kpi-label">平均TAT</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${usReviewing}</div><div class="kpi-label">US審査中</div></div>
  </div>`;

  // Charts
  html += `<div class="chart-grid">
    <div class="chart-card"><h4>月次検査出件数推移</h4><canvas id="test-monthly"></canvas></div>
    <div class="chart-card"><h4>検体ステータス</h4><canvas id="test-specimen"></canvas></div>
  </div>`;
  html += `<div class="chart-grid">
    <div class="chart-card"><h4>施設別出件数</h4><canvas id="test-inst"></canvas></div>
    <div class="chart-card"><h4>がん種別内訳</h4><canvas id="test-cancer"></canvas></div>
  </div>`;

  // レビュー状況
  html += `<div class="card"><div class="card-header"><h3>レビュー状況</h3></div><div class="kpi-row cols-4">
    <div class="kpi-card"><div class="kpi-val">${specimens.filter(s=>s.Review_Status__c==='未レビュー').length}</div><div class="kpi-label">未レビュー</div></div>
    <div class="kpi-card"><div class="kpi-val">${specimens.filter(s=>s.Review_Status__c==='東大レビュー中').length}</div><div class="kpi-label">東大レビュー中</div></div>
    <div class="kpi-card"><div class="kpi-val">${specimens.filter(s=>s.Review_Status__c==='USレビュー中').length}</div><div class="kpi-label">USレビュー中</div></div>
    <div class="kpi-card"><div class="kpi-val">${specimens.filter(s=>s.Review_Status__c==='レビュー完了').length}</div><div class="kpi-label">レビュー完了</div></div>
  </div></div>`;

  // 検査オーダー一覧
  html += `<div class="card"><div class="card-header"><h3>検査オーダー一覧</h3></div><table><thead><tr><th>番号</th><th>依頼医</th><th>施設</th><th>依頼日</th><th>ステータス</th><th>USレビュー</th><th>TAT</th></tr></thead><tbody>`;
  orders.sort((a,b)=>(b.Order_Date__c||'').localeCompare(a.Order_Date__c||'')).forEach(o => {
    const cls = getObjDef('Testing_Order__c').statusMap[o.Status__c]||'s-gray';
    const usCls = {未送信:'s-gray',US審査中:'s-orange',US承認:'s-green',US差戻し:'s-red'}[o.US_Review_Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Testing_Order__c','${o.id}')"><td><span class="cell-link">${o.Name}</span></td><td>${resolveRef(o.Doctor__c,'Doctor__c')}</td><td>${resolveRef(o.Institution__c,'Medical_Institution__c')}</td><td>${o.Order_Date__c||'-'}</td><td><span class="status ${cls}">${o.Status__c}</span></td><td><span class="status ${usCls}">${o.US_Review_Status__c||'-'}</span></td><td>${o.TAT_Days__c||0}日</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(() => {
    // Monthly testing volume
    if (monthly.length) {
      new Chart(document.getElementById('test-monthly'),{
        type:'line',data:{labels:monthly.map(m=>m.month.replace(/^\d{4}-/,'')),datasets:[
          {label:'出件数',data:monthly.map(m=>m.orders),borderColor:'#0176d3',backgroundColor:'rgba(1,118,211,.1)',fill:true,tension:.3},
          {label:'完了数',data:monthly.map(m=>m.completed),borderColor:'#66bb6a',backgroundColor:'rgba(102,187,106,.1)',fill:true,tension:.3}
        ]},options:{responsive:true,plugins:{legend:{position:'top'}}}
      });
    }
    // Specimen status
    const specStatuses = ['受領待ち','受領済','QC中','解析中','レポート作成','レビュー中','完了','不適格'];
    new Chart(document.getElementById('test-specimen'),{type:'doughnut',data:{labels:specStatuses,datasets:[{data:specStatuses.map(s=>specimens.filter(x=>x.Status__c===s).length),backgroundColor:['#bdbdbd','#42a5f5','#ffa726','#ab47bc','#26a69a','#ffee58','#66bb6a','#ef5350']}]},options:{responsive:true,plugins:{legend:{position:'right'}}}});
    // By institution
    const insts = store.Medical_Institution__c||[];
    new Chart(document.getElementById('test-inst'),{type:'bar',data:{labels:insts.map(i=>i.Name.substring(0,8)),datasets:[{data:insts.map(i=>orders.filter(o=>o.Institution__c===i.id).length),backgroundColor:'#42a5f5'}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}}}});
    // By cancer type
    const cancers = ['肺がん','乳がん','大腸がん','胃がん','膵臓がん','血液がん','希少がん','小児がん'];
    new Chart(document.getElementById('test-cancer'),{type:'doughnut',data:{labels:cancers,datasets:[{data:cancers.map(c=>specimens.filter(s=>s.Cancer_Type__c===c).length),backgroundColor:['#42a5f5','#f06292','#66bb6a','#ffa726','#ab47bc','#ef5350','#26a69a','#78909c']}]},options:{responsive:true,plugins:{legend:{position:'right'}}}});
  },100);
}

// ===========================================
// PMDAダッシュボード
// ===========================================
function renderPMDADashboard() {
  renderTopbar('PMDAダッシュボード', '🏛️');
  const subs = store.PMDA_Submission__c||[];
  const active = subs.filter(s=>!['承認済','不承認'].includes(s.Status__c));
  const totalInquiries = subs.reduce((s,x)=>s+(x.Inquiry_Count__c||0),0);
  const resolvedInquiries = subs.reduce((s,x)=>s+(x.Inquiry_Resolved__c||0),0);

  let html = `<div class="kpi-row cols-4">
    <div class="kpi-card blue"><div class="kpi-val">${subs.length}</div><div class="kpi-label">申請総数</div></div>
    <div class="kpi-card green"><div class="kpi-val">${subs.filter(s=>s.Status__c==='承認済').length}</div><div class="kpi-label">承認済</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${active.length}</div><div class="kpi-label">審査中/対応中</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${resolvedInquiries}/${totalInquiries}</div><div class="kpi-label">照会回答状況</div></div>
  </div>`;

  // ステータスパイプライン
  const statuses = ['準備中','申請済','審査中','照会対応中','承認済','不承認'];
  html += `<div class="card"><div class="card-header"><h3>申請ステータスパイプライン</h3></div>`;
  statuses.forEach(s => {
    const cnt = subs.filter(x=>x.Status__c===s).length;
    const cls = getObjDef('PMDA_Submission__c').statusMap[s]||'s-gray';
    html += `<div class="funnel-row"><div class="funnel-label">${s}</div><div class="funnel-bar" style="width:${Math.max(cnt/Math.max(subs.length,1)*100,15)}%;background:var(--pipe-color,#0176d3)">${cnt}件</div></div>`;
  });
  html += `</div>`;

  // 照会対応状況
  html += `<div class="chart-grid"><div class="chart-card"><h4>照会事項 対応状況</h4><canvas id="pmda-inquiry"></canvas></div>`;

  // 承認予定カウントダウン
  html += `<div class="card"><div class="card-header"><h3>承認予定日カウントダウン</h3></div>`;
  active.forEach(s => {
    if (s.Expected_Approval__c) {
      const days = Math.ceil((new Date(s.Expected_Approval__c) - new Date(_todayStr)) / 86400000);
      const color = days < 30 ? '#ef5350' : days < 90 ? '#ffa726' : '#66bb6a';
      html += `<div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid #eee">
        <div style="font-size:28px;font-weight:700;color:${color};min-width:80px;text-align:center">${days}日</div>
        <div><div style="font-weight:600">${s.Name}</div><div style="font-size:12px;color:#888">承認予定: ${s.Expected_Approval__c}</div></div>
      </div>`;
    }
  });
  html += `</div></div>`;

  // 申請一覧
  html += `<div class="card"><div class="card-header"><h3>PMDA申請一覧</h3></div><table><thead><tr><th>申請名</th><th>種別</th><th>ステータス</th><th>申請日</th><th>承認予定</th><th>照会</th></tr></thead><tbody>`;
  subs.forEach(s => {
    const cls = getObjDef('PMDA_Submission__c').statusMap[s.Status__c]||'s-gray';
    html += `<tr onclick="showDetail('PMDA_Submission__c','${s.id}')"><td><span class="cell-link">${s.Name}</span></td><td>${s.Submission_Type__c||'-'}</td><td><span class="status ${cls}">${s.Status__c}</span></td><td>${s.Submission_Date__c||'-'}</td><td>${s.Expected_Approval__c||'-'}</td><td>${s.Inquiry_Resolved__c||0}/${s.Inquiry_Count__c||0}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(() => {
    new Chart(document.getElementById('pmda-inquiry'),{type:'doughnut',data:{labels:['回答済','未回答'],datasets:[{data:[resolvedInquiries,totalInquiries-resolvedInquiries],backgroundColor:['#66bb6a','#ef5350']}]},options:{responsive:true,plugins:{legend:{position:'right'}}}});
  },100);
}

// ===========================================
// 病理レビュー画面
// ===========================================
function renderPathologyReview() {
  renderTopbar('病理レビュー', '🔬');
  const orders = store.Testing_Order__c||[];
  const specimens = store.Specimen__c||[];

  // レビュー待ちキュー
  const reviewQueue = orders.filter(o=>o.Status__c==='レビュー中');
  const utReview = specimens.filter(s=>s.Review_Status__c==='東大レビュー中');
  const usReview = specimens.filter(s=>s.Review_Status__c==='USレビュー中');
  const unreviewed = specimens.filter(s=>s.Review_Status__c==='未レビュー'&&['解析中','レポート作成','レビュー中'].includes(s.Status__c));

  let html = `<div class="kpi-row cols-4">
    <div class="kpi-card blue"><div class="kpi-val">${reviewQueue.length}</div><div class="kpi-label">レビュー待ち</div></div>
    <div class="kpi-card green"><div class="kpi-val">${utReview.length}</div><div class="kpi-label">東大レビュー中</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${usReview.length}</div><div class="kpi-label">US Tempusレビュー中</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${unreviewed.length}</div><div class="kpi-label">未レビュー(要対応)</div></div>
  </div>`;

  // 東大チーム（油谷先生）レビューキュー
  html += `<div class="card"><div class="card-header"><h3>👨‍🏫 東大チーム（油谷先生）レビューキュー</h3></div><table><thead><tr><th>検体ID</th><th>患者ID</th><th>施設</th><th>がん種</th><th>レビュー状況</th><th>TAT</th></tr></thead><tbody>`;
  [...utReview,...unreviewed].forEach(s => {
    const cls = {未レビュー:'s-gray',東大レビュー中:'s-blue',USレビュー中:'s-orange',レビュー完了:'s-green'}[s.Review_Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Specimen__c','${s.id}')"><td><span class="cell-link">${s.Name}</span></td><td>${s.Patient_ID__c||'-'}</td><td>${resolveRef(s.Institution__c,'Medical_Institution__c')}</td><td>${s.Cancer_Type__c||'-'}</td><td><span class="status ${cls}">${s.Review_Status__c}</span></td><td>${s.TAT_Days__c||0}日</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // US Tempus レビューキュー
  html += `<div class="card"><div class="card-header"><h3>🌐 US Tempus レビューキュー</h3></div><table><thead><tr><th>オーダー番号</th><th>検体</th><th>施設</th><th>USレビュー</th><th>TAT</th></tr></thead><tbody>`;
  orders.filter(o=>o.US_Review_Status__c==='US審査中'||o.US_Review_Status__c==='US差戻し').forEach(o => {
    const usCls = {US審査中:'s-orange',US差戻し:'s-red'}[o.US_Review_Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Testing_Order__c','${o.id}')"><td><span class="cell-link">${o.Name}</span></td><td>${resolveRef(o.Specimen__c,'Specimen__c')}</td><td>${resolveRef(o.Institution__c,'Medical_Institution__c')}</td><td><span class="status ${usCls}">${o.US_Review_Status__c}</span></td><td>${o.TAT_Days__c||0}日</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
}

// ===========================================
// 経営者ダッシュボード
// ===========================================
function renderExecDashboard() {
  renderTopbar('経営者ダッシュボード', '📊');
  const pharma = store.Pharma_Opportunity__c||[];
  const orders = store.Testing_Order__c||[];
  const specimens = store.Specimen__c||[];
  const insts = store.Medical_Institution__c||[];
  const labs = store.Lab__c||[];
  const monthly = typeof MONTHLY_TESTING_DATA !== 'undefined' ? MONTHLY_TESTING_DATA : [];

  const totalPipeline = pharma.filter(p=>!['受注','失注'].includes(p.Phase__c)).reduce((s,p)=>s+(p.Amount__c||0),0);
  const wonRevenue = pharma.filter(p=>p.Phase__c==='受注').reduce((s,p)=>s+(p.Amount__c||0),0);
  const activeInst = insts.filter(i=>i.Adapter_Status__c==='導入完了').length;
  const avgUtil = labs.length?Math.round(labs.reduce((s,l)=>s+(l.Utilization_Rate__c||0),0)/labs.length):0;

  let html = `<div class="kpi-row cols-4">
    <div class="kpi-card blue"><div class="kpi-val">¥${(totalPipeline/100000000).toFixed(1)}億</div><div class="kpi-label">パイプライン</div></div>
    <div class="kpi-card green"><div class="kpi-val">¥${(wonRevenue/100000000).toFixed(1)}億</div><div class="kpi-label">受注済売上</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${activeInst}/${insts.length}</div><div class="kpi-label">導入完了施設</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${avgUtil}%</div><div class="kpi-label">ラボ平均稼働率</div></div>
  </div>`;

  html += `<div class="chart-grid">
    <div class="chart-card"><h4>月次検査出件数推移</h4><canvas id="exec-testing"></canvas></div>
    <div class="chart-card"><h4>サービス別パイプライン</h4><canvas id="exec-service"></canvas></div>
  </div>`;

  // チーム別サマリー
  html += `<div class="card"><div class="card-header"><h3>チーム別業績サマリー</h3></div><table><thead><tr><th>担当者</th><th>役割</th><th>パイプライン</th><th>受注額</th><th>担当ドクター</th></tr></thead><tbody>`;
  USERS.filter(u=>['Sales','MA'].includes(u.team)).forEach(u => {
    const myPipe = pharma.filter(p=>p.OwnerId===u.id&&!['受注','失注'].includes(p.Phase__c)).reduce((s,p)=>s+(p.Amount__c||0),0);
    const myWon = pharma.filter(p=>p.OwnerId===u.id&&p.Phase__c==='受注').reduce((s,p)=>s+(p.Amount__c||0),0);
    const myDocs = (store.Doctor__c||[]).filter(d=>d.OwnerId===u.id).length;
    html += `<tr><td>${u.photo} ${u.name}</td><td>${u.role}</td><td>¥${(myPipe/1000000).toFixed(0)}M</td><td>¥${(myWon/1000000).toFixed(0)}M</td><td>${myDocs}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(() => {
    if (monthly.length) {
      new Chart(document.getElementById('exec-testing'),{
        type:'bar',data:{labels:monthly.map(m=>m.month.replace(/^\d{4}-/,'')),datasets:[{label:'出件数',data:monthly.map(m=>m.orders),backgroundColor:'#42a5f5'},{label:'完了数',data:monthly.map(m=>m.completed),backgroundColor:'#66bb6a'}]},
        options:{responsive:true,plugins:{legend:{position:'top'}}}
      });
    }
    const services = ['genmine TOP 導入','受託解析','Tempus Lens','Tempus Explore','共同研究','データライセンス'];
    new Chart(document.getElementById('exec-service'),{type:'doughnut',data:{labels:services,datasets:[{data:services.map(s=>pharma.filter(p=>p.Service_Type__c===s).reduce((sum,p)=>sum+(p.Amount__c||0),0)),backgroundColor:['#42a5f5','#66bb6a','#ffa726','#ab47bc','#26a69a','#ef5350']}]},options:{responsive:true,plugins:{legend:{position:'right'}}}});
  },100);
}

// ===========================================
// カレンダー
// ===========================================
let calMonthOffset = 0;
function renderCalendar() {
  const base = new Date();
  base.setMonth(base.getMonth() + calMonthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events = store.Event || [];
  const tasks = store.Task || [];
  const visits = store.Visit_Record__c || [];
  const seminars = store.Seminar__c || [];

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  renderTopbar('カレンダー', '📅',
    `<button class="btn btn-sm btn-secondary" onclick="calMonthOffset--;renderCalendar()">◀ 前月</button>
     <button class="btn btn-sm btn-primary" onclick="calMonthOffset=0;renderCalendar()">今月</button>
     <button class="btn btn-sm btn-secondary" onclick="calMonthOffset++;renderCalendar()">翌月 ▶</button>`);
  let html = `<div class="card"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
    <button class="btn btn-sm btn-secondary" onclick="calMonthOffset--;renderCalendar()">◀ 前月</button>
    <h3 style="margin:0">${year}年 ${monthNames[month]}</h3>
    <div><button class="btn btn-sm btn-primary" onclick="calMonthOffset=0;renderCalendar()" style="margin-right:4px">今月</button>
    <button class="btn btn-sm btn-secondary" onclick="calMonthOffset++;renderCalendar()">翌月 ▶</button></div></div>`;
  html += `<div class="calendar">`;
  ['日','月','火','水','木','金','土'].forEach(d => html += `<div class="cal-header">${d}</div>`);

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvents = events.filter(e => e.StartDateTime?.startsWith(dateStr));
    const dayTasks = tasks.filter(t => t.ActivityDate === dateStr);
    const dayVisits = visits.filter(v => v.Visit_Date__c === dateStr);
    const daySeminars = seminars.filter(s => (s.Event_Date__c || s.Date__c) === dateStr);
    html += `<div class="cal-day" onclick="showFormModal('Visit_Record__c',null,{Visit_Date__c:'${dateStr}'})"><div class="day-num">${d}</div>`;
    dayEvents.forEach(e => html += `<div class="cal-event" title="${e.Subject}" onclick="event.stopPropagation();showDetail('Event','${e.id}')" style="cursor:pointer">📅 ${e.Subject}</div>`);
    dayVisits.forEach(v => html += `<div class="cal-event visit" title="訪問: ${resolveRef(v.Doctor__c,'Doctor__c')}" onclick="event.stopPropagation();showDetail('Visit_Record__c','${v.id}')" style="cursor:pointer">📝 ${resolveRef(v.Doctor__c,'Doctor__c')}</div>`);
    daySeminars.forEach(s => html += `<div class="cal-event seminar" title="${s.Name}" onclick="event.stopPropagation();showDetail('Seminar__c','${s.id}')" style="cursor:pointer">📚 ${s.Name}</div>`);
    dayTasks.forEach(t => html += `<div class="cal-event task" title="${t.Subject}" onclick="event.stopPropagation();showDetail('Task','${t.id}')" style="cursor:pointer">✅ ${t.Subject}</div>`);
    html += `</div>`;
  }
  html += `</div></div>`;

  // 今後の予定リスト
  html += `<div class="card"><div class="card-header"><h3>今後の予定</h3></div><table><thead><tr><th>種別</th><th>件名</th><th>日時</th><th>場所</th><th>担当</th></tr></thead><tbody>`;
  const allEvents = [
    ...events.map(e=>({type:'📅 行動',name:e.Subject,date:e.StartDateTime,loc:e.Location,owner:e.OwnerId,id:e.id,obj:'Event'})),
    ...visits.map(v=>({type:'📝 訪問',name:resolveRef(v.Doctor__c,'Doctor__c'),date:v.Visit_Date__c,loc:resolveRef(v.Institution__c,'Medical_Institution__c'),owner:v.OwnerId,id:v.id,obj:'Visit_Record__c'})),
    ...seminars.map(s=>({type:'📚 勉強会',name:s.Name,date:s.Date__c,loc:s.Venue__c,owner:s.OwnerId,id:s.id,obj:'Seminar__c'}))
  ].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  allEvents.forEach(e => {
    html += `<tr onclick="showDetail('${e.obj}','${e.id}')"><td>${e.type}</td><td><span class="cell-link">${e.name}</span></td><td>${e.date||'-'}</td><td>${e.loc||'-'}</td><td>${getUserName(e.owner)}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
}

// ===========================================
// パイプライン (カンバン)
// ===========================================
function renderPipeline() {
  renderTopbar('パイプライン', '📈');
  const pharma = store.Pharma_Opportunity__c || [];
  const phases = ['リード','ヒアリング','提案','セキュリティ審査','契約交渉','受注','失注'];
  const colors = {リード:'#90a4ae',ヒアリング:'#42a5f5',提案:'#ffa726',セキュリティ審査:'#ab47bc',契約交渉:'#26a69a',受注:'#66bb6a',失注:'#ef5350'};

  let html = `<div class="kanban">`;
  phases.forEach(phase => {
    const items = pharma.filter(p => p.Phase__c === phase);
    const total = items.reduce((s,p) => s+(p.Amount__c||0), 0);
    html += `<div class="kanban-col"><div class="kanban-col-header" style="border-bottom-color:${colors[phase]}"><span>${phase}</span><span class="cnt">${items.length}</span></div>`;
    html += `<div style="font-size:11px;color:#888;margin-bottom:8px">¥${(total/1000000).toFixed(0)}M</div>`;
    items.forEach(p => {
      html += `<div class="kanban-card" onclick="showDetail('Pharma_Opportunity__c','${p.id}')">
        <div class="kc-title">${p.Name}</div>
        <div class="kc-sub">${p.Pharma_Company__c} · ${getUserName(p.OwnerId)}</div>
        <div class="kc-amount">¥${Number(p.Amount__c||0).toLocaleString()}</div>
        <div style="font-size:10px;color:#888;margin-top:4px">${p.Close_Date__c||'-'} · ${p.Probability__c||0}%</div>
      </div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

// ===========================================
// マップビュー
// ===========================================
function renderMapView() {
  const editBtn = `<button id="map-guide-btn" class="btn btn-sm btn-secondary" onclick="showMapGuide()" style="margin-right:6px">❓ 使い方</button><button id="map-edit-toggle" class="btn btn-sm ${mapEditMode ? 'btn-danger' : 'btn-secondary'}" onclick="toggleMapEditMode()">${mapEditMode ? '✏️ 編集モード解除' : '✏️ 編集モード'}</button>`;
  renderTopbar('マップ', '🗺️', editBtn);

  let html = `<div class="card"><div class="card-header"><h3>医療機関・勉強会会場マップ</h3></div><div id="map-container" class="${mapEditMode ? 'edit-mode' : ''}" style="height:500px;border-radius:8px"></div></div>`;

  // 編集モードバナー
  if (mapEditMode) {
    html += `<div class="card" style="background:#fff3e0;border-left:4px solid #e65100;padding:12px 20px">
      <div style="display:flex;align-items:center;gap:10px;font-size:13px">
        <span style="font-size:18px">✏️</span>
        <div><strong>編集モード</strong>: マーカーをドラッグして位置を変更 / マップをクリックして新規施設を追加 / ポップアップから編集・削除</div>
      </div>
    </div>`;
  }

  // 凡例
  html += `<div class="card"><div class="card-header"><h3>凡例</h3></div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px">
      <span>🏥 大学病院</span><span>🏨 がん拠点病院</span><span>🏫 一般病院/研究所</span><span>📚 勉強会会場</span>
    </div></div>`;

  // 施設一覧
  html += `<div class="card"><div class="card-header"><h3>施設一覧</h3>${mapEditMode ? '<button class="btn btn-sm btn-primary" onclick="onMapClickToAdd({latlng:{lat:35.68,lng:139.76}})">+ 新規施設</button>' : ''}</div><table><thead><tr><th>施設名</th><th>種別</th><th>都道府県</th><th>genmine導入</th><th>ドクター数</th>${mapEditMode ? '<th>操作</th>' : ''}</tr></thead><tbody>`;
  (store.Medical_Institution__c||[]).forEach(inst => {
    const docCount = (store.Doctor__c||[]).filter(d=>d.Institution__c===inst.id).length;
    const cls = getObjDef('Medical_Institution__c').statusMap[inst.Adapter_Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Medical_Institution__c','${inst.id}')"><td><span class="cell-link">${inst.Name}</span></td><td>${inst.Facility_Type__c||'-'}</td><td>${inst.Prefecture__c||'-'}</td><td><span class="status ${cls}">${inst.Adapter_Status__c}</span></td><td>${docCount}</td>`;
    if (mapEditMode) {
      html += `<td onclick="event.stopPropagation()"><button class="btn btn-sm btn-primary" onclick="showEditForm('Medical_Institution__c','${inst.id}')">編集</button> <button class="btn btn-sm btn-danger" onclick="deleteRecordFromMap('Medical_Institution__c','${inst.id}')">削除</button></td>`;
    }
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;

  // Initialize Leaflet map
  setTimeout(() => {
    if (typeof L === 'undefined') return;
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    mapMarkers = [];

    mapInstance = L.map('map-container').setView([35.68, 139.76], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(mapInstance);

    addMapMarkers();

    if (mapEditMode) {
      mapInstance.on('click', onMapClickToAdd);
    }
  }, 200);
}

function toggleMapEditMode() {
  mapEditMode = !mapEditMode;
  renderMapView();
  toast(mapEditMode ? '編集モードに切り替えました' : '閲覧モードに戻りました');
}

function addMapMarkers() {
  mapMarkers = [];

  // Medical institutions
  (store.Medical_Institution__c||[]).forEach(inst => {
    if (inst.Latitude__c == null || inst.Longitude__c == null) return;
    const docCount = (store.Doctor__c||[]).filter(d=>d.Institution__c===inst.id).length;
    const icon = inst.Facility_Type__c==='大学病院'?'🏥':inst.Facility_Type__c==='がん拠点病院'?'🏨':'🏫';

    const marker = L.marker([inst.Latitude__c, inst.Longitude__c], { draggable: mapEditMode }).addTo(mapInstance);
    marker.bindPopup(buildMarkerPopup('Medical_Institution__c', inst.id, icon, inst, docCount));

    if (mapEditMode) {
      marker.on('dragend', function(e) { onMarkerDragEnd('Medical_Institution__c', inst.id, e); });
    }
    mapMarkers.push({ marker, type: 'institution', id: inst.id });
  });

  // Seminar venues
  (store.Seminar__c||[]).forEach(sem => {
    if (sem.Latitude__c == null || sem.Longitude__c == null) return;
    const marker = L.marker([sem.Latitude__c, sem.Longitude__c], { draggable: mapEditMode }).addTo(mapInstance);
    marker.bindPopup(buildMarkerPopup('Seminar__c', sem.id, '📚', sem, null));

    if (mapEditMode) {
      marker.on('dragend', function(e) { onMarkerDragEnd('Seminar__c', sem.id, e); });
    }
    mapMarkers.push({ marker, type: 'seminar', id: sem.id });
  });
}

function buildMarkerPopup(apiName, id, icon, rec, docCount) {
  let html = `<b>${icon} ${rec.Name}</b><br>`;
  if (apiName === 'Medical_Institution__c') {
    html += `${rec.Facility_Type__c||'-'}<br>genmine: ${rec.Adapter_Status__c||'-'}<br>ドクター: ${docCount||0}名`;
  } else {
    html += `${rec.Venue__c||'-'}<br>${rec.Date__c||'日程未定'}<br>ステータス: ${rec.Status__c||'-'}`;
  }
  html += `<br><small style="color:#888">📍 ${Number(rec.Latitude__c).toFixed(4)}, ${Number(rec.Longitude__c).toFixed(4)}</small>`;

  if (mapEditMode) {
    html += `<div style="margin-top:8px;display:flex;gap:6px">`;
    html += `<button class="btn btn-sm btn-primary" onclick="showEditForm('${apiName}','${id}')">編集</button>`;
    html += `<button class="btn btn-sm btn-danger" onclick="deleteRecordFromMap('${apiName}','${id}')">削除</button>`;
    html += `</div>`;
  }
  return html;
}

function onMarkerDragEnd(apiName, id, e) {
  const latlng = e.target.getLatLng();
  const rec = (store[apiName]||[]).find(r => r.id === id);
  if (!rec) return;

  rec.Latitude__c = Math.round(latlng.lat * 10000) / 10000;
  rec.Longitude__c = Math.round(latlng.lng * 10000) / 10000;

  const icon = apiName === 'Medical_Institution__c'
    ? (rec.Facility_Type__c==='大学病院'?'🏥':rec.Facility_Type__c==='がん拠点病院'?'🏨':'🏫')
    : '📚';
  const docCount = apiName === 'Medical_Institution__c'
    ? (store.Doctor__c||[]).filter(d=>d.Institution__c===id).length : null;

  e.target.setPopupContent(buildMarkerPopup(apiName, id, icon, rec, docCount));
  toast(`${rec.Name} の位置を更新しました (${rec.Latitude__c}, ${rec.Longitude__c})`);
}

function onMapClickToAdd(e) {
  if (!mapEditMode) return;
  const lat = Math.round(e.latlng.lat * 10000) / 10000;
  const lng = Math.round(e.latlng.lng * 10000) / 10000;
  showFormModal('Medical_Institution__c', null, { Latitude__c: lat, Longitude__c: lng });
}

function deleteRecordFromMap(apiName, id) {
  if (!confirm('削除してよろしいですか？')) return;
  store[apiName] = (store[apiName]||[]).filter(r => r.id !== id);
  toast('削除しました', 'error');
  renderSidebar();
  renderMapView();
}

// --- マップ操作ガイド ---
let mapGuideStep = 0;
const MAP_GUIDE_STEPS = [
  {
    target: '#map-edit-toggle',
    title: 'STEP 1: 編集モードに切り替え',
    body: 'まず右上のこのボタンをクリックして<strong>編集モード</strong>に入ります。\nもう一度押すと閲覧モードに戻ります。',
    position: 'below'
  },
  {
    target: '#map-container',
    title: 'STEP 2: マップ上で操作',
    body: '編集モードでは3つの操作ができます：\n<ul style="margin:6px 0 0 16px;padding:0"><li><strong>マーカーをドラッグ</strong> → 施設の位置を変更</li><li><strong>マップの空白をクリック</strong> → 新しい施設を追加</li><li><strong>マーカーをクリック</strong> → 次のステップへ</li></ul>',
    position: 'above'
  },
  {
    target: '.leaflet-marker-icon',
    title: 'STEP 3: マーカーのポップアップ',
    body: 'マーカーをクリックするとポップアップが表示されます。\n編集モード中は<strong>「編集」「削除」ボタン</strong>が表示されます。',
    position: 'right'
  },
  {
    target: '#content table',
    title: 'STEP 4: 施設一覧テーブル',
    body: 'マップの下にある施設一覧テーブルからも操作できます。\n編集モード中は各行に<strong>「編集」「削除」ボタン</strong>が表示されます。',
    position: 'above'
  }
];

function showMapGuide() {
  mapGuideStep = 0;
  renderGuideStep();
}

function renderGuideStep() {
  closeMapGuide();
  if (mapGuideStep >= MAP_GUIDE_STEPS.length) return;

  const step = MAP_GUIDE_STEPS[mapGuideStep];
  const targetEl = document.querySelector(step.target);

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'map-guide-overlay';
  overlay.onclick = closeMapGuide;
  document.body.appendChild(overlay);

  // Highlight target
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.id = 'map-guide-highlight';
    highlight.style.cssText = `top:${rect.top - 4}px;left:${rect.left - 4}px;width:${rect.width + 8}px;height:${rect.height + 8}px;`;
    document.body.appendChild(highlight);
  }

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'map-guide-tooltip';
  tooltip.innerHTML = `
    <div style="font-weight:700;font-size:14px;color:#0176d3;margin-bottom:6px">${step.title}</div>
    <div style="font-size:13px;line-height:1.6">${step.body.replace(/\n/g,'')}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
      <span style="font-size:11px;color:#888">${mapGuideStep + 1} / ${MAP_GUIDE_STEPS.length}</span>
      <div style="display:flex;gap:8px">
        ${mapGuideStep > 0 ? '<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();prevGuideStep()">戻る</button>' : ''}
        ${mapGuideStep < MAP_GUIDE_STEPS.length - 1
          ? '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();nextGuideStep()">次へ</button>'
          : '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();closeMapGuide()">閉じる</button>'}
      </div>
    </div>`;

  document.body.appendChild(tooltip);

  // Position tooltip relative to target
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const ttRect = tooltip.getBoundingClientRect();
    if (step.position === 'below') {
      tooltip.style.top = (rect.bottom + 12) + 'px';
      tooltip.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - ttRect.width - 12)) + 'px';
    } else if (step.position === 'above') {
      tooltip.style.top = Math.max(12, rect.top - ttRect.height - 12) + 'px';
      tooltip.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - ttRect.width - 12)) + 'px';
    } else {
      tooltip.style.top = rect.top + 'px';
      tooltip.style.left = (rect.right + 12) + 'px';
    }
  } else {
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%,-50%)';
  }
}

function nextGuideStep() {
  mapGuideStep++;
  renderGuideStep();
}

function prevGuideStep() {
  mapGuideStep--;
  renderGuideStep();
}

function closeMapGuide() {
  const overlay = document.getElementById('map-guide-overlay');
  const highlight = document.getElementById('map-guide-highlight');
  const tooltip = document.getElementById('map-guide-tooltip');
  if (overlay) overlay.remove();
  if (highlight) highlight.remove();
  if (tooltip) tooltip.remove();
}

// ===========================================
// 月次検査出件レポート
// ===========================================
function renderTestingReport() {
  renderTopbar('月次検査出件レポート', '📊');
  const monthly = typeof MONTHLY_TESTING_DATA !== 'undefined' ? MONTHLY_TESTING_DATA : [];
  const orders = store.Testing_Order__c||[];
  const specimens = store.Specimen__c||[];
  const insts = store.Medical_Institution__c||[];

  let html = `<div class="chart-grid">
    <div class="chart-card"><h4>月次出件数・完了数推移</h4><canvas id="rpt-monthly"></canvas></div>
    <div class="chart-card"><h4>平均TAT推移</h4><canvas id="rpt-tat"></canvas></div>
  </div>`;

  // 施設別クロス集計
  html += `<div class="card"><div class="card-header"><h3>施設別出件数</h3></div><table><thead><tr><th>施設名</th><th>出件数</th><th>完了</th><th>進行中</th><th>平均TAT</th></tr></thead><tbody>`;
  insts.forEach(inst => {
    const instOrders = orders.filter(o=>o.Institution__c===inst.id);
    const done = instOrders.filter(o=>o.Status__c==='完了').length;
    const active = instOrders.filter(o=>!['完了','キャンセル'].includes(o.Status__c)).length;
    const avgT = instOrders.filter(o=>o.TAT_Days__c).length?Math.round(instOrders.filter(o=>o.TAT_Days__c).reduce((s,o)=>s+o.TAT_Days__c,0)/instOrders.filter(o=>o.TAT_Days__c).length*10)/10:'-';
    if (instOrders.length===0) return;
    html += `<tr><td>${inst.Name}</td><td>${instOrders.length}</td><td>${done}</td><td>${active}</td><td>${avgT}日</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // がん種別クロス集計
  const cancers = ['肺がん','乳がん','大腸がん','胃がん','膵臓がん','血液がん','希少がん','小児がん'];
  html += `<div class="card"><div class="card-header"><h3>がん種別検体数</h3></div><table><thead><tr><th>がん種</th><th>検体数</th><th>完了</th><th>解析中</th></tr></thead><tbody>`;
  cancers.forEach(c => {
    const cSpecs = specimens.filter(s=>s.Cancer_Type__c===c);
    if (cSpecs.length===0) return;
    html += `<tr><td>${c}</td><td>${cSpecs.length}</td><td>${cSpecs.filter(s=>s.Status__c==='完了').length}</td><td>${cSpecs.filter(s=>['解析中','QC中','レビュー中'].includes(s.Status__c)).length}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(() => {
    if (monthly.length) {
      new Chart(document.getElementById('rpt-monthly'),{type:'bar',data:{labels:monthly.map(m=>m.month),datasets:[{label:'出件数',data:monthly.map(m=>m.orders),backgroundColor:'#42a5f5'},{label:'完了数',data:monthly.map(m=>m.completed),backgroundColor:'#66bb6a'}]},options:{responsive:true,plugins:{legend:{position:'top'}}}});
      new Chart(document.getElementById('rpt-tat'),{type:'line',data:{labels:monthly.map(m=>m.month),datasets:[{label:'平均TAT(日)',data:monthly.map(m=>m.avgTAT),borderColor:'#ab47bc',backgroundColor:'rgba(171,71,188,.1)',fill:true,tension:.3}]},options:{responsive:true,plugins:{legend:{display:false}}}});
    }
  },100);
}

// ===========================================
// 営業成績レポート
// ===========================================
function renderSalesReport() {
  renderTopbar('営業成績レポート', '📈');
  let html = `<div class="kpi-row cols-3">`;
  USERS.filter(u=>u.team==='Sales').forEach(u => {
    const deals = [...(store.Pharma_Opportunity__c||[]),...(store.Opportunity||[])].filter(d=>d.OwnerId===u.id);
    const won = deals.filter(d=>d.Phase__c==='受注'||d.StageName==='受注').reduce((s,d)=>s+(d.Amount__c||d.Amount||0),0);
    const pipe = deals.filter(d=>!['失注','受注'].includes(d.Phase__c||d.StageName)).reduce((s,d)=>s+(d.Amount__c||d.Amount||0),0);
    const myVisits = (store.Visit_Record__c||[]).filter(v=>v.OwnerId===u.id).length;
    html += `<div class="card"><h3>${u.photo} ${u.name}</h3><div class="kpi-row cols-3" style="margin-top:12px">
      <div class="kpi-card green"><div class="kpi-val">¥${(won/1000000).toFixed(0)}M</div><div class="kpi-label">受注</div></div>
      <div class="kpi-card blue"><div class="kpi-val">¥${(pipe/1000000).toFixed(0)}M</div><div class="kpi-label">パイプライン</div></div>
      <div class="kpi-card orange"><div class="kpi-val">${myVisits}</div><div class="kpi-label">訪問</div></div>
    </div></div>`;
  });
  html += `</div>`;
  document.getElementById('content').innerHTML = html;
}

// ===========================================
// Generic List View
// ===========================================
function renderListView(apiName, filter) {
  const obj = getObjDef(apiName);
  if (!obj) return;
  let data = store[apiName] || [];

  if (filter) {
    Object.keys(filter).forEach(k => {
      if (filter[k]) data = data.filter(r => r[k] === filter[k]);
    });
  }

  renderTopbar(obj.label, obj.icon, `<button class="btn btn-primary btn-sm" onclick="showCreateForm('${apiName}')">+ 新規${obj.label}</button>`);

  let statusHtml = '';
  if (obj.statusField) {
    const sf = obj.fields.find(f => f.apiName === obj.statusField);
    if (sf && sf.values) {
      statusHtml = `<div class="filter-group"><select class="filter-select" onchange="filterByStatus('${apiName}','${obj.statusField}',this.value)"><option value="">全て</option>`;
      sf.values.forEach(v => statusHtml += `<option value="${v}">${v}</option>`);
      statusHtml += `</select></div>`;
    }
  }

  let html = `<div class="toolbar">
    <div class="search-box"><span class="search-icon">🔍</span><input type="text" id="searchInput" placeholder="${obj.label}を検索..." oninput="searchList('${apiName}',this.value)" oncompositionstart="window._imeOn=true" oncompositionend="window._imeOn=false;searchList('${apiName}',this.value)" onkeydown="if(!window._imeOn&&event.key==='Enter'){searchList('${apiName}',this.value)}"><button class="btn btn-sm btn-primary" onclick="searchList('${apiName}',document.getElementById('searchInput').value)" style="margin-left:4px">検索</button></div>
    ${statusHtml}
    <div class="btn-group">`;
  if (obj.kanbanField) html += `<button class="btn btn-sm btn-secondary" onclick="renderKanbanView('${apiName}')">カンバン</button>`;
  html += `<button class="btn btn-sm btn-secondary" onclick="navigate('obj','${apiName}')">一覧</button></div></div>`;

  html += `<div class="card"><div class="table-wrap"><table><thead><tr>`;
  obj.listColumns.forEach(col => {
    const f = obj.fields.find(fi => fi.apiName === col);
    html += `<th onclick="sortList('${apiName}','${col}')">${f ? f.label : col}<span class="sort-icon">⇅</span></th>`;
  });
  html += `</tr></thead><tbody id="list-body">`;

  data.forEach(rec => {
    html += `<tr onclick="showDetail('${apiName}','${rec.id}')">`;
    obj.listColumns.forEach((col,i) => {
      const f = obj.fields.find(fi => fi.apiName === col);
      let val = rec[col];

      if (f && f.type === 'Lookup') {
        if (col === 'OwnerId' || col === 'Reviewer__c') val = getUserName(val);
        else val = resolveRef(val, f.ref);
      } else {
        val = fmt(val, f?.type);
      }
      if (col === obj.statusField && obj.statusMap) {
        const cls = obj.statusMap[rec[col]] || 's-gray';
        val = `<span class="status ${cls}">${rec[col]||'-'}</span>`;
      }
      // Doctor list: show institution name as sub-text
      if (i === 0 && apiName === 'Doctor__c') {
        const inst = getInstitutionName(rec.Institution__c);
        val = `<span class="cell-link">${val}</span><div class="sub-text">🏥 ${inst}</div>`;
      } else if (i === 0) {
        val = `<span class="cell-link">${val}</span>`;
      }
      html += `<td>${val}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table></div>
    <div class="pagination"><span>${data.length} 件</span></div></div>`;

  document.getElementById('content').innerHTML = html;
}

function filterByStatus(apiName, field, value) {
  navigate('obj', apiName, value ? { [field]: value } : null);
}

// --- Kanban View ---
function renderKanbanView(apiName) {
  const obj = getObjDef(apiName);
  if (!obj || !obj.kanbanField) return;
  const field = obj.fields.find(f => f.apiName === obj.kanbanField);
  if (!field) return;
  const data = store[apiName] || [];

  renderTopbar(obj.label + ' (カンバン)', obj.icon, `<button class="btn btn-primary btn-sm" onclick="showCreateForm('${apiName}')">+ 新規</button>`);

  let html = `<div class="toolbar"><button class="btn btn-sm btn-secondary" onclick="navigate('obj','${apiName}')">一覧表示</button></div><div class="kanban">`;
  field.values.forEach(stage => {
    const items = data.filter(r => r[obj.kanbanField] === stage);
    html += `<div class="kanban-col"><div class="kanban-col-header"><span>${stage}</span><span class="cnt">${items.length}</span></div>`;
    items.forEach(rec => {
      const name = rec.Name || rec.Subject || rec.LastName || '-';
      const amount = rec.Amount || rec.Amount__c || rec.Budget__c;
      html += `<div class="kanban-card" onclick="showDetail('${apiName}','${rec.id}')">
        <div class="kc-title">${name}</div>
        <div class="kc-sub">${rec.OwnerId ? getUserName(rec.OwnerId) : ''}</div>
        ${amount ? `<div class="kc-amount">¥${Number(amount).toLocaleString()}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;
  document.getElementById('content').innerHTML = html;
}

// --- Detail View ---
function showDetail(apiName, id) {
  const obj = getObjDef(apiName);
  const data = store[apiName] || [];
  const rec = data.find(r => r.id === id);
  if (!obj || !rec) return;

  const name = rec.Name || rec.Subject || (`${rec.LastName||''} ${rec.FirstName||''}`).trim() || id;
  renderTopbar(name, obj.icon, `<div class="btn-group"><button class="btn btn-sm btn-primary" onclick="showEditForm('${apiName}','${id}')">編集</button><button class="btn btn-sm btn-danger" onclick="deleteRecord('${apiName}','${id}')">削除</button><button class="btn btn-sm btn-secondary" onclick="navigate('obj','${apiName}')">← 戻る</button></div>`);

  let html = `<div class="card"><div class="card-header"><h3>${obj.label}の詳細</h3>`;
  if (obj.statusField && rec[obj.statusField]) {
    const cls = obj.statusMap?.[rec[obj.statusField]] || 's-gray';
    html += `<span class="status ${cls}">${rec[obj.statusField]}</span>`;
  }
  html += `</div>`;

  // Doctor: show institution prominently
  if (apiName === 'Doctor__c' && rec.Institution__c) {
    const inst = getInstitutionName(rec.Institution__c);
    html += `<div style="background:#e3f2fd;padding:12px 16px;border-radius:6px;margin-bottom:16px;font-size:15px">🏥 <strong>所属病院: ${inst}</strong></div>`;
  }

  html += `<div class="detail-grid">`;
  obj.fields.forEach(f => {
    let val = rec[f.apiName];
    if (f.type === 'Lookup') {
      if (f.apiName === 'OwnerId' || f.apiName === 'Reviewer__c') val = getUserName(val);
      else val = resolveRef(val, f.ref);
    } else if (f.type === 'Checkbox') {
      val = val ? '✅ はい' : '❌ いいえ';
    } else {
      val = fmt(val, f.type);
    }
    html += `<div class="detail-field"><div class="dl">${f.label}</div><div class="dv">${val}</div></div>`;
  });
  html += `</div></div>`;

  // Related Lists
  html += renderRelatedLists(apiName, id);

  document.getElementById('content').innerHTML = html;
  updateActiveNav();
}

function renderRelatedLists(parentObj, parentId) {
  let html = '';
  ALL_OBJECTS.forEach(obj => {
    obj.fields.forEach(f => {
      if (f.type === 'Lookup' && f.ref === parentObj) {
        const related = (store[obj.apiName]||[]).filter(r => r[f.apiName] === parentId);
        if (related.length === 0) return;
        html += `<div class="related-list"><div class="related-list-header"><h4>${obj.icon} ${obj.label}<span class="rl-count">${related.length}</span></h4></div>`;
        html += `<table><thead><tr>`;
        const cols = obj.listColumns.slice(0, 5).filter(c => c !== f.apiName);
        cols.forEach(col => {
          const fi = obj.fields.find(x => x.apiName === col);
          html += `<th>${fi ? fi.label : col}</th>`;
        });
        html += `</tr></thead><tbody>`;
        related.forEach(rec => {
          html += `<tr onclick="showDetail('${obj.apiName}','${rec.id}')">`;
          cols.forEach((col, i) => {
            const fi = obj.fields.find(x => x.apiName === col);
            let val = rec[col];
            if (fi && fi.type === 'Lookup') val = col === 'OwnerId' ? getUserName(val) : resolveRef(val, fi.ref);
            else val = fmt(val, fi?.type);
            if (col === obj.statusField && obj.statusMap) val = `<span class="status ${obj.statusMap[rec[col]]||'s-gray'}">${rec[col]||'-'}</span>`;
            if (i === 0) val = `<span class="cell-link">${val}</span>`;
            html += `<td>${val}</td>`;
          });
          html += `</tr>`;
        });
        html += `</tbody></table></div>`;
      }
    });
  });
  return html;
}

// --- Modal: Create/Edit Form ---
function showCreateForm(apiName) { showFormModal(apiName, null); }
function showEditForm(apiName, id) {
  const rec = (store[apiName]||[]).find(r => r.id === id);
  showFormModal(apiName, rec);
}

function showFormModal(apiName, rec, defaults) {
  const obj = getObjDef(apiName);
  if (!obj) return;
  const isEdit = !!rec;
  const title = isEdit ? `${obj.label}を編集` : `新規${obj.label}`;

  let html = `<div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>`;
  html += `<div class="modal-body"><form id="record-form" class="form-grid">`;

  obj.fields.forEach(f => {
    if (f.type === 'AutoNumber' || f.type === 'Formula') return;
    const val = rec ? (rec[f.apiName] || '') : (defaults && defaults[f.apiName] != null ? defaults[f.apiName] : '');
    const req = f.required ? '<span class="req">*</span>' : '';
    const fullClass = f.type === 'LongTextArea' ? ' full' : '';

    html += `<div class="form-group${fullClass}"><label>${f.label}${req}</label>`;
    if (f.type === 'Picklist' && f.values) {
      html += `<select name="${f.apiName}" class="form-control"><option value="">-- 選択 --</option>`;
      f.values.forEach(v => html += `<option value="${v}" ${v===val?'selected':''}>${v}</option>`);
      html += `</select>`;
    } else if (f.type === 'LongTextArea') {
      html += `<textarea name="${f.apiName}" class="form-control">${val}</textarea>`;
    } else if (f.type === 'Checkbox') {
      html += `<input type="checkbox" name="${f.apiName}" ${val?'checked':''}>`;
    } else if (f.type === 'Lookup' && (f.apiName === 'OwnerId' || f.apiName === 'Reviewer__c')) {
      html += `<select name="${f.apiName}" class="form-control"><option value="">-- 選択 --</option>`;
      USERS.forEach(u => html += `<option value="${u.id}" ${u.id===val?'selected':''}>${u.name} (${u.role})</option>`);
      html += `</select>`;
    } else if (f.type === 'Lookup' && f.ref) {
      const refData = store[f.ref] || [];
      html += `<select name="${f.apiName}" class="form-control"><option value="">-- 選択 --</option>`;
      refData.forEach(r => {
        const rName = r.Name || r.LastName || r.Subject || r.id;
        html += `<option value="${r.id}" ${r.id===val?'selected':''}>${rName}</option>`;
      });
      html += `</select>`;
    } else if (f.type === 'Date') {
      html += `<input type="date" name="${f.apiName}" class="form-control" value="${val}">`;
    } else if (f.type === 'Number' || f.type === 'Currency' || f.type === 'Percent') {
      html += `<input type="number" name="${f.apiName}" class="form-control" value="${val}">`;
    } else {
      html += `<input type="text" name="${f.apiName}" class="form-control" value="${val}">`;
    }
    html += `</div>`;
  });

  // Medical_Institution__c / Seminar__c: 座標貼り付け欄
  if (obj.fields.some(f => f.apiName === 'Latitude__c') && obj.fields.some(f => f.apiName === 'Longitude__c')) {
    html += `<div class="form-group full"><label>📍 座標を貼り付け（Google Mapからコピー）</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="latlng-paste" class="form-control" placeholder="例: 35.6812, 139.7671" style="flex:1"
          oninput="parseLatLngInput(this.value)">
        <button type="button" class="btn btn-sm btn-secondary" onclick="pasteLatLng()">📋 貼り付け</button>
      </div>
      <small style="color:#888;margin-top:4px;display:block">Google Mapで場所を右クリック → 座標をコピー → ここに貼り付け</small>
    </div>`;
  }

  // Visit_Record__c: GPS取得ボタン
  if (apiName === 'Visit_Record__c') {
    html += `<div class="form-group full"><label>GPS位置情報</label>
      <button type="button" class="btn btn-sm btn-secondary" onclick="captureGPS()">📍 現在地を取得</button>
      <span id="gps-status" style="margin-left:8px;color:#888"></span></div>`;
  }

  html += `</form></div>`;
  html += `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>`;
  html += `<button class="btn btn-primary" onclick="saveRecord('${apiName}','${rec?.id||''}')">保存</button></div>`;

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function parseLatLngInput(val) {
  const parts = val.split(/[,\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const latField = document.querySelector('[name="Latitude__c"]');
      const lngField = document.querySelector('[name="Longitude__c"]');
      if (latField) latField.value = lat;
      if (lngField) lngField.value = lng;
    }
  }
}

async function pasteLatLng() {
  try {
    const text = await navigator.clipboard.readText();
    const input = document.getElementById('latlng-paste');
    if (input) {
      input.value = text;
      parseLatLngInput(text);
    }
  } catch(e) {
    toast('クリップボードの読み取りに失敗しました。直接入力してください', 'error');
  }
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
}

function saveRecord(apiName, id) {
  const form = document.getElementById('record-form');
  const obj = getObjDef(apiName);
  const formData = new FormData(form);
  const rec = id ? (store[apiName]||[]).find(r => r.id === id) : { id: genId(SF_KEY_PREFIXES[apiName] || apiName.substring(0,3)) };

  obj.fields.forEach(f => {
    if (f.type === 'Checkbox') {
      rec[f.apiName] = form.querySelector(`[name="${f.apiName}"]`)?.checked || false;
    } else if (f.type === 'Number' || f.type === 'Currency' || f.type === 'Percent') {
      const v = formData.get(f.apiName);
      rec[f.apiName] = v ? Number(v) : null;
    } else {
      rec[f.apiName] = formData.get(f.apiName) || '';
    }
  });

  if (!id) {
    if (!store[apiName]) store[apiName] = [];
    store[apiName].push(rec);
    toast(`${obj.label}を作成しました`);
  } else {
    toast(`${obj.label}を更新しました`);
  }

  closeModal();
  renderSidebar();
  if (currentView === 'map-view') {
    renderMapView();
  } else {
    showDetail(apiName, rec.id);
  }
}

function deleteRecord(apiName, id) {
  if (!confirm('削除してよろしいですか？')) return;
  store[apiName] = (store[apiName]||[]).filter(r => r.id !== id);
  toast('削除しました', 'error');
  renderSidebar();
  navigate('obj', apiName);
}

// --- Search & Sort ---
let currentSort = { field: null, asc: true };

function searchList(apiName, query) {
  if(window._imeOn)return;
  navigate('obj', apiName);
}

function sortList(apiName, field) {
  if (currentSort.field === field) currentSort.asc = !currentSort.asc;
  else { currentSort.field = field; currentSort.asc = true; }
  store[apiName].sort((a, b) => {
    const va = a[field] || '', vb = b[field] || '';
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return currentSort.asc ? cmp : -cmp;
  });
  navigate('obj', apiName);
}

function updateActiveNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    const view = el.getAttribute('data-view');
    if (view === currentView || (currentView === 'obj' && view === `obj:${currentObject}`)) {
      el.classList.add('active');
    }
  });
}

// ========================================
//  日報画面
// ========================================
function renderDailyReport() {
  const uid = window.currentUser?.id || 'U002';
  const user = USERS.find(u => u.id === uid);
  const reports = (store.Daily_Report__c || []).filter(r => r.OwnerId === uid);
  const allReports = store.Daily_Report__c || [];
  const isManager = user && (user.role.includes('マネージャー') || user.role.includes('事業部長') || user.role.includes('代表'));

  renderTopbar('日報', '📝', `<button class="btn btn-primary btn-sm" onclick="showCreateForm('Daily_Report__c')">+ 日報作成</button>`);

  let html = '';

  // 自分の日報サマリー
  const submitted = reports.filter(r => r.Approval_Status__c === '提出済').length;
  const approved = reports.filter(r => r.Approval_Status__c === '承認済').length;
  const draft = reports.filter(r => r.Approval_Status__c === '下書き').length;
  const rejected = reports.filter(r => r.Approval_Status__c === '差戻し').length;

  html += `<div class="kpi-row">
    <div class="kpi-card"><div class="kpi-value">${reports.length}</div><div class="kpi-label">今月の日報数</div></div>
    <div class="kpi-card"><div class="kpi-value" style="color:#2196f3">${submitted}</div><div class="kpi-label">提出済</div></div>
    <div class="kpi-card"><div class="kpi-value" style="color:#4caf50">${approved}</div><div class="kpi-label">承認済</div></div>
    <div class="kpi-card"><div class="kpi-value" style="color:#f44336">${rejected}</div><div class="kpi-label">差戻し</div></div>
    <div class="kpi-card"><div class="kpi-value" style="color:#9e9e9e">${draft}</div><div class="kpi-label">下書き</div></div>
  </div>`;

  // マネージャーの場合：チームの未承認日報一覧
  if (isManager) {
    const pending = allReports.filter(r => r.Approval_Status__c === '提出済');
    if (pending.length > 0) {
      html += `<div class="card"><div class="card-header"><h3>承認待ち日報（${pending.length}件）</h3></div>`;
      html += `<div class="table-wrap"><table><thead><tr><th>日付</th><th>報告者</th><th>種別</th><th>訪問件数</th><th>操作</th></tr></thead><tbody>`;
      pending.forEach(r => {
        html += `<tr><td>${r.Report_Date__c}</td><td>${getUserName(r.OwnerId)}</td><td>${r.Report_Type__c||'-'}</td><td>${r.Visit_Summary__c||0}</td>
          <td><button class="btn btn-sm btn-primary" onclick="approveReport('${r.id}')">承認</button> <button class="btn btn-sm btn-danger" onclick="rejectReport('${r.id}')">差戻し</button> <button class="btn btn-sm btn-secondary" onclick="showDetail('Daily_Report__c','${r.id}')">詳細</button></td></tr>`;
      });
      html += `</tbody></table></div></div>`;
    }
  }

  // 日報一覧（時系列）
  html += `<div class="card"><div class="card-header"><h3>日報一覧</h3></div>`;
  const displayReports = isManager ? allReports : reports;
  displayReports.sort((a,b) => (b.Report_Date__c||'').localeCompare(a.Report_Date__c||''));

  displayReports.forEach(r => {
    const cls = {下書き:'s-gray',提出済:'s-blue',承認済:'s-green',差戻し:'s-red'}[r.Approval_Status__c] || 's-gray';
    html += `<div class="report-card" onclick="showDetail('Daily_Report__c','${r.id}')">
      <div class="report-header">
        <span class="report-date">${r.Report_Date__c}</span>
        <span>${getUserName(r.OwnerId)}</span>
        <span class="status ${cls}">${r.Approval_Status__c||'下書き'}</span>
        <span>訪問 ${r.Visit_Summary__c||0}件</span>
      </div>
      <div class="report-body">
        <div class="report-section"><strong>活動内容:</strong><br>${(r.Key_Activities__c||'-').substring(0,200)}${(r.Key_Activities__c||'').length > 200 ? '...' : ''}</div>
        ${r.Key_Findings__c ? `<div class="report-section"><strong>気づき:</strong><br>${r.Key_Findings__c.substring(0,150)}${r.Key_Findings__c.length > 150 ? '...' : ''}</div>` : ''}
      </div>
      ${r.Approval_Comment__c ? `<div class="report-approval"><strong>承認者コメント (${getUserName(r.Approved_By__c)}):</strong> ${r.Approval_Comment__c}</div>` : ''}
    </div>`;
  });
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

function approveReport(id) {
  const r = (store.Daily_Report__c||[]).find(x => x.id === id);
  if (!r) return;
  const comment = prompt('承認コメント（任意）:');
  r.Approval_Status__c = '承認済';
  r.Approved_By__c = window.currentUser?.id || 'U001';
  r.Approval_Date__c = new Date().toISOString().split('T')[0];
  if (comment) r.Approval_Comment__c = comment;
  showToast('日報を承認しました', 'success');
  renderDailyReport();
}

function rejectReport(id) {
  const r = (store.Daily_Report__c||[]).find(x => x.id === id);
  if (!r) return;
  const comment = prompt('差戻しコメント:');
  if (!comment) return;
  r.Approval_Status__c = '差戻し';
  r.Approved_By__c = window.currentUser?.id || 'U001';
  r.Approval_Comment__c = comment;
  showToast('日報を差戻しました', 'warning');
  renderDailyReport();
}

// ========================================
//  承認キュー
// ========================================
function renderApprovalQueue() {
  const uid = window.currentUser?.id || 'U002';
  const allApprovals = store.Approval_Request__c || [];
  const myPending = allApprovals.filter(r => r.Approver__c === uid && (r.Status__c === '承認待ち' || r.Status__c === '申請中'));
  const myRequests = allApprovals.filter(r => r.Requested_By__c === uid);
  const recentAll = [...allApprovals].sort((a,b) => (b.Submitted_Date__c||'').localeCompare(a.Submitted_Date__c||''));

  renderTopbar('承認キュー', '✅', `<button class="btn btn-primary btn-sm" onclick="showCreateForm('Approval_Request__c')">+ 新規申請</button>`);

  let html = '';

  // KPI
  const pendingCount = allApprovals.filter(r => r.Status__c === '承認待ち' || r.Status__c === '申請中').length;
  const approvedCount = allApprovals.filter(r => r.Status__c === '承認済').length;
  const totalAmount = allApprovals.filter(r => r.Status__c === '承認済').reduce((s,r) => s + (r.Amount__c||0), 0);

  html += `<div class="kpi-row">
    <div class="kpi-card"><div class="kpi-value" style="color:#ff9800">${pendingCount}</div><div class="kpi-label">承認待ち</div></div>
    <div class="kpi-card"><div class="kpi-value" style="color:#4caf50">${approvedCount}</div><div class="kpi-label">承認済</div></div>
    <div class="kpi-card"><div class="kpi-value">¥${(totalAmount/10000).toFixed(0)}万</div><div class="kpi-label">承認済金額合計</div></div>
    <div class="kpi-card"><div class="kpi-value">${myPending.length}</div><div class="kpi-label">あなたの承認待ち</div></div>
  </div>`;

  // 自分が承認者の待ちリスト
  if (myPending.length > 0) {
    html += `<div class="card"><div class="card-header"><h3>あなたの承認待ち（${myPending.length}件）</h3></div>`;
    myPending.forEach(r => {
      const prCls = {高:'s-red',中:'s-orange',低:'s-blue'}[r.Priority__c] || 's-gray';
      html += `<div class="approval-card">
        <div class="approval-header">
          <span class="approval-type">${r.Request_Type__c}</span>
          <strong>${r.Name}</strong>
          <span class="status ${prCls}">${r.Priority__c||'中'}</span>
          ${r.Amount__c ? `<span class="approval-amount">¥${Number(r.Amount__c).toLocaleString()}</span>` : ''}
        </div>
        <div class="approval-body">${(r.Description__c||'').substring(0,300)}${(r.Description__c||'').length > 300 ? '...' : ''}</div>
        <div class="approval-meta">申請者: ${getUserName(r.Requested_By__c)} | 申請日: ${r.Submitted_Date__c||'-'}</div>
        <div class="approval-actions">
          <button class="btn btn-sm btn-primary" onclick="approveRequest('${r.id}')">承認</button>
          <button class="btn btn-sm btn-danger" onclick="rejectRequest('${r.id}')">差戻し</button>
          <button class="btn btn-sm btn-secondary" onclick="showDetail('Approval_Request__c','${r.id}')">詳細</button>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  // 全承認履歴
  html += `<div class="card"><div class="card-header"><h3>承認履歴</h3></div>`;
  html += `<div class="table-wrap"><table><thead><tr><th>申請名</th><th>種別</th><th>金額</th><th>申請者</th><th>承認者</th><th>ステータス</th><th>申請日</th></tr></thead><tbody>`;
  recentAll.forEach(r => {
    const cls = {申請中:'s-blue',承認待ち:'s-orange',承認済:'s-green',差戻し:'s-red',却下:'s-red',取下げ:'s-gray'}[r.Status__c] || 's-gray';
    html += `<tr onclick="showDetail('Approval_Request__c','${r.id}')"><td>${r.Name}</td><td>${r.Request_Type__c||'-'}</td><td>${r.Amount__c ? '¥'+Number(r.Amount__c).toLocaleString() : '-'}</td><td>${getUserName(r.Requested_By__c)}</td><td>${getUserName(r.Approver__c)}</td><td><span class="status ${cls}">${r.Status__c}</span></td><td>${r.Submitted_Date__c||'-'}</td></tr>`;
  });
  html += `</tbody></table></div></div>`;

  document.getElementById('content').innerHTML = html;
}

function approveRequest(id) {
  const r = (store.Approval_Request__c||[]).find(x => x.id === id);
  if (!r) return;
  const comment = prompt('承認コメント（任意）:');
  r.Status__c = '承認済';
  r.Approved_Date__c = new Date().toISOString().split('T')[0];
  if (comment) r.Approver_Comment__c = comment;
  showToast('承認しました', 'success');
  renderApprovalQueue();
}

function rejectRequest(id) {
  const r = (store.Approval_Request__c||[]).find(x => x.id === id);
  if (!r) return;
  const comment = prompt('差戻しコメント:');
  if (!comment) return;
  r.Status__c = '差戻し';
  r.Approved_Date__c = new Date().toISOString().split('T')[0];
  r.Approver_Comment__c = comment;
  showToast('差戻ししました', 'warning');
  renderApprovalQueue();
}

// ========================================
//  Doctor 360° ビュー
// ========================================
function renderDoctor360(docId) {
  const doctors = store.Doctor__c || [];
  const doc = docId ? doctors.find(d => d.id === docId) : doctors[0];
  if (!doc) { renderListView('Doctor__c'); return; }

  const inst = getInstitutionName(doc.Institution__c);
  const visits = (store.Visit_Record__c||[]).filter(v => v.Doctor__c === doc.id).sort((a,b) => (b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||''));
  const seminars = (store.Seminar__c||[]).filter(s => s.Speaker__c === doc.id);
  const attendances = (store.Seminar_Attendee__c||[]).filter(a => a.Doctor__c === doc.id);
  const specimens = (store.Specimen__c||[]).filter(s => s.Referring_Doctor__c === doc.id);
  const maActivities = (store.MA_Activity__c||[]).filter(m => m.Doctor__c === doc.id);
  const research = (store.Joint_Research__c||[]).filter(j => j.PI__c === doc.id);

  renderTopbar(`Doctor 360° - ${doc.Name}`, '👨‍⚕️', `<button class="btn btn-sm btn-secondary" onclick="navigate('doctor-360')">← ドクター選択</button> <button class="btn btn-sm btn-primary" onclick="showEditForm('Doctor__c','${doc.id}')">編集</button>`);

  let html = '';

  // プロファイルカード
  html += `<div class="doctor-profile-card">
    <div class="doctor-profile-header">
      <div class="doctor-avatar">${doc.Name.charAt(0)}</div>
      <div class="doctor-info">
        <h2>${doc.Name}</h2>
        <div class="doctor-meta">🏥 ${inst} | ${doc.Department__c||'-'} | ${doc.Title__c||'-'}</div>
        <div class="doctor-meta">専門: ${doc.Cancer_Type__c||'-'} | KOLスコア: <strong>${doc.KOL_Score__c||0}</strong></div>
      </div>
      <div class="doctor-status-area">
        <div class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[doc.Relationship_Level__c]||'s-gray'}">${doc.Relationship_Level__c||'-'}</div>
        <div style="margin-top:8px">genmine関心度: <strong>${doc.Genomic_Interest__c||'不明'}</strong></div>
      </div>
    </div>
    ${doc.Note__c ? `<div class="doctor-note">${doc.Note__c}</div>` : ''}
  </div>`;

  // KPI行
  html += `<div class="kpi-row">
    <div class="kpi-card"><div class="kpi-value">${doc.Visit_Count__c||0}</div><div class="kpi-label">総訪問回数</div></div>
    <div class="kpi-card"><div class="kpi-value">${doc.Last_Visit_Date__c||'-'}</div><div class="kpi-label">最終訪問日</div></div>
    <div class="kpi-card"><div class="kpi-value">${specimens.length}</div><div class="kpi-label">紹介検体数</div></div>
    <div class="kpi-card"><div class="kpi-value">${seminars.length}</div><div class="kpi-label">講演回数</div></div>
    <div class="kpi-card"><div class="kpi-value">${maActivities.length}</div><div class="kpi-label">MA活動</div></div>
    <div class="kpi-card"><div class="kpi-value">${research.length}</div><div class="kpi-label">共同研究</div></div>
  </div>`;

  // タイムライン（訪問・MA・セミナーを統合）
  const timeline = [];
  visits.forEach(v => timeline.push({date:v.Visit_Date__c, type:'訪問', icon:'📝', title:`${v.Purpose__c||'訪問'}`, detail:v.Detail__c||'', result:v.Result__c, id:v.id, obj:'Visit_Record__c'}));
  maActivities.forEach(m => timeline.push({date:m.Date__c, type:'MA活動', icon:'🎤', title:m.Name, detail:m.Outcome__c||'', result:m.Status__c, id:m.id, obj:'MA_Activity__c'}));
  seminars.forEach(s => timeline.push({date:s.Date__c, type:'講演', icon:'📚', title:s.Name, detail:`${s.Format__c} - ${s.Venue__c||''}`, result:s.Status__c, id:s.id, obj:'Seminar__c'}));
  timeline.sort((a,b) => (b.date||'').localeCompare(a.date||''));

  html += `<div class="card"><div class="card-header"><h3>活動タイムライン</h3></div><div class="timeline">`;
  timeline.forEach(t => {
    html += `<div class="timeline-item" onclick="showDetail('${t.obj}','${t.id}')">
      <div class="timeline-dot">${t.icon}</div>
      <div class="timeline-content">
        <div class="timeline-date">${t.date||'-'} <span class="timeline-type">${t.type}</span> ${t.result ? `<span class="status s-blue">${t.result}</span>` : ''}</div>
        <div class="timeline-title">${t.title}</div>
        ${t.detail ? `<div class="timeline-detail">${t.detail.substring(0,200)}${t.detail.length > 200 ? '...' : ''}</div>` : ''}
      </div>
    </div>`;
  });
  html += `</div></div>`;

  // 検体一覧
  if (specimens.length > 0) {
    html += `<div class="card"><div class="card-header"><h3>紹介検体 (${specimens.length}件)</h3></div>`;
    html += `<div class="table-wrap"><table><thead><tr><th>検体ID</th><th>がん種</th><th>検体種別</th><th>ステータス</th><th>レビュー</th><th>TAT</th></tr></thead><tbody>`;
    specimens.forEach(s => {
      html += `<tr onclick="showDetail('Specimen__c','${s.id}')"><td>${s.Name}</td><td>${s.Cancer_Type__c||'-'}</td><td>${s.Specimen_Type__c||'-'}</td><td><span class="status ${({受領待ち:'s-gray',受領済:'s-blue',QC中:'s-orange',解析中:'s-purple',レポート作成:'s-teal',レビュー中:'s-yellow',完了:'s-green',不適格:'s-red'})[s.Status__c]||'s-gray'}">${s.Status__c}</span></td><td>${s.Review_Status__c||'-'}</td><td>${s.TAT_Days__c||'-'}日</td></tr>`;
    });
    html += `</tbody></table></div></div>`;
  }

  // 共同研究
  if (research.length > 0) {
    html += `<div class="card"><div class="card-header"><h3>共同研究</h3></div>`;
    research.forEach(r => {
      html += `<div class="research-card" onclick="showDetail('Joint_Research__c','${r.id}')">
        <strong>${r.Name}</strong> <span class="status s-blue">${r.Status__c}</span>
        <div style="margin-top:6px;font-size:13px;color:#666">パートナー: ${r.Partner__c} | 期間: ${r.Start_Date__c}〜${r.End_Date__c} | 予算: ¥${(r.Budget__c/10000).toFixed(0)}万 | 投稿先: ${r.Publication_Plan__c||'-'}</div>
      </div>`;
    });
    html += `</div>`;
  }

  document.getElementById('content').innerHTML = html;
}

function renderDoctor360Selector() {
  const doctors = (store.Doctor__c||[]).sort((a,b) => (b.KOL_Score__c||0)-(a.KOL_Score__c||0));
  renderTopbar('Doctor 360° - ドクター選択', '👨‍⚕️');

  let html = `<div class="card"><div class="card-header"><h3>ドクターを選択してください</h3></div>`;
  html += `<div class="doctor-grid">`;
  doctors.forEach(d => {
    const inst = getInstitutionName(d.Institution__c);
    const cls = ({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray';
    html += `<div class="doctor-select-card" onclick="renderDoctor360('${d.id}')">
      <div class="doctor-select-avatar">${d.Name.charAt(0)}</div>
      <div class="doctor-select-info">
        <strong>${d.Name}</strong>
        <div class="sub-text">🏥 ${inst}</div>
        <div style="font-size:12px;color:#888">${d.Department__c||'-'} ${d.Title__c||'-'}</div>
        <div style="margin-top:4px"><span class="status ${cls}">${d.Relationship_Level__c||'-'}</span> <span style="font-size:12px">KOL: ${d.KOL_Score__c||0}</span></div>
      </div>
    </div>`;
  });
  html += `</div></div>`;
  document.getElementById('content').innerHTML = html;
}

// ========================================
//  KOLマップ
// ========================================
function renderKOLMap() {
  const doctors = (store.Doctor__c||[]).filter(d => (d.KOL_Score__c||0) > 0);
  renderTopbar('KOL マップ', '🌟');

  let html = `<div class="kpi-row">`;
  const tiers = [{name:'Tier 1 (KOL)',min:80,color:'#c62828'},{name:'Tier 2 (推進者)',min:50,color:'#e65100'},{name:'Tier 3 (関心あり)',min:20,color:'#1565c0'},{name:'その他',min:0,color:'#9e9e9e'}];
  tiers.forEach(t => {
    const cnt = doctors.filter(d => {
      const s = d.KOL_Score__c||0;
      if (t.min === 80) return s >= 80;
      if (t.min === 50) return s >= 50 && s < 80;
      if (t.min === 20) return s >= 20 && s < 50;
      return s < 20;
    }).length;
    html += `<div class="kpi-card"><div class="kpi-value" style="color:${t.color}">${cnt}</div><div class="kpi-label">${t.name}</div></div>`;
  });
  html += `</div>`;

  // がん種別KOLマトリクス
  const cancerTypes = [...new Set(doctors.map(d => d.Cancer_Type__c).filter(Boolean))];
  html += `<div class="card"><div class="card-header"><h3>がん種別 KOL マトリクス</h3></div>`;
  html += `<div class="table-wrap"><table><thead><tr><th>ドクター</th><th>病院</th><th>専門</th><th>KOLスコア</th><th>関係構築度</th><th>訪問数</th><th>講演</th><th>共同研究</th><th>検体</th></tr></thead><tbody>`;
  doctors.sort((a,b) => (b.KOL_Score__c||0) - (a.KOL_Score__c||0)).forEach(d => {
    const inst = getInstitutionName(d.Institution__c);
    const seminars = (store.Seminar__c||[]).filter(s => s.Speaker__c === d.id).length;
    const research = (store.Joint_Research__c||[]).filter(j => j.PI__c === d.id).length;
    const specs = (store.Specimen__c||[]).filter(s => s.Referring_Doctor__c === d.id).length;
    const score = d.KOL_Score__c||0;
    const barColor = score >= 80 ? '#c62828' : score >= 50 ? '#e65100' : score >= 20 ? '#1565c0' : '#9e9e9e';

    html += `<tr onclick="renderDoctor360('${d.id}')" style="cursor:pointer">
      <td><strong>${d.Name}</strong></td><td>${inst}</td><td>${d.Cancer_Type__c||'-'}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div style="width:60px;height:8px;background:#eee;border-radius:4px"><div style="width:${score}%;height:100%;background:${barColor};border-radius:4px"></div></div><strong>${score}</strong></div></td>
      <td><span class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray'}">${d.Relationship_Level__c||'-'}</span></td>
      <td>${d.Visit_Count__c||0}</td><td>${seminars}</td><td>${research}</td><td>${specs}</td></tr>`;
  });
  html += `</tbody></table></div></div>`;

  // がん種別分布
  html += `<div class="card"><div class="card-header"><h3>がん種別 KOL分布</h3></div><div class="cancer-kol-grid">`;
  cancerTypes.forEach(ct => {
    const drs = doctors.filter(d => d.Cancer_Type__c === ct).sort((a,b) => (b.KOL_Score__c||0)-(a.KOL_Score__c||0));
    html += `<div class="cancer-kol-section"><h4>${ct}（${drs.length}名）</h4>`;
    drs.forEach(d => {
      const inst = getInstitutionName(d.Institution__c);
      html += `<div class="kol-chip" onclick="renderDoctor360('${d.id}')" title="${inst} ${d.Title__c||''}">${d.Name} <small>${d.KOL_Score__c||0}</small></div>`;
    });
    html += `</div>`;
  });
  html += `</div></div>`;

  document.getElementById('content').innerHTML = html;
}

// ========================================
//  競合情報ダッシュボード
// ========================================
function renderCompetitiveIntel() {
  const intels = (store.Competitive_Intel__c||[]).sort((a,b) => (b.Date__c||'').localeCompare(a.Date__c||''));
  renderTopbar('競合情報ダッシュボード', '🔍', `<button class="btn btn-primary btn-sm" onclick="showCreateForm('Competitive_Intel__c')">+ 情報追加</button>`);

  let html = '';

  // 競合別サマリー
  const competitors = [...new Set(intels.map(i => i.Competitor__c).filter(Boolean))];
  html += `<div class="kpi-row">`;
  html += `<div class="kpi-card"><div class="kpi-value">${intels.length}</div><div class="kpi-label">総情報件数</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-value" style="color:#c62828">${intels.filter(i => i.Impact__c === '高').length}</div><div class="kpi-label">高影響度</div></div>`;
  competitors.forEach(c => {
    const cnt = intels.filter(i => i.Competitor__c === c).length;
    html += `<div class="kpi-card"><div class="kpi-value">${cnt}</div><div class="kpi-label">${c.split('（')[0]}</div></div>`;
  });
  html += `</div>`;

  // 時系列表示
  html += `<div class="card"><div class="card-header"><h3>競合情報タイムライン</h3></div>`;
  intels.forEach(i => {
    const impactCls = {高:'s-red',中:'s-orange',低:'s-blue'}[i.Impact__c] || 's-gray';
    html += `<div class="intel-card" onclick="showDetail('Competitive_Intel__c','${i.id}')">
      <div class="intel-header">
        <span class="intel-date">${i.Date__c||'-'}</span>
        <span class="intel-competitor">${i.Competitor__c||'-'}</span>
        <span class="intel-type">${i.Intel_Type__c||'-'}</span>
        <span class="status ${impactCls}">影響度: ${i.Impact__c||'-'}</span>
      </div>
      <div class="intel-title"><strong>${i.Name}</strong></div>
      <div class="intel-summary">${(i.Summary__c||'').substring(0,300)}${(i.Summary__c||'').length > 300 ? '...' : ''}</div>
      ${i.Action_Required__c ? `<div class="intel-action">📌 要アクション: ${i.Action_Required__c}</div>` : ''}
      <div class="intel-source">情報源: ${i.Source__c||'-'} | 報告: ${getUserName(i.OwnerId)}</div>
    </div>`;
  });
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

// ========================================
//  コンプライアンスダッシュボード
// ========================================
function renderComplianceDashboard() {
  const maActs = store.MA_Activity__c || [];
  const seminars = store.Seminar__c || [];
  const approvals = store.Approval_Request__c || [];
  const expenses = store.Expense_Report__c || [];

  renderTopbar('コンプライアンスダッシュボード', '⚖️');

  let html = '';

  // KPI
  const compliantMA = maActs.filter(m => m.Compliance_Approved__c).length;
  const totalMA = maActs.length;
  const pendingApprovals = approvals.filter(a => a.Status__c === '承認待ち' || a.Status__c === '申請中').length;
  const unapprovedExpenses = expenses.filter(e => e.Status__c === '申請中').length;

  html += `<div class="kpi-row">
    <div class="kpi-card"><div class="kpi-value" style="color:#4caf50">${totalMA > 0 ? Math.round(compliantMA/totalMA*100) : 0}%</div><div class="kpi-label">MA活動コンプラ承認率</div></div>
    <div class="kpi-card"><div class="kpi-value" style="color:#ff9800">${pendingApprovals}</div><div class="kpi-label">未処理承認件数</div></div>
    <div class="kpi-card"><div class="kpi-value">${unapprovedExpenses}</div><div class="kpi-label">未承認経費精算</div></div>
    <div class="kpi-card"><div class="kpi-value">${seminars.filter(s => s.Budget__c > 1000000).length}</div><div class="kpi-label">100万円超セミナー</div></div>
  </div>`;

  // 透明性ガイドライン チェック
  html += `<div class="card"><div class="card-header"><h3>透明性ガイドライン チェックリスト</h3></div>`;
  const checks = [
    {item:'KOL講演謝金の上限遵守（1回50万円以下）',status:true,detail:'全講演が基準内'},
    {item:'アドバイザリーボード謝金の上限遵守（1人20万円以下）',status:true,detail:'MA002: ¥200,000/人 - 基準内'},
    {item:'勉強会弁当 1人5,000円以下',status:true,detail:'全弁当が基準内（最高¥2,000/人）'},
    {item:'セミナー会場の適切性',status:true,detail:'医療関係者向け学術目的の会場を使用'},
    {item:'日本製薬工業協会 透明性ガイドライン準拠',status:true,detail:'講演料・原稿執筆料・コンサルティング料を年次報告対象として記録'},
    {item:'利益相反（COI）管理',status:false,detail:'油谷先生のCOI申告書の更新が必要（期限: 2026/3/31）'}
  ];
  checks.forEach(c => {
    html += `<div class="compliance-check"><span class="compliance-icon">${c.status ? '✅' : '⚠️'}</span><div class="compliance-info"><strong>${c.item}</strong><div class="compliance-detail">${c.detail}</div></div></div>`;
  });
  html += `</div>`;

  // 高額承認案件一覧
  const highValue = approvals.filter(a => (a.Amount__c||0) >= 500000).sort((a,b) => (b.Amount__c||0)-(a.Amount__c||0));
  html += `<div class="card"><div class="card-header"><h3>高額承認案件（50万円以上）</h3></div>`;
  html += `<div class="table-wrap"><table><thead><tr><th>案件名</th><th>種別</th><th>金額</th><th>ステータス</th><th>申請者</th><th>承認者</th></tr></thead><tbody>`;
  highValue.forEach(a => {
    const cls = {承認済:'s-green',承認待ち:'s-orange',申請中:'s-blue',差戻し:'s-red'}[a.Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Approval_Request__c','${a.id}')"><td>${a.Name}</td><td>${a.Request_Type__c||'-'}</td><td>¥${Number(a.Amount__c).toLocaleString()}</td><td><span class="status ${cls}">${a.Status__c}</span></td><td>${getUserName(a.Requested_By__c)}</td><td>${getUserName(a.Approver__c)}</td></tr>`;
  });
  html += `</tbody></table></div></div>`;

  document.getElementById('content').innerHTML = html;
}

// ========================================
//  経費精算ビュー
// ========================================
function renderExpenseReport() {
  const uid = window.currentUser?.id || 'U002';
  const expenses = store.Expense_Report__c || [];
  const myExpenses = expenses.filter(e => e.OwnerId === uid);

  renderTopbar('経費精算', '💴', `<button class="btn btn-primary btn-sm" onclick="showCreateForm('Expense_Report__c')">+ 経費登録</button>`);

  let html = '';

  const totalPending = myExpenses.filter(e => e.Status__c === '申請中').reduce((s,e) => s+(e.Amount__c||0), 0);
  const totalApproved = myExpenses.filter(e => e.Status__c === '承認済' || e.Status__c === '支払済').reduce((s,e) => s+(e.Amount__c||0), 0);

  html += `<div class="kpi-row">
    <div class="kpi-card"><div class="kpi-value">${myExpenses.length}</div><div class="kpi-label">今月の経費件数</div></div>
    <div class="kpi-card"><div class="kpi-value">¥${totalPending.toLocaleString()}</div><div class="kpi-label">申請中金額</div></div>
    <div class="kpi-card"><div class="kpi-value" style="color:#4caf50">¥${totalApproved.toLocaleString()}</div><div class="kpi-label">承認済金額</div></div>
  </div>`;

  // 種別別集計
  const byType = {};
  myExpenses.forEach(e => { byType[e.Expense_Type__c] = (byType[e.Expense_Type__c]||0) + (e.Amount__c||0); });
  html += `<div class="card"><div class="card-header"><h3>経費種別内訳</h3></div><div class="expense-breakdown">`;
  Object.entries(byType).sort((a,b) => b[1]-a[1]).forEach(([type, amount]) => {
    html += `<div class="expense-type-row"><span class="expense-type-label">${type}</span><div class="expense-type-bar-wrap"><div class="expense-type-bar" style="width:${Math.round(amount/Math.max(...Object.values(byType))*100)}%"></div></div><span class="expense-type-amount">¥${amount.toLocaleString()}</span></div>`;
  });
  html += `</div></div>`;

  // 経費一覧
  html += `<div class="card"><div class="card-header"><h3>経費一覧</h3></div>`;
  html += `<div class="table-wrap"><table><thead><tr><th>番号</th><th>日付</th><th>種別</th><th>金額</th><th>内容</th><th>領収書</th><th>ステータス</th></tr></thead><tbody>`;
  myExpenses.sort((a,b) => (b.Report_Date__c||'').localeCompare(a.Report_Date__c||'')).forEach(e => {
    const cls = {下書き:'s-gray',申請中:'s-blue',承認済:'s-green',差戻し:'s-red',支払済:'s-teal'}[e.Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Expense_Report__c','${e.id}')"><td>${e.Name}</td><td>${e.Report_Date__c||'-'}</td><td>${e.Expense_Type__c||'-'}</td><td>¥${(e.Amount__c||0).toLocaleString()}</td><td>${e.Description__c||'-'}</td><td>${e.Receipt_Attached__c ? '✅' : '❌'}</td><td><span class="status ${cls}">${e.Status__c||'-'}</span></td></tr>`;
  });
  html += `</tbody></table></div></div>`;

  document.getElementById('content').innerHTML = html;
}

// ========================================
//  テリトリー分析
// ========================================
function renderTerritory() {
  const institutions = store.Medical_Institution__c || [];
  const doctors = store.Doctor__c || [];
  const visits = store.Visit_Record__c || [];

  renderTopbar('テリトリー分析', '🗾');

  let html = '';

  // 都道府県別サマリー
  const byPref = {};
  institutions.forEach(inst => {
    const pref = inst.Prefecture__c || '不明';
    if (!byPref[pref]) byPref[pref] = {institutions:0,doctors:0,visits:0,adopted:0,specimens:0};
    byPref[pref].institutions++;
    if (inst.Adapter_Status__c === '導入完了') byPref[pref].adopted++;
  });
  doctors.forEach(d => {
    const inst = institutions.find(i => i.id === d.Institution__c);
    const pref = inst?.Prefecture__c || '不明';
    if (byPref[pref]) byPref[pref].doctors++;
  });
  visits.forEach(v => {
    const inst = institutions.find(i => i.id === v.Institution__c);
    const pref = inst?.Prefecture__c || '不明';
    if (byPref[pref]) byPref[pref].visits++;
  });

  html += `<div class="card"><div class="card-header"><h3>地域別カバレッジ</h3></div>`;
  html += `<div class="table-wrap"><table><thead><tr><th>都道府県</th><th>医療機関数</th><th>導入済</th><th>ドクター数</th><th>訪問数</th><th>カバー率</th></tr></thead><tbody>`;
  Object.entries(byPref).sort((a,b) => b[1].institutions - a[1].institutions).forEach(([pref, data]) => {
    const coverRate = data.institutions > 0 ? Math.round(data.adopted/data.institutions*100) : 0;
    const barColor = coverRate >= 75 ? '#4caf50' : coverRate >= 50 ? '#ff9800' : '#f44336';
    html += `<tr><td><strong>${pref}</strong></td><td>${data.institutions}</td><td>${data.adopted}</td><td>${data.doctors}</td><td>${data.visits}</td><td><div style="display:flex;align-items:center;gap:8px"><div style="width:80px;height:8px;background:#eee;border-radius:4px"><div style="width:${coverRate}%;height:100%;background:${barColor};border-radius:4px"></div></div>${coverRate}%</div></td></tr>`;
  });
  html += `</tbody></table></div></div>`;

  // MR別担当エリア
  const mrUsers = USERS.filter(u => u.team === 'Sales');
  html += `<div class="card"><div class="card-header"><h3>MR別担当状況</h3></div><div class="mr-territory-grid">`;
  mrUsers.forEach(mr => {
    const myDocs = doctors.filter(d => d.OwnerId === mr.id);
    const myVisits = visits.filter(v => v.OwnerId === mr.id);
    const myInsts = [...new Set(myDocs.map(d => d.Institution__c))];
    html += `<div class="mr-territory-card">
      <h4>${mr.photo} ${mr.name}（${mr.role}）</h4>
      <div class="mr-stats"><span>担当ドクター: ${myDocs.length}名</span><span>担当施設: ${myInsts.length}施設</span><span>訪問数: ${myVisits.length}件</span></div>
      <div class="mr-doctor-list">`;
    myDocs.forEach(d => {
      const inst = getInstitutionName(d.Institution__c);
      html += `<div class="mr-doctor-chip" onclick="renderDoctor360('${d.id}')">${d.Name}<small>${inst}</small></div>`;
    });
    html += `</div></div>`;
  });
  html += `</div></div>`;

  document.getElementById('content').innerHTML = html;
}

// ========================================
//  検体トラッカー
// ========================================
function renderSpecimenTracker() {
  const specimens = (store.Specimen__c||[]).sort((a,b) => (b.Received_Date__c||'').localeCompare(a.Received_Date__c||''));
  const orders = store.Testing_Order__c || [];

  renderTopbar('検体トラッカー', '📦');

  let html = '';

  // ステータスパイプライン
  const statuses = ['受領待ち','受領済','QC中','解析中','レポート作成','レビュー中','完了'];
  html += `<div class="specimen-pipeline">`;
  statuses.forEach((st, i) => {
    const cnt = specimens.filter(s => s.Status__c === st).length;
    const isLast = i === statuses.length - 1;
    html += `<div class="pipeline-stage ${cnt > 0 ? 'active' : ''}">
      <div class="pipeline-count">${cnt}</div>
      <div class="pipeline-label">${st}</div>
      ${!isLast ? '<div class="pipeline-arrow">→</div>' : ''}
    </div>`;
  });
  html += `</div>`;

  // 検体タイムライン
  html += `<div class="card"><div class="card-header"><h3>検体一覧（TAT順）</h3></div>`;
  specimens.forEach(sp => {
    const order = orders.find(o => o.Specimen__c === sp.id);
    const inst = getInstitutionName(sp.Institution__c);
    const doc = (store.Doctor__c||[]).find(d => d.id === sp.Referring_Doctor__c);
    const tatColor = (sp.TAT_Days__c||0) > 14 ? '#c62828' : (sp.TAT_Days__c||0) > 10 ? '#e65100' : '#2e7d32';
    const progress = ({受領待ち:0,受領済:15,QC中:30,解析中:50,レポート作成:70,レビュー中:85,完了:100})[sp.Status__c] || 0;

    html += `<div class="specimen-card" onclick="showDetail('Specimen__c','${sp.id}')">
      <div class="specimen-header">
        <strong>${sp.Name}</strong>
        <span>${sp.Cancer_Type__c||'-'}</span>
        <span>${sp.Specimen_Type__c||'-'}</span>
        <span class="status ${({受領待ち:'s-gray',受領済:'s-blue',QC中:'s-orange',解析中:'s-purple',レポート作成:'s-teal',レビュー中:'s-yellow',完了:'s-green',不適格:'s-red'})[sp.Status__c]||'s-gray'}">${sp.Status__c}</span>
        <span style="color:${tatColor};font-weight:600">TAT ${sp.TAT_Days__c||0}日</span>
      </div>
      <div class="specimen-progress"><div class="specimen-progress-bar" style="width:${progress}%"></div></div>
      <div class="specimen-meta">
        <span>🏥 ${inst}</span>
        <span>👨‍⚕️ ${doc ? doc.Name : '-'}</span>
        <span>患者: ${sp.Patient_ID__c||'-'}</span>
        <span>QC: ${sp.QC_Status__c||'未実施'}</span>
        <span>レビュー: ${sp.Review_Status__c||'-'}</span>
        ${sp.Report_Date__c ? `<span>レポート: ${sp.Report_Date__c}</span>` : ''}
      </div>
    </div>`;
  });
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

// ===========================================
// スケジュール帳（個人別 週間ビュー）
// ===========================================
let scheduleUserId = null;
let scheduleWeekOffset = 0;

function renderSchedule(userId) {
  if (userId) { scheduleUserId = userId; scheduleWeekOffset = 0; }
  const uid = scheduleUserId || window.currentUser?.id || 'U002';
  scheduleUserId = uid;
  const user = USERS.find(u => u.id === uid) || USERS[1];
  const teamLabel = {Sales:'営業',MA:'MA',Lab:'ラボ',Research:'研究',Executive:'経営',External:'外部'}[user.team]||'';

  renderTopbar(`${user.name} のスケジュール帳`, '📅',
    `<button class="btn btn-sm btn-secondary" onclick="scheduleWeekOffset--;renderSchedule()">◀ 前週</button>
     <button class="btn btn-sm btn-primary" onclick="scheduleWeekOffset=0;renderSchedule()">今週</button>
     <button class="btn btn-sm btn-secondary" onclick="scheduleWeekOffset++;renderSchedule()">翌週 ▶</button>`);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset + scheduleWeekOffset * 7);
  const weekDates = [];
  for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); weekDates.push(d); }
  const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dayNames = ['日','月','火','水','木','金','土'];

  const fieldUsers = USERS.filter(u => u.team !== 'External');
  let html = `<div class="schedule-user-tabs">`;
  fieldUsers.forEach(u => {
    html += `<div class="schedule-user-tab ${u.id===uid?'active':''}" onclick="renderSchedule('${u.id}')">
      <span class="tab-photo">${u.photo||'👤'}</span><span class="tab-name">${u.name}</span><span class="tab-role">${u.role}</span></div>`;
  });
  html += `</div>`;

  const weekLabel = `${weekDates[0].getMonth()+1}/${weekDates[0].getDate()} 〜 ${weekDates[6].getMonth()+1}/${weekDates[6].getDate()}`;
  html += `<div class="card"><div class="card-header"><h3>${weekLabel}（${user.name} - ${teamLabel} ${user.role}）</h3></div>`;

  const visits = (store.Visit_Record__c||[]).filter(v => v.OwnerId === uid);
  const events = (store.Event||[]).filter(e => e.OwnerId === uid);
  const tasks = (store.Task||[]).filter(t => t.OwnerId === uid);
  const seminars = (store.Seminar__c||[]).filter(s => s.OwnerId === uid);
  const maActs = (store.MA_Activity__c||[]).filter(m => m.OwnerId === uid);
  const reports = (store.Daily_Report__c||[]).filter(r => r.OwnerId === uid);

  html += `<div class="schedule-week">`;
  weekDates.forEach((date, idx) => {
    const ds = fmtDate(date);
    const isToday = ds === _todayStr;
    const isWeekend = idx >= 5;
    const dv = visits.filter(v => v.Visit_Date__c === ds);
    const de = events.filter(e => (e.StartDateTime||'').startsWith(ds));
    const dt = tasks.filter(t => t.ActivityDate === ds);
    const ds2 = seminars.filter(s => s.Date__c === ds);
    const dm = maActs.filter(m => m.Activity_Date__c === ds);
    const dr = reports.filter(r => r.Report_Date__c === ds);
    const cnt = dv.length + de.length + dt.length + ds2.length + dm.length;

    html += `<div class="schedule-day ${isToday?'today':''} ${isWeekend?'weekend':''}">
      <div class="schedule-day-header"><span class="schedule-date ${isToday?'today-badge':''}">${date.getMonth()+1}/${date.getDate()}</span>
        <span class="schedule-dow">${dayNames[date.getDay()]}</span>${cnt>0?`<span class="schedule-count">${cnt}</span>`:''}</div>`;
    dv.forEach(v => { const doc=(store.Doctor__c||[]).find(d=>d.id===v.Doctor__c); html+=`<div class="schedule-item visit" onclick="showDetail('Visit_Record__c','${v.id}')"><div class="si-icon">🏥</div><div class="si-body"><div class="si-title">訪問: ${doc?doc.Name:'-'}</div><div class="si-sub">${getInstitutionName(v.Institution__c)}</div>${v.Purpose__c?`<div class="si-note">${v.Purpose__c}</div>`:''}</div></div>`; });
    ds2.forEach(s => { html+=`<div class="schedule-item seminar" onclick="showDetail('Seminar__c','${s.id}')"><div class="si-icon">📚</div><div class="si-body"><div class="si-title">${s.Name}</div><div class="si-sub">${s.Venue__c||'-'}</div></div></div>`; });
    dm.forEach(m => { html+=`<div class="schedule-item ma" onclick="showDetail('MA_Activity__c','${m.id}')"><div class="si-icon">🎤</div><div class="si-body"><div class="si-title">MA: ${m.Activity_Type__c||'活動'}</div><div class="si-sub">${resolveRef(m.Doctor__c,'Doctor__c')}</div></div></div>`; });
    de.forEach(e => { html+=`<div class="schedule-item event" onclick="showDetail('Event','${e.id}')"><div class="si-icon">📅</div><div class="si-body"><div class="si-title">${e.Subject}</div><div class="si-sub">${e.Location||'-'}</div></div></div>`; });
    dt.forEach(t => { html+=`<div class="schedule-item task" onclick="showDetail('Task','${t.id}')"><div class="si-icon">${t.Status==='完了'?'✅':'⬜'}</div><div class="si-body"><div class="si-title">${t.Subject}</div><div class="si-sub">${t.Priority||'-'}</div></div></div>`; });
    dr.forEach(r => { html+=`<div class="schedule-item report"><div class="si-icon">📝</div><div class="si-body"><div class="si-title">日報</div><div class="si-sub"><span class="status ${({下書き:'s-gray',提出済:'s-orange',承認済:'s-green',差戻し:'s-red'})[r.Approval_Status__c]||'s-gray'}">${r.Approval_Status__c||'下書き'}</span></div></div></div>`; });
    if (cnt === 0 && dr.length === 0) html += `<div class="schedule-empty">予定なし</div>`;
    html += `</div>`;
  });
  html += `</div></div>`;

  // 月間サマリー
  html += `<div class="card"><div class="card-header"><h3>${user.name} の今月サマリー</h3></div><div class="kpi-row cols-6">`;
  html += `<div class="kpi-card blue"><div class="kpi-val">${visits.filter(v=>(v.Visit_Date__c||'').startsWith(_curMonth)).length}</div><div class="kpi-label">訪問</div></div>`;
  html += `<div class="kpi-card purple"><div class="kpi-val">${seminars.filter(s=>(s.Date__c||'').startsWith(_curMonth)).length}</div><div class="kpi-label">勉強会</div></div>`;
  html += `<div class="kpi-card teal"><div class="kpi-val">${maActs.filter(m=>(m.Activity_Date__c||'').startsWith(_curMonth)).length}</div><div class="kpi-label">MA活動</div></div>`;
  html += `<div class="kpi-card green"><div class="kpi-val">${reports.filter(r=>(r.Report_Date__c||'').startsWith(_curMonth)&&r.Approval_Status__c==='承認済').length}/${reports.filter(r=>(r.Report_Date__c||'').startsWith(_curMonth)).length}</div><div class="kpi-label">日報</div></div>`;
  html += `<div class="kpi-card orange"><div class="kpi-val">${tasks.filter(t=>t.Status!=='完了').length}</div><div class="kpi-label">未完了タスク</div></div>`;
  const tgts = (store.Visit_Target__c||[]).filter(t=>t.OwnerId===uid&&t.Target_Month__c===_curMonth);
  html += `<div class="kpi-card red"><div class="kpi-val">${tgts.filter(t=>t.Status__c==='達成').length}/${tgts.length}</div><div class="kpi-label">巡回目標</div></div>`;
  html += `</div></div>`;

  document.getElementById('content').innerHTML = html;
}

// ===========================================
// 巡回目標管理
// ===========================================
function renderVisitTarget() {
  renderTopbar('巡回目標管理', '🎯');
  const targets = store.Visit_Target__c || [];
  const month = _curMonth;
  const monthTargets = targets.filter(t => t.Target_Month__c === month);
  const totalT = monthTargets.length;
  const achieved = monthTargets.filter(t=>t.Status__c==='達成').length;
  const inProg = monthTargets.filter(t=>t.Status__c==='進行中').length;
  const notStarted = monthTargets.filter(t=>t.Status__c==='未着手').length;
  const totalTarget = monthTargets.reduce((s,t)=>s+(t.Target_Visits__c||0),0);
  const totalActual = monthTargets.reduce((s,t)=>s+(t.Actual_Visits__c||0),0);
  const overallRate = totalTarget>0 ? Math.round(totalActual/totalTarget*100) : 0;

  let html = `<div class="kpi-row cols-6">
    <div class="kpi-card blue"><div class="kpi-val">${totalT}</div><div class="kpi-label">目標総数</div></div>
    <div class="kpi-card green"><div class="kpi-val">${achieved}</div><div class="kpi-label">達成</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${inProg}</div><div class="kpi-label">進行中</div></div>
    <div class="kpi-card red"><div class="kpi-val">${notStarted}</div><div class="kpi-label">未着手</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${totalActual}/${totalTarget}</div><div class="kpi-label">訪問回数</div></div>
    <div class="kpi-card teal"><div class="kpi-val">${overallRate}%</div><div class="kpi-label">全体達成率</div></div>
  </div>`;

  // 担当者別
  const salesMA = USERS.filter(u=>['Sales','MA'].includes(u.team));
  html += `<div class="card"><div class="card-header"><h3>担当者別 巡回目標（${month}）</h3></div><div class="visit-target-grid">`;
  salesMA.forEach(u => {
    const my = monthTargets.filter(t=>t.OwnerId===u.id);
    if (!my.length) return;
    const myT = my.reduce((s,t)=>s+(t.Target_Visits__c||0),0);
    const myA = my.reduce((s,t)=>s+(t.Actual_Visits__c||0),0);
    const myR = myT>0?Math.round(myA/myT*100):0;
    const rc = myR>=80?'#2e7d32':myR>=50?'#e65100':'#c62828';
    html += `<div class="visit-target-user-card"><div class="vt-user-header"><span class="vt-photo">${u.photo}</span><div class="vt-user-info"><strong>${u.name}</strong><span>${u.role}</span></div><div class="vt-rate" style="color:${rc}"><span class="vt-rate-num">${myR}%</span></div></div>
      <div class="vt-progress"><div class="vt-progress-bar" style="width:${myR}%;background:${rc}"></div></div>
      <div class="vt-stats"><span>目標:${my.length}件</span><span>達成:${my.filter(t=>t.Status__c==='達成').length}件</span><span>訪問:${myA}/${myT}回</span></div>`;
    my.forEach(t => {
      const doc=(store.Doctor__c||[]).find(d=>d.id===t.Doctor__c);
      const rate=t.Target_Visits__c>0?Math.round((t.Actual_Visits__c||0)/t.Target_Visits__c*100):0;
      const pc={'A（最優先）':'#c62828','B（重要）':'#e65100','C（通常）':'#0176d3','D（低）':'#999'}[t.Priority__c]||'#999';
      html+=`<div class="vt-item" onclick="showDetail('Visit_Target__c','${t.id}')"><div class="vt-item-header"><span class="vt-priority" style="background:${pc}">${(t.Priority__c||'C')[0]}</span><span class="vt-item-title">${doc?doc.Name:'-'}</span><span class="vt-item-inst">${getInstitutionName(t.Institution__c)}</span><span class="status ${({未着手:'s-gray',進行中:'s-blue',達成:'s-green',未達:'s-red',中止:'s-orange'})[t.Status__c]||'s-gray'}">${t.Status__c}</span></div>
        <div class="vt-item-body"><span>${t.Visit_Purpose__c||'-'}</span><span>訪問:${t.Actual_Visits__c||0}/${t.Target_Visits__c||0}</span><div class="vt-mini-bar"><div class="vt-mini-fill" style="width:${rate}%"></div></div><span>${rate}%</span></div>
        ${t.Next_Visit_Date__c?`<div class="vt-next">次回:${t.Next_Visit_Date__c}</div>`:''}
        ${t.Note__c?`<div class="vt-note">${t.Note__c}</div>`:''}</div>`;
    });
    html += `</div>`;
  });
  html += `</div></div>`;

  // 全目標テーブル
  html += `<div class="card"><div class="card-header"><h3>全目標一覧</h3></div><table><thead><tr><th>優先</th><th>担当</th><th>ドクター</th><th>施設</th><th>目的</th><th>目標</th><th>実績</th><th>達成率</th><th>次回</th><th>状態</th></tr></thead><tbody>`;
  monthTargets.sort((a,b)=>(a.Priority__c||'D').localeCompare(b.Priority__c||'D')).forEach(t => {
    const doc=(store.Doctor__c||[]).find(d=>d.id===t.Doctor__c);
    const rate=t.Target_Visits__c>0?Math.round((t.Actual_Visits__c||0)/t.Target_Visits__c*100):0;
    html+=`<tr onclick="showDetail('Visit_Target__c','${t.id}')"><td><span class="vt-priority" style="background:${{
      'A（最優先）':'#c62828','B（重要）':'#e65100','C（通常）':'#0176d3','D（低）':'#999'}[t.Priority__c]||'#999'}">${(t.Priority__c||'C')[0]}</span></td>
      <td>${getUserName(t.OwnerId)}</td><td class="cell-link">${doc?doc.Name:'-'}</td><td>${getInstitutionName(t.Institution__c)}</td><td>${t.Visit_Purpose__c||'-'}</td>
      <td>${t.Target_Visits__c||0}</td><td>${t.Actual_Visits__c||0}</td><td style="font-weight:700;color:${rate>=80?'#2e7d32':rate>=50?'#e65100':'#c62828'}">${rate}%</td>
      <td>${t.Next_Visit_Date__c||'-'}</td><td><span class="status ${({未着手:'s-gray',進行中:'s-blue',達成:'s-green',未達:'s-red',中止:'s-orange'})[t.Status__c]||'s-gray'}">${t.Status__c}</span></td></tr>`;
  });
  html += `</tbody></table></div>`;
  document.getElementById('content').innerHTML = html;
}

// ===========================================
// MR個人ダッシュボード
// ===========================================
function renderMRDashboard(userId) {
  const uid = userId || window.currentUser?.id || 'U002';
  const user = USERS.find(u=>u.id===uid) || USERS[1];
  const salesUsers = USERS.filter(u=>u.team==='Sales');

  renderTopbar(`${user.name} の営業ダッシュボード`, '💼',
    `<select class="filter-select" onchange="renderMRDashboard(this.value)">${salesUsers.map(u=>`<option value="${u.id}" ${u.id===uid?'selected':''}>${u.photo} ${u.name} (${u.role})</option>`).join('')}</select>`);

  const myDocs = (store.Doctor__c||[]).filter(d=>d.OwnerId===uid);
  const myVisits = (store.Visit_Record__c||[]).filter(v=>v.OwnerId===uid);
  const myPharma = (store.Pharma_Opportunity__c||[]).filter(p=>p.OwnerId===uid);
  const myTargets = (store.Visit_Target__c||[]).filter(t=>t.OwnerId===uid&&t.Target_Month__c===_curMonth);
  const myTasks = (store.Task||[]).filter(t=>t.OwnerId===uid);

  const pipeAmt = myPharma.filter(p=>!['受注','失注'].includes(p.Phase__c)).reduce((s,p)=>s+(p.Amount__c||0),0);
  const wonAmt = myPharma.filter(p=>p.Phase__c==='受注').reduce((s,p)=>s+(p.Amount__c||0),0);
  const monthV = myVisits.filter(v=>(v.Visit_Date__c||'').startsWith(_curMonth)).length;
  const tAch = myTargets.length>0?Math.round(myTargets.filter(t=>t.Status__c==='達成').length/myTargets.length*100):0;

  let html = `<div class="kpi-row cols-6">
    <div class="kpi-card blue"><div class="kpi-val">${myDocs.length}</div><div class="kpi-label">担当ドクター</div></div>
    <div class="kpi-card green"><div class="kpi-val">${monthV}</div><div class="kpi-label">今月訪問</div></div>
    <div class="kpi-card purple"><div class="kpi-val">¥${(pipeAmt/1000000).toFixed(0)}M</div><div class="kpi-label">パイプライン</div></div>
    <div class="kpi-card orange"><div class="kpi-val">¥${(wonAmt/1000000).toFixed(0)}M</div><div class="kpi-label">受注額</div></div>
    <div class="kpi-card teal"><div class="kpi-val">${tAch}%</div><div class="kpi-label">巡回目標達成率</div></div>
    <div class="kpi-card red"><div class="kpi-val">${myTasks.filter(t=>t.Status!=='完了').length}</div><div class="kpi-label">未完了タスク</div></div>
  </div>`;

  // 巡回目標
  if (myTargets.length) {
    html += `<div class="card"><div class="card-header"><h3>巡回目標（2月）</h3></div>`;
    myTargets.forEach(t => {
      const doc=(store.Doctor__c||[]).find(d=>d.id===t.Doctor__c);
      const rate=t.Target_Visits__c>0?Math.round((t.Actual_Visits__c||0)/t.Target_Visits__c*100):0;
      html+=`<div class="vt-item" onclick="showDetail('Visit_Target__c','${t.id}')"><div class="vt-item-header"><span class="vt-priority" style="background:${{
        'A（最優先）':'#c62828','B（重要）':'#e65100','C（通常）':'#0176d3','D（低）':'#999'}[t.Priority__c]||'#999'}">${(t.Priority__c||'C')[0]}</span>
        <span class="vt-item-title">${doc?doc.Name:'-'}</span><span class="vt-item-inst">${getInstitutionName(t.Institution__c)}</span>
        <span style="font-weight:700;color:${rate>=80?'#2e7d32':rate>=50?'#e65100':'#c62828'}">${rate}%</span>
        <span class="status ${({未着手:'s-gray',進行中:'s-blue',達成:'s-green',未達:'s-red'})[t.Status__c]||'s-gray'}">${t.Status__c}</span></div>
        <div class="vt-item-body"><span>${t.Visit_Purpose__c||'-'}</span><span>訪問:${t.Actual_Visits__c||0}/${t.Target_Visits__c||0}</span>
        <div class="vt-mini-bar"><div class="vt-mini-fill" style="width:${rate}%"></div></div></div></div>`;
    });
    html += `</div>`;
  }

  // 担当ドクター
  html += `<div class="card"><div class="card-header"><h3>担当ドクター</h3><button class="btn btn-sm btn-primary" onclick="navigate('doctor-assign')">担当割当管理</button></div>
    <table><thead><tr><th>氏名</th><th>所属</th><th>診療科</th><th>関係度</th><th>訪問回数</th></tr></thead><tbody>`;
  myDocs.forEach(d => {
    const vCnt = myVisits.filter(v=>v.Doctor__c===d.id).length;
    html+=`<tr onclick="renderDoctor360('${d.id}')"><td class="cell-link">${d.Name}</td><td>${getInstitutionName(d.Institution__c)}</td><td>${d.Specialty__c||'-'}</td>
      <td><span class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray'}">${d.Relationship_Level__c||'-'}</span></td><td>${vCnt}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 商談
  if (myPharma.length) {
    html += `<div class="card"><div class="card-header"><h3>担当商談</h3></div><table><thead><tr><th>案件名</th><th>製薬会社</th><th>フェーズ</th><th>金額</th><th>確度</th></tr></thead><tbody>`;
    myPharma.forEach(p => { html+=`<tr onclick="showDetail('Pharma_Opportunity__c','${p.id}')"><td class="cell-link">${p.Name}</td><td>${p.Pharma_Company__c||'-'}</td><td><span class="status s-blue">${p.Phase__c}</span></td><td>¥${Number(p.Amount__c||0).toLocaleString()}</td><td>${p.Probability__c||0}%</td></tr>`; });
    html += `</tbody></table></div>`;
  }

  // 最近の訪問
  html += `<div class="card"><div class="card-header"><h3>最近の訪問記録</h3></div><table><thead><tr><th>日付</th><th>ドクター</th><th>施設</th><th>目的</th><th>結果</th></tr></thead><tbody>`;
  myVisits.sort((a,b)=>(b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||'')).slice(0,8).forEach(v => {
    html+=`<tr onclick="showDetail('Visit_Record__c','${v.id}')"><td>${v.Visit_Date__c||'-'}</td><td class="cell-link">${resolveRef(v.Doctor__c,'Doctor__c')}</td><td>${getInstitutionName(v.Institution__c)}</td><td>${v.Purpose__c||'-'}</td><td>${v.Result__c||'-'}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  document.getElementById('content').innerHTML = html;
}

// ===========================================
// MSL個人ダッシュボード
// ===========================================
function renderMSLDashboard(userId) {
  const uid = userId || 'U004';
  const user = USERS.find(u=>u.id===uid) || USERS[3];
  const maUsers = USERS.filter(u=>u.team==='MA');

  renderTopbar(`${user.name} のMA個人ダッシュボード`, '🎤',
    `<select class="filter-select" onchange="renderMSLDashboard(this.value)">${maUsers.map(u=>`<option value="${u.id}" ${u.id===uid?'selected':''}>${u.photo} ${u.name}</option>`).join('')}</select>`);

  const myMA = (store.MA_Activity__c||[]).filter(m=>m.OwnerId===uid);
  const myDocs = (store.Doctor__c||[]).filter(d=>d.OwnerId===uid);
  const myTargets = (store.Visit_Target__c||[]).filter(t=>t.OwnerId===uid&&t.Target_Month__c===_curMonth);
  const myResearch = (store.Joint_Research__c||[]).filter(r=>r.MSL__c===uid||r.OwnerId===uid);
  const myReports = (store.Daily_Report__c||[]).filter(r=>r.OwnerId===uid);

  const monthMA = myMA.filter(m=>(m.Activity_Date__c||'').startsWith(_curMonth)).length;
  const tAch = myTargets.length>0?Math.round(myTargets.filter(t=>t.Status__c==='達成').length/myTargets.length*100):0;

  let html = `<div class="kpi-row cols-6">
    <div class="kpi-card blue"><div class="kpi-val">${myDocs.length}</div><div class="kpi-label">担当KOL</div></div>
    <div class="kpi-card green"><div class="kpi-val">${monthMA}</div><div class="kpi-label">今月MA活動</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${myTargets.length}</div><div class="kpi-label">巡回目標</div></div>
    <div class="kpi-card teal"><div class="kpi-val">${tAch}%</div><div class="kpi-label">巡回達成率</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${myResearch.length}</div><div class="kpi-label">共同研究</div></div>
    <div class="kpi-card red"><div class="kpi-val">${myReports.filter(r=>r.Approval_Status__c==='提出済').length}</div><div class="kpi-label">承認待ち日報</div></div>
  </div>`;

  // 巡回目標
  if (myTargets.length) {
    html += `<div class="card"><div class="card-header"><h3>巡回目標（2月）</h3></div>`;
    myTargets.forEach(t => {
      const doc=(store.Doctor__c||[]).find(d=>d.id===t.Doctor__c);
      const rate=t.Target_Visits__c>0?Math.round((t.Actual_Visits__c||0)/t.Target_Visits__c*100):0;
      html+=`<div class="vt-item"><div class="vt-item-header"><span class="vt-priority" style="background:${{
        'A（最優先）':'#c62828','B（重要）':'#e65100','C（通常）':'#0176d3','D（低）':'#999'}[t.Priority__c]||'#999'}">${(t.Priority__c||'C')[0]}</span>
        <span class="vt-item-title">${doc?doc.Name:'-'}</span><span class="vt-item-inst">${getInstitutionName(t.Institution__c)}</span>
        <span style="font-weight:700;color:${rate>=80?'#2e7d32':rate>=50?'#e65100':'#c62828'}">${rate}%</span></div>
        <div class="vt-item-body"><span>訪問:${t.Actual_Visits__c||0}/${t.Target_Visits__c||0}</span><div class="vt-mini-bar"><div class="vt-mini-fill" style="width:${rate}%"></div></div></div></div>`;
    });
    html += `</div>`;
  }

  // MA活動一覧
  html += `<div class="card"><div class="card-header"><h3>最近のMA活動</h3></div><table><thead><tr><th>日付</th><th>種別</th><th>ドクター</th><th>施設</th><th>テーマ</th></tr></thead><tbody>`;
  myMA.sort((a,b)=>(b.Activity_Date__c||'').localeCompare(a.Activity_Date__c||'')).forEach(m => {
    html+=`<tr onclick="showDetail('MA_Activity__c','${m.id}')"><td>${m.Activity_Date__c||'-'}</td><td><span class="status s-purple">${m.Activity_Type__c||'-'}</span></td><td class="cell-link">${resolveRef(m.Doctor__c,'Doctor__c')}</td><td>${getInstitutionName(m.Institution__c)}</td><td>${m.Topic__c||'-'}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 共同研究
  if (myResearch.length) {
    html += `<div class="card"><div class="card-header"><h3>共同研究</h3></div><table><thead><tr><th>研究名</th><th>施設</th><th>フェーズ</th><th>ステータス</th></tr></thead><tbody>`;
    myResearch.forEach(r => { html+=`<tr onclick="showDetail('Joint_Research__c','${r.id}')"><td class="cell-link">${r.Name}</td><td>${getInstitutionName(r.Institution__c)}</td><td>${r.Phase__c||'-'}</td><td><span class="status s-blue">${r.Status__c||'-'}</span></td></tr>`; });
    html += `</tbody></table></div>`;
  }

  // 担当KOL
  html += `<div class="card"><div class="card-header"><h3>担当KOL</h3></div><table><thead><tr><th>氏名</th><th>所属</th><th>専門</th><th>関係度</th></tr></thead><tbody>`;
  myDocs.forEach(d => {
    html+=`<tr onclick="renderDoctor360('${d.id}')"><td class="cell-link">${d.Name}</td><td>${getInstitutionName(d.Institution__c)}</td><td>${d.Specialty__c||'-'}</td>
      <td><span class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray'}">${d.Relationship_Level__c||'-'}</span></td></tr>`;
  });
  html += `</tbody></table></div>`;
  document.getElementById('content').innerHTML = html;
}

// ===========================================
// ドクター担当割当・引き継ぎ（MA/営業マン対応）
// ===========================================
let handoverTab = 'handover'; // 'handover' or 'assign'

function renderDoctorAssign() {
  renderTopbar('担当割当・引き継ぎ管理', '🔄');
  const doctors = store.Doctor__c || [];
  const salesMA = USERS.filter(u=>['Sales','MA'].includes(u.team));

  let html = `<div style="display:flex;gap:8px;margin-bottom:20px">
    <button class="btn ${handoverTab==='handover'?'btn-primary':'btn-secondary'}" onclick="handoverTab='handover';renderDoctorAssign()">引き継ぎ</button>
    <button class="btn ${handoverTab==='assign'?'btn-primary':'btn-secondary'}" onclick="handoverTab='assign';renderDoctorAssign()">担当割当</button>
  </div>`;

  if (handoverTab === 'handover') {
    html += renderHandoverSection(doctors, salesMA);
  } else {
    html += renderAssignSection(doctors, salesMA);
  }

  document.getElementById('content').innerHTML = html;
}

function renderHandoverSection(doctors, salesMA) {
  let html = '';

  // 引き継ぎフォーム
  html += `<div class="card" style="border-left:4px solid #1565c0">
    <div class="card-header"><h3>引き継ぎ実行</h3><span style="font-size:13px;color:#666">退職・異動・担当変更時に使用</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div>
        <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">引き継ぎ元（退職/異動する人）</label>
        <select id="assign-from" class="filter-select" style="width:100%" onchange="previewHandover()">
          <option value="">-- 選択してください --</option>
          ${salesMA.map(u=>`<option value="${u.id}">${u.photo} ${u.name}（${u.role}）</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">引き継ぎ先（後任者）</label>
        <select id="assign-to" class="filter-select" style="width:100%" onchange="previewHandover()">
          <option value="">-- 選択してください --</option>
          ${salesMA.map(u=>`<option value="${u.id}">${u.photo} ${u.name}（${u.role}）</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
      <div>
        <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">引き継ぎ理由</label>
        <select id="handover-reason" class="filter-select" style="width:100%">
          <option value="退職">退職</option>
          <option value="異動">異動</option>
          <option value="担当変更">担当変更</option>
          <option value="産休・育休">産休・育休</option>
          <option value="その他">その他</option>
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">引き継ぎ日</label>
        <input type="date" id="handover-date" class="filter-select" style="width:100%" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">ステータス</label>
        <select id="handover-status" class="filter-select" style="width:100%">
          <option value="計画中">計画中</option>
          <option value="進行中">進行中</option>
          <option value="完了">完了</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">引き継ぎメモ</label>
      <textarea id="handover-note" class="filter-select" style="width:100%;min-height:60px;resize:vertical" placeholder="後任者への申し送り事項を記入..."></textarea>
    </div>
    <div id="handover-preview"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-primary" onclick="previewHandover()">プレビュー更新</button>
      <button class="btn btn-success" onclick="executeHandover()">引き継ぎ実行</button>
    </div>
  </div>`;

  // 引き継ぎチェックリスト
  html += `<div class="card">
    <div class="card-header"><h3>引き継ぎチェックリスト</h3></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${['担当ドクターの引き継ぎ','進行中商談の引き継ぎ','訪問記録の共有','巡回目標の再設定','MA活動の引き継ぎ','関係者への連絡','アクセス権限の変更','社内システムの更新'].map((item,i)=>`
        <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8f9fa;border-radius:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="check-${i}" style="width:16px;height:16px"> ${item}
        </label>`).join('')}
    </div>
  </div>`;

  // 担当者別サマリー
  html += `<div class="card">
    <div class="card-header"><h3>担当者別 保有状況サマリー</h3></div>
    <table><thead><tr><th>担当者</th><th>役職</th><th>チーム</th><th>担当ドクター</th><th>進行中商談</th><th>訪問記録</th><th>MA活動</th><th>巡回目標</th></tr></thead><tbody>`;
  salesMA.forEach(u => {
    const dCnt = (store.Doctor__c||[]).filter(d=>d.OwnerId===u.id).length;
    const pCnt = (store.Pharma_Opportunity__c||[]).filter(p=>p.OwnerId===u.id && !['受注','失注'].includes(p.Stage__c)).length;
    const vCnt = (store.Visit_Record__c||[]).filter(v=>v.OwnerId===u.id).length;
    const mCnt = (store.MA_Activity__c||[]).filter(m=>m.OwnerId===u.id).length;
    const tCnt = (store.Visit_Target__c||[]).filter(t=>t.OwnerId===u.id).length;
    html += `<tr>
      <td><strong>${u.photo} ${u.name}</strong></td>
      <td>${u.role}</td>
      <td><span class="status ${u.team==='Sales'?'s-blue':'s-purple'}">${u.team==='Sales'?'営業':'MA'}</span></td>
      <td style="text-align:center"><strong>${dCnt}</strong>名</td>
      <td style="text-align:center"><strong>${pCnt}</strong>件</td>
      <td style="text-align:center">${vCnt}件</td>
      <td style="text-align:center">${mCnt}件</td>
      <td style="text-align:center">${tCnt}件</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;

  return html;
}

function renderAssignSection(doctors, salesMA) {
  let html = '';

  // 担当者別ドクター一覧
  html += `<div class="card"><div class="card-header"><h3>担当者別ドクター割当</h3></div>`;
  html += `<div class="mr-territory-grid">`;
  salesMA.forEach(u => {
    const myDocs = doctors.filter(d=>d.OwnerId===u.id);
    html += `<div class="mr-territory-card">
      <h4>${u.photo} ${u.name}</h4>
      <div class="territory-meta">${u.role} · 担当ドクター: ${myDocs.length}名</div>
      <table style="font-size:12px"><thead><tr><th>ドクター</th><th>施設</th><th>関係度</th><th>割当変更</th></tr></thead><tbody>`;
    myDocs.forEach(d => {
      html += `<tr><td>${d.Name}</td><td>${getInstitutionName(d.Institution__c)}</td>
        <td><span class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray'}">${d.Relationship_Level__c||'-'}</span></td>
        <td><select class="filter-select" style="font-size:11px" onchange="reassignDoctor('${d.id}',this.value)">
          ${salesMA.map(su=>`<option value="${su.id}" ${su.id===u.id?'selected':''}>${su.name}</option>`).join('')}
        </select></td></tr>`;
    });
    html += `</tbody></table></div>`;
  });
  html += `</div></div>`;

  // 未割当ドクター
  const unassigned = doctors.filter(d => !salesMA.find(u=>u.id===d.OwnerId));
  if (unassigned.length) {
    html += `<div class="card"><div class="card-header"><h3 style="color:#c62828">未割当ドクター（${unassigned.length}名）</h3></div>
      <table><thead><tr><th>ドクター</th><th>施設</th><th>診療科</th><th>割当先</th></tr></thead><tbody>`;
    unassigned.forEach(d => {
      html += `<tr><td>${d.Name}</td><td>${getInstitutionName(d.Institution__c)}</td><td>${d.Specialty__c||'-'}</td>
        <td><select class="filter-select" onchange="reassignDoctor('${d.id}',this.value)"><option value="">-- 選択 --</option>
          ${salesMA.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}</select></td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  return html;
}

function reassignDoctor(docId, newOwnerId) {
  const doc = (store.Doctor__c||[]).find(d=>d.id===docId);
  if (doc && newOwnerId) {
    const oldOwner = getUserName(doc.OwnerId);
    doc.OwnerId = newOwnerId;
    showToast(`${doc.Name} の担当を ${oldOwner} → ${getUserName(newOwnerId)} に変更しました`, 'success');
  }
}

function previewHandover() {
  const fromId = document.getElementById('assign-from')?.value;
  const toId = document.getElementById('assign-to')?.value;
  const previewEl = document.getElementById('handover-preview');
  if (!previewEl) return;
  if (!fromId || !toId) { previewEl.innerHTML = '<p style="color:#888;font-size:13px">引き継ぎ元と引き継ぎ先を選択してください</p>'; return; }
  if (fromId === toId) { previewEl.innerHTML = '<p style="color:#c62828;font-size:13px">引き継ぎ元と先が同じです</p>'; return; }

  const docs = (store.Doctor__c||[]).filter(d=>d.OwnerId===fromId);
  const visits = (store.Visit_Record__c||[]).filter(v=>v.OwnerId===fromId);
  const pharma = (store.Pharma_Opportunity__c||[]).filter(p=>p.OwnerId===fromId);
  const targets = (store.Visit_Target__c||[]).filter(t=>t.OwnerId===fromId);
  const maActs = (store.MA_Activity__c||[]).filter(m=>m.OwnerId===fromId);

  let h = `<div style="background:#e3f2fd;padding:16px;border-radius:8px;border:1px solid #90caf9">
    <h4 style="margin-bottom:12px;color:#1565c0">引き継ぎプレビュー: ${getUserName(fromId)} → ${getUserName(toId)}</h4>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px">
      <div style="text-align:center;background:white;padding:8px;border-radius:6px"><div style="font-size:20px;font-weight:700;color:#1565c0">${docs.length}</div><div style="font-size:11px;color:#666">ドクター</div></div>
      <div style="text-align:center;background:white;padding:8px;border-radius:6px"><div style="font-size:20px;font-weight:700;color:#e65100">${pharma.length}</div><div style="font-size:11px;color:#666">商談</div></div>
      <div style="text-align:center;background:white;padding:8px;border-radius:6px"><div style="font-size:20px;font-weight:700;color:#2e7d32">${visits.length}</div><div style="font-size:11px;color:#666">訪問記録</div></div>
      <div style="text-align:center;background:white;padding:8px;border-radius:6px"><div style="font-size:20px;font-weight:700;color:#6a1b9a">${maActs.length}</div><div style="font-size:11px;color:#666">MA活動</div></div>
      <div style="text-align:center;background:white;padding:8px;border-radius:6px"><div style="font-size:20px;font-weight:700;color:#00695c">${targets.length}</div><div style="font-size:11px;color:#666">巡回目標</div></div>
    </div>
    <table style="font-size:12px"><thead><tr><th>対象ドクター</th><th>施設</th><th>関係度</th><th>訪問回数</th><th>進行商談</th></tr></thead><tbody>`;
  docs.forEach(d => {
    const vCnt = visits.filter(v=>v.Doctor__c===d.id).length;
    const pCnt = pharma.filter(p=>p.Doctor__c===d.id || p.Institution__c===d.Institution__c).length;
    h += `<tr><td>${d.Name}</td><td>${getInstitutionName(d.Institution__c)}</td><td>${d.Relationship_Level__c||'-'}</td><td>${vCnt}</td><td>${pCnt}</td></tr>`;
  });
  h += `</tbody></table></div>`;
  previewEl.innerHTML = h;
}

function executeHandover() {
  const fromId = document.getElementById('assign-from')?.value;
  const toId = document.getElementById('assign-to')?.value;
  if (!fromId || !toId) { showToast('引き継ぎ元と引き継ぎ先を選択してください','error'); return; }
  if (fromId === toId) { showToast('引き継ぎ元と先が同じです','error'); return; }

  const reason = document.getElementById('handover-reason')?.value || '';
  const date = document.getElementById('handover-date')?.value || '';

  let cnt = 0;
  (store.Doctor__c||[]).filter(d=>d.OwnerId===fromId).forEach(d => { d.OwnerId = toId; cnt++; });
  (store.Visit_Record__c||[]).filter(v=>v.OwnerId===fromId).forEach(v => { v.OwnerId = toId; });
  (store.Pharma_Opportunity__c||[]).filter(p=>p.OwnerId===fromId).forEach(p => { p.OwnerId = toId; });
  (store.Visit_Target__c||[]).filter(t=>t.OwnerId===fromId).forEach(t => { t.OwnerId = toId; });
  (store.MA_Activity__c||[]).filter(m=>m.OwnerId===fromId).forEach(m => { m.OwnerId = toId; });

  showToast(`${getUserName(fromId)} → ${getUserName(toId)} へ ${cnt}名のドクター + 関連レコードを引き継ぎました（理由: ${reason}、日付: ${date}）`, 'success');
  renderDoctorAssign();
}

// ===========================================
// セミナー参加者管理（CRM管理画面）
// ===========================================
function renderSeminarAttendees(seminarId) {
  const seminars = store.Seminar__c || [];
  const allAttendees = store.Seminar_Attendee__c || [];
  const bentos = store.Bento_Order__c || [];

  // セミナー未指定 → セミナー一覧+参加者サマリー
  if (!seminarId) {
    renderTopbar('セミナー参加者管理', '👥');
    let html = `<div class="kpi-row cols-4">
      <div class="kpi-card blue"><div class="kpi-val">${seminars.length}</div><div class="kpi-label">セミナー数</div></div>
      <div class="kpi-card green"><div class="kpi-val">${allAttendees.length}</div><div class="kpi-label">登録参加者</div></div>
      <div class="kpi-card orange"><div class="kpi-val">${allAttendees.filter(a=>a.Bento_Required__c).length}</div><div class="kpi-label">弁当希望</div></div>
      <div class="kpi-card purple"><div class="kpi-val">${allAttendees.filter(a=>a.Attendance_Status__c==='参加確定'||a.Attendance_Status__c==='参加').length}</div><div class="kpi-label">確定参加者</div></div>
    </div>`;

    html += `<div class="card"><div class="card-header"><h3>セミナー別参加者</h3></div>
      <table><thead><tr><th>セミナー名</th><th>日程</th><th>形式</th><th>定員</th><th>登録</th><th>確定</th><th>弁当</th><th>操作</th></tr></thead><tbody>`;
    seminars.sort((a,b)=>(b.Date__c||'').localeCompare(a.Date__c||'')).forEach(s => {
      const sAtt = allAttendees.filter(a=>a.Seminar__c===s.id);
      const confirmed = sAtt.filter(a=>a.Attendance_Status__c==='参加確定'||a.Attendance_Status__c==='参加').length;
      const bentoCount = sAtt.filter(a=>a.Bento_Required__c).length;
      html += `<tr>
        <td><span class="cell-link" onclick="renderSeminarAttendees('${s.id}')">${s.Name}</span></td>
        <td>${s.Date__c||'-'}</td>
        <td><span class="status s-blue">${s.Format__c||'-'}</span></td>
        <td>${s.Capacity__c||'-'}</td>
        <td><strong>${sAtt.length}</strong></td>
        <td>${confirmed}</td>
        <td>${bentoCount>0?`<span class="bento-badge">🍱${bentoCount}</span>`:'-'}</td>
        <td><button class="btn btn-sm btn-primary" onclick="renderSeminarAttendees('${s.id}')">参加者管理</button></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    document.getElementById('content').innerHTML = html;
    return;
  }

  // 特定セミナーの参加者管理
  const sem = seminars.find(s=>s.id===seminarId);
  if (!sem) return;
  const semAttendees = allAttendees.filter(a=>a.Seminar__c===seminarId);
  const semBentos = bentos.filter(b=>b.Seminar__c===seminarId);
  const confirmed = semAttendees.filter(a=>a.Attendance_Status__c==='参加確定'||a.Attendance_Status__c==='参加').length;
  const bentoCount = semAttendees.filter(a=>a.Bento_Required__c).length;
  const cancelled = semAttendees.filter(a=>a.Attendance_Status__c==='キャンセル').length;

  renderTopbar(`参加者管理: ${sem.Name}`, '👥',
    `<button class="btn btn-sm btn-secondary" onclick="renderSeminarAttendees()">← セミナー一覧</button>`);

  let html = `<div class="kpi-row cols-6">
    <div class="kpi-card blue"><div class="kpi-val">${semAttendees.length}</div><div class="kpi-label">登録数</div></div>
    <div class="kpi-card green"><div class="kpi-val">${confirmed}</div><div class="kpi-label">参加確定</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${semAttendees.length - confirmed - cancelled}</div><div class="kpi-label">未確定</div></div>
    <div class="kpi-card red"><div class="kpi-val">${cancelled}</div><div class="kpi-label">キャンセル</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${bentoCount}</div><div class="kpi-label">弁当希望</div></div>
    <div class="kpi-card teal"><div class="kpi-val">${sem.Capacity__c||'∞'}</div><div class="kpi-label">定員</div></div>
  </div>`;

  // セミナー情報
  html += `<div class="card"><div class="card-header"><h3>セミナー情報</h3></div>
    <div class="detail-grid">
      <div class="detail-field"><div class="dl">日程</div><div class="dv">${sem.Date__c||'-'} ${sem.Time__c||''}</div></div>
      <div class="detail-field"><div class="dl">形式</div><div class="dv">${sem.Format__c||'-'}</div></div>
      <div class="detail-field"><div class="dl">会場</div><div class="dv">${sem.Venue__c||'-'}</div></div>
      <div class="detail-field"><div class="dl">講師</div><div class="dv">${resolveRef(sem.Speaker__c,'Doctor__c')}</div></div>
      <div class="detail-field"><div class="dl">ステータス</div><div class="dv"><span class="status s-blue">${sem.Status__c||'-'}</span></div></div>
      <div class="detail-field"><div class="dl">担当</div><div class="dv">${getUserName(sem.OwnerId)}</div></div>
    </div>
  </div>`;

  // 参加者一覧
  html += `<div class="card"><div class="card-header"><h3>参加者一覧（${semAttendees.length}名）</h3>
    <button class="btn btn-sm btn-primary" onclick="showNewRecordForm('Seminar_Attendee__c',{Seminar__c:'${seminarId}'})">＋ 参加者追加</button></div>
    <table><thead><tr><th>氏名</th><th>所属施設</th><th>登録日</th><th>ステータス</th><th>弁当</th><th>備考</th></tr></thead><tbody>`;
  semAttendees.sort((a,b)=>(a.Registration_Date__c||'').localeCompare(b.Registration_Date__c||'')).forEach(a => {
    const inst = getInstitutionName(a.Institution__c);
    const stCls = {登録済:'s-blue',参加確定:'s-green',参加:'s-green',欠席:'s-red',キャンセル:'s-gray'}[a.Attendance_Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Seminar_Attendee__c','${a.id}')">
      <td><span class="cell-link">${a.Name}</span></td>
      <td>${inst}</td>
      <td>${a.Registration_Date__c||'-'}</td>
      <td><span class="status ${stCls}">${a.Attendance_Status__c||'-'}</span></td>
      <td>${a.Bento_Required__c ? '<span style="color:#e65100;font-weight:600">🍱 要</span>' : '<span style="color:#bbb">不要</span>'}</td>
      <td>${a.Note__c||'-'}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;

  // 弁当手配情報
  if (semBentos.length) {
    html += `<div class="card"><div class="card-header"><h3>🍱 弁当手配</h3></div>
      <table><thead><tr><th>手配名</th><th>業者</th><th>メニュー</th><th>数量</th><th>単価</th><th>合計</th><th>配達時間</th><th>ステータス</th></tr></thead><tbody>`;
    semBentos.forEach(b => {
      html += `<tr onclick="showDetail('Bento_Order__c','${b.id}')">
        <td><span class="cell-link">${b.Name}</span></td>
        <td>${b.Vendor__c||'-'}</td><td>${b.Menu__c||'-'}</td>
        <td>${b.Quantity__c||0}</td><td>¥${Number(b.Unit_Price__c||0).toLocaleString()}</td>
        <td><strong>¥${Number(b.Total__c||0).toLocaleString()}</strong></td>
        <td>${b.Delivery_Time__c||'-'}</td>
        <td><span class="status ${({手配中:'s-orange',発注済:'s-blue',配達済:'s-green',キャンセル:'s-red'})[b.Status__c]||'s-gray'}">${b.Status__c||'-'}</span></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  document.getElementById('content').innerHTML = html;
}

// ===========================================
// ワークフローエンジン
// ===========================================

let wfFilter = 'all'; // all, active, mine, completed

function renderWorkflowDashboard() {
  renderTopbar('ワークフロー管理', '⚙️', `<button class="btn btn-primary btn-sm" onclick="navigate('workflow-new')">+ 新規ワークフロー</button>`);
  const uid = window.currentUser?.id || 'U002';
  const wfs = store.Workflow_Instance__c || [];

  // フィルタリング
  let filtered = wfs;
  if (wfFilter === 'active') filtered = wfs.filter(w => ['進行中','承認待ち'].includes(w.Status__c));
  else if (wfFilter === 'mine') filtered = wfs.filter(w => w.Current_Assignee__c === uid || w.Requested_By__c === uid || w.OwnerId === uid);
  else if (wfFilter === 'completed') filtered = wfs.filter(w => w.Status__c === '完了');

  // KPI
  const active = wfs.filter(w => ['進行中','承認待ち'].includes(w.Status__c));
  const myAction = wfs.filter(w => w.Current_Assignee__c === uid && ['進行中','承認待ち'].includes(w.Status__c));
  const overdue = active.filter(w => w.Due_Date__c && w.Due_Date__c < new Date().toISOString().split('T')[0]);
  const completed = wfs.filter(w => w.Status__c === '完了');

  let html = `<div class="kpi-row">
    <div class="kpi-card" onclick="wfFilter='active';renderWorkflowDashboard()" style="cursor:pointer">
      <div class="kpi-value" style="color:#1565c0">${active.length}</div><div class="kpi-label">進行中</div></div>
    <div class="kpi-card" onclick="wfFilter='mine';renderWorkflowDashboard()" style="cursor:pointer">
      <div class="kpi-value" style="color:#e65100">${myAction.length}</div><div class="kpi-label">あなたのアクション待ち</div></div>
    <div class="kpi-card"><div class="kpi-value" style="color:#c62828">${overdue.length}</div><div class="kpi-label">期限超過</div></div>
    <div class="kpi-card" onclick="wfFilter='completed';renderWorkflowDashboard()" style="cursor:pointer">
      <div class="kpi-value" style="color:#2e7d32">${completed.length}</div><div class="kpi-label">完了</div></div>
  </div>`;

  // フィルタボタン
  html += `<div style="display:flex;gap:8px;margin-bottom:16px">
    <button class="btn ${wfFilter==='all'?'btn-primary':'btn-secondary'}" onclick="wfFilter='all';renderWorkflowDashboard()">すべて (${wfs.length})</button>
    <button class="btn ${wfFilter==='active'?'btn-primary':'btn-secondary'}" onclick="wfFilter='active';renderWorkflowDashboard()">進行中 (${active.length})</button>
    <button class="btn ${wfFilter==='mine'?'btn-primary':'btn-secondary'}" onclick="wfFilter='mine';renderWorkflowDashboard()">自分関連 (${myAction.length})</button>
    <button class="btn ${wfFilter==='completed'?'btn-primary':'btn-secondary'}" onclick="wfFilter='completed';renderWorkflowDashboard()">完了 (${completed.length})</button>
  </div>`;

  // ワークフロー種別別のサマリー
  html += `<div class="card"><div class="card-header"><h3>ワークフロー種別サマリー</h3></div>
    <div class="wf-type-grid">`;
  Object.entries(WORKFLOW_TEMPLATES).forEach(([type, tpl]) => {
    const typeWfs = wfs.filter(w => w.Workflow_Type__c === type);
    const typeActive = typeWfs.filter(w => ['進行中','承認待ち'].includes(w.Status__c)).length;
    const typeCompleted = typeWfs.filter(w => w.Status__c === '完了').length;
    html += `<div class="wf-type-card" style="border-left:4px solid ${tpl.color}">
      <div class="wf-type-icon">${tpl.icon}</div>
      <div class="wf-type-info">
        <div class="wf-type-name">${tpl.name}</div>
        <div class="wf-type-stats">進行中: <strong>${typeActive}</strong> / 完了: ${typeCompleted} / ステップ数: ${tpl.steps.length}</div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();navigate('workflow-new','${type}')">起票</button>
    </div>`;
  });
  html += `</div></div>`;

  // あなたのアクション待ち（目立たせる）
  if (myAction.length > 0) {
    html += `<div class="card" style="border-left:4px solid #e65100"><div class="card-header"><h3 style="color:#e65100">あなたのアクション待ち</h3></div>`;
    myAction.forEach(wf => {
      const tpl = WORKFLOW_TEMPLATES[wf.Workflow_Type__c] || {};
      const currentStep = wf.steps ? wf.steps.find(s => s.status === '進行中' || s.status === '承認待ち') : null;
      html += renderWfCard(wf, tpl, currentStep, true);
    });
    html += `</div>`;
  }

  // ワークフロー一覧
  html += `<div class="card"><div class="card-header"><h3>ワークフロー一覧</h3><span style="font-size:13px;color:#666">${filtered.length}件</span></div>`;
  if (filtered.length === 0) {
    html += `<p style="color:#999;text-align:center;padding:24px">該当するワークフローがありません</p>`;
  }
  filtered.sort((a,b) => {
    const ord = {緊急:0,高:1,中:2,低:3};
    if (a.Status__c === '完了' && b.Status__c !== '完了') return 1;
    if (a.Status__c !== '完了' && b.Status__c === '完了') return -1;
    return (ord[a.Priority__c]||2) - (ord[b.Priority__c]||2);
  });
  filtered.forEach(wf => {
    const tpl = WORKFLOW_TEMPLATES[wf.Workflow_Type__c] || {};
    const currentStep = wf.steps ? wf.steps.find(s => s.status === '進行中' || s.status === '承認待ち') : null;
    html += renderWfCard(wf, tpl, currentStep, false);
  });
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

function renderWfCard(wf, tpl, currentStep, isAction) {
  const progress = wf.Total_Steps__c ? Math.round((wf.steps ? wf.steps.filter(s=>s.status==='完了').length : 0) / wf.Total_Steps__c * 100) : 0;
  const stCls = {未開始:'s-gray',進行中:'s-blue',承認待ち:'s-orange',完了:'s-green',中止:'s-red',差戻し:'s-red'}[wf.Status__c]||'s-gray';
  const priCls = {緊急:'s-red',高:'s-orange',中:'s-blue',低:'s-gray'}[wf.Priority__c]||'s-gray';
  const isOverdue = wf.Due_Date__c && wf.Due_Date__c < new Date().toISOString().split('T')[0] && wf.Status__c !== '完了';

  let h = `<div class="wf-card ${isAction?'wf-action':''} ${isOverdue?'wf-overdue':''}" onclick="navigate('workflow-detail','${wf.id}')">
    <div class="wf-card-header">
      <span class="wf-icon">${tpl.icon||'⚙️'}</span>
      <div class="wf-card-title">
        <strong>${wf.Name}</strong>
        <div class="wf-card-meta">
          <span class="status ${stCls}">${wf.Status__c}</span>
          <span class="status ${priCls}">${wf.Priority__c}</span>
          <span>${wf.Workflow_Type__c}</span>
          ${isOverdue ? '<span style="color:#c62828;font-weight:600">期限超過</span>' : ''}
        </div>
      </div>
      <div class="wf-card-progress">
        <div class="wf-progress-text">${progress}%</div>
        <div class="wf-progress-bar"><div class="wf-progress-fill" style="width:${progress}%;background:${tpl.color||'#1565c0'}"></div></div>
        <div class="wf-progress-steps">Step ${wf.Current_Step__c||0}/${wf.Total_Steps__c||0}</div>
      </div>
    </div>`;

  // ステップ簡易表示
  if (wf.steps) {
    h += `<div class="wf-steps-mini">`;
    wf.steps.forEach((s,i) => {
      const sCls = s.status === '完了' ? 'wf-step-done' : (s.status === '進行中' || s.status === '承認待ち') ? 'wf-step-active' : 'wf-step-pending';
      h += `<div class="wf-step-dot ${sCls}" title="${s.name}: ${s.status}"></div>`;
      if (i < wf.steps.length - 1) h += `<div class="wf-step-line ${s.status==='完了'?'wf-line-done':''}"></div>`;
    });
    h += `</div>`;
  }

  // 現在ステップ詳細
  if (currentStep) {
    h += `<div class="wf-current-step">
      <span style="font-size:11px;color:#666">現在:</span> <strong>${currentStep.name}</strong>
      <span style="color:#888">担当: ${getUserName(currentStep.assignee)}</span>
      ${currentStep.dueDate ? `<span style="color:${currentStep.dueDate < new Date().toISOString().split('T')[0] ? '#c62828' : '#666'}">期限: ${currentStep.dueDate}</span>` : ''}
      ${currentStep.comment ? `<span style="color:#555">${currentStep.comment.substring(0,60)}${currentStep.comment.length>60?'...':''}</span>` : ''}
    </div>`;
  }

  h += `<div class="wf-card-footer">
    <span>起票: ${getUserName(wf.Requested_By__c)}</span>
    <span>開始: ${wf.Start_Date__c||'-'}</span>
    <span>期限: ${wf.Due_Date__c||'-'}</span>
    ${wf.Completed_Date__c ? `<span>完了: ${wf.Completed_Date__c}</span>` : ''}
  </div></div>`;
  return h;
}

// ワークフロー詳細画面
function renderWorkflowDetail(wfId) {
  const wf = (store.Workflow_Instance__c || []).find(w => w.id === wfId);
  if (!wf) { showToast('ワークフローが見つかりません','error'); navigate('workflow'); return; }
  const tpl = WORKFLOW_TEMPLATES[wf.Workflow_Type__c] || {};
  const uid = window.currentUser?.id || 'U002';

  renderTopbar(`${tpl.icon||'⚙️'} ${wf.Name}`, '', `<button class="btn btn-secondary btn-sm" onclick="navigate('workflow')">一覧に戻る</button>`);

  let html = '';

  // ヘッダー情報
  const stCls = {未開始:'s-gray',進行中:'s-blue',承認待ち:'s-orange',完了:'s-green',中止:'s-red',差戻し:'s-red'}[wf.Status__c]||'s-gray';
  const progress = wf.Total_Steps__c ? Math.round((wf.steps ? wf.steps.filter(s=>s.status==='完了').length : 0) / wf.Total_Steps__c * 100) : 0;

  html += `<div class="wf-detail-header" style="border-left:4px solid ${tpl.color||'#1565c0'}">
    <div class="wf-detail-info">
      <h2>${tpl.icon||'⚙️'} ${wf.Name}</h2>
      <div style="display:flex;gap:8px;align-items:center;margin:8px 0">
        <span class="status ${stCls}">${wf.Status__c}</span>
        <span class="status ${({緊急:'s-red',高:'s-orange',中:'s-blue',低:'s-gray'})[wf.Priority__c]||'s-gray'}">${wf.Priority__c}</span>
        <span style="background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:12px">${wf.Workflow_Type__c}</span>
      </div>
      <p style="color:#555;margin:8px 0">${wf.Description__c || ''}</p>
      <div style="display:flex;gap:24px;font-size:13px;color:#666;flex-wrap:wrap">
        <span>起票者: <strong>${getUserName(wf.Requested_By__c)}</strong></span>
        <span>責任者: <strong>${getUserName(wf.OwnerId)}</strong></span>
        <span>開始: ${wf.Start_Date__c || '-'}</span>
        <span>期限: <strong style="color:${wf.Due_Date__c && wf.Due_Date__c < new Date().toISOString().split('T')[0] && wf.Status__c !== '完了' ? '#c62828' : '#333'}">${wf.Due_Date__c || '-'}</strong></span>
        ${wf.Completed_Date__c ? `<span>完了日: ${wf.Completed_Date__c}</span>` : ''}
      </div>
    </div>
    <div class="wf-detail-progress">
      <div class="wf-progress-circle" style="--pct:${progress};--color:${tpl.color||'#1565c0'}">
        <span>${progress}%</span>
      </div>
      <div style="text-align:center;font-size:12px;color:#666;margin-top:4px">Step ${wf.Current_Step__c||0} / ${wf.Total_Steps__c||0}</div>
    </div>
  </div>`;

  // アクションボタン
  if (wf.Status__c !== '完了' && wf.Status__c !== '中止') {
    const currentStep = wf.steps ? wf.steps.find(s => s.status === '進行中' || s.status === '承認待ち') : null;
    const isMyAction = currentStep && currentStep.assignee === uid;

    html += `<div class="wf-actions-bar">`;
    if (isMyAction) {
      if (currentStep.status === '承認待ち') {
        html += `<button class="btn btn-success" onclick="wfApproveStep('${wf.id}',${currentStep.no})">承認</button>`;
        html += `<button class="btn btn-danger" onclick="wfRejectStep('${wf.id}',${currentStep.no})">差戻し</button>`;
      } else {
        html += `<button class="btn btn-success" onclick="wfCompleteStep('${wf.id}',${currentStep.no})">このステップを完了</button>`;
      }
      html += `<button class="btn btn-secondary" onclick="wfAddComment('${wf.id}',${currentStep.no})">コメント追加</button>`;
    } else if (currentStep) {
      html += `<span style="color:#888;padding:8px">現在の担当: <strong>${getUserName(currentStep.assignee)}</strong> (${currentStep.name})</span>`;
    }
    html += `<button class="btn btn-danger btn-sm" onclick="wfCancel('${wf.id}')" style="margin-left:auto">中止</button>`;
    html += `</div>`;
  }

  // ステップタイムライン
  html += `<div class="card"><div class="card-header"><h3>ワークフローステップ</h3></div>
    <div class="wf-timeline">`;

  if (wf.steps) {
    wf.steps.forEach((step, i) => {
      const isActive = step.status === '進行中' || step.status === '承認待ち';
      const isDone = step.status === '完了';
      const stepClass = isDone ? 'wf-tl-done' : isActive ? 'wf-tl-active' : 'wf-tl-pending';
      const stepIcon = isDone ? '✓' : isActive ? (step.status === '承認待ち' ? '⏳' : '▶') : (i + 1);
      const isOverdue = step.dueDate && step.dueDate < new Date().toISOString().split('T')[0] && !isDone;

      html += `<div class="wf-tl-step ${stepClass}">
        <div class="wf-tl-marker" style="${isDone ? `background:${tpl.color||'#1565c0'}` : isActive ? `background:${tpl.color||'#1565c0'};animation:pulse 2s infinite` : ''}">
          ${stepIcon}
        </div>
        <div class="wf-tl-content">
          <div class="wf-tl-header">
            <strong>Step ${step.no}: ${step.name}</strong>
            <span class="status ${isDone?'s-green':isActive?(step.status==='承認待ち'?'s-orange':'s-blue'):'s-gray'}">${step.status}</span>
          </div>
          <div class="wf-tl-meta">
            <span>担当: ${getUserName(step.assignee)}</span>
            ${step.completed ? `<span>完了: ${step.completed}</span>` : ''}
            ${step.dueDate && !isDone ? `<span style="color:${isOverdue?'#c62828':'#666'}">期限: ${step.dueDate} ${isOverdue?'(超過)':''}</span>` : ''}
          </div>
          ${step.comment ? `<div class="wf-tl-comment">${step.comment}</div>` : ''}
        </div>
      </div>`;
    });
  }
  html += `</div></div>`;

  // 関連レコード
  if (wf.Related_Record__c) {
    html += `<div class="card"><div class="card-header"><h3>関連レコード</h3></div>
      <p style="padding:8px 0">ID: <code>${wf.Related_Record__c}</code></p>
    </div>`;
  }

  document.getElementById('content').innerHTML = html;
}

// ワークフロー新規起票画面
function renderWorkflowNew(type) {
  renderTopbar('新規ワークフロー起票', '⚙️', `<button class="btn btn-secondary btn-sm" onclick="navigate('workflow')">一覧に戻る</button>`);
  const uid = window.currentUser?.id || 'U002';
  const types = Object.keys(WORKFLOW_TEMPLATES);

  let html = `<div class="card" style="max-width:800px">
    <div class="card-header"><h3>ワークフロー起票</h3></div>
    <div class="wf-form">
      <div class="wf-form-row">
        <label>ワークフロー種別</label>
        <select id="wf-type" class="filter-select" onchange="wfTypeChanged()">
          ${types.map(t=>`<option value="${t}" ${t===type?'selected':''}>${WORKFLOW_TEMPLATES[t].icon} ${WORKFLOW_TEMPLATES[t].name}</option>`).join('')}
        </select>
      </div>
      <div class="wf-form-row">
        <label>ワークフロー名</label>
        <input type="text" id="wf-name" class="filter-select" style="width:100%" placeholder="例: 佐藤花子 → 鈴木一郎 引き継ぎ">
      </div>
      <div class="wf-form-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div><label>優先度</label><select id="wf-priority" class="filter-select" style="width:100%">
          <option value="緊急">緊急</option><option value="高">高</option><option value="中" selected>中</option><option value="低">低</option>
        </select></div>
        <div><label>開始日</label><input type="date" id="wf-start" class="filter-select" style="width:100%" value="${new Date().toISOString().split('T')[0]}"></div>
        <div><label>期限</label><input type="date" id="wf-due" class="filter-select" style="width:100%"></div>
      </div>
      <div class="wf-form-row">
        <label>説明</label>
        <textarea id="wf-desc" class="filter-select" style="width:100%;min-height:80px" placeholder="ワークフローの目的・背景を記入..."></textarea>
      </div>
      <div id="wf-steps-preview"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-primary" onclick="createWorkflow()">起票する</button>
        <button class="btn btn-secondary" onclick="navigate('workflow')">キャンセル</button>
      </div>
    </div>
  </div>`;

  document.getElementById('content').innerHTML = html;
  wfTypeChanged();
}

function wfTypeChanged() {
  const type = document.getElementById('wf-type')?.value;
  const tpl = WORKFLOW_TEMPLATES[type];
  if (!tpl) return;

  const startDate = document.getElementById('wf-start')?.value || new Date().toISOString().split('T')[0];
  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + tpl.sla);
  const dueEl = document.getElementById('wf-due');
  if (dueEl) dueEl.value = dueDate.toISOString().split('T')[0];

  let h = `<div style="margin-top:16px;background:#f7f9fc;padding:16px;border-radius:8px;border-left:4px solid ${tpl.color}">
    <h4 style="margin-bottom:12px">${tpl.icon} ステッププレビュー（${tpl.steps.length}ステップ、SLA: ${tpl.sla}日）</h4>
    <div class="wf-steps-mini" style="margin-bottom:12px">`;
  tpl.steps.forEach((s,i) => {
    h += `<div class="wf-step-dot wf-step-pending" title="${s}"></div>`;
    if (i < tpl.steps.length - 1) h += `<div class="wf-step-line"></div>`;
  });
  h += `</div><table style="font-size:12px"><thead><tr><th>Step</th><th>ステップ名</th><th>デフォルト担当</th></tr></thead><tbody>`;
  tpl.steps.forEach((s,i) => {
    const assignee = tpl.defaultAssignees[i];
    const assigneeName = assignee === 'requester' ? '起票者' : assignee === 'manager' ? 'マネージャー' : getUserName(assignee);
    h += `<tr><td>${i+1}</td><td>${s}</td><td>${assigneeName}</td></tr>`;
  });
  h += `</tbody></table></div>`;
  const el = document.getElementById('wf-steps-preview');
  if (el) el.innerHTML = h;
}

function createWorkflow() {
  const type = document.getElementById('wf-type').value;
  const name = document.getElementById('wf-name').value.trim();
  if (!name) { showToast('ワークフロー名を入力してください','error'); return; }
  const tpl = WORKFLOW_TEMPLATES[type];
  const uid = window.currentUser?.id || 'U002';
  const userObj = USERS.find(u2=>u2.id===uid);
  const manager = USERS.find(u => u.role.includes('マネージャー') && u.team === (userObj||{}).team);

  const steps = tpl.steps.map((s,i) => {
    let assignee = tpl.defaultAssignees[i];
    if (assignee === 'requester') assignee = uid;
    else if (assignee === 'manager') assignee = manager ? manager.id : 'U001';
    return { no: i+1, name: s, assignee, status: i === 0 ? '進行中' : '未着手' };
  });

  const newWf = {
    id: 'WF' + String((store.Workflow_Instance__c||[]).length + 1).padStart(3,'0'),
    Name: name,
    Workflow_Type__c: type,
    Status__c: '進行中',
    Current_Step__c: 1,
    Total_Steps__c: tpl.steps.length,
    Priority__c: document.getElementById('wf-priority').value,
    Requested_By__c: uid,
    Current_Assignee__c: steps[0].assignee,
    OwnerId: uid,
    Start_Date__c: document.getElementById('wf-start').value,
    Due_Date__c: document.getElementById('wf-due').value,
    Description__c: document.getElementById('wf-desc').value,
    steps: steps
  };

  if (!store.Workflow_Instance__c) store.Workflow_Instance__c = [];
  store.Workflow_Instance__c.push(newWf);
  showToast(`ワークフロー「${name}」を起票しました`, 'success');
  navigate('workflow-detail', newWf.id);
}

// ワークフローアクション
function wfCompleteStep(wfId, stepNo) {
  const wf = (store.Workflow_Instance__c || []).find(w => w.id === wfId);
  if (!wf || !wf.steps) return;
  const step = wf.steps.find(s => s.no === stepNo);
  if (!step) return;

  step.status = '完了';
  step.completed = new Date().toISOString().split('T')[0];

  const nextStep = wf.steps.find(s => s.no === stepNo + 1);
  if (nextStep) {
    nextStep.status = nextStep.name.includes('承認') ? '承認待ち' : '進行中';
    wf.Current_Step__c = nextStep.no;
    wf.Current_Assignee__c = nextStep.assignee;
    wf.Status__c = nextStep.name.includes('承認') ? '承認待ち' : '進行中';
  } else {
    wf.Status__c = '完了';
    wf.Completed_Date__c = new Date().toISOString().split('T')[0];
  }

  showToast(`Step ${stepNo}「${step.name}」を完了しました`, 'success');
  renderWorkflowDetail(wfId);
}

function wfApproveStep(wfId, stepNo) {
  const wf = (store.Workflow_Instance__c || []).find(w => w.id === wfId);
  if (!wf || !wf.steps) return;
  const step = wf.steps.find(s => s.no === stepNo);
  if (!step) return;

  step.status = '完了';
  step.completed = new Date().toISOString().split('T')[0];
  step.comment = (step.comment ? step.comment + ' → ' : '') + '承認済み';

  const nextStep = wf.steps.find(s => s.no === stepNo + 1);
  if (nextStep) {
    nextStep.status = nextStep.name.includes('承認') ? '承認待ち' : '進行中';
    wf.Current_Step__c = nextStep.no;
    wf.Current_Assignee__c = nextStep.assignee;
    wf.Status__c = nextStep.name.includes('承認') ? '承認待ち' : '進行中';
  } else {
    wf.Status__c = '完了';
    wf.Completed_Date__c = new Date().toISOString().split('T')[0];
  }

  showToast(`Step ${stepNo}「${step.name}」を承認しました`, 'success');
  renderWorkflowDetail(wfId);
}

function wfRejectStep(wfId, stepNo) {
  const wf = (store.Workflow_Instance__c || []).find(w => w.id === wfId);
  if (!wf || !wf.steps) return;
  const step = wf.steps.find(s => s.no === stepNo);
  if (!step) return;

  const reason = prompt('差戻し理由を入力してください:');
  if (reason === null) return;

  step.status = '未着手';
  step.comment = (step.comment ? step.comment + ' → ' : '') + `差戻し: ${reason}`;

  const prevStep = wf.steps.find(s => s.no === stepNo - 1);
  if (prevStep) {
    prevStep.status = '進行中';
    prevStep.completed = null;
    wf.Current_Step__c = prevStep.no;
    wf.Current_Assignee__c = prevStep.assignee;
  }
  wf.Status__c = '差戻し';

  showToast(`Step ${stepNo}「${step.name}」を差戻しました`, 'warning');
  renderWorkflowDetail(wfId);
}

function wfAddComment(wfId, stepNo) {
  const wf = (store.Workflow_Instance__c || []).find(w => w.id === wfId);
  if (!wf || !wf.steps) return;
  const step = wf.steps.find(s => s.no === stepNo);
  if (!step) return;

  const comment = prompt('コメントを入力:');
  if (!comment) return;

  step.comment = (step.comment ? step.comment + '\n' : '') + `[${new Date().toLocaleDateString('ja-JP')}] ${comment}`;
  showToast('コメントを追加しました', 'success');
  renderWorkflowDetail(wfId);
}

function wfCancel(wfId) {
  const wf = (store.Workflow_Instance__c || []).find(w => w.id === wfId);
  if (!wf) return;
  if (!confirm('このワークフローを中止しますか？')) return;

  wf.Status__c = '中止';
  if (wf.steps) wf.steps.forEach(s => { if (s.status !== '完了') s.status = '中止'; });
  showToast(`ワークフロー「${wf.Name}」を中止しました`, 'warning');
  renderWorkflowDetail(wfId);
}

// ===========================================
// Phase 1: GPS取得
// ===========================================
function captureGPS() {
  const status = document.getElementById('gps-status');
  if (!navigator.geolocation) { status.textContent = 'GPS非対応のブラウザです'; return; }
  status.textContent = '取得中...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = Math.round(pos.coords.latitude * 10000000) / 10000000;
      const lng = Math.round(pos.coords.longitude * 10000000) / 10000000;
      const acc = Math.round(pos.coords.accuracy * 100) / 100;
      const form = document.getElementById('record-form');
      if (form.querySelector('[name="Checkin_Latitude__c"]')) form.querySelector('[name="Checkin_Latitude__c"]').value = lat;
      if (form.querySelector('[name="Checkin_Longitude__c"]')) form.querySelector('[name="Checkin_Longitude__c"]').value = lng;
      if (form.querySelector('[name="Location_Accuracy__c"]')) form.querySelector('[name="Location_Accuracy__c"]').value = acc;
      if (form.querySelector('[name="Checkin_Time__c"]')) form.querySelector('[name="Checkin_Time__c"]').value = new Date().toISOString().slice(0,16);
      status.textContent = `取得完了 (${lat}, ${lng}) 精度: ${acc}m`;
      status.style.color = '#2e7d32';
    },
    (err) => { status.textContent = 'GPS取得失敗: ' + err.message; status.style.color = '#c62828'; },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ===========================================
// Phase 1: 訪問マップ
// ===========================================
function renderVisitMap() {
  renderTopbar('訪問マップ', '📍', `<button class="btn btn-sm btn-secondary" onclick="navigate('obj','Visit_Record__c')">← 訪問記録一覧</button>`);
  const visits = (store.Visit_Record__c || []).filter(v => v.Checkin_Latitude__c && v.Checkin_Longitude__c);

  let html = `<div class="card"><div class="card-header"><h3>訪問記録マップ <span style="font-size:13px;color:#888">(${visits.length}件)</span></h3></div>
    <div id="visit-map-container" style="height:500px;border-radius:8px"></div></div>`;

  // 凡例
  html += `<div class="card"><div class="card-header"><h3>凡例</h3></div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px">
      <span>📍 訪問地点</span><span style="color:#0176d3">--- 訪問ルート（時系列）</span>
      <span>🟢 良好</span><span>🔵 継続検討</span><span>🟠 保留</span><span>🟡 次回アポ取得</span>
    </div></div>`;

  // 訪問一覧テーブル
  html += `<div class="card"><div class="card-header"><h3>訪問履歴</h3></div><table><thead><tr><th>訪問番号</th><th>ドクター</th><th>医療機関</th><th>訪問日</th><th>目的</th><th>結果</th><th>位置精度</th></tr></thead><tbody>`;
  visits.sort((a,b) => (b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||'')).forEach(v => {
    const cls = {良好:'s-green',継続検討:'s-blue',保留:'s-orange',次回アポ取得:'s-teal',不在:'s-gray'}[v.Result__c] || 's-gray';
    html += `<tr onclick="showDetail('Visit_Record__c','${v.id}')"><td><span class="cell-link">${v.Name}</span></td><td>${resolveRef(v.Doctor__c,'Doctor__c')}</td><td>${resolveRef(v.Institution__c,'Medical_Institution__c')}</td><td>${v.Visit_Date__c||'-'}</td><td>${v.Purpose__c||'-'}</td><td><span class="status ${cls}">${v.Result__c||'-'}</span></td><td>${v.Location_Accuracy__c||'-'}m</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;

  setTimeout(() => {
    if (typeof L === 'undefined') return;
    const map = L.map('visit-map-container').setView([35.68, 139.76], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'&copy; OpenStreetMap'}).addTo(map);

    const sorted = [...visits].sort((a,b) => (a.Visit_Date__c||'').localeCompare(b.Visit_Date__c||''));
    const coords = [];
    const resultColors = {良好:'#2e7d32',継続検討:'#1565c0',保留:'#e65100',次回アポ取得:'#00897b',不在:'#888'};

    sorted.forEach(v => {
      const lat = v.Checkin_Latitude__c, lng = v.Checkin_Longitude__c;
      const doc = resolveRef(v.Doctor__c, 'Doctor__c');
      const inst = resolveRef(v.Institution__c, 'Medical_Institution__c');
      const color = resultColors[v.Result__c] || '#888';

      const icon = L.divIcon({
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8], className: ''
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`<b>${v.Name}</b><br>${v.Visit_Date__c}<br>👨‍⚕️ ${doc}<br>🏥 ${inst}<br>目的: ${v.Purpose__c||'-'}<br>結果: <b>${v.Result__c||'-'}</b><br>面談: ${v.Duration__c||'-'}分`);
      coords.push([lat, lng]);
    });

    // ルート線
    if (coords.length > 1) {
      L.polyline(coords, {color: '#0176d3', weight: 2, dashArray: '6,8', opacity: 0.7}).addTo(map);
    }
    if (coords.length) map.fitBounds(coords, {padding: [30, 30]});
  }, 200);
}

// ===========================================
// Phase 2: 訪問レポート・集計
// ===========================================
function renderVisitReport() {
  renderTopbar('訪問レポート', '📊');
  const visits = store.Visit_Record__c || [];
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`;

  const thisMonth = visits.filter(v => (v.Visit_Date__c||'').startsWith(thisMonthStr)).length;
  const lastMonth = visits.filter(v => (v.Visit_Date__c||'').startsWith(lastMonthStr)).length;
  const durations = visits.filter(v => v.Duration__c).map(v => v.Duration__c);
  const avgDuration = durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 0;
  const uniqueDoctors = [...new Set(visits.map(v => v.Doctor__c).filter(Boolean))].length;
  const uniqueInst = [...new Set(visits.map(v => v.Institution__c).filter(Boolean))].length;
  const monthChange = lastMonth > 0 ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : 0;

  let html = `<div class="kpi-row cols-5">
    <div class="kpi-card blue"><div class="kpi-val">${visits.length}</div><div class="kpi-label">総訪問数</div></div>
    <div class="kpi-card green"><div class="kpi-val">${thisMonth}</div><div class="kpi-label">今月訪問 ${monthChange >= 0 ? '↑' : '↓'}${Math.abs(monthChange)}%</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${avgDuration}分</div><div class="kpi-label">平均面談時間</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${uniqueDoctors}</div><div class="kpi-label">訪問ドクター数</div></div>
    <div class="kpi-card teal"><div class="kpi-val">${uniqueInst}</div><div class="kpi-label">訪問施設数</div></div>
  </div>`;

  // Charts
  html += `<div class="chart-grid"><div class="chart-card"><h4>月別訪問数</h4><canvas id="vr-monthly"></canvas></div>
    <div class="chart-card"><h4>訪問目的別</h4><canvas id="vr-purpose"></canvas></div></div>`;
  html += `<div class="chart-grid"><div class="chart-card"><h4>訪問結果別</h4><canvas id="vr-result"></canvas></div>
    <div class="chart-card"><h4>担当者別訪問数</h4><canvas id="vr-owner"></canvas></div></div>`;

  // ドクター別集計
  html += `<div class="card"><div class="card-header"><h3>ドクター別訪問集計</h3></div><table><thead><tr><th>ドクター</th><th>医療機関</th><th>訪問回数</th><th>最終訪問日</th><th>平均面談時間</th><th>最新結果</th></tr></thead><tbody>`;
  const docVisits = {};
  visits.forEach(v => { if (!docVisits[v.Doctor__c]) docVisits[v.Doctor__c] = []; docVisits[v.Doctor__c].push(v); });
  Object.entries(docVisits).sort((a,b) => b[1].length - a[1].length).forEach(([docId, vList]) => {
    const doc = resolveRef(docId, 'Doctor__c');
    const inst = resolveRef(vList[0]?.Institution__c, 'Medical_Institution__c');
    const sorted = vList.sort((a,b) => (b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||''));
    const lastDate = sorted[0]?.Visit_Date__c || '-';
    const lastResult = sorted[0]?.Result__c || '-';
    const durs = vList.filter(v => v.Duration__c);
    const avg = durs.length ? Math.round(durs.reduce((s,v)=>s+v.Duration__c,0)/durs.length) : '-';
    const cls = {良好:'s-green',継続検討:'s-blue',保留:'s-orange',次回アポ取得:'s-teal',不在:'s-gray'}[lastResult] || 's-gray';
    html += `<tr><td>${doc}</td><td>${inst}</td><td><strong>${vList.length}</strong></td><td>${lastDate}</td><td>${avg}分</td><td><span class="status ${cls}">${lastResult}</span></td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 医療機関別集計
  html += `<div class="card"><div class="card-header"><h3>医療機関別訪問集計</h3></div><table><thead><tr><th>医療機関</th><th>訪問回数</th><th>訪問ドクター数</th><th>最終訪問日</th></tr></thead><tbody>`;
  const instVisits = {};
  visits.forEach(v => { const key = v.Institution__c; if (!instVisits[key]) instVisits[key] = []; instVisits[key].push(v); });
  Object.entries(instVisits).sort((a,b) => b[1].length - a[1].length).forEach(([instId, vList]) => {
    const inst = resolveRef(instId, 'Medical_Institution__c');
    const docCount = [...new Set(vList.map(v => v.Doctor__c))].length;
    const lastDate = vList.sort((a,b) => (b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||''))[0]?.Visit_Date__c || '-';
    html += `<tr><td>${inst}</td><td><strong>${vList.length}</strong></td><td>${docCount}</td><td>${lastDate}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;

  // Charts
  setTimeout(() => {
    const chartColors = ['#42a5f5','#66bb6a','#ffa726','#ab47bc','#26a69a','#ef5350','#78909c','#ec407a'];

    // 月別
    const months = [...new Set(visits.map(v => (v.Visit_Date__c||'').substring(0,7)))].filter(Boolean).sort();
    new Chart(document.getElementById('vr-monthly'), {
      type:'bar', data:{labels:months, datasets:[{label:'訪問数',data:months.map(m=>visits.filter(v=>(v.Visit_Date__c||'').startsWith(m)).length),backgroundColor:'#42a5f5'}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}
    });

    // 目的別
    const purposes = [...new Set(visits.map(v => v.Purpose__c).filter(Boolean))];
    new Chart(document.getElementById('vr-purpose'), {
      type:'doughnut', data:{labels:purposes,datasets:[{data:purposes.map(p=>visits.filter(v=>v.Purpose__c===p).length),backgroundColor:chartColors}]},
      options:{responsive:true,plugins:{legend:{position:'right'}}}
    });

    // 結果別
    const results = [...new Set(visits.map(v => v.Result__c).filter(Boolean))];
    const resultColors = {良好:'#66bb6a',継続検討:'#42a5f5',保留:'#ffa726',次回アポ取得:'#26a69a',不在:'#78909c'};
    new Chart(document.getElementById('vr-result'), {
      type:'doughnut', data:{labels:results,datasets:[{data:results.map(r=>visits.filter(v=>v.Result__c===r).length),backgroundColor:results.map(r=>resultColors[r]||'#888')}]},
      options:{responsive:true,plugins:{legend:{position:'right'}}}
    });

    // 担当者別
    const owners = [...new Set(visits.map(v => v.OwnerId).filter(Boolean))];
    new Chart(document.getElementById('vr-owner'), {
      type:'bar', data:{labels:owners.map(o=>getUserName(o)),datasets:[{label:'訪問数',data:owners.map(o=>visits.filter(v=>v.OwnerId===o).length),backgroundColor:'#ab47bc'}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}
    });
  }, 100);
}

// ===========================================
// Phase 3: 訪問カレンダー (既存カレンダー拡張版)
// ===========================================
let visitCalYear = null;
let visitCalMonth = null;

function renderVisitCalendar(yearOvr, monthOvr) {
  const now = new Date();
  visitCalYear = yearOvr != null ? yearOvr : (visitCalYear != null ? visitCalYear : now.getFullYear());
  visitCalMonth = monthOvr != null ? monthOvr : (visitCalMonth != null ? visitCalMonth : now.getMonth());

  const year = visitCalYear, month = visitCalMonth;
  const prevY = month === 0 ? year - 1 : year;
  const prevM = month === 0 ? 11 : month - 1;
  const nextY = month === 11 ? year + 1 : year;
  const nextM = month === 11 ? 0 : month + 1;

  const navBtns = `<button class="btn btn-sm btn-secondary" onclick="renderVisitCalendar(${prevY},${prevM})">◀ 前月</button>
    <button class="btn btn-sm btn-primary" onclick="visitCalYear=null;visitCalMonth=null;renderVisitCalendar()">今月</button>
    <button class="btn btn-sm btn-secondary" onclick="renderVisitCalendar(${nextY},${nextM})">翌月 ▶</button>
    <button class="btn btn-sm btn-primary" onclick="showCreateForm('Visit_Record__c')">+ 訪問予定追加</button>`;
  renderTopbar('訪問カレンダー', '🗓️', navBtns);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const visits = store.Visit_Record__c || [];
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  let html = `<div class="card"><div class="card-header"><h3>${year}年 ${monthNames[month]} 訪問カレンダー</h3></div>`;
  html += `<div class="calendar">`;
  ['日','月','火','水','木','金','土'].forEach(d => html += `<div class="cal-header">${d}</div>`);

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === today;
    const dayVisits = visits.filter(v => v.Visit_Date__c === dateStr);
    const plannedVisits = visits.filter(v => v.Next_Visit_Date__c === dateStr);
    const overdueVisits = visits.filter(v => v.Next_Visit_Date__c === dateStr && dateStr < today);

    html += `<div class="cal-day${isToday ? ' cal-today' : ''}" onclick="showFormModal('Visit_Record__c',null,{Visit_Date__c:'${dateStr}'})">`;
    html += `<div class="day-num">${d}</div>`;

    dayVisits.forEach(v => {
      const cls = overdueVisits.includes(v) ? 'overdue' : 'visit';
      html += `<div class="cal-event ${cls}" onclick="event.stopPropagation();showDetail('Visit_Record__c','${v.id}')" title="訪問: ${resolveRef(v.Doctor__c,'Doctor__c')}">📝 ${resolveRef(v.Doctor__c,'Doctor__c')}</div>`;
    });
    plannedVisits.forEach(v => {
      const isOverdue = dateStr < today;
      const cls = isOverdue ? 'overdue' : 'planned';
      const icon = isOverdue ? '⚠️' : '🔵';
      html += `<div class="cal-event ${cls}" onclick="event.stopPropagation();showDetail('Visit_Record__c','${v.id}')" title="予定: ${resolveRef(v.Doctor__c,'Doctor__c')}${isOverdue ? ' (期限超過)' : ''}">${icon} ${resolveRef(v.Doctor__c,'Doctor__c')}</div>`;
    });
    html += `</div>`;
  }
  html += `</div></div>`;

  // 今後の訪問予定リスト
  const upcoming = visits.filter(v => v.Next_Visit_Date__c && v.Next_Visit_Date__c >= today).sort((a,b) => a.Next_Visit_Date__c.localeCompare(b.Next_Visit_Date__c));
  const overdue = visits.filter(v => v.Next_Visit_Date__c && v.Next_Visit_Date__c < today).sort((a,b) => a.Next_Visit_Date__c.localeCompare(b.Next_Visit_Date__c));

  if (overdue.length) {
    html += `<div class="card" style="border-left:4px solid #c62828"><div class="card-header"><h3 style="color:#c62828">⚠️ 期限超過の訪問予定 (${overdue.length}件)</h3></div><table><thead><tr><th>訪問番号</th><th>ドクター</th><th>予定日</th><th>ネクストアクション</th><th>担当</th></tr></thead><tbody>`;
    overdue.forEach(v => {
      html += `<tr onclick="showDetail('Visit_Record__c','${v.id}')" style="background:#fff5f5"><td><span class="cell-link">${v.Name}</span></td><td>${resolveRef(v.Doctor__c,'Doctor__c')}</td><td style="color:#c62828;font-weight:600">${v.Next_Visit_Date__c}</td><td>${v.Next_Action__c||'-'}</td><td>${getUserName(v.OwnerId)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  if (upcoming.length) {
    html += `<div class="card"><div class="card-header"><h3>📅 今後の訪問予定 (${upcoming.length}件)</h3></div><table><thead><tr><th>訪問番号</th><th>ドクター</th><th>予定日</th><th>ネクストアクション</th><th>担当</th></tr></thead><tbody>`;
    upcoming.forEach(v => {
      html += `<tr onclick="showDetail('Visit_Record__c','${v.id}')"><td><span class="cell-link">${v.Name}</span></td><td>${resolveRef(v.Doctor__c,'Doctor__c')}</td><td>${v.Next_Visit_Date__c}</td><td>${v.Next_Action__c||'-'}</td><td>${getUserName(v.OwnerId)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  document.getElementById('content').innerHTML = html;
}

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
        <div>${icon} <strong>${n.Name}</strong></div>
        <div style="font-size:12px;color:#555;margin-top:2px">${n.Message__c||''}</div>
        <div style="font-size:11px;color:#999;margin-top:4px">${n.Due_Date__c||''} | ${n.Notification_Type__c||''}</div>
      </div>`;
    });
  }
  html += `</div>`;

  document.getElementById('topbar').style.position = 'relative';
  document.getElementById('topbar').insertAdjacentHTML('beforeend', html);
}
