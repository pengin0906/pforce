/* Doctor 360 & Assignment */

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

  renderTopbar(`Doctor 360° - ${escHtml(doc.Name)}`, '👨‍⚕️', `<button class="btn btn-sm btn-secondary" onclick="navigate('doctor-360')">← ドクター選択</button> <button class="btn btn-sm btn-primary" onclick="showEditForm('Doctor__c','${doc.id}')">編集</button>`);

  let html = '';

  // プロファイルカード
  html += `<div class="doctor-profile-card">
    <div class="doctor-profile-header">
      <div class="doctor-avatar">${escHtml(doc.Name.charAt(0))}</div>
      <div class="doctor-info">
        <h2>${escHtml(doc.Name)}</h2>
        <div class="doctor-meta">🏥 ${inst} | ${escHtml(doc.Department__c||'-')} | ${escHtml(doc.Title__c||'-')}</div>
        <div class="doctor-meta">専門: ${escHtml(doc.Cancer_Type__c||'-')} | KOLスコア: <strong>${doc.KOL_Score__c||0}</strong></div>
      </div>
      <div class="doctor-status-area">
        <div class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[doc.Relationship_Level__c]||'s-gray'}">${escHtml(doc.Relationship_Level__c||'-')}</div>
        <div style="margin-top:8px">genmine関心度: <strong>${escHtml(doc.Genomic_Interest__c||'不明')}</strong></div>
      </div>
    </div>
    ${doc.Note__c ? `<div class="doctor-note">${escHtml(doc.Note__c)}</div>` : ''}
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
  visits.forEach(v => timeline.push({date:v.Visit_Date__c, type:'訪問', icon:'📝', title:v.Purpose__c||'訪問', detail:v.Detail__c||'', result:v.Result__c, id:v.id, obj:'Visit_Record__c'}));
  maActivities.forEach(m => timeline.push({date:m.Date__c, type:'MA活動', icon:'🎤', title:m.Name, detail:m.Outcome__c||'', result:m.Status__c, id:m.id, obj:'MA_Activity__c'}));
  seminars.forEach(s => timeline.push({date:s.Date__c, type:'講演', icon:'📚', title:s.Name, detail:(s.Format__c||'') + ' - ' + (s.Venue__c||''), result:s.Status__c, id:s.id, obj:'Seminar__c'}));
  timeline.sort((a,b) => (b.date||'').localeCompare(a.date||''));

  html += `<div class="card"><div class="card-header"><h3>活動タイムライン</h3></div><div class="timeline">`;
  timeline.forEach(t => {
    html += `<div class="timeline-item" onclick="showDetail('${t.obj}','${t.id}')">
      <div class="timeline-dot">${t.icon}</div>
      <div class="timeline-content">
        <div class="timeline-date">${escHtml(t.date||'-')} <span class="timeline-type">${escHtml(t.type)}</span> ${t.result ? `<span class="status s-blue">${escHtml(t.result)}</span>` : ''}</div>
        <div class="timeline-title">${escHtml(t.title)}</div>
        ${t.detail ? `<div class="timeline-detail">${escHtml(t.detail.substring(0,200))}${t.detail.length > 200 ? '...' : ''}</div>` : ''}
      </div>
    </div>`;
  });
  html += `</div></div>`;

  // 検体一覧
  if (specimens.length > 0) {
    html += `<div class="card"><div class="card-header"><h3>紹介検体 (${specimens.length}件)</h3></div>`;
    html += `<div class="table-wrap"><table><thead><tr><th>検体ID</th><th>がん種</th><th>検体種別</th><th>ステータス</th><th>レビュー</th><th>TAT</th></tr></thead><tbody>`;
    specimens.forEach(s => {
      html += `<tr onclick="showDetail('Specimen__c','${s.id}')"><td>${escHtml(s.Name)}</td><td>${escHtml(s.Cancer_Type__c||'-')}</td><td>${escHtml(s.Specimen_Type__c||'-')}</td><td><span class="status ${({受領待ち:'s-gray',受領済:'s-blue',QC中:'s-orange',解析中:'s-purple',レポート作成:'s-teal',レビュー中:'s-yellow',完了:'s-green',不適格:'s-red'})[s.Status__c]||'s-gray'}">${escHtml(s.Status__c)}</span></td><td>${escHtml(s.Review_Status__c||'-')}</td><td>${s.TAT_Days__c||'-'}日</td></tr>`;
    });
    html += `</tbody></table></div></div>`;
  }

  // 共同研究
  if (research.length > 0) {
    html += `<div class="card"><div class="card-header"><h3>共同研究</h3></div>`;
    research.forEach(r => {
      html += `<div class="research-card" onclick="showDetail('Joint_Research__c','${r.id}')">
        <strong>${escHtml(r.Name)}</strong> <span class="status s-blue">${escHtml(r.Status__c)}</span>
        <div style="margin-top:6px;font-size:13px;color:#666">パートナー: ${escHtml(r.Partner__c)} | 期間: ${escHtml(r.Start_Date__c)}〜${escHtml(r.End_Date__c)} | 予算: ¥${(r.Budget__c/10000).toFixed(0)}万 | 投稿先: ${escHtml(r.Publication_Plan__c||'-')}</div>
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
      <div class="doctor-select-avatar">${escHtml(d.Name.charAt(0))}</div>
      <div class="doctor-select-info">
        <strong>${escHtml(d.Name)}</strong>
        <div class="sub-text">🏥 ${inst}</div>
        <div style="font-size:12px;color:#888">${escHtml(d.Department__c||'-')} ${escHtml(d.Title__c||'-')}</div>
        <div style="margin-top:4px"><span class="status ${cls}">${escHtml(d.Relationship_Level__c||'-')}</span> <span style="font-size:12px">KOL: ${d.KOL_Score__c||0}</span></div>
      </div>
    </div>`;
  });
  html += `</div></div>`;
  document.getElementById('content').innerHTML = html;
}

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
      html += `<tr><td>${escHtml(d.Name)}</td><td>${getInstitutionName(d.Institution__c)}</td>
        <td><span class="status ${({未接触:'s-gray',初回面談済:'s-blue',関心あり:'s-orange',検討中:'s-purple',推進者:'s-teal','ファン（KOL）':'s-green'})[d.Relationship_Level__c]||'s-gray'}">${escHtml(d.Relationship_Level__c||'-')}</span></td>
        <td><select class="filter-select" style="font-size:11px" onchange="reassignDoctor('${d.id}',this.value)">
          ${salesMA.map(su=>`<option value="${escAttr(su.id)}" ${su.id===u.id?'selected':''}>${escHtml(su.name)}</option>`).join('')}
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
      html += `<tr><td>${escHtml(d.Name)}</td><td>${getInstitutionName(d.Institution__c)}</td><td>${escHtml(d.Specialty__c||'-')}</td>
        <td><select class="filter-select" onchange="reassignDoctor('${d.id}',this.value)"><option value="">-- 選択 --</option>
          ${salesMA.map(u=>`<option value="${escAttr(u.id)}">${escHtml(u.name)}</option>`).join('')}</select></td></tr>`;
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
    h += `<tr><td>${escHtml(d.Name)}</td><td>${getInstitutionName(d.Institution__c)}</td><td>${escHtml(d.Relationship_Level__c||'-')}</td><td>${vCnt}</td><td>${pCnt}</td></tr>`;
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
