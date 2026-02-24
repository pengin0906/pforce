/* Home/Personal Dashboard */

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
      <td><span class="cell-link">${escHtml(d.Name)}</span><div class="sub-text">🏥 ${inst}</div></td>
      <td>${inst}</td><td>${escHtml(d.Department__c||'-')}</td>
      <td><span class="status ${cls}">${escHtml(d.Relationship_Level__c)}</span></td>
      <td>${escHtml(d.Last_Visit_Date__c||'-')}</td><td>${d.KOL_Score__c||0}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // パイプライン
  if (myPharma.length) {
    html += `<div class="card"><div class="card-header"><h3>💊 製薬商談パイプライン</h3></div><table><thead><tr><th>商談名</th><th>製薬企業</th><th>フェーズ</th><th>金額</th><th>クローズ予定</th></tr></thead><tbody>`;
    myPharma.forEach(p => {
      const cls = getObjDef('Pharma_Opportunity__c').statusMap[p.Phase__c] || 's-gray';
      html += `<tr onclick="showDetail('Pharma_Opportunity__c','${p.id}')"><td><span class="cell-link">${escHtml(p.Name)}</span></td><td>${escHtml(p.Pharma_Company__c)}</td><td><span class="status ${cls}">${escHtml(p.Phase__c)}</span></td><td>${fmt(p.Amount__c,'Currency')}</td><td>${escHtml(p.Close_Date__c||'-')}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // ToDo & スケジュール
  html += `<div class="chart-grid">`;
  html += `<div class="card"><div class="card-header"><h3>✅ ToDo</h3></div><ul class="timeline">`;
  myTasks.filter(t=>t.Status!=='完了').forEach(t => {
    html += `<li><div class="tl-time">${escHtml(t.ActivityDate||'-')} <span class="status ${t.Priority==='高'?'s-red':'s-blue'}">${escHtml(t.Priority)}</span></div><div class="tl-text">${escHtml(t.Subject)}</div></li>`;
  });
  html += `</ul></div>`;
  html += `<div class="card"><div class="card-header"><h3>📅 今後の予定</h3></div><ul class="timeline">`;
  myEvents.sort((a,b)=>(a.StartDateTime||'').localeCompare(b.StartDateTime||'')).forEach(e => {
    html += `<li><div class="tl-time">${escHtml(e.StartDateTime||'-')}</div><div class="tl-text">${escHtml(e.Subject)} @ ${escHtml(e.Location||'-')}</div></li>`;
  });
  html += `</ul></div></div>`;

  document.getElementById('content').innerHTML = html;
}
