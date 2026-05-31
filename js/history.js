// Saved calculations history

const HISTORY_KEY = 'artvitrina_history';

function loadHistory() {
  try {
    const s = localStorage.getItem(HISTORY_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  return [];
}

function saveHistoryList(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function saveToHistory(proj, total, currentCfg) {
  const list = loadHistory();
  const entry = {
    id: Date.now(),
    savedAt: new Date().toISOString(),
    total,
    project: JSON.parse(JSON.stringify(proj)),
    cfg: JSON.parse(JSON.stringify(currentCfg)),
  };
  list.unshift(entry);
  saveHistoryList(list);
  if (document.getElementById('tab-history').classList.contains('active')) {
    renderHistory();
  }
}

function renderHistory() {
  const list = loadHistory();
  const el = document.getElementById('history-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty-state">Нет сохранённых расчётов</div>';
    return;
  }
  el.innerHTML = list.map(entry => {
    const d = new Date(entry.savedAt);
    const dateStr = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const p = entry.project;
    const name = p.name || '—';
    const client = p.client || '—';
    const orderNum = p.orderNum || '—';
    return `<div class="history-card">
      <div class="history-card-info">
        <div class="history-card-title">${name}</div>
        <div class="history-card-meta">
          <span>👤 ${client}</span>
          <span>№ ${orderNum}</span>
          <span>📅 ${dateStr}</span>
          <span>📦 ${p.bases.length} баз</span>
        </div>
      </div>
      <div class="history-card-total">${Math.round(entry.total).toLocaleString('ru-RU')} ₽</div>
      <div class="history-card-actions">
        <button class="btn btn-primary btn-sm" onclick="historyOpenKP(${entry.id})">📄 КП</button>
        <button class="btn btn-outline btn-sm" onclick="historyLoad(${entry.id})">↩ Загрузить</button>
        <button class="btn btn-danger btn-sm" onclick="historyDelete(${entry.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}

window.historyOpenKP = (id) => {
  const list = loadHistory();
  const entry = list.find(e => e.id === id);
  if (!entry) return;
  openKP(entry.project, entry.cfg);
};

window.historyLoad = (id) => {
  if (!confirm('Загрузить этот расчёт в калькулятор? Текущие данные будут заменены.')) return;
  const list = loadHistory();
  const entry = list.find(e => e.id === id);
  if (!entry) return;
  project = JSON.parse(JSON.stringify(entry.project));
  saveProject();
  // switch to calc tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const calcBtn = document.querySelector('[data-tab="tab-calc"]');
  calcBtn.classList.add('active');
  document.getElementById('tab-calc').classList.add('active');
  // re-init wall panel selector
  const sel = document.getElementById('wall-panel-type');
  sel.innerHTML = '<option value="">— Не включать —</option>' +
    Object.entries(cfg.wallPanels).map(([k, v]) =>
      `<option value="${k}">${v.name} — ${v.price.toLocaleString('ru-RU')} ₽/м²</option>`
    ).join('');
  restoreFormFields();
  renderBases();
  updateSummary();
  showToast('Расчёт загружен');
};

window.historyDelete = (id) => {
  if (!confirm('Удалить этот расчёт?')) return;
  const list = loadHistory().filter(e => e.id !== id);
  saveHistoryList(list);
  renderHistory();
  showToast('Расчёт удалён');
};

// Render history when tab is activated
document.querySelector('[data-tab="tab-history"]').addEventListener('click', () => {
  renderHistory();
});
