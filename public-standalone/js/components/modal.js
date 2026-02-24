/* Modal & Form Component */

// --- Modal: Create/Edit Form ---
function showCreateForm(apiName) { showFormModal(apiName, null); }
function showEditForm(apiName, id) {
  const rec = (store[apiName]||[]).find(r => r.id === id);
  showFormModal(apiName, rec);
}

function showFormModal(apiName, rec, defaults) {
  const obj = getObjDef(apiName);
  if (!obj) return;
  const isEdit = !!rec;
  const title = isEdit ? `${obj.label}を編集` : `新規${obj.label}`;

  let html = `<div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>`;
  html += `<div class="modal-body"><form id="record-form" class="form-grid">`;

  obj.fields.forEach(f => {
    if (f.type === 'AutoNumber' || f.type === 'Formula') return;
    const val = rec ? (rec[f.apiName] || '') : (defaults && defaults[f.apiName] != null ? defaults[f.apiName] : '');
    const req = f.required ? '<span class="req">*</span>' : '';
    const fullClass = f.type === 'LongTextArea' ? ' full' : '';

    html += `<div class="form-group${fullClass}"><label>${f.label}${req}</label>`;
    if (f.type === 'Picklist' && f.values) {
      html += `<select name="${f.apiName}" class="form-control"><option value="">-- 選択 --</option>`;
      f.values.forEach(v => html += `<option value="${v}" ${v===val?'selected':''}>${v}</option>`);
      html += `</select>`;
    } else if (f.type === 'LongTextArea') {
      html += `<textarea name="${f.apiName}" class="form-control">${val}</textarea>`;
    } else if (f.type === 'Checkbox') {
      html += `<input type="checkbox" name="${f.apiName}" ${val?'checked':''}>`;
    } else if (f.type === 'Lookup' && (f.apiName === 'OwnerId' || f.apiName === 'Reviewer__c')) {
      html += `<select name="${f.apiName}" class="form-control"><option value="">-- 選択 --</option>`;
      USERS.forEach(u => html += `<option value="${u.id}" ${u.id===val?'selected':''}>${u.name} (${u.role})</option>`);
      html += `</select>`;
    } else if (f.type === 'Lookup' && f.ref) {
      const refData = store[f.ref] || [];
      html += `<select name="${f.apiName}" class="form-control"><option value="">-- 選択 --</option>`;
      refData.forEach(r => {
        const rName = r.Name || r.LastName || r.Subject || r.id;
        html += `<option value="${r.id}" ${r.id===val?'selected':''}>${rName}</option>`;
      });
      html += `</select>`;
    } else if (f.type === 'Date') {
      html += `<input type="date" name="${f.apiName}" class="form-control" value="${val}">`;
    } else if (f.type === 'Number' || f.type === 'Currency' || f.type === 'Percent') {
      html += `<input type="number" name="${f.apiName}" class="form-control" value="${val}">`;
    } else {
      html += `<input type="text" name="${f.apiName}" class="form-control" value="${val}">`;
    }
    html += `</div>`;
  });

  // Medical_Institution__c / Seminar__c: 座標貼り付け欄
  if (obj.fields.some(f => f.apiName === 'Latitude__c') && obj.fields.some(f => f.apiName === 'Longitude__c')) {
    html += `<div class="form-group full"><label>📍 座標を貼り付け（Google Mapからコピー）</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="latlng-paste" class="form-control" placeholder="例: 35.6812, 139.7671" style="flex:1"
          oninput="parseLatLngInput(this.value)">
        <button type="button" class="btn btn-sm btn-secondary" onclick="pasteLatLng()">📋 貼り付け</button>
      </div>
      <small style="color:#888;margin-top:4px;display:block">Google Mapで場所を右クリック → 座標をコピー → ここに貼り付け</small>
    </div>`;
  }

  // Visit_Record__c: GPS取得ボタン
  if (apiName === 'Visit_Record__c') {
    html += `<div class="form-group full"><label>GPS位置情報</label>
      <button type="button" class="btn btn-sm btn-secondary" onclick="captureGPS()">📍 現在地を取得</button>
      <span id="gps-status" style="margin-left:8px;color:#888"></span></div>`;
  }

  html += `</form></div>`;
  html += `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>`;
  html += `<button class="btn btn-primary" onclick="saveRecord('${apiName}','${rec?.id||''}')">保存</button></div>`;

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function parseLatLngInput(val) {
  const parts = val.split(/[,\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const latField = document.querySelector('[name="Latitude__c"]');
      const lngField = document.querySelector('[name="Longitude__c"]');
      if (latField) latField.value = lat;
      if (lngField) lngField.value = lng;
    }
  }
}

async function pasteLatLng() {
  try {
    const text = await navigator.clipboard.readText();
    const input = document.getElementById('latlng-paste');
    if (input) {
      input.value = text;
      parseLatLngInput(text);
    }
  } catch(e) {
    toast('クリップボードの読み取りに失敗しました。直接入力してください', 'error');
  }
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
}

function saveRecord(apiName, id) {
  const form = document.getElementById('record-form');
  const obj = getObjDef(apiName);
  const formData = new FormData(form);
  const rec = id ? (store[apiName]||[]).find(r => r.id === id) : { id: genId(SF_KEY_PREFIXES[apiName] || apiName.substring(0,3)) };

  obj.fields.forEach(f => {
    if (f.type === 'Checkbox') {
      rec[f.apiName] = form.querySelector(`[name="${f.apiName}"]`)?.checked || false;
    } else if (f.type === 'Number' || f.type === 'Currency' || f.type === 'Percent') {
      const v = formData.get(f.apiName);
      rec[f.apiName] = v ? Number(v) : null;
    } else {
      rec[f.apiName] = formData.get(f.apiName) || '';
    }
  });

  if (!id) {
    if (!store[apiName]) store[apiName] = [];
    store[apiName].push(rec);
    toast(`${obj.label}を作成しました`);
  } else {
    toast(`${obj.label}を更新しました`);
  }

  closeModal();
  renderSidebar();
  if (currentView === 'map-view') {
    renderMapView();
  } else {
    showDetail(apiName, rec.id);
  }
}

function deleteRecord(apiName, id) {
  if (!confirm('削除してよろしいですか？')) return;
  store[apiName] = (store[apiName]||[]).filter(r => r.id !== id);
  toast('削除しました', 'error');
  renderSidebar();
  navigate('obj', apiName);
}
