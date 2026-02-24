/* Table/List Component */

function renderListView(apiName, filter) {
  const obj = getObjDef(apiName);
  if (!obj) return;
  let data = store[apiName] || [];

  if (filter) {
    Object.keys(filter).forEach(k => {
      if (filter[k]) data = data.filter(r => r[k] === filter[k]);
    });
  }

  renderTopbar(obj.label, obj.icon, `<button class="btn btn-primary btn-sm" onclick="showCreateForm('${apiName}')">+ 新規${obj.label}</button>`);

  let statusHtml = '';
  if (obj.statusField) {
    const sf = obj.fields.find(f => f.apiName === obj.statusField);
    if (sf && sf.values) {
      statusHtml = `<div class="filter-group"><select class="filter-select" onchange="filterByStatus('${apiName}','${obj.statusField}',this.value)"><option value="">全て</option>`;
      sf.values.forEach(v => statusHtml += `<option value="${v}">${v}</option>`);
      statusHtml += `</select></div>`;
    }
  }

  let html = `<div class="toolbar">
    <div class="search-box"><span class="search-icon">🔍</span><input type="text" id="searchInput" placeholder="${obj.label}を検索..." oninput="searchList('${apiName}',this.value)" oncompositionstart="window._imeOn=true" oncompositionend="window._imeOn=false;searchList('${apiName}',this.value)" onkeydown="if(!window._imeOn&&event.key==='Enter'){searchList('${apiName}',this.value)}"><button class="btn btn-sm btn-primary" onclick="searchList('${apiName}',document.getElementById('searchInput').value)" style="margin-left:4px">検索</button></div>
    ${statusHtml}
    <div class="btn-group">`;
  if (obj.kanbanField) html += `<button class="btn btn-sm btn-secondary" onclick="renderKanbanView('${apiName}')">カンバン</button>`;
  html += `<button class="btn btn-sm btn-secondary" onclick="navigate('obj','${apiName}')">一覧</button></div></div>`;

  html += `<div class="card"><div class="table-wrap"><table><thead><tr>`;
  obj.listColumns.forEach(col => {
    const f = obj.fields.find(fi => fi.apiName === col);
    html += `<th onclick="sortList('${apiName}','${col}')">${f ? f.label : col}<span class="sort-icon">⇅</span></th>`;
  });
  html += `</tr></thead><tbody id="list-body">`;

  data.forEach(rec => {
    html += `<tr onclick="showDetail('${apiName}','${rec.id}')">`;
    obj.listColumns.forEach((col,i) => {
      const f = obj.fields.find(fi => fi.apiName === col);
      let val = rec[col];

      if (f && f.type === 'Lookup') {
        if (col === 'OwnerId' || col === 'Reviewer__c') val = getUserName(val);
        else val = resolveRef(val, f.ref);
      } else {
        val = fmt(val, f?.type);
      }
      if (col === obj.statusField && obj.statusMap) {
        const cls = obj.statusMap[rec[col]] || 's-gray';
        val = `<span class="status ${cls}">${rec[col]||'-'}</span>`;
      }
      // Doctor list: show institution name as sub-text
      if (i === 0 && apiName === 'Doctor__c') {
        const inst = getInstitutionName(rec.Institution__c);
        val = `<span class="cell-link">${val}</span><div class="sub-text">🏥 ${inst}</div>`;
      } else if (i === 0) {
        val = `<span class="cell-link">${val}</span>`;
      }
      html += `<td>${val}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table></div>
    <div class="pagination"><span>${data.length} 件</span></div></div>`;

  document.getElementById('content').innerHTML = html;
}

function filterByStatus(apiName, field, value) {
  navigate('obj', apiName, value ? { [field]: value } : null);
}

// --- Search & Sort ---
let currentSort = { field: null, asc: true };

function searchList(apiName, query) {
  if(window._imeOn)return;
  navigate('obj', apiName);
}

function sortList(apiName, field) {
  if (currentSort.field === field) currentSort.asc = !currentSort.asc;
  else { currentSort.field = field; currentSort.asc = true; }
  store[apiName].sort((a, b) => {
    const va = a[field] || '', vb = b[field] || '';
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return currentSort.asc ? cmp : -cmp;
  });
  navigate('obj', apiName);
}

function updateActiveNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    const view = el.getAttribute('data-view');
    if (view === currentView || (currentView === 'obj' && view === `obj:${currentObject}`)) {
      el.classList.add('active');
    }
  });
}
