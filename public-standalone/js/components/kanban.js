/* Kanban/Pipeline Component */

function renderPipeline() {
  renderTopbar('パイプライン', '📈');
  const pharma = store.Pharma_Opportunity__c || [];
  const phases = ['リード','ヒアリング','提案','セキュリティ審査','契約交渉','受注','失注'];
  const colors = {リード:'#90a4ae',ヒアリング:'#42a5f5',提案:'#ffa726',セキュリティ審査:'#ab47bc',契約交渉:'#26a69a',受注:'#66bb6a',失注:'#ef5350'};

  let html = `<div class="kanban">`;
  phases.forEach(phase => {
    const items = pharma.filter(p => p.Phase__c === phase);
    const total = items.reduce((s,p) => s+(p.Amount__c||0), 0);
    html += `<div class="kanban-col"><div class="kanban-col-header" style="border-bottom-color:${colors[phase]}"><span>${phase}</span><span class="cnt">${items.length}</span></div>`;
    html += `<div style="font-size:11px;color:#888;margin-bottom:8px">¥${(total/1000000).toFixed(0)}M</div>`;
    items.forEach(p => {
      html += `<div class="kanban-card" onclick="showDetail('Pharma_Opportunity__c','${p.id}')">
        <div class="kc-title">${p.Name}</div>
        <div class="kc-sub">${p.Pharma_Company__c} · ${getUserName(p.OwnerId)}</div>
        <div class="kc-amount">¥${Number(p.Amount__c||0).toLocaleString()}</div>
        <div style="font-size:10px;color:#888;margin-top:4px">${p.Close_Date__c||'-'} · ${p.Probability__c||0}%</div>
      </div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

function renderKanbanView(apiName) {
  const obj = getObjDef(apiName);
  if (!obj || !obj.kanbanField) return;
  const field = obj.fields.find(f => f.apiName === obj.kanbanField);
  if (!field) return;
  const data = store[apiName] || [];

  renderTopbar(obj.label + ' (カンバン)', obj.icon, `<button class="btn btn-primary btn-sm" onclick="showCreateForm('${apiName}')">+ 新規</button>`);

  let html = `<div class="toolbar"><button class="btn btn-sm btn-secondary" onclick="navigate('obj','${apiName}')">一覧表示</button></div><div class="kanban">`;
  field.values.forEach(stage => {
    const items = data.filter(r => r[obj.kanbanField] === stage);
    html += `<div class="kanban-col"><div class="kanban-col-header"><span>${stage}</span><span class="cnt">${items.length}</span></div>`;
    items.forEach(rec => {
      const name = rec.Name || rec.Subject || rec.LastName || '-';
      const amount = rec.Amount || rec.Amount__c || rec.Budget__c;
      html += `<div class="kanban-card" onclick="showDetail('${apiName}','${rec.id}')">
        <div class="kc-title">${name}</div>
        <div class="kc-sub">${rec.OwnerId ? getUserName(rec.OwnerId) : ''}</div>
        ${amount ? `<div class="kc-amount">¥${Number(amount).toLocaleString()}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;
  document.getElementById('content').innerHTML = html;
}
