/* Visit Management */

// ===========================================
// Phase 1: GPS取得
// ===========================================
function captureGPS() {
  const status = document.getElementById('gps-status');
  if (!navigator.geolocation) { status.textContent = 'GPS非対応のブラウザです'; return; }
  status.textContent = '取得中...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = Math.round(pos.coords.latitude * 10000000) / 10000000;
      const lng = Math.round(pos.coords.longitude * 10000000) / 10000000;
      const acc = Math.round(pos.coords.accuracy * 100) / 100;
      const form = document.getElementById('record-form');
      if (form.querySelector('[name="Checkin_Latitude__c"]')) form.querySelector('[name="Checkin_Latitude__c"]').value = lat;
      if (form.querySelector('[name="Checkin_Longitude__c"]')) form.querySelector('[name="Checkin_Longitude__c"]').value = lng;
      if (form.querySelector('[name="Location_Accuracy__c"]')) form.querySelector('[name="Location_Accuracy__c"]').value = acc;
      if (form.querySelector('[name="Checkin_Time__c"]')) form.querySelector('[name="Checkin_Time__c"]').value = new Date().toISOString().slice(0,16);
      status.textContent = `取得完了 (${lat}, ${lng}) 精度: ${acc}m`;
      status.style.color = '#2e7d32';
    },
    (err) => { status.textContent = 'GPS取得失敗: ' + err.message; status.style.color = '#c62828'; },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ===========================================
// Phase 1: 訪問マップ
// ===========================================
function renderVisitMap() {
  renderTopbar('訪問マップ', '📍', `<button class="btn btn-sm btn-secondary" onclick="navigate('obj','Visit_Record__c')">← 訪問記録一覧</button>`);
  const visits = (store.Visit_Record__c || []).filter(v => v.Checkin_Latitude__c && v.Checkin_Longitude__c);

  let html = `<div class="card"><div class="card-header"><h3>訪問記録マップ <span style="font-size:13px;color:#888">(${visits.length}件)</span></h3></div>
    <div id="visit-map-container" style="height:500px;border-radius:8px"></div></div>`;

  // 凡例
  html += `<div class="card"><div class="card-header"><h3>凡例</h3></div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px">
      <span>📍 訪問地点</span><span style="color:#0176d3">--- 訪問ルート（時系列）</span>
      <span>🟢 良好</span><span>🔵 継続検討</span><span>🟠 保留</span><span>🟡 次回アポ取得</span>
    </div></div>`;

  // 訪問一覧テーブル
  html += `<div class="card"><div class="card-header"><h3>訪問履歴</h3></div><table><thead><tr><th>訪問番号</th><th>ドクター</th><th>医療機関</th><th>訪問日</th><th>目的</th><th>結果</th><th>位置精度</th></tr></thead><tbody>`;
  visits.sort((a,b) => (b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||'')).forEach(v => {
    const cls = {良好:'s-green',継続検討:'s-blue',保留:'s-orange',次回アポ取得:'s-teal',不在:'s-gray'}[v.Result__c] || 's-gray';
    html += `<tr onclick="showDetail('Visit_Record__c','${v.id}')"><td><span class="cell-link">${v.Name}</span></td><td>${resolveRef(v.Doctor__c,'Doctor__c')}</td><td>${resolveRef(v.Institution__c,'Medical_Institution__c')}</td><td>${v.Visit_Date__c||'-'}</td><td>${v.Purpose__c||'-'}</td><td><span class="status ${cls}">${v.Result__c||'-'}</span></td><td>${v.Location_Accuracy__c||'-'}m</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;

  setTimeout(() => {
    if (typeof L === 'undefined') return;
    const map = L.map('visit-map-container').setView([35.68, 139.76], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'&copy; OpenStreetMap'}).addTo(map);

    const sorted = [...visits].sort((a,b) => (a.Visit_Date__c||'').localeCompare(b.Visit_Date__c||''));
    const coords = [];
    const resultColors = {良好:'#2e7d32',継続検討:'#1565c0',保留:'#e65100',次回アポ取得:'#00897b',不在:'#888'};

    sorted.forEach(v => {
      const lat = v.Checkin_Latitude__c, lng = v.Checkin_Longitude__c;
      const doc = resolveRef(v.Doctor__c, 'Doctor__c');
      const inst = resolveRef(v.Institution__c, 'Medical_Institution__c');
      const color = resultColors[v.Result__c] || '#888';

      const icon = L.divIcon({
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8], className: ''
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`<b>${v.Name}</b><br>${v.Visit_Date__c}<br>👨‍⚕️ ${doc}<br>🏥 ${inst}<br>目的: ${v.Purpose__c||'-'}<br>結果: <b>${v.Result__c||'-'}</b><br>面談: ${v.Duration__c||'-'}分`);
      coords.push([lat, lng]);
    });

    // ルート線
    if (coords.length > 1) {
      L.polyline(coords, {color: '#0176d3', weight: 2, dashArray: '6,8', opacity: 0.7}).addTo(map);
    }
    if (coords.length) map.fitBounds(coords, {padding: [30, 30]});
  }, 200);
}

// ===========================================
// Phase 2: 訪問レポート・集計
// ===========================================
function renderVisitReport() {
  renderTopbar('訪問レポート', '📊');
  const visits = store.Visit_Record__c || [];
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`;

  const thisMonth = visits.filter(v => (v.Visit_Date__c||'').startsWith(thisMonthStr)).length;
  const lastMonth = visits.filter(v => (v.Visit_Date__c||'').startsWith(lastMonthStr)).length;
  const durations = visits.filter(v => v.Duration__c).map(v => v.Duration__c);
  const avgDuration = durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 0;
  const uniqueDoctors = [...new Set(visits.map(v => v.Doctor__c).filter(Boolean))].length;
  const uniqueInst = [...new Set(visits.map(v => v.Institution__c).filter(Boolean))].length;
  const monthChange = lastMonth > 0 ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : 0;

  let html = `<div class="kpi-row cols-5">
    <div class="kpi-card blue"><div class="kpi-val">${visits.length}</div><div class="kpi-label">総訪問数</div></div>
    <div class="kpi-card green"><div class="kpi-val">${thisMonth}</div><div class="kpi-label">今月訪問 ${monthChange >= 0 ? '↑' : '↓'}${Math.abs(monthChange)}%</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${avgDuration}分</div><div class="kpi-label">平均面談時間</div></div>
    <div class="kpi-card orange"><div class="kpi-val">${uniqueDoctors}</div><div class="kpi-label">訪問ドクター数</div></div>
    <div class="kpi-card teal"><div class="kpi-val">${uniqueInst}</div><div class="kpi-label">訪問施設数</div></div>
  </div>`;

  // Charts
  html += `<div class="chart-grid"><div class="chart-card"><h4>月別訪問数</h4><canvas id="vr-monthly"></canvas></div>
    <div class="chart-card"><h4>訪問目的別</h4><canvas id="vr-purpose"></canvas></div></div>`;
  html += `<div class="chart-grid"><div class="chart-card"><h4>訪問結果別</h4><canvas id="vr-result"></canvas></div>
    <div class="chart-card"><h4>担当者別訪問数</h4><canvas id="vr-owner"></canvas></div></div>`;

  // ドクター別集計
  html += `<div class="card"><div class="card-header"><h3>ドクター別訪問集計</h3></div><table><thead><tr><th>ドクター</th><th>医療機関</th><th>訪問回数</th><th>最終訪問日</th><th>平均面談時間</th><th>最新結果</th></tr></thead><tbody>`;
  const docVisits = {};
  visits.forEach(v => { if (!docVisits[v.Doctor__c]) docVisits[v.Doctor__c] = []; docVisits[v.Doctor__c].push(v); });
  Object.entries(docVisits).sort((a,b) => b[1].length - a[1].length).forEach(([docId, vList]) => {
    const doc = resolveRef(docId, 'Doctor__c');
    const inst = resolveRef(vList[0]?.Institution__c, 'Medical_Institution__c');
    const sorted = vList.sort((a,b) => (b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||''));
    const lastDate = sorted[0]?.Visit_Date__c || '-';
    const lastResult = sorted[0]?.Result__c || '-';
    const durs = vList.filter(v => v.Duration__c);
    const avg = durs.length ? Math.round(durs.reduce((s,v)=>s+v.Duration__c,0)/durs.length) : '-';
    const cls = {良好:'s-green',継続検討:'s-blue',保留:'s-orange',次回アポ取得:'s-teal',不在:'s-gray'}[lastResult] || 's-gray';
    html += `<tr><td>${doc}</td><td>${inst}</td><td><strong>${vList.length}</strong></td><td>${lastDate}</td><td>${avg}分</td><td><span class="status ${cls}">${lastResult}</span></td></tr>`;
  });
  html += `</tbody></table></div>`;

  // 医療機関別集計
  html += `<div class="card"><div class="card-header"><h3>医療機関別訪問集計</h3></div><table><thead><tr><th>医療機関</th><th>訪問回数</th><th>訪問ドクター数</th><th>最終訪問日</th></tr></thead><tbody>`;
  const instVisits = {};
  visits.forEach(v => { const key = v.Institution__c; if (!instVisits[key]) instVisits[key] = []; instVisits[key].push(v); });
  Object.entries(instVisits).sort((a,b) => b[1].length - a[1].length).forEach(([instId, vList]) => {
    const inst = resolveRef(instId, 'Medical_Institution__c');
    const docCount = [...new Set(vList.map(v => v.Doctor__c))].length;
    const lastDate = vList.sort((a,b) => (b.Visit_Date__c||'').localeCompare(a.Visit_Date__c||''))[0]?.Visit_Date__c || '-';
    html += `<tr><td>${inst}</td><td><strong>${vList.length}</strong></td><td>${docCount}</td><td>${lastDate}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;

  // Charts
  setTimeout(() => {
    const chartColors = ['#42a5f5','#66bb6a','#ffa726','#ab47bc','#26a69a','#ef5350','#78909c','#ec407a'];

    // 月別
    const months = [...new Set(visits.map(v => (v.Visit_Date__c||'').substring(0,7)))].filter(Boolean).sort();
    new Chart(document.getElementById('vr-monthly'), {
      type:'bar', data:{labels:months, datasets:[{label:'訪問数',data:months.map(m=>visits.filter(v=>(v.Visit_Date__c||'').startsWith(m)).length),backgroundColor:'#42a5f5'}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}
    });

    // 目的別
    const purposes = [...new Set(visits.map(v => v.Purpose__c).filter(Boolean))];
    new Chart(document.getElementById('vr-purpose'), {
      type:'doughnut', data:{labels:purposes,datasets:[{data:purposes.map(p=>visits.filter(v=>v.Purpose__c===p).length),backgroundColor:chartColors}]},
      options:{responsive:true,plugins:{legend:{position:'right'}}}
    });

    // 結果別
    const results = [...new Set(visits.map(v => v.Result__c).filter(Boolean))];
    const resultColors = {良好:'#66bb6a',継続検討:'#42a5f5',保留:'#ffa726',次回アポ取得:'#26a69a',不在:'#78909c'};
    new Chart(document.getElementById('vr-result'), {
      type:'doughnut', data:{labels:results,datasets:[{data:results.map(r=>visits.filter(v=>v.Result__c===r).length),backgroundColor:results.map(r=>resultColors[r]||'#888')}]},
      options:{responsive:true,plugins:{legend:{position:'right'}}}
    });

    // 担当者別
    const owners = [...new Set(visits.map(v => v.OwnerId).filter(Boolean))];
    new Chart(document.getElementById('vr-owner'), {
      type:'bar', data:{labels:owners.map(o=>getUserName(o)),datasets:[{label:'訪問数',data:owners.map(o=>visits.filter(v=>v.OwnerId===o).length),backgroundColor:'#ab47bc'}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}
    });
  }, 100);
}

// ===========================================
// Phase 3: 訪問カレンダー (既存カレンダー拡張版)
// ===========================================
let visitCalYear = null;
let visitCalMonth = null;

function renderVisitCalendar(yearOvr, monthOvr) {
  const now = new Date();
  visitCalYear = yearOvr != null ? yearOvr : (visitCalYear != null ? visitCalYear : now.getFullYear());
  visitCalMonth = monthOvr != null ? monthOvr : (visitCalMonth != null ? visitCalMonth : now.getMonth());

  const year = visitCalYear, month = visitCalMonth;
  const prevY = month === 0 ? year - 1 : year;
  const prevM = month === 0 ? 11 : month - 1;
  const nextY = month === 11 ? year + 1 : year;
  const nextM = month === 11 ? 0 : month + 1;

  const navBtns = `<button class="btn btn-sm btn-secondary" onclick="renderVisitCalendar(${prevY},${prevM})">◀ 前月</button>
    <button class="btn btn-sm btn-primary" onclick="visitCalYear=null;visitCalMonth=null;renderVisitCalendar()">今月</button>
    <button class="btn btn-sm btn-secondary" onclick="renderVisitCalendar(${nextY},${nextM})">翌月 ▶</button>
    <button class="btn btn-sm btn-primary" onclick="showCreateForm('Visit_Record__c')">+ 訪問予定追加</button>`;
  renderTopbar('訪問カレンダー', '🗓️', navBtns);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const visits = store.Visit_Record__c || [];
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  let html = `<div class="card"><div class="card-header"><h3>${year}年 ${monthNames[month]} 訪問カレンダー</h3></div>`;
  html += `<div class="calendar">`;
  ['日','月','火','水','木','金','土'].forEach(d => html += `<div class="cal-header">${d}</div>`);

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === today;
    const dayVisits = visits.filter(v => v.Visit_Date__c === dateStr);
    const plannedVisits = visits.filter(v => v.Next_Visit_Date__c === dateStr);
    const overdueVisits = visits.filter(v => v.Next_Visit_Date__c === dateStr && dateStr < today);

    html += `<div class="cal-day${isToday ? ' cal-today' : ''}" onclick="showFormModal('Visit_Record__c',null,{Visit_Date__c:'${dateStr}'})">`;
    html += `<div class="day-num">${d}</div>`;

    dayVisits.forEach(v => {
      const cls = overdueVisits.includes(v) ? 'overdue' : 'visit';
      html += `<div class="cal-event ${cls}" onclick="event.stopPropagation();showDetail('Visit_Record__c','${v.id}')" title="訪問: ${resolveRef(v.Doctor__c,'Doctor__c')}">📝 ${resolveRef(v.Doctor__c,'Doctor__c')}</div>`;
    });
    plannedVisits.forEach(v => {
      const isOverdue = dateStr < today;
      const cls = isOverdue ? 'overdue' : 'planned';
      const icon = isOverdue ? '⚠️' : '🔵';
      html += `<div class="cal-event ${cls}" onclick="event.stopPropagation();showDetail('Visit_Record__c','${v.id}')" title="予定: ${resolveRef(v.Doctor__c,'Doctor__c')}${isOverdue ? ' (期限超過)' : ''}">${icon} ${resolveRef(v.Doctor__c,'Doctor__c')}</div>`;
    });
    html += `</div>`;
  }
  html += `</div></div>`;

  // 今後の訪問予定リスト
  const upcoming = visits.filter(v => v.Next_Visit_Date__c && v.Next_Visit_Date__c >= today).sort((a,b) => a.Next_Visit_Date__c.localeCompare(b.Next_Visit_Date__c));
  const overdue = visits.filter(v => v.Next_Visit_Date__c && v.Next_Visit_Date__c < today).sort((a,b) => a.Next_Visit_Date__c.localeCompare(b.Next_Visit_Date__c));

  if (overdue.length) {
    html += `<div class="card" style="border-left:4px solid #c62828"><div class="card-header"><h3 style="color:#c62828">⚠️ 期限超過の訪問予定 (${overdue.length}件)</h3></div><table><thead><tr><th>訪問番号</th><th>ドクター</th><th>予定日</th><th>ネクストアクション</th><th>担当</th></tr></thead><tbody>`;
    overdue.forEach(v => {
      html += `<tr onclick="showDetail('Visit_Record__c','${v.id}')" style="background:#fff5f5"><td><span class="cell-link">${v.Name}</span></td><td>${resolveRef(v.Doctor__c,'Doctor__c')}</td><td style="color:#c62828;font-weight:600">${v.Next_Visit_Date__c}</td><td>${v.Next_Action__c||'-'}</td><td>${getUserName(v.OwnerId)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  if (upcoming.length) {
    html += `<div class="card"><div class="card-header"><h3>📅 今後の訪問予定 (${upcoming.length}件)</h3></div><table><thead><tr><th>訪問番号</th><th>ドクター</th><th>予定日</th><th>ネクストアクション</th><th>担当</th></tr></thead><tbody>`;
    upcoming.forEach(v => {
      html += `<tr onclick="showDetail('Visit_Record__c','${v.id}')"><td><span class="cell-link">${v.Name}</span></td><td>${resolveRef(v.Doctor__c,'Doctor__c')}</td><td>${v.Next_Visit_Date__c}</td><td>${v.Next_Action__c||'-'}</td><td>${getUserName(v.OwnerId)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  document.getElementById('content').innerHTML = html;
}
