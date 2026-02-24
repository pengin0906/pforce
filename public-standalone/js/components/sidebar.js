/* Sidebar Component */

// --- Render: Sidebar ---
function renderSidebar() {
  const sb = document.getElementById('sidebar');
  let html = `<div class="sidebar-brand"><h2>genmine CRM</h2><small>遺伝子パネル検査 SFA</small></div>`;

  // Dashboard Views
  html += `<div class="nav-group"><div class="nav-group-title">ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="home" onclick="navigate('home')"><span class="icon">🏠</span>ホーム（個人）</div>`;
  html += `<div class="nav-item" data-view="sales-dashboard" onclick="navigate('sales-dashboard')"><span class="icon">💼</span>営業ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="ma-dashboard" onclick="navigate('ma-dashboard')"><span class="icon">🎤</span>MA活動ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="seminar-dashboard" onclick="navigate('seminar-dashboard')"><span class="icon">📚</span>勉強会ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="testing-dashboard" onclick="navigate('testing-dashboard')"><span class="icon">🧪</span>検査ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="pmda-dashboard" onclick="navigate('pmda-dashboard')"><span class="icon">🏛️</span>PMDAダッシュボード</div>`;
  html += `<div class="nav-item" data-view="pathology-review" onclick="navigate('pathology-review')"><span class="icon">🔬</span>病理レビュー</div>`;
  html += `<div class="nav-item" data-view="exec-dashboard" onclick="navigate('exec-dashboard')"><span class="icon">📊</span>経営者ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="compliance-dashboard" onclick="navigate('compliance-dashboard')"><span class="icon">⚖️</span>コンプライアンス</div>`;
  html += `<div class="nav-item" data-view="competitive-intel" onclick="navigate('competitive-intel')"><span class="icon">🔍</span>競合情報</div>`;
  html += `</div>`;

  // 個人ダッシュボード（ダッシュボードの直下に配置）
  html += `<div class="nav-group"><div class="nav-group-title">個人ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="mr-dashboard" onclick="navigate('mr-dashboard')"><span class="icon">💼</span>MR個人ダッシュボード</div>`;
  html += `<div class="nav-item" data-view="msl-dashboard" onclick="navigate('msl-dashboard')"><span class="icon">🎤</span>MA個人ダッシュボード</div>`;
  html += `</div>`;

  // Workflow
  html += `<div class="nav-group"><div class="nav-group-title">ワークフロー</div>`;
  html += `<div class="nav-item" data-view="daily-report" onclick="navigate('daily-report')"><span class="icon">📝</span>日報</div>`;
  html += `<div class="nav-item" data-view="approval-queue" onclick="navigate('approval-queue')"><span class="icon">✅</span>承認キュー</div>`;
  html += `<div class="nav-item" data-view="expense-report" onclick="navigate('expense-report')"><span class="icon">💴</span>経費精算</div>`;
  html += `<div class="nav-item" data-view="doctor-assign" onclick="navigate('doctor-assign')"><span class="icon">🔄</span>担当割当・引き継ぎ</div>`;
  html += `<div class="nav-item" data-view="workflow" onclick="navigate('workflow')"><span class="icon">⚙️</span>ワークフロー管理</div>`;
  html += `</div>`;

  // Tools
  html += `<div class="nav-group"><div class="nav-group-title">ツール</div>`;
  html += `<div class="nav-item" data-view="schedule" onclick="navigate('schedule')"><span class="icon">📅</span>スケジュール帳</div>`;
  html += `<div class="nav-item" data-view="calendar" onclick="navigate('calendar')"><span class="icon">🗓️</span>月間カレンダー</div>`;
  html += `<div class="nav-item" data-view="pipeline" onclick="navigate('pipeline')"><span class="icon">📈</span>パイプライン</div>`;
  html += `<div class="nav-item" data-view="map-view" onclick="navigate('map-view')"><span class="icon">🗺️</span>マップ</div>`;
  html += `<div class="nav-item" data-view="doctor-360" onclick="navigate('doctor-360')"><span class="icon">👨‍⚕️</span>Doctor 360°</div>`;
  html += `<div class="nav-item" data-view="kol-map" onclick="navigate('kol-map')"><span class="icon">🌟</span>KOLマップ</div>`;
  html += `<div class="nav-item" data-view="territory" onclick="navigate('territory')"><span class="icon">🗾</span>テリトリー分析</div>`;
  html += `<div class="nav-item" data-view="specimen-tracker" onclick="navigate('specimen-tracker')"><span class="icon">📦</span>検体トラッカー</div>`;
  html += `<div class="nav-item" data-view="visit-target" onclick="navigate('visit-target')"><span class="icon">🎯</span>巡回目標管理</div>`;
  html += `<div class="nav-item" data-view="seminar-attendees" onclick="navigate('seminar-attendees')"><span class="icon">👥</span>セミナー参加者管理</div>`;
  html += `<div class="nav-item" data-view="visit-map" onclick="navigate('visit-map')"><span class="icon">📍</span>訪問マップ</div>`;
  html += `<div class="nav-item" data-view="visit-calendar" onclick="navigate('visit-calendar')"><span class="icon">🗓️</span>訪問カレンダー</div>`;
  html += `</div>`;

  // Objects
  html += `<div class="nav-group"><div class="nav-group-title">オブジェクト</div>`;
  CUSTOM_OBJECTS.forEach(obj => {
    const cnt = (store[obj.apiName]||[]).length;
    html += `<div class="nav-item" data-view="obj:${obj.apiName}" onclick="navigate('obj','${obj.apiName}')"><span class="icon">${obj.icon}</span>${obj.label}<span class="count">${cnt}</span></div>`;
  });
  html += `</div>`;

  // Standard Objects (collapsed)
  html += `<div class="nav-group"><div class="nav-group-title">標準オブジェクト</div>`;
  SF_STANDARD_OBJECTS.forEach(obj => {
    const cnt = (store[obj.apiName]||[]).length;
    html += `<div class="nav-item" data-view="obj:${obj.apiName}" onclick="navigate('obj','${obj.apiName}')"><span class="icon">${obj.icon}</span>${obj.label}<span class="count">${cnt}</span></div>`;
  });
  html += `</div>`;

  // Reports
  html += `<div class="nav-group"><div class="nav-group-title">レポート</div>`;
  html += `<div class="nav-item" data-view="report-testing" onclick="navigate('report-testing')"><span class="icon">📊</span>月次検査出件レポート</div>`;
  html += `<div class="nav-item" data-view="report-sales" onclick="navigate('report-sales')"><span class="icon">📈</span>営業成績レポート</div>`;
  html += `<div class="nav-item" data-view="visit-report" onclick="navigate('visit-report')"><span class="icon">📋</span>訪問レポート</div>`;
  html += `</div>`;

  sb.innerHTML = html;
}
