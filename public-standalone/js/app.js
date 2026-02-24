/* ============================================
   genmine CRM - App Initialization
   Navigation, routing, and bootstrap
   ============================================ */

let currentView = 'home';
let currentObject = null;

// --- Navigation ---
function navigate(view, objName, filter) {
  currentView = view;
  currentObject = objName || null;

  switch(view) {
    case 'home': renderHome(); break;
    case 'sales-dashboard': renderSalesDashboard(); break;
    case 'ma-dashboard': renderMADashboard(); break;
    case 'seminar-dashboard': renderSeminarDashboard(); break;
    case 'testing-dashboard': renderTestingDashboard(); break;
    case 'pmda-dashboard': renderPMDADashboard(); break;
    case 'pathology-review': renderPathologyReview(); break;
    case 'exec-dashboard': renderExecDashboard(); break;
    case 'calendar': renderCalendar(); break;
    case 'pipeline': renderPipeline(); break;
    case 'map-view': renderMapView(); break;
    case 'daily-report': renderDailyReport(); break;
    case 'approval-queue': renderApprovalQueue(); break;
    case 'expense-report': renderExpenseReport(); break;
    case 'doctor-360': renderDoctor360Selector(); break;
    case 'kol-map': renderKOLMap(); break;
    case 'competitive-intel': renderCompetitiveIntel(); break;
    case 'compliance-dashboard': renderComplianceDashboard(); break;
    case 'territory': renderTerritory(); break;
    case 'specimen-tracker': renderSpecimenTracker(); break;
    case 'schedule': renderSchedule(); break;
    case 'visit-target': renderVisitTarget(); break;
    case 'mr-dashboard': renderMRDashboard(); break;
    case 'msl-dashboard': renderMSLDashboard(); break;
    case 'doctor-assign': renderDoctorAssign(); break;
    case 'seminar-attendees': renderSeminarAttendees(); break;
    case 'workflow': renderWorkflowDashboard(); break;
    case 'workflow-detail': renderWorkflowDetail(objName); break;
    case 'workflow-new': renderWorkflowNew(objName); break;
    case 'obj': renderListView(objName, filter); break;
    case 'report-testing': renderTestingReport(); break;
    case 'report-sales': renderSalesReport(); break;
    case 'visit-map': renderVisitMap(); break;
    case 'visit-report': renderVisitReport(); break;
    case 'visit-calendar': renderVisitCalendar(); break;
    default: renderHome();
  }
  updateActiveNav();
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

// --- Init ---
async function init() {
  const defaultUser = { id: 'U002', displayName: '佐藤花子', profile: 'Sales_Rep' };
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const serverUser = await res.json();
      // Map server user to CRM user if possible, otherwise use default
      if (serverUser.id && USERS && USERS.find(u => u.id === serverUser.id)) {
        window.currentUser = serverUser;
      } else {
        window.currentUser = defaultUser;
      }
    } else {
      window.currentUser = defaultUser;
    }
  } catch(e) {
    window.currentUser = defaultUser;
  }

  initStore();
  if (typeof generateVisitReminders === 'function') generateVisitReminders();
  renderSidebar();
  navigate('home');

  document.getElementById('modal-overlay').addEventListener('click', closeModal);
}

document.addEventListener('DOMContentLoaded', init);
