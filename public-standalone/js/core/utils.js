/* ============================================
   Core Utilities & State
   ============================================ */

// --- Salesforce Key Prefix Map ---
const SF_KEY_PREFIXES = {
  Account:'001',Contact:'003',Lead:'00Q',Opportunity:'006',
  Case:'500',Task:'00T',Event:'00U',Product2:'01t',Campaign:'701',
  Medical_Institution__c:'a0A',Doctor__c:'a0B',
  Pharma_Opportunity__c:'a0C',Genomic_Project__c:'a0D',
  Visit_Record__c:'a0E',Specimen__c:'a0F',
  MA_Activity__c:'a0G',Seminar__c:'a0H',
  Lab__c:'a0I',Joint_Research__c:'a0J',
  Testing_Order__c:'a0K',PMDA_Submission__c:'a0L',
  Seminar_Attendee__c:'a0M',Bento_Order__c:'a0N',
  Daily_Report__c:'a0O',Approval_Request__c:'a0P',
  Competitive_Intel__c:'a0Q',Expense_Report__c:'a0R'
};

// --- Map Edit State ---
let mapEditMode = false;
let mapInstance = null;
let mapMarkers = [];

// --- Dynamic Date Helpers ---
const _now = new Date();
const _todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
const _curMonth = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}`;
const _curMonthFirst = _curMonth + '-01';

// --- Data Store ---
const store = {};
function initStore() {
  ALL_OBJECTS.forEach(obj => {
    store[obj.apiName] = JSON.parse(JSON.stringify(SAMPLE_DATA[obj.apiName] || []));
  });
}

// --- Utility Functions ---
function fmt(v, type) {
  if (v == null || v === '') return '-';
  switch(type) {
    case 'Currency': return '¥' + Number(v).toLocaleString();
    case 'Percent': return v + '%';
    case 'Number': return Number(v).toLocaleString();
    case 'Checkbox': return v ? '✓' : '✗';
    case 'Date': return v;
    case 'DateTime': return v;
    default: return String(v);
  }
}

function resolveRef(val, refObj) {
  if (!val) return '-';
  const data = store[refObj] || [];
  const rec = data.find(r => r.id === val);
  if (!rec) return val;
  return rec.Name || rec.LastName || val;
}

function getObjDef(apiName) {
  return ALL_OBJECTS.find(o => o.apiName === apiName);
}

function getUserName(uid) {
  const u = USERS.find(u => u.id === uid);
  return u ? u.name : uid || '-';
}

function getInstitutionName(instId) {
  const inst = (store.Medical_Institution__c || []).find(i => i.id === instId);
  return inst ? inst.Name : '-';
}

// Salesforce-compatible 18-char ID generator
function genId(prefix) {
  const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const CHECKSUM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
  let random = '';
  for (let i = 0; i < 12; i++) random += BASE62[Math.floor(Math.random() * 62)];
  const id15 = (prefix || '000').substring(0, 3) + random;
  let checksum = '';
  for (let g = 0; g < 3; g++) {
    let bits = 0;
    for (let i = 0; i < 5; i++) {
      const ch = id15[g * 5 + i];
      if (ch >= 'A' && ch <= 'Z') bits |= (1 << i);
    }
    checksum += CHECKSUM_CHARS[bits];
  }
  return id15 + checksum;
}

function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}
