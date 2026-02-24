/* Specialized Views - KOL, Territory, Specimen, Compliance, Competitive Intel */

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
      <td><strong>${escHtml(d.Name)}</strong></td><td>${inst}</td><td>${escHtml(d.Cancer_Type__c||'-')}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div style="width:60px;height:8px;background:#eee;border-radius:4px"><div style="width:${score}%;height:100%;background:${barColor};border-radius:4px"></div></div><strong>${score}</strong></div></td>
      <td><span class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray'}">${escHtml(d.Relationship_Level__c||'-')}</span></td>
      <td>${d.Visit_Count__c||0}</td><td>${seminars}</td><td>${research}</td><td>${specs}</td></tr>`;
  });
  html += `</tbody></table></div></div>`;

  // がん種別分布
  html += `<div class="card"><div class="card-header"><h3>がん種別 KOL分布</h3></div><div class="cancer-kol-grid">`;
  cancerTypes.forEach(ct => {
    const drs = doctors.filter(d => d.Cancer_Type__c === ct).sort((a,b) => (b.KOL_Score__c||0)-(a.KOL_Score__c||0));
    html += `<div class="cancer-kol-section"><h4>${escHtml(ct)}（${drs.length}名）</h4>`;
    drs.forEach(d => {
      const inst = getInstitutionName(d.Institution__c);
      html += `<div class="kol-chip" onclick="renderDoctor360('${d.id}')" title="${escAttr((inst||'') + ' ' + (d.Title__c||''))}">${escHtml(d.Name)} <small>${d.KOL_Score__c||0}</small></div>`;
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
    html += `<div class="kpi-card"><div class="kpi-value">${cnt}</div><div class="kpi-label">${escHtml(c.split('（')[0])}</div></div>`;
  });
  html += `</div>`;

  // 時系列表示
  html += `<div class="card"><div class="card-header"><h3>競合情報タイムライン</h3></div>`;
  intels.forEach(i => {
    const impactCls = {高:'s-red',中:'s-orange',低:'s-blue'}[i.Impact__c] || 's-gray';
    html += `<div class="intel-card" onclick="showDetail('Competitive_Intel__c','${i.id}')">
      <div class="intel-header">
        <span class="intel-date">${i.Date__c||'-'}</span>
        <span class="intel-competitor">${escHtml(i.Competitor__c||'-')}</span>
        <span class="intel-type">${escHtml(i.Intel_Type__c||'-')}</span>
        <span class="status ${impactCls}">影響度: ${escHtml(i.Impact__c||'-')}</span>
      </div>
      <div class="intel-title"><strong>${escHtml(i.Name)}</strong></div>
      <div class="intel-summary">${escHtml((i.Summary__c||'').substring(0,300))}${(i.Summary__c||'').length > 300 ? '...' : ''}</div>
      ${i.Action_Required__c ? `<div class="intel-action">📌 要アクション: ${escHtml(i.Action_Required__c)}</div>` : ''}
      <div class="intel-source">情報源: ${escHtml(i.Source__c||'-')} | 報告: ${getUserName(i.OwnerId)}</div>
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
    html += `<tr onclick="showDetail('Approval_Request__c','${a.id}')"><td>${escHtml(a.Name)}</td><td>${escHtml(a.Request_Type__c||'-')}</td><td>¥${Number(a.Amount__c).toLocaleString()}</td><td><span class="status ${cls}">${escHtml(a.Status__c)}</span></td><td>${getUserName(a.Requested_By__c)}</td><td>${getUserName(a.Approver__c)}</td></tr>`;
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
    html += `<div class="expense-type-row"><span class="expense-type-label">${escHtml(type)}</span><div class="expense-type-bar-wrap"><div class="expense-type-bar" style="width:${Math.round(amount/Math.max(...Object.values(byType))*100)}%"></div></div><span class="expense-type-amount">¥${amount.toLocaleString()}</span></div>`;
  });
  html += `</div></div>`;

  // 経費一覧
  html += `<div class="card"><div class="card-header"><h3>経費一覧</h3></div>`;
  html += `<div class="table-wrap"><table><thead><tr><th>番号</th><th>日付</th><th>種別</th><th>金額</th><th>内容</th><th>領収書</th><th>ステータス</th></tr></thead><tbody>`;
  myExpenses.sort((a,b) => (b.Report_Date__c||'').localeCompare(a.Report_Date__c||'')).forEach(e => {
    const cls = {下書き:'s-gray',申請中:'s-blue',承認済:'s-green',差戻し:'s-red',支払済:'s-teal'}[e.Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Expense_Report__c','${e.id}')"><td>${escHtml(e.Name)}</td><td>${escHtml(e.Report_Date__c||'-')}</td><td>${escHtml(e.Expense_Type__c||'-')}</td><td>¥${(e.Amount__c||0).toLocaleString()}</td><td>${escHtml(e.Description__c||'-')}</td><td>${e.Receipt_Attached__c ? '✅' : '❌'}</td><td><span class="status ${cls}">${escHtml(e.Status__c||'-')}</span></td></tr>`;
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
    html += `<tr><td><strong>${escHtml(pref)}</strong></td><td>${data.institutions}</td><td>${data.adopted}</td><td>${data.doctors}</td><td>${data.visits}</td><td><div style="display:flex;align-items:center;gap:8px"><div style="width:80px;height:8px;background:#eee;border-radius:4px"><div style="width:${coverRate}%;height:100%;background:${barColor};border-radius:4px"></div></div>${coverRate}%</div></td></tr>`;
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
      html += `<div class="mr-doctor-chip" onclick="renderDoctor360('${d.id}')">${escHtml(d.Name)}<small>${inst}</small></div>`;
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
        <strong>${escHtml(sp.Name)}</strong>
        <span>${escHtml(sp.Cancer_Type__c||'-')}</span>
        <span>${escHtml(sp.Specimen_Type__c||'-')}</span>
        <span class="status ${({受領待ち:'s-gray',受領済:'s-blue',QC中:'s-orange',解析中:'s-purple',レポート作成:'s-teal',レビュー中:'s-yellow',完了:'s-green',不適格:'s-red'})[sp.Status__c]||'s-gray'}">${escHtml(sp.Status__c)}</span>
        <span style="color:${tatColor};font-weight:600">TAT ${sp.TAT_Days__c||0}日</span>
      </div>
      <div class="specimen-progress"><div class="specimen-progress-bar" style="width:${progress}%"></div></div>
      <div class="specimen-meta">
        <span>🏥 ${inst}</span>
        <span>👨‍⚕️ ${doc ? escHtml(doc.Name) : '-'}</span>
        <span>患者: ${escHtml(sp.Patient_ID__c||'-')}</span>
        <span>QC: ${escHtml(sp.QC_Status__c||'未実施')}</span>
        <span>レビュー: ${escHtml(sp.Review_Status__c||'-')}</span>
        ${sp.Report_Date__c ? `<span>レポート: ${escHtml(sp.Report_Date__c)}</span>` : ''}
      </div>
    </div>`;
  });
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}
