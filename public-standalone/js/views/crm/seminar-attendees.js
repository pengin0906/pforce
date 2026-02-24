/* Seminar Attendee Management */

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
        <td><span class="cell-link" onclick="renderSeminarAttendees('${s.id}')">${escHtml(s.Name)}</span></td>
        <td>${escHtml(s.Date__c||'-')}</td>
        <td><span class="status s-blue">${escHtml(s.Format__c||'-')}</span></td>
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

  renderTopbar(`参加者管理: ${escHtml(sem.Name)}`, '👥',
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
      <div class="detail-field"><div class="dl">日程</div><div class="dv">${escHtml(sem.Date__c||'-')} ${escHtml(sem.Time__c||'')}</div></div>
      <div class="detail-field"><div class="dl">形式</div><div class="dv">${escHtml(sem.Format__c||'-')}</div></div>
      <div class="detail-field"><div class="dl">会場</div><div class="dv">${escHtml(sem.Venue__c||'-')}</div></div>
      <div class="detail-field"><div class="dl">講師</div><div class="dv">${resolveRef(sem.Speaker__c,'Doctor__c')}</div></div>
      <div class="detail-field"><div class="dl">ステータス</div><div class="dv"><span class="status s-blue">${escHtml(sem.Status__c||'-')}</span></div></div>
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
      <td><span class="cell-link">${escHtml(a.Name)}</span></td>
      <td>${inst}</td>
      <td>${escHtml(a.Registration_Date__c||'-')}</td>
      <td><span class="status ${stCls}">${escHtml(a.Attendance_Status__c||'-')}</span></td>
      <td>${a.Bento_Required__c ? '<span style="color:#e65100;font-weight:600">🍱 要</span>' : '<span style="color:#bbb">不要</span>'}</td>
      <td>${escHtml(a.Note__c||'-')}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;

  // 弁当手配情報
  if (semBentos.length) {
    html += `<div class="card"><div class="card-header"><h3>🍱 弁当手配</h3></div>
      <table><thead><tr><th>手配名</th><th>業者</th><th>メニュー</th><th>数量</th><th>単価</th><th>合計</th><th>配達時間</th><th>ステータス</th></tr></thead><tbody>`;
    semBentos.forEach(b => {
      html += `<tr onclick="showDetail('Bento_Order__c','${b.id}')">
        <td><span class="cell-link">${escHtml(b.Name)}</span></td>
        <td>${escHtml(b.Vendor__c||'-')}</td><td>${escHtml(b.Menu__c||'-')}</td>
        <td>${b.Quantity__c||0}</td><td>¥${Number(b.Unit_Price__c||0).toLocaleString()}</td>
        <td><strong>¥${Number(b.Total__c||0).toLocaleString()}</strong></td>
        <td>${escHtml(b.Delivery_Time__c||'-')}</td>
        <td><span class="status ${({手配中:'s-orange',発注済:'s-blue',配達済:'s-green',キャンセル:'s-red'})[b.Status__c]||'s-gray'}">${escHtml(b.Status__c||'-')}</span></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  document.getElementById('content').innerHTML = html;
}
