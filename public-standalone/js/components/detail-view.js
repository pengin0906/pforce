/* Detail View Component */

function showDetail(apiName, id) {
  const obj = getObjDef(apiName);
  const data = store[apiName] || [];
  const rec = data.find(r => r.id === id);
  if (!obj || !rec) return;

  const name = rec.Name || rec.Subject || (`${rec.LastName||''} ${rec.FirstName||''}`).trim() || id;
  renderTopbar(name, obj.icon, `<div class="btn-group"><button class="btn btn-sm btn-primary" onclick="showEditForm('${apiName}','${id}')">編集</button><button class="btn btn-sm btn-danger" onclick="deleteRecord('${apiName}','${id}')">削除</button><button class="btn btn-sm btn-secondary" onclick="navigate('obj','${apiName}')">← 戻る</button></div>`);

  let html = `<div class="card"><div class="card-header"><h3>${obj.label}の詳細</h3>`;
  if (obj.statusField && rec[obj.statusField]) {
    const cls = obj.statusMap?.[rec[obj.statusField]] || 's-gray';
    html += `<span class="status ${cls}">${rec[obj.statusField]}</span>`;
  }
  html += `</div>`;

  // Doctor: show institution prominently
  if (apiName === 'Doctor__c' && rec.Institution__c) {
    const inst = getInstitutionName(rec.Institution__c);
    html += `<div style="background:#e3f2fd;padding:12px 16px;border-radius:6px;margin-bottom:16px;font-size:15px">🏥 <strong>所属病院: ${inst}</strong></div>`;
  }

  html += `<div class="detail-grid">`;
  obj.fields.forEach(f => {
    let val = rec[f.apiName];
    if (f.type === 'Lookup') {
      if (f.apiName === 'OwnerId' || f.apiName === 'Reviewer__c') val = getUserName(val);
      else val = resolveRef(val, f.ref);
    } else if (f.type === 'Checkbox') {
      val = val ? '✅ はい' : '❌ いいえ';
    } else {
      val = fmt(val, f.type);
    }
    html += `<div class="detail-field"><div class="dl">${f.label}</div><div class="dv">${val}</div></div>`;
  });
  html += `</div></div>`;

  // Related Lists
  html += renderRelatedLists(apiName, id);

  document.getElementById('content').innerHTML = html;
  updateActiveNav();
}

function renderRelatedLists(parentObj, parentId) {
  let html = '';
  ALL_OBJECTS.forEach(obj => {
    obj.fields.forEach(f => {
      if (f.type === 'Lookup' && f.ref === parentObj) {
        const related = (store[obj.apiName]||[]).filter(r => r[f.apiName] === parentId);
        if (related.length === 0) return;
        html += `<div class="related-list"><div class="related-list-header"><h4>${obj.icon} ${obj.label}<span class="rl-count">${related.length}</span></h4></div>`;
        html += `<table><thead><tr>`;
        const cols = obj.listColumns.slice(0, 5).filter(c => c !== f.apiName);
        cols.forEach(col => {
          const fi = obj.fields.find(x => x.apiName === col);
          html += `<th>${fi ? fi.label : col}</th>`;
        });
        html += `</tr></thead><tbody>`;
        related.forEach(rec => {
          html += `<tr onclick="showDetail('${obj.apiName}','${rec.id}')">`;
          cols.forEach((col, i) => {
            const fi = obj.fields.find(x => x.apiName === col);
            let val = rec[col];
            if (fi && fi.type === 'Lookup') val = col === 'OwnerId' ? getUserName(val) : resolveRef(val, fi.ref);
            else val = fmt(val, fi?.type);
            if (col === obj.statusField && obj.statusMap) val = `<span class="status ${obj.statusMap[rec[col]]||'s-gray'}">${rec[col]||'-'}</span>`;
            if (i === 0) val = `<span class="cell-link">${val}</span>`;
            html += `<td>${val}</td>`;
          });
          html += `</tr>`;
        });
        html += `</tbody></table></div>`;
      }
    });
  });
  return html;
}
