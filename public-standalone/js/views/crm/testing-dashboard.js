/* Testing, PMDA & Pathology Dashboards */

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
    html += `<tr onclick="showDetail('Testing_Order__c','${o.id}')"><td><span class="cell-link">${escHtml(o.Name)}</span></td><td>${resolveRef(o.Doctor__c,'Doctor__c')}</td><td>${resolveRef(o.Institution__c,'Medical_Institution__c')}</td><td>${escHtml(o.Order_Date__c||'-')}</td><td><span class="status ${cls}">${escHtml(o.Status__c)}</span></td><td><span class="status ${usCls}">${escHtml(o.US_Review_Status__c||'-')}</span></td><td>${o.TAT_Days__c||0}日</td></tr>`;
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
        <div><div style="font-weight:600">${escHtml(s.Name)}</div><div style="font-size:12px;color:#888">承認予定: ${escHtml(s.Expected_Approval__c)}</div></div>
      </div>`;
    }
  });
  html += `</div></div>`;

  // 申請一覧
  html += `<div class="card"><div class="card-header"><h3>PMDA申請一覧</h3></div><table><thead><tr><th>申請名</th><th>種別</th><th>ステータス</th><th>申請日</th><th>承認予定</th><th>照会</th></tr></thead><tbody>`;
  subs.forEach(s => {
    const cls = getObjDef('PMDA_Submission__c').statusMap[s.Status__c]||'s-gray';
    html += `<tr onclick="showDetail('PMDA_Submission__c','${s.id}')"><td><span class="cell-link">${escHtml(s.Name)}</span></td><td>${escHtml(s.Submission_Type__c||'-')}</td><td><span class="status ${cls}">${escHtml(s.Status__c)}</span></td><td>${escHtml(s.Submission_Date__c||'-')}</td><td>${escHtml(s.Expected_Approval__c||'-')}</td><td>${s.Inquiry_Resolved__c||0}/${s.Inquiry_Count__c||0}</td></tr>`;
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
    html += `<tr onclick="showDetail('Specimen__c','${s.id}')"><td><span class="cell-link">${escHtml(s.Name)}</span></td><td>${escHtml(s.Patient_ID__c||'-')}</td><td>${resolveRef(s.Institution__c,'Medical_Institution__c')}</td><td>${escHtml(s.Cancer_Type__c||'-')}</td><td><span class="status ${cls}">${escHtml(s.Review_Status__c)}</span></td><td>${s.TAT_Days__c||0}日</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // US Tempus レビューキュー
  html += `<div class="card"><div class="card-header"><h3>🌐 US Tempus レビューキュー</h3></div><table><thead><tr><th>オーダー番号</th><th>検体</th><th>施設</th><th>USレビュー</th><th>TAT</th></tr></thead><tbody>`;
  orders.filter(o=>o.US_Review_Status__c==='US審査中'||o.US_Review_Status__c==='US差戻し').forEach(o => {
    const usCls = {US審査中:'s-orange',US差戻し:'s-red'}[o.US_Review_Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Testing_Order__c','${o.id}')"><td><span class="cell-link">${escHtml(o.Name)}</span></td><td>${resolveRef(o.Specimen__c,'Specimen__c')}</td><td>${resolveRef(o.Institution__c,'Medical_Institution__c')}</td><td><span class="status ${usCls}">${escHtml(o.US_Review_Status__c)}</span></td><td>${o.TAT_Days__c||0}日</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
}
