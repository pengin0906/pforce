/* Sales & Executive Dashboards */

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
