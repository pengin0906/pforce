/* Individual Dashboards - MR & MSL */

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
    dv.forEach(v => { const doc=(store.Doctor__c||[]).find(d=>d.id===v.Doctor__c); html+=`<div class="schedule-item visit" onclick="showDetail('Visit_Record__c','${v.id}')"><div class="si-icon">🏥</div><div class="si-body"><div class="si-title">訪問: ${doc?escHtml(doc.Name):'-'}</div><div class="si-sub">${getInstitutionName(v.Institution__c)}</div>${v.Purpose__c?`<div class="si-note">${escHtml(v.Purpose__c)}</div>`:''}</div></div>`; });
    ds2.forEach(s => { html+=`<div class="schedule-item seminar" onclick="showDetail('Seminar__c','${s.id}')"><div class="si-icon">📚</div><div class="si-body"><div class="si-title">${escHtml(s.Name)}</div><div class="si-sub">${escHtml(s.Venue__c||'-')}</div></div></div>`; });
    dm.forEach(m => { html+=`<div class="schedule-item ma" onclick="showDetail('MA_Activity__c','${m.id}')"><div class="si-icon">🎤</div><div class="si-body"><div class="si-title">MA: ${escHtml(m.Activity_Type__c||'活動')}</div><div class="si-sub">${resolveRef(m.Doctor__c,'Doctor__c')}</div></div></div>`; });
    de.forEach(e => { html+=`<div class="schedule-item event" onclick="showDetail('Event','${e.id}')"><div class="si-icon">📅</div><div class="si-body"><div class="si-title">${escHtml(e.Subject)}</div><div class="si-sub">${escHtml(e.Location||'-')}</div></div></div>`; });
    dt.forEach(t => { html+=`<div class="schedule-item task" onclick="showDetail('Task','${t.id}')"><div class="si-icon">${t.Status==='完了'?'✅':'⬜'}</div><div class="si-body"><div class="si-title">${escHtml(t.Subject)}</div><div class="si-sub">${escHtml(t.Priority||'-')}</div></div></div>`; });
    dr.forEach(r => { html+=`<div class="schedule-item report"><div class="si-icon">📝</div><div class="si-body"><div class="si-title">日報</div><div class="si-sub"><span class="status ${({下書き:'s-gray',提出済:'s-orange',承認済:'s-green',差戻し:'s-red'})[r.Approval_Status__c]||'s-gray'}">${escHtml(r.Approval_Status__c||'下書き')}</span></div></div></div>`; });
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
      html+=`<div class="vt-item" onclick="showDetail('Visit_Target__c','${t.id}')"><div class="vt-item-header"><span class="vt-priority" style="background:${pc}">${(t.Priority__c||'C')[0]}</span><span class="vt-item-title">${doc?escHtml(doc.Name):'-'}</span><span class="vt-item-inst">${getInstitutionName(t.Institution__c)}</span><span class="status ${({未着手:'s-gray',進行中:'s-blue',達成:'s-green',未達:'s-red',中止:'s-orange'})[t.Status__c]||'s-gray'}">${escHtml(t.Status__c)}</span></div>
        <div class="vt-item-body"><span>${escHtml(t.Visit_Purpose__c||'-')}</span><span>訪問:${t.Actual_Visits__c||0}/${t.Target_Visits__c||0}</span><div class="vt-mini-bar"><div class="vt-mini-fill" style="width:${rate}%"></div></div><span>${rate}%</span></div>
        ${t.Next_Visit_Date__c?`<div class="vt-next">次回:${escHtml(t.Next_Visit_Date__c)}</div>`:''}
        ${t.Note__c?`<div class="vt-note">${escHtml(t.Note__c)}</div>`:''}</div>`;
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
      <td>${getUserName(t.OwnerId)}</td><td class="cell-link">${doc?escHtml(doc.Name):'-'}</td><td>${getInstitutionName(t.Institution__c)}</td><td>${escHtml(t.Visit_Purpose__c||'-')}</td>
      <td>${t.Target_Visits__c||0}</td><td>${t.Actual_Visits__c||0}</td><td style="font-weight:700;color:${rate>=80?'#2e7d32':rate>=50?'#e65100':'#c62828'}">${rate}%</td>
      <td>${escHtml(t.Next_Visit_Date__c||'-')}</td><td><span class="status ${({未着手:'s-gray',進行中:'s-blue',達成:'s-green',未達:'s-red',中止:'s-orange'})[t.Status__c]||'s-gray'}">${escHtml(t.Status__c)}</span></td></tr>`;
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
        <span class="vt-item-title">${doc?escHtml(doc.Name):'-'}</span><span class="vt-item-inst">${getInstitutionName(t.Institution__c)}</span>
        <span style="font-weight:700;color:${rate>=80?'#2e7d32':rate>=50?'#e65100':'#c62828'}">${rate}%</span>
        <span class="status ${({未着手:'s-gray',進行中:'s-blue',達成:'s-green',未達:'s-red'})[t.Status__c]||'s-gray'}">${escHtml(t.Status__c)}</span></div>
        <div class="vt-item-body"><span>${escHtml(t.Visit_Purpose__c||'-')}</span><span>訪問:${t.Actual_Visits__c||0}/${t.Target_Visits__c||0}</span>
        <div class="vt-mini-bar"><div class="vt-mini-fill" style="width:${rate}%"></div></div></div></div>`;
    });
    html += `</div>`;
  }

  // 担当ドクター
  html += `<div class="card"><div class="card-header"><h3>担当ドクター</h3><button class="btn btn-sm btn-primary" onclick="navigate('doctor-assign')">担当割当管理</button></div>
    <table><thead><tr><th>氏名</th><th>所属</th><th>診療科</th><th>関係度</th><th>訪問回数</th></tr></thead><tbody>`;
  myDocs.forEach(d => {
    const vCnt = myVisits.filter(v=>v.Doctor__c===d.id).length;
    html+=`<tr onclick="renderDoctor360('${d.id}')"><td class="cell-link">${escHtml(d.Name)}</td><td>${getInstitutionName(d.Institution__c)}</td><td>${escHtml(d.Specialty__c||'-')}</td>
      <td><span class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray'}">${escHtml(d.Relationship_Level__c||'-')}</span></td><td>${vCnt}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 商談
  if (myPharma.length) {
    html += `<div class="card"><div class="card-header"><h3>担当商談</h3></div><table><thead><tr><th>案件名</th><th>製薬会社</th><th>フェーズ</th><th>金額</th><th>確度</th></tr></thead><tbody>`;
    myPharma.forEach(p => { html+=`<tr onclick="showDetail('Pharma_Opportunity__c','${p.id}')"><td class="cell-link">${escHtml(p.Name)}</td><td>${escHtml(p.Pharma_Company__c||'-')}</td><td><span class="status s-blue">${escHtml(p.Phase__c)}</span></td><td>¥${Number(p.Amount__c||0).toLocaleString()}</td><td>${p.Probability__c||0}%</td></tr>`; });
    html += `</tbody></table></div>`;
  }

  // 最近の訪問
  html += `<div class="card"><div class="card-header"><h3>最近の訪問記録</h3></div><table><thead><tr><th>日付</th><th>ドクター</th><th>施設</th><th>目的</th><th>結果</th></tr></thead><tbody>`;
  myVisits.sort((a,b)=>(b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||'')).slice(0,8).forEach(v => {
    html+=`<tr onclick="showDetail('Visit_Record__c','${v.id}')"><td>${escHtml(v.Visit_Date__c||'-')}</td><td class="cell-link">${resolveRef(v.Doctor__c,'Doctor__c')}</td><td>${getInstitutionName(v.Institution__c)}</td><td>${escHtml(v.Purpose__c||'-')}</td><td>${escHtml(v.Result__c||'-')}</td></tr>`;
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
        <span class="vt-item-title">${doc?escHtml(doc.Name):'-'}</span><span class="vt-item-inst">${getInstitutionName(t.Institution__c)}</span>
        <span style="font-weight:700;color:${rate>=80?'#2e7d32':rate>=50?'#e65100':'#c62828'}">${rate}%</span></div>
        <div class="vt-item-body"><span>訪問:${t.Actual_Visits__c||0}/${t.Target_Visits__c||0}</span><div class="vt-mini-bar"><div class="vt-mini-fill" style="width:${rate}%"></div></div></div></div>`;
    });
    html += `</div>`;
  }

  // MA活動一覧
  html += `<div class="card"><div class="card-header"><h3>最近のMA活動</h3></div><table><thead><tr><th>日付</th><th>種別</th><th>ドクター</th><th>施設</th><th>テーマ</th></tr></thead><tbody>`;
  myMA.sort((a,b)=>(b.Activity_Date__c||'').localeCompare(a.Activity_Date__c||'')).forEach(m => {
    html+=`<tr onclick="showDetail('MA_Activity__c','${m.id}')"><td>${escHtml(m.Activity_Date__c||'-')}</td><td><span class="status s-purple">${escHtml(m.Activity_Type__c||'-')}</span></td><td class="cell-link">${resolveRef(m.Doctor__c,'Doctor__c')}</td><td>${getInstitutionName(m.Institution__c)}</td><td>${escHtml(m.Topic__c||'-')}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 共同研究
  if (myResearch.length) {
    html += `<div class="card"><div class="card-header"><h3>共同研究</h3></div><table><thead><tr><th>研究名</th><th>施設</th><th>フェーズ</th><th>ステータス</th></tr></thead><tbody>`;
    myResearch.forEach(r => { html+=`<tr onclick="showDetail('Joint_Research__c','${r.id}')"><td class="cell-link">${escHtml(r.Name)}</td><td>${getInstitutionName(r.Institution__c)}</td><td>${escHtml(r.Phase__c||'-')}</td><td><span class="status s-blue">${escHtml(r.Status__c||'-')}</span></td></tr>`; });
    html += `</tbody></table></div>`;
  }

  // 担当KOL
  html += `<div class="card"><div class="card-header"><h3>担当KOL</h3></div><table><thead><tr><th>氏名</th><th>所属</th><th>専門</th><th>関係度</th></tr></thead><tbody>`;
  myDocs.forEach(d => {
    html+=`<tr onclick="renderDoctor360('${d.id}')"><td class="cell-link">${escHtml(d.Name)}</td><td>${getInstitutionName(d.Institution__c)}</td><td>${escHtml(d.Specialty__c||'-')}</td>
      <td><span class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray'}">${escHtml(d.Relationship_Level__c||'-')}</span></td></tr>`;
  });
  html += `</tbody></table></div>`;
  document.getElementById('content').innerHTML = html;
}
