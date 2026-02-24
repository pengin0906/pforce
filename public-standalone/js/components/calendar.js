/* Calendar Component */

let calMonthOffset = 0;
function renderCalendar() {
  const base = new Date();
  base.setMonth(base.getMonth() + calMonthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events = store.Event || [];
  const tasks = store.Task || [];
  const visits = store.Visit_Record__c || [];
  const seminars = store.Seminar__c || [];

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  renderTopbar('カレンダー', '📅',
    `<button class="btn btn-sm btn-secondary" onclick="calMonthOffset--;renderCalendar()">◀ 前月</button>
     <button class="btn btn-sm btn-primary" onclick="calMonthOffset=0;renderCalendar()">今月</button>
     <button class="btn btn-sm btn-secondary" onclick="calMonthOffset++;renderCalendar()">翌月 ▶</button>`);
  let html = `<div class="card"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
    <button class="btn btn-sm btn-secondary" onclick="calMonthOffset--;renderCalendar()">◀ 前月</button>
    <h3 style="margin:0">${year}年 ${monthNames[month]}</h3>
    <div><button class="btn btn-sm btn-primary" onclick="calMonthOffset=0;renderCalendar()" style="margin-right:4px">今月</button>
    <button class="btn btn-sm btn-secondary" onclick="calMonthOffset++;renderCalendar()">翌月 ▶</button></div></div>`;
  html += `<div class="calendar">`;
  ['日','月','火','水','木','金','土'].forEach(d => html += `<div class="cal-header">${d}</div>`);

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvents = events.filter(e => e.StartDateTime?.startsWith(dateStr));
    const dayTasks = tasks.filter(t => t.ActivityDate === dateStr);
    const dayVisits = visits.filter(v => v.Visit_Date__c === dateStr);
    const daySeminars = seminars.filter(s => (s.Event_Date__c || s.Date__c) === dateStr);
    html += `<div class="cal-day" onclick="showFormModal('Visit_Record__c',null,{Visit_Date__c:'${dateStr}'})"><div class="day-num">${d}</div>`;
    dayEvents.forEach(e => html += `<div class="cal-event" title="${escAttr(e.Subject)}" onclick="event.stopPropagation();showDetail('Event','${escAttr(e.id)}')" style="cursor:pointer">📅 ${escHtml(e.Subject)}</div>`);
    dayVisits.forEach(v => html += `<div class="cal-event visit" title="訪問: ${resolveRef(v.Doctor__c,'Doctor__c')}" onclick="event.stopPropagation();showDetail('Visit_Record__c','${escAttr(v.id)}')" style="cursor:pointer">📝 ${resolveRef(v.Doctor__c,'Doctor__c')}</div>`);
    daySeminars.forEach(s => html += `<div class="cal-event seminar" title="${escAttr(s.Name)}" onclick="event.stopPropagation();showDetail('Seminar__c','${escAttr(s.id)}')" style="cursor:pointer">📚 ${escHtml(s.Name)}</div>`);
    dayTasks.forEach(t => html += `<div class="cal-event task" title="${escAttr(t.Subject)}" onclick="event.stopPropagation();showDetail('Task','${escAttr(t.id)}')" style="cursor:pointer">✅ ${escHtml(t.Subject)}</div>`);
    html += `</div>`;
  }
  html += `</div></div>`;

  // 今後の予定リスト
  html += `<div class="card"><div class="card-header"><h3>今後の予定</h3></div><table><thead><tr><th>種別</th><th>件名</th><th>日時</th><th>場所</th><th>担当</th></tr></thead><tbody>`;
  const allEvents = [
    ...events.map(e=>({type:'📅 行動',name:e.Subject,date:e.StartDateTime,loc:e.Location,owner:e.OwnerId,id:e.id,obj:'Event'})),
    ...visits.map(v=>({type:'📝 訪問',name:resolveRef(v.Doctor__c,'Doctor__c'),date:v.Visit_Date__c,loc:resolveRef(v.Institution__c,'Medical_Institution__c'),owner:v.OwnerId,id:v.id,obj:'Visit_Record__c'})),
    ...seminars.map(s=>({type:'📚 勉強会',name:s.Name,date:s.Date__c,loc:s.Venue__c,owner:s.OwnerId,id:s.id,obj:'Seminar__c'}))
  ].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  allEvents.forEach(e => {
    html += `<tr onclick="showDetail('${escAttr(e.obj)}','${escAttr(e.id)}')"><td>${escHtml(e.type)}</td><td><span class="cell-link">${escHtml(e.name)}</span></td><td>${escHtml(e.date||'-')}</td><td>${escHtml(e.loc||'-')}</td><td>${getUserName(e.owner)}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  document.getElementById('content').innerHTML = html;
}
