/* MA & Seminar Dashboards */

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
    html += `<tr onclick="showDetail('MA_Activity__c','${a.id}')"><td><span class="cell-link">${escHtml(a.Name)}</span></td><td>${escHtml(a.Activity_Type__c||'-')}</td><td>${resolveRef(a.Doctor__c,'Doctor__c')}</td><td>${escHtml(a.Date__c||'-')}</td><td><span class="status ${cls}">${escHtml(a.Status__c)}</span></td></tr>`;
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
    html += `<tr onclick="showDetail('Seminar__c','${s.id}')"><td><span class="cell-link">${escHtml(s.Name)}</span></td><td>${escHtml(s.Format__c||'-')}</td><td>${speaker}</td><td>${escHtml(s.Date__c||'-')}</td><td>${escHtml(s.Venue__c||'-')}</td><td><span class="status ${cls}">${escHtml(s.Status__c)}</span></td><td>${s.Attendees__c||0}/${s.Capacity__c||0}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 弁当手配状況
  html += `<div class="card"><div class="card-header"><h3>🍱 弁当手配状況</h3></div><table><thead><tr><th>手配名</th><th>関連セミナー</th><th>業者</th><th>数量</th><th>合計</th><th>ステータス</th><th>配達日</th></tr></thead><tbody>`;
  bentos.forEach(b => {
    const cls = getObjDef('Bento_Order__c').statusMap[b.Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Bento_Order__c','${b.id}')"><td><span class="cell-link">${escHtml(b.Name)}</span></td><td>${resolveRef(b.Seminar__c,'Seminar__c')}</td><td>${escHtml(b.Vendor__c||'-')}</td><td>${b.Quantity__c||0}</td><td>${fmt(b.Total__c,'Currency')}</td><td><span class="status ${cls}">${escHtml(b.Status__c)}</span></td><td>${escHtml(b.Delivery_Date__c||'-')}</td></tr>`;
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
