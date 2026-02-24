/* Workflow, Daily Report & Approval */

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
        html += `<tr><td>${escHtml(r.Report_Date__c)}</td><td>${getUserName(r.OwnerId)}</td><td>${escHtml(r.Report_Type__c||'-')}</td><td>${r.Visit_Summary__c||0}</td>
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
        <span class="report-date">${escHtml(r.Report_Date__c)}</span>
        <span>${getUserName(r.OwnerId)}</span>
        <span class="status ${cls}">${escHtml(r.Approval_Status__c||'下書き')}</span>
        <span>訪問 ${r.Visit_Summary__c||0}件</span>
      </div>
      <div class="report-body">
        <div class="report-section"><strong>活動内容:</strong><br>${escHtml((r.Key_Activities__c||'-').substring(0,200))}${(r.Key_Activities__c||'').length > 200 ? '...' : ''}</div>
        ${r.Key_Findings__c ? `<div class="report-section"><strong>気づき:</strong><br>${escHtml(r.Key_Findings__c.substring(0,150))}${r.Key_Findings__c.length > 150 ? '...' : ''}</div>` : ''}
      </div>
      ${r.Approval_Comment__c ? `<div class="report-approval"><strong>承認者コメント (${getUserName(r.Approved_By__c)}):</strong> ${escHtml(r.Approval_Comment__c)}</div>` : ''}
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
          <span class="approval-type">${escHtml(r.Request_Type__c)}</span>
          <strong>${escHtml(r.Name)}</strong>
          <span class="status ${prCls}">${escHtml(r.Priority__c||'中')}</span>
          ${r.Amount__c ? `<span class="approval-amount">¥${Number(r.Amount__c).toLocaleString()}</span>` : ''}
        </div>
        <div class="approval-body">${escHtml((r.Description__c||'').substring(0,300))}${(r.Description__c||'').length > 300 ? '...' : ''}</div>
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
    html += `<tr onclick="showDetail('Approval_Request__c','${r.id}')"><td>${escHtml(r.Name)}</td><td>${escHtml(r.Request_Type__c||'-')}</td><td>${r.Amount__c ? '¥'+Number(r.Amount__c).toLocaleString() : '-'}</td><td>${getUserName(r.Requested_By__c)}</td><td>${getUserName(r.Approver__c)}</td><td><span class="status ${cls}">${escHtml(r.Status__c)}</span></td><td>${escHtml(r.Submitted_Date__c||'-')}</td></tr>`;
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
        <div class="wf-type-name">${escHtml(tpl.name)}</div>
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
        <strong>${escHtml(wf.Name)}</strong>
        <div class="wf-card-meta">
          <span class="status ${stCls}">${escHtml(wf.Status__c)}</span>
          <span class="status ${priCls}">${escHtml(wf.Priority__c)}</span>
          <span>${escHtml(wf.Workflow_Type__c)}</span>
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
      h += `<div class="wf-step-dot ${sCls}" title="${escAttr(s.name + ': ' + s.status)}"></div>`;
      if (i < wf.steps.length - 1) h += `<div class="wf-step-line ${s.status==='完了'?'wf-line-done':''}"></div>`;
    });
    h += `</div>`;
  }

  // 現在ステップ詳細
  if (currentStep) {
    h += `<div class="wf-current-step">
      <span style="font-size:11px;color:#666">現在:</span> <strong>${escHtml(currentStep.name)}</strong>
      <span style="color:#888">担当: ${getUserName(currentStep.assignee)}</span>
      ${currentStep.dueDate ? `<span style="color:${currentStep.dueDate < new Date().toISOString().split('T')[0] ? '#c62828' : '#666'}">期限: ${escHtml(currentStep.dueDate)}</span>` : ''}
      ${currentStep.comment ? `<span style="color:#555">${escHtml(currentStep.comment.substring(0,60))}${currentStep.comment.length>60?'...':''}</span>` : ''}
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

  renderTopbar(`${tpl.icon||'⚙️'} ${escHtml(wf.Name)}`, '', `<button class="btn btn-secondary btn-sm" onclick="navigate('workflow')">一覧に戻る</button>`);

  let html = '';

  // ヘッダー情報
  const stCls = {未開始:'s-gray',進行中:'s-blue',承認待ち:'s-orange',完了:'s-green',中止:'s-red',差戻し:'s-red'}[wf.Status__c]||'s-gray';
  const progress = wf.Total_Steps__c ? Math.round((wf.steps ? wf.steps.filter(s=>s.status==='完了').length : 0) / wf.Total_Steps__c * 100) : 0;

  html += `<div class="wf-detail-header" style="border-left:4px solid ${tpl.color||'#1565c0'}">
    <div class="wf-detail-info">
      <h2>${tpl.icon||'⚙️'} ${escHtml(wf.Name)}</h2>
      <div style="display:flex;gap:8px;align-items:center;margin:8px 0">
        <span class="status ${stCls}">${escHtml(wf.Status__c)}</span>
        <span class="status ${({緊急:'s-red',高:'s-orange',中:'s-blue',低:'s-gray'})[wf.Priority__c]||'s-gray'}">${escHtml(wf.Priority__c)}</span>
        <span style="background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:12px">${escHtml(wf.Workflow_Type__c)}</span>
      </div>
      <p style="color:#555;margin:8px 0">${escHtml(wf.Description__c || '')}</p>
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
            <strong>Step ${step.no}: ${escHtml(step.name)}</strong>
            <span class="status ${isDone?'s-green':isActive?(step.status==='承認待ち'?'s-orange':'s-blue'):'s-gray'}">${escHtml(step.status)}</span>
          </div>
          <div class="wf-tl-meta">
            <span>担当: ${getUserName(step.assignee)}</span>
            ${step.completed ? `<span>完了: ${step.completed}</span>` : ''}
            ${step.dueDate && !isDone ? `<span style="color:${isOverdue?'#c62828':'#666'}">期限: ${step.dueDate} ${isOverdue?'(超過)':''}</span>` : ''}
          </div>
          ${step.comment ? `<div class="wf-tl-comment">${escHtml(step.comment)}</div>` : ''}
        </div>
      </div>`;
    });
  }
  html += `</div></div>`;

  // 関連レコード
  if (wf.Related_Record__c) {
    html += `<div class="card"><div class="card-header"><h3>関連レコード</h3></div>
      <p style="padding:8px 0">ID: <code>${escHtml(wf.Related_Record__c)}</code></p>
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
    h += `<div class="wf-step-dot wf-step-pending" title="${escAttr(s)}"></div>`;
    if (i < tpl.steps.length - 1) h += `<div class="wf-step-line"></div>`;
  });
  h += `</div><table style="font-size:12px"><thead><tr><th>Step</th><th>ステップ名</th><th>デフォルト担当</th></tr></thead><tbody>`;
  tpl.steps.forEach((s,i) => {
    const assignee = tpl.defaultAssignees[i];
    const assigneeName = assignee === 'requester' ? '起票者' : assignee === 'manager' ? 'マネージャー' : getUserName(assignee);
    h += `<tr><td>${i+1}</td><td>${escHtml(s)}</td><td>${escHtml(assigneeName)}</td></tr>`;
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
