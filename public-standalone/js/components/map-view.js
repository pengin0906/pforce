/* Map View Component (Leaflet.js) */

function renderMapView() {
  const editBtn = `<button id="map-guide-btn" class="btn btn-sm btn-secondary" onclick="showMapGuide()" style="margin-right:6px">❓ 使い方</button><button id="map-edit-toggle" class="btn btn-sm ${mapEditMode ? 'btn-danger' : 'btn-secondary'}" onclick="toggleMapEditMode()">${mapEditMode ? '✏️ 編集モード解除' : '✏️ 編集モード'}</button>`;
  renderTopbar('マップ', '🗺️', editBtn);

  let html = `<div class="card"><div class="card-header"><h3>医療機関・勉強会会場マップ</h3></div><div id="map-container" class="${mapEditMode ? 'edit-mode' : ''}" style="height:500px;border-radius:8px"></div></div>`;

  // 編集モードバナー
  if (mapEditMode) {
    html += `<div class="card" style="background:#fff3e0;border-left:4px solid #e65100;padding:12px 20px">
      <div style="display:flex;align-items:center;gap:10px;font-size:13px">
        <span style="font-size:18px">✏️</span>
        <div><strong>編集モード</strong>: マーカーをドラッグして位置を変更 / マップをクリックして新規施設を追加 / ポップアップから編集・削除</div>
      </div>
    </div>`;
  }

  // 凡例
  html += `<div class="card"><div class="card-header"><h3>凡例</h3></div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px">
      <span>🏥 大学病院</span><span>🏨 がん拠点病院</span><span>🏫 一般病院/研究所</span><span>📚 勉強会会場</span>
    </div></div>`;

  // 施設一覧
  html += `<div class="card"><div class="card-header"><h3>施設一覧</h3>${mapEditMode ? '<button class="btn btn-sm btn-primary" onclick="onMapClickToAdd({latlng:{lat:35.68,lng:139.76}})">+ 新規施設</button>' : ''}</div><table><thead><tr><th>施設名</th><th>種別</th><th>都道府県</th><th>genmine導入</th><th>ドクター数</th>${mapEditMode ? '<th>操作</th>' : ''}</tr></thead><tbody>`;
  (store.Medical_Institution__c||[]).forEach(inst => {
    const docCount = (store.Doctor__c||[]).filter(d=>d.Institution__c===inst.id).length;
    const cls = getObjDef('Medical_Institution__c').statusMap[inst.Adapter_Status__c]||'s-gray';
    html += `<tr onclick="showDetail('Medical_Institution__c','${inst.id}')"><td><span class="cell-link">${inst.Name}</span></td><td>${inst.Facility_Type__c||'-'}</td><td>${inst.Prefecture__c||'-'}</td><td><span class="status ${cls}">${inst.Adapter_Status__c}</span></td><td>${docCount}</td>`;
    if (mapEditMode) {
      html += `<td onclick="event.stopPropagation()"><button class="btn btn-sm btn-primary" onclick="showEditForm('Medical_Institution__c','${inst.id}')">編集</button> <button class="btn btn-sm btn-danger" onclick="deleteRecordFromMap('Medical_Institution__c','${inst.id}')">削除</button></td>`;
    }
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;

  // Initialize Leaflet map
  setTimeout(() => {
    if (typeof L === 'undefined') return;
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    mapMarkers = [];

    mapInstance = L.map('map-container').setView([35.68, 139.76], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(mapInstance);

    addMapMarkers();

    if (mapEditMode) {
      mapInstance.on('click', onMapClickToAdd);
    }
  }, 200);
}

function toggleMapEditMode() {
  mapEditMode = !mapEditMode;
  renderMapView();
  toast(mapEditMode ? '編集モードに切り替えました' : '閲覧モードに戻りました');
}

function addMapMarkers() {
  mapMarkers = [];

  // Medical institutions
  (store.Medical_Institution__c||[]).forEach(inst => {
    if (inst.Latitude__c == null || inst.Longitude__c == null) return;
    const docCount = (store.Doctor__c||[]).filter(d=>d.Institution__c===inst.id).length;
    const icon = inst.Facility_Type__c==='大学病院'?'🏥':inst.Facility_Type__c==='がん拠点病院'?'🏨':'🏫';

    const marker = L.marker([inst.Latitude__c, inst.Longitude__c], { draggable: mapEditMode }).addTo(mapInstance);
    marker.bindPopup(buildMarkerPopup('Medical_Institution__c', inst.id, icon, inst, docCount));

    if (mapEditMode) {
      marker.on('dragend', function(e) { onMarkerDragEnd('Medical_Institution__c', inst.id, e); });
    }
    mapMarkers.push({ marker, type: 'institution', id: inst.id });
  });

  // Seminar venues
  (store.Seminar__c||[]).forEach(sem => {
    if (sem.Latitude__c == null || sem.Longitude__c == null) return;
    const marker = L.marker([sem.Latitude__c, sem.Longitude__c], { draggable: mapEditMode }).addTo(mapInstance);
    marker.bindPopup(buildMarkerPopup('Seminar__c', sem.id, '📚', sem, null));

    if (mapEditMode) {
      marker.on('dragend', function(e) { onMarkerDragEnd('Seminar__c', sem.id, e); });
    }
    mapMarkers.push({ marker, type: 'seminar', id: sem.id });
  });
}

function buildMarkerPopup(apiName, id, icon, rec, docCount) {
  let html = `<b>${icon} ${rec.Name}</b><br>`;
  if (apiName === 'Medical_Institution__c') {
    html += `${rec.Facility_Type__c||'-'}<br>genmine: ${rec.Adapter_Status__c||'-'}<br>ドクター: ${docCount||0}名`;
  } else {
    html += `${rec.Venue__c||'-'}<br>${rec.Date__c||'日程未定'}<br>ステータス: ${rec.Status__c||'-'}`;
  }
  html += `<br><small style="color:#888">📍 ${Number(rec.Latitude__c).toFixed(4)}, ${Number(rec.Longitude__c).toFixed(4)}</small>`;

  if (mapEditMode) {
    html += `<div style="margin-top:8px;display:flex;gap:6px">`;
    html += `<button class="btn btn-sm btn-primary" onclick="showEditForm('${apiName}','${id}')">編集</button>`;
    html += `<button class="btn btn-sm btn-danger" onclick="deleteRecordFromMap('${apiName}','${id}')">削除</button>`;
    html += `</div>`;
  }
  return html;
}

function onMarkerDragEnd(apiName, id, e) {
  const latlng = e.target.getLatLng();
  const rec = (store[apiName]||[]).find(r => r.id === id);
  if (!rec) return;

  rec.Latitude__c = Math.round(latlng.lat * 10000) / 10000;
  rec.Longitude__c = Math.round(latlng.lng * 10000) / 10000;

  const icon = apiName === 'Medical_Institution__c'
    ? (rec.Facility_Type__c==='大学病院'?'🏥':rec.Facility_Type__c==='がん拠点病院'?'🏨':'🏫')
    : '📚';
  const docCount = apiName === 'Medical_Institution__c'
    ? (store.Doctor__c||[]).filter(d=>d.Institution__c===id).length : null;

  e.target.setPopupContent(buildMarkerPopup(apiName, id, icon, rec, docCount));
  toast(`${rec.Name} の位置を更新しました (${rec.Latitude__c}, ${rec.Longitude__c})`);
}

function onMapClickToAdd(e) {
  if (!mapEditMode) return;
  const lat = Math.round(e.latlng.lat * 10000) / 10000;
  const lng = Math.round(e.latlng.lng * 10000) / 10000;
  showFormModal('Medical_Institution__c', null, { Latitude__c: lat, Longitude__c: lng });
}

function deleteRecordFromMap(apiName, id) {
  if (!confirm('削除してよろしいですか？')) return;
  store[apiName] = (store[apiName]||[]).filter(r => r.id !== id);
  toast('削除しました', 'error');
  renderSidebar();
  renderMapView();
}

// --- マップ操作ガイド ---
let mapGuideStep = 0;
const MAP_GUIDE_STEPS = [
  {
    target: '#map-edit-toggle',
    title: 'STEP 1: 編集モードに切り替え',
    body: 'まず右上のこのボタンをクリックして<strong>編集モード</strong>に入ります。\nもう一度押すと閲覧モードに戻ります。',
    position: 'below'
  },
  {
    target: '#map-container',
    title: 'STEP 2: マップ上で操作',
    body: '編集モードでは3つの操作ができます：\n<ul style="margin:6px 0 0 16px;padding:0"><li><strong>マーカーをドラッグ</strong> → 施設の位置を変更</li><li><strong>マップの空白をクリック</strong> → 新しい施設を追加</li><li><strong>マーカーをクリック</strong> → 次のステップへ</li></ul>',
    position: 'above'
  },
  {
    target: '.leaflet-marker-icon',
    title: 'STEP 3: マーカーのポップアップ',
    body: 'マーカーをクリックするとポップアップが表示されます。\n編集モード中は<strong>「編集」「削除」ボタン</strong>が表示されます。',
    position: 'right'
  },
  {
    target: '#content table',
    title: 'STEP 4: 施設一覧テーブル',
    body: 'マップの下にある施設一覧テーブルからも操作できます。\n編集モード中は各行に<strong>「編集」「削除」ボタン</strong>が表示されます。',
    position: 'above'
  }
];

function showMapGuide() {
  mapGuideStep = 0;
  renderGuideStep();
}

function renderGuideStep() {
  closeMapGuide();
  if (mapGuideStep >= MAP_GUIDE_STEPS.length) return;

  const step = MAP_GUIDE_STEPS[mapGuideStep];
  const targetEl = document.querySelector(step.target);

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'map-guide-overlay';
  overlay.onclick = closeMapGuide;
  document.body.appendChild(overlay);

  // Highlight target
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.id = 'map-guide-highlight';
    highlight.style.cssText = `top:${rect.top - 4}px;left:${rect.left - 4}px;width:${rect.width + 8}px;height:${rect.height + 8}px;`;
    document.body.appendChild(highlight);
  }

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'map-guide-tooltip';
  tooltip.innerHTML = `
    <div style="font-weight:700;font-size:14px;color:#0176d3;margin-bottom:6px">${step.title}</div>
    <div style="font-size:13px;line-height:1.6">${step.body.replace(/\n/g,'')}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
      <span style="font-size:11px;color:#888">${mapGuideStep + 1} / ${MAP_GUIDE_STEPS.length}</span>
      <div style="display:flex;gap:8px">
        ${mapGuideStep > 0 ? '<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();prevGuideStep()">戻る</button>' : ''}
        ${mapGuideStep < MAP_GUIDE_STEPS.length - 1
          ? '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();nextGuideStep()">次へ</button>'
          : '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();closeMapGuide()">閉じる</button>'}
      </div>
    </div>`;

  document.body.appendChild(tooltip);

  // Position tooltip relative to target
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const ttRect = tooltip.getBoundingClientRect();
    if (step.position === 'below') {
      tooltip.style.top = (rect.bottom + 12) + 'px';
      tooltip.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - ttRect.width - 12)) + 'px';
    } else if (step.position === 'above') {
      tooltip.style.top = Math.max(12, rect.top - ttRect.height - 12) + 'px';
      tooltip.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - ttRect.width - 12)) + 'px';
    } else {
      tooltip.style.top = rect.top + 'px';
      tooltip.style.left = (rect.right + 12) + 'px';
    }
  } else {
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%,-50%)';
  }
}

function nextGuideStep() {
  mapGuideStep++;
  renderGuideStep();
}

function prevGuideStep() {
  mapGuideStep--;
  renderGuideStep();
}

function closeMapGuide() {
  const overlay = document.getElementById('map-guide-overlay');
  const highlight = document.getElementById('map-guide-highlight');
  const tooltip = document.getElementById('map-guide-tooltip');
  if (overlay) overlay.remove();
  if (highlight) highlight.remove();
  if (tooltip) tooltip.remove();
}
