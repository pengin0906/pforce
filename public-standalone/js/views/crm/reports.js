/* Reports */

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
    html += `<tr><td>${escHtml(inst.Name)}</td><td>${instOrders.length}</td><td>${done}</td><td>${active}</td><td>${avgT}日</td></tr>`;
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
