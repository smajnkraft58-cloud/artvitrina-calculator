// Main application logic

let cfg = getConfig();

function loadProject() {
  try {
    const s = localStorage.getItem('artvitrina_project');
    if (s) return JSON.parse(s);
  } catch(e) {}
  return null;
}

function saveProject() {
  localStorage.setItem('artvitrina_project', JSON.stringify(project));
}

const DEFAULT_PROJECT = {
  name: '', client: '', orderNum: '', kpImage: null, bases: [],
  dobory: { left: false, right: false, top: false, falsh: false, customH: 0 },
  wallPanel: { typeKey: '', w: 0, h: 0 },
  cushion: { w: 0, h: 0 },
  customItems: [], totalH: 0, totalW: 0,
};

let project = loadProject() || JSON.parse(JSON.stringify(DEFAULT_PROJECT));
let nextId = project.bases.reduce((m, b) => Math.max(m, b.id || 0), 0) + 1;

let currentBaseId = null;

// ─── Tabs ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'tab-admin') renderAdmin();
  });
});

// ─── Project Info ─────────────────────────────────────────────────────────────
document.getElementById('proj-name').addEventListener('input', e => { project.name = e.target.value; saveProject(); });
document.getElementById('proj-client').addEventListener('input', e => { project.client = e.target.value; saveProject(); });
document.getElementById('proj-order').addEventListener('input', e => { project.orderNum = e.target.value; saveProject(); });

// ─── KP Image Upload ──────────────────────────────────────────────────────────
document.getElementById('btn-upload-kp-img').addEventListener('click', () => {
  document.getElementById('kp-img-file').click();
});
document.getElementById('kp-img-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    project.kpImage = ev.target.result;
    saveProject();
    document.getElementById('kp-img-name').textContent = file.name;
    document.getElementById('btn-clear-kp-img').style.display = '';
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});
document.getElementById('btn-clear-kp-img').addEventListener('click', () => {
  project.kpImage = null;
  saveProject();
  document.getElementById('kp-img-name').textContent = 'не выбрано';
  document.getElementById('btn-clear-kp-img').style.display = 'none';
});

// ─── Add Base Button ──────────────────────────────────────────────────────────
document.getElementById('btn-add-base').addEventListener('click', () => {
  currentBaseId = null;
  openBaseWizard(null);
});

function openBaseWizard(editEntry) {
  const wizard = document.getElementById('base-wizard');
  wizard.classList.remove('hidden');
  wizard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  wizardState = {
    step: 'type',
    typeKey: editEntry?.typeKey || '',
    w: editEntry?.w || '',
    h: editEntry?.h || '',
    d: editEntry?.d || '',
    qty: editEntry?.qty || 1,
    facadeKey: editEntry?.facadeKey || '',
    filling: editEntry?.filling ? Object.assign({}, editEntry.filling) : {},
    doors: editEntry?.doors || 1,
  };
  renderWizardStep();
}

// ─── Wizard ───────────────────────────────────────────────────────────────────
let wizardState = {};

function renderWizardStep() {
  const wizard = document.getElementById('base-wizard');
  const steps = ['type', 'size', 'qty', 'facade', 'filling'];
  const stepIdx = steps.indexOf(wizardState.step);

  const stepsHtml = steps.map((s, i) => {
    const labels = ['Тип базы', 'Размеры', 'Количество', 'Фасад', 'Наполнение'];
    const cls = i < stepIdx ? 'done' : i === stepIdx ? 'active' : '';
    return `<div class="wiz-step ${cls}"><span class="wiz-num">${i + 1}</span>${labels[i]}</div>`;
  }).join('<div class="wiz-sep"></div>');

  let bodyHtml = '';
  if (wizardState.step === 'type') bodyHtml = renderStepType();
  else if (wizardState.step === 'size') bodyHtml = renderStepSize();
  else if (wizardState.step === 'qty') bodyHtml = renderStepQty();
  else if (wizardState.step === 'facade') bodyHtml = renderStepFacade();
  else if (wizardState.step === 'filling') bodyHtml = renderStepFilling();

  wizard.innerHTML = `
    <div class="wiz-header">
      <div class="wiz-steps">${stepsHtml}</div>
      <button class="btn-icon wiz-close" onclick="closeWizard()">✕</button>
    </div>
    <div class="wiz-body">${bodyHtml}</div>
  `;
  attachWizardEvents();
}

function renderStepType() {
  const groups = {};
  for (const [key, ct] of Object.entries(cfg.cabinetTypes)) {
    if (!groups[ct.group]) groups[ct.group] = { label: ct.groupName, types: [] };
    groups[ct.group].types.push({ key, ct });
  }
  let html = '<h3 class="wiz-title">Выбор типа базы</h3><div class="type-groups">';
  for (const [grp, g] of Object.entries(groups)) {
    html += `<div class="type-group"><div class="type-group-label">${g.label === 'Напольные' ? '🪵 Напольные базы' : '🔲 Подвесные базы'}</div><div class="type-cards">`;
    for (const { key, ct } of g.types) {
      const sel = wizardState.typeKey === key ? 'selected' : '';
      html += `<div class="type-card ${sel}" data-key="${key}" onclick="selectType('${key}')">
        <div class="type-card-name">${ct.name}</div>
        <div class="type-card-dims">${ct.wMin}–${ct.wMax} × ${ct.hMin}–${ct.hMax} × ${ct.dMin}–${ct.dMax} мм</div>
      </div>`;
    }
    html += '</div></div>';
  }
  html += '</div>';
  html += `<div class="wiz-nav"><button class="btn btn-primary" onclick="wizardNext()" ${!wizardState.typeKey ? 'disabled' : ''}>Далее →</button></div>`;
  return html;
}

function renderStepSize() {
  const ct = cfg.cabinetTypes[wizardState.typeKey];
  const note = ct.hingeNote ? `<div class="note">⚠️ ${ct.hingeNote}</div>` : '';
  return `
    <h3 class="wiz-title">Размеры базы — ${ct.name}</h3>
    <div class="size-form">
      <label>Ширина (мм) <span class="dim-range">${ct.wMin}–${ct.wMax}</span>
        <input type="number" id="sz-w" value="${wizardState.w}" min="${ct.wMin}" max="${ct.wMax}" placeholder="${ct.wMin}–${ct.wMax}">
      </label>
      <label>Высота (мм) <span class="dim-range">${ct.hMin}–${ct.hMax}</span>
        <input type="number" id="sz-h" value="${wizardState.h}" min="${ct.hMin}" max="${ct.hMax}" placeholder="${ct.hMin}–${ct.hMax}">
      </label>
      <label>Глубина (мм) <span class="dim-range">${ct.dMin}–${ct.dMax}</span>
        <input type="number" id="sz-d" value="${wizardState.d}" min="${ct.dMin}" max="${ct.dMax}" placeholder="${ct.dMin}–${ct.dMax}">
      </label>
    </div>
    ${note}
    <div class="wiz-nav">
      <button class="btn btn-outline" onclick="wizardBack()">← Назад</button>
      <button class="btn btn-primary" onclick="wizardNextSize()">Далее →</button>
    </div>
  `;
}

function renderStepQty() {
  const ct = cfg.cabinetTypes[wizardState.typeKey];
  return `
    <h3 class="wiz-title">Количество баз</h3>
    <p class="wiz-sub">${ct.name} — ${wizardState.w} × ${wizardState.h} × ${wizardState.d} мм</p>
    <div class="qty-form">
      <label>Количество штук
        <div class="qty-ctrl">
          <button class="btn-qty" onclick="changeQty(-1)">−</button>
          <input type="number" id="sz-qty" value="${wizardState.qty}" min="1" max="999" oninput="wizardState.qty=Math.max(1,+this.value)">
          <button class="btn-qty" onclick="changeQty(1)">+</button>
        </div>
      </label>
    </div>
    <div class="wiz-nav">
      <button class="btn btn-outline" onclick="wizardBack()">← Назад</button>
      <button class="btn btn-primary" onclick="wizardNext()">Далее →</button>
    </div>
  `;
}

function renderStepFacade() {
  const ct = cfg.cabinetTypes[wizardState.typeKey];
  let html = `<h3 class="wiz-title">Выбор фасада</h3>
    <p class="wiz-sub">Размер фасада соответствует размерам выбранной базы</p>
    <div class="facade-grid">
    <div class="facade-card ${wizardState.facadeKey === '' ? 'selected' : ''}" onclick="selectFacade('')">
      <div class="facade-name">Без фасада</div>
    </div>`;
  for (const [key, f] of Object.entries(cfg.facades)) {
    const sel = wizardState.facadeKey === key ? 'selected' : '';
    html += `<div class="facade-card ${sel}" onclick="selectFacade('${key}')">
      <div class="facade-name">${f.name}</div>
      <div class="facade-price">${f.price.toLocaleString('ru-RU')} ₽/м²</div>
    </div>`;
  }
  html += `</div>
    <div class="wiz-nav">
      <button class="btn btn-outline" onclick="wizardBack()">← Назад</button>
      <button class="btn btn-primary" onclick="wizardNext()">Далее →</button>
    </div>`;
  return html;
}

function renderStepFilling() {
  let html = `<h3 class="wiz-title">Наполнение и комплектующие</h3>
    <p class="wiz-sub">Укажите количество для каждой позиции (0 — не включать)</p>
    <div class="filling-list">`;
  for (const [key, fi] of Object.entries(cfg.filling)) {
    const val = wizardState.filling[key] || 0;
    html += `<div class="filling-row">
      <div class="filling-info">
        <span class="filling-name">${fi.name}</span>
        ${fi.note ? `<span class="filling-note">${fi.note}</span>` : ''}
        <span class="filling-price">${fi.price.toLocaleString('ru-RU')} ₽/шт</span>
      </div>
      <div class="qty-ctrl small">
        <button class="btn-qty" onclick="changeFilling('${key}',-1)">−</button>
        <input type="number" id="fill-${key}" value="${val}" min="0" max="99"
          oninput="wizardState.filling['${key}']=Math.max(0,+this.value)">
        <button class="btn-qty" onclick="changeFilling('${key}',1)">+</button>
      </div>
    </div>`;
  }
  html += `</div>
    <div class="custom-filling">
      <h4>Произвольная позиция</h4>
      <div class="custom-row">
        <input type="text" id="custom-name" placeholder="Наименование" class="custom-name">
        <input type="number" id="custom-price" placeholder="Цена, ₽" class="custom-price">
        <input type="number" id="custom-qty" placeholder="Кол-во" value="1" class="custom-qty">
        <button class="btn btn-sm" onclick="addCustomItem()">+ Добавить</button>
      </div>
    </div>
    <div class="wiz-nav">
      <button class="btn btn-outline" onclick="wizardBack()">← Назад</button>
      <button class="btn btn-success" onclick="saveBase()">✓ Добавить базу</button>
    </div>`;
  return html;
}

function attachWizardEvents() {
  // inputs already use inline handlers
}

window.selectType = (key) => {
  wizardState.typeKey = key;
  wizardState.doors = cfg.cabinetTypes[key].doors;
  renderWizardStep();
};

window.selectFacade = (key) => {
  wizardState.facadeKey = key;
  renderWizardStep();
};

window.changeQty = (delta) => {
  wizardState.qty = Math.max(1, (wizardState.qty || 1) + delta);
  document.getElementById('sz-qty').value = wizardState.qty;
};

window.changeFilling = (key, delta) => {
  wizardState.filling[key] = Math.max(0, (wizardState.filling[key] || 0) + delta);
  const inp = document.getElementById(`fill-${key}`);
  if (inp) inp.value = wizardState.filling[key];
};

window.wizardNext = () => {
  const steps = ['type', 'size', 'qty', 'facade', 'filling'];
  const idx = steps.indexOf(wizardState.step);
  if (idx < steps.length - 1) {
    wizardState.step = steps[idx + 1];
    renderWizardStep();
  }
};

window.wizardBack = () => {
  const steps = ['type', 'size', 'qty', 'facade', 'filling'];
  const idx = steps.indexOf(wizardState.step);
  if (idx > 0) {
    wizardState.step = steps[idx - 1];
    renderWizardStep();
  }
};

window.wizardNextSize = () => {
  const ct = cfg.cabinetTypes[wizardState.typeKey];
  const w = +document.getElementById('sz-w').value;
  const h = +document.getElementById('sz-h').value;
  const d = +document.getElementById('sz-d').value;
  const errors = [];
  if (!w || w < ct.wMin || w > ct.wMax) errors.push(`Ширина: ${ct.wMin}–${ct.wMax} мм`);
  if (!h || h < ct.hMin || h > ct.hMax) errors.push(`Высота: ${ct.hMin}–${ct.hMax} мм`);
  if (!d || d < ct.dMin || d > ct.dMax) errors.push(`Глубина: ${ct.dMin}–${ct.dMax} мм`);
  if (errors.length) {
    showError('Проверьте размеры:\n' + errors.join('\n'));
    return;
  }
  wizardState.w = w; wizardState.h = h; wizardState.d = d;
  wizardState.step = 'qty';
  renderWizardStep();
};

window.addCustomItem = () => {
  const name  = document.getElementById('custom-name').value.trim();
  const price = +document.getElementById('custom-price').value;
  const qty   = +document.getElementById('custom-qty').value || 1;
  if (!name || !price) { showError('Введите наименование и цену'); return; }
  project.customItems.push({ name, price, qty });
  document.getElementById('custom-name').value = '';
  document.getElementById('custom-price').value = '';
  document.getElementById('custom-qty').value = 1;
  showToast('Позиция добавлена');
};

window.saveBase = () => {
  const id = currentBaseId || nextId++;
  const entry = {
    id,
    typeKey:    wizardState.typeKey,
    w:          wizardState.w,
    h:          wizardState.h,
    d:          wizardState.d,
    qty:        wizardState.qty,
    facadeKey:  wizardState.facadeKey,
    filling:    Object.assign({}, wizardState.filling),
    doors:      wizardState.doors,
  };
  if (currentBaseId) {
    const idx = project.bases.findIndex(b => b.id === currentBaseId);
    if (idx >= 0) project.bases[idx] = entry;
  } else {
    project.bases.push(entry);
  }
  currentBaseId = null;
  closeWizard();
  renderBases();
  updateSummary();
  saveProject();
};

window.closeWizard = () => {
  document.getElementById('base-wizard').classList.add('hidden');
};

window.editBase = (id) => {
  const entry = project.bases.find(b => b.id === id);
  if (!entry) return;
  currentBaseId = id;
  openBaseWizard(entry);
};

window.removeBase = (id) => {
  project.bases = project.bases.filter(b => b.id !== id);
  renderBases();
  updateSummary();
  saveProject();
};

// ─── Render Bases List ────────────────────────────────────────────────────────
function renderBases() {
  const list = document.getElementById('bases-list');
  if (!project.bases.length) {
    list.innerHTML = '<div class="empty-state">Базы не добавлены. Нажмите «+ Добавить базу»</div>';
    return;
  }
  list.innerHTML = project.bases.map(b => {
    const ct = cfg.cabinetTypes[b.typeKey];
    const { cost } = calcCabinetCost(b, cfg);
    const facadeName = b.facadeKey ? cfg.facades[b.facadeKey]?.name : '—';
    const fillingItems = Object.entries(b.filling || {})
      .filter(([, q]) => q > 0)
      .map(([k, q]) => `${cfg.filling[k]?.name}: ${q} шт`)
      .join(', ');
    return `<div class="base-card">
      <div class="base-card-header">
        <div class="base-card-title">
          <span class="base-tag ${ct.group}">${ct.groupName}</span>
          <strong>${ct.name}</strong>
        </div>
        <div class="base-card-cost">${formatMoney(cost * b.qty)}</div>
      </div>
      <div class="base-card-body">
        <div class="base-dim">${b.w} × ${b.h} × ${b.d} мм</div>
        <div class="base-info">Количество: <b>${b.qty} шт</b></div>
        ${b.facadeKey ? `<div class="base-info">Фасад: <b>${facadeName}</b></div>` : ''}
        ${fillingItems ? `<div class="base-info">Наполнение: <b>${fillingItems}</b></div>` : ''}
      </div>
      <div class="base-card-actions">
        <button class="btn btn-sm btn-outline" onclick="editBase(${b.id})">✏ Изменить</button>
        <button class="btn btn-sm btn-danger" onclick="removeBase(${b.id})">✕ Удалить</button>
      </div>
    </div>`;
  }).join('');
}

// ─── Add-ons ──────────────────────────────────────────────────────────────────
function initAddons() {
  // Доборы
  ['left', 'right', 'top', 'falsh'].forEach(side => {
    const el = document.getElementById(`dobor-${side}`);
    if (el) el.addEventListener('change', () => {
      project.dobory[side] = el.checked;
      updateSummary(); saveProject();
    });
  });
  const htEl = document.getElementById('dobor-top-h');
  if (htEl) htEl.addEventListener('input', () => {
    project.dobory.customH = +htEl.value;
    updateSummary(); saveProject();
  });
  const twEl = document.getElementById('total-w');
  const thEl = document.getElementById('total-h');
  if (twEl) twEl.addEventListener('input', () => { project.totalW = +twEl.value; updateSummary(); saveProject(); });
  if (thEl) thEl.addEventListener('input', () => { project.totalH = +thEl.value; updateSummary(); saveProject(); });

  // Стеновая панель
  document.getElementById('wall-panel-type').addEventListener('change', e => {
    project.wallPanel.typeKey = e.target.value;
    updateSummary(); saveProject();
  });
  document.getElementById('wall-panel-w').addEventListener('input', e => {
    project.wallPanel.w = +e.target.value;
    updateSummary(); saveProject();
  });
  document.getElementById('wall-panel-h').addEventListener('input', e => {
    project.wallPanel.h = +e.target.value;
    updateSummary(); saveProject();
  });

  // Заполняем список типов стеновой панели
  const sel = document.getElementById('wall-panel-type');
  sel.innerHTML = '<option value="">— Не включать —</option>' +
    Object.entries(cfg.wallPanels).map(([k, v]) =>
      `<option value="${k}">${v.name} — ${v.price.toLocaleString('ru-RU')} ₽/м²</option>`
    ).join('');

  // Мягкая подушка
  document.getElementById('cushion-w').addEventListener('input', e => {
    project.cushion.w = +e.target.value;
    updateSummary(); saveProject();
  });
  document.getElementById('cushion-h').addEventListener('input', e => {
    project.cushion.h = +e.target.value;
    updateSummary(); saveProject();
  });
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function updateSummary() {
  let total = 0;
  const lines = [];

  // Bases
  for (const b of project.bases) {
    const ct = cfg.cabinetTypes[b.typeKey];
    const { cost, breakdown } = calcCabinetCost(b, cfg);
    const subtotal = cost * (b.qty || 1);
    total += subtotal;
    lines.push({
      section: `${ct.name} (${b.w}×${b.h}×${b.d}) × ${b.qty || 1}`,
      subtotal,
      breakdown
    });
  }

  // Custom items
  for (const ci of project.customItems) {
    const cost = ci.price * ci.qty;
    total += cost;
    lines.push({ section: `${ci.name} × ${ci.qty}`, subtotal: cost });
  }

  // Доборы
  const { left, right, top, falsh, customH } = project.dobory;
  const W = project.totalW / 1000; // m
  const H = project.totalH / 1000; // m
  const dPrice = cfg.general.doborPricePerM2;
  const dW = cfg.general.doborWidth / 1000; // m
  if (left) {
    const a = dW * H; const c = a * dPrice;
    total += c; lines.push({ section: 'Левый добор', subtotal: c });
  }
  if (right) {
    const a = dW * H; const c = a * dPrice;
    total += c; lines.push({ section: 'Правый добор', subtotal: c });
  }
  if (top && customH > 0) {
    const a = W * (customH / 1000); const c = a * dPrice;
    total += c; lines.push({ section: 'Верхний добор', subtotal: c });
  }
  if (falsh) {
    const a = dW * H; const c = a * dPrice;
    total += c; lines.push({ section: 'Фальш-панель', subtotal: c });
  }

  // Стеновая панель
  if (project.wallPanel.typeKey && project.wallPanel.w && project.wallPanel.h) {
    const wp = cfg.wallPanels[project.wallPanel.typeKey];
    const area = (project.wallPanel.w * project.wallPanel.h) / 1_000_000;
    const cost = area * wp.price;
    total += cost;
    lines.push({ section: wp.name, subtotal: cost });
  }

  // Мягкая подушка
  if (project.cushion.w && project.cushion.h) {
    const area = (project.cushion.w * project.cushion.h) / 1_000_000;
    const cost = area * cfg.general.cushionPricePerM2;
    total += cost;
    lines.push({ section: 'Мягкая подушка', subtotal: cost });
  }

  // Render summary sidebar
  const el = document.getElementById('summary-lines');
  el.innerHTML = lines.length
    ? lines.map(l => `<div class="sum-line">
        <span class="sum-label">${l.section}</span>
        <span class="sum-val">${formatMoney(l.subtotal)}</span>
      </div>`).join('')
    : '<div class="sum-empty">Позиции не добавлены</div>';

  document.getElementById('summary-total').textContent = formatMoney(total);
}

// ─── Print / Export ───────────────────────────────────────────────────────────
document.getElementById('btn-print').addEventListener('click', () => {
  buildPrintReport();
  window.print();
});

document.getElementById('btn-kp').addEventListener('click', () => {
  openKP();
});

document.getElementById('btn-save-calc').addEventListener('click', () => {
  const total = getCurrentTotal();
  saveToHistory(project, total, cfg);
  showToast('Расчёт сохранён');
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Очистить всю текущую смету?')) {
    project = JSON.parse(JSON.stringify(DEFAULT_PROJECT));
    saveProject();
    restoreFormFields();
    renderBases();
    updateSummary();
    showToast('Смета очищена');
  }
});

function buildPrintReport() {
  const el = document.getElementById('print-area');
  let total = 0;
  let rows = '';
  for (const b of project.bases) {
    const ct = cfg.cabinetTypes[b.typeKey];
    const { cost, breakdown } = calcCabinetCost(b, cfg);
    const qty = b.qty || 1;
    const subtotal = cost * qty;
    total += subtotal;
    rows += `<tr class="section-row"><td colspan="4"><b>${ct.name} — ${b.w}×${b.h}×${b.d} мм, ${qty} шт.</b></td></tr>`;
    for (const [name, item] of Object.entries(breakdown)) {
      const lineQty = typeof item.qty === 'string' ? (parseFloat(item.qty) * qty).toFixed(3) : item.qty * qty;
      rows += `<tr><td>${name}</td><td>${lineQty} ${item.unit}</td><td>${formatMoney(item.price)}</td><td>${formatMoney(item.total * qty)}</td></tr>`;
    }
  }
  for (const ci of project.customItems) {
    const cost = ci.price * ci.qty;
    total += cost;
    rows += `<tr><td>${ci.name}</td><td>${ci.qty} шт</td><td>${formatMoney(ci.price)}</td><td>${formatMoney(cost)}</td></tr>`;
  }
  el.innerHTML = `
    <div class="print-header">
      <h2>АртВитрина — Смета на мебель</h2>
      ${project.client ? `<div>Клиент: ${project.client}</div>` : ''}
      ${project.name ? `<div>Проект: ${project.name}</div>` : ''}
      <div>Дата: ${new Date().toLocaleDateString('ru-RU')}</div>
    </div>
    <table class="print-table">
      <thead><tr><th>Позиция</th><th>Количество</th><th>Цена</th><th>Сумма</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3"><b>ИТОГО</b></td><td><b>${formatMoney(total)}</b></td></tr></tfoot>
    </table>
  `;
}

// ─── KP Builder ───────────────────────────────────────────────────────────────
function getCurrentTotal() {
  let total = 0;
  for (const b of project.bases) {
    const { cost } = calcCabinetCost(b, cfg);
    total += cost * (b.qty || 1);
  }
  for (const ci of project.customItems) total += ci.price * ci.qty;
  const { left, right, top, falsh, customH } = project.dobory;
  const W = project.totalW / 1000, H = project.totalH / 1000;
  const dPrice = cfg.general.doborPricePerM2, dW = cfg.general.doborWidth / 1000;
  if (left)  total += dW * H * dPrice;
  if (right) total += dW * H * dPrice;
  if (top && customH > 0) total += W * (customH / 1000) * dPrice;
  if (falsh) total += dW * H * dPrice;
  if (project.wallPanel.typeKey && project.wallPanel.w && project.wallPanel.h) {
    const wp = cfg.wallPanels[project.wallPanel.typeKey];
    total += (project.wallPanel.w * project.wallPanel.h / 1_000_000) * wp.price;
  }
  if (project.cushion.w && project.cushion.h) {
    total += (project.cushion.w * project.cushion.h / 1_000_000) * cfg.general.cushionPricePerM2;
  }
  return total;
}

function generateOrderNum() {
  const saved = loadHistory();
  const seq = String(saved.length + 1).padStart(2, '0');
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${seq}${mm}${dd}${yy}/А`;
}

function openKP(snapshotProject, snapshotCfg) {
  const p = snapshotProject || project;
  const c = snapshotCfg || cfg;
  const orderNum = p.orderNum || generateOrderNum();
  const date = new Date().toLocaleDateString('ru-RU');

  // Build rows
  let rows = '';
  let total = 0;

  for (const b of p.bases) {
    const ct = c.cabinetTypes[b.typeKey];
    const { cost } = calcCabinetCost(b, c);
    const qty = b.qty || 1;
    const subtotal = cost * qty;
    total += subtotal;
    const facadeName = b.facadeKey ? c.facades[b.facadeKey]?.name : '';
    const fillingItems = Object.entries(b.filling || {})
      .filter(([, q]) => q > 0)
      .map(([k, q]) => `${c.filling[k]?.name}: ${q} шт`)
      .join(', ');
    let desc = `<b>${ct.name}</b><br>${b.w} × ${b.h} × ${b.d} мм, ${qty} шт.`;
    if (facadeName) desc += `<br>Фасад: ${facadeName}`;
    if (fillingItems) desc += `<br>${fillingItems}`;
    rows += `<tr><td>${desc}</td><td class="td-price">${Math.round(subtotal).toLocaleString('ru-RU')}</td></tr>`;
  }

  for (const ci of p.customItems) {
    const cost = ci.price * ci.qty;
    total += cost;
    rows += `<tr><td><b>${ci.name}</b> × ${ci.qty} шт.</td><td class="td-price">${Math.round(cost).toLocaleString('ru-RU')}</td></tr>`;
  }

  const addons = [];
  const { left, right, top, falsh, customH } = p.dobory;
  const W = p.totalW / 1000, H = p.totalH / 1000;
  const dPrice = c.general.doborPricePerM2, dW = c.general.doborWidth / 1000;
  if (left)  { const cost = dW*H*dPrice; total += cost; addons.push(['Левый добор', cost]); }
  if (right) { const cost = dW*H*dPrice; total += cost; addons.push(['Правый добор', cost]); }
  if (top && customH > 0) { const cost = W*(customH/1000)*dPrice; total += cost; addons.push(['Верхний добор', cost]); }
  if (falsh) { const cost = dW*H*dPrice; total += cost; addons.push(['Фальш-панель', cost]); }
  if (p.wallPanel.typeKey && p.wallPanel.w && p.wallPanel.h) {
    const wp = c.wallPanels[p.wallPanel.typeKey];
    const cost = (p.wallPanel.w * p.wallPanel.h / 1_000_000) * wp.price;
    total += cost;
    addons.push([wp.name, cost]);
  }
  if (p.cushion.w && p.cushion.h) {
    const cost = (p.cushion.w * p.cushion.h / 1_000_000) * c.general.cushionPricePerM2;
    total += cost;
    addons.push(['Мягкая подушка', cost]);
  }
  for (const [name, cost] of addons) {
    rows += `<tr><td><b>${name}</b></td><td class="td-price">${Math.round(cost).toLocaleString('ru-RU')}</td></tr>`;
  }

  const imgHtml = p.kpImage
    ? `<div class="kp-img-block"><img src="${p.kpImage}" alt="Проект"></div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>КП — ${p.client || p.name || 'АртВитринА'}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Arial',sans-serif;color:#1a1a1a;background:#fff;padding:40px;max-width:800px;margin:0 auto}
  .logo{text-align:center;margin-bottom:24px}
  .logo-text{font-size:32px;font-weight:900;letter-spacing:2px;text-transform:uppercase}
  .logo-text .v{font-style:italic;color:#CEB26F}
  .logo-sub{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#888;margin-top:2px}
  h1{text-align:center;font-size:18px;font-weight:700;margin-bottom:8px}
  .order-num{text-align:center;font-size:15px;margin-bottom:28px}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#f5f5f5;font-size:13px;font-weight:700;padding:10px 14px;text-align:left;border:1px solid #ddd}
  th.td-price,td.td-price{text-align:right;white-space:nowrap;font-weight:700;width:140px}
  td{padding:12px 14px;border:1px solid #ddd;font-size:13px;vertical-align:top;line-height:1.6}
  tfoot td{background:#2E2E2E;color:#fff;font-size:15px;font-weight:700;padding:12px 14px}
  .kp-img-block{margin-top:32px;text-align:center}
  .kp-img-block img{max-width:100%;border-radius:8px}
  @media print{body{padding:20px}button{display:none}}
</style>
</head>
<body>
  <div class="logo">
    <div class="logo-text">Арт<i class="v">V</i>итрин<span style="color:#CEB26F">А</span></div>
    <div class="logo-sub">мебель на заказ</div>
  </div>
  <h1>Предварительный расчёт стоимости по заказу</h1>
  <div class="order-num">№ ${orderNum} от ${date}</div>
  ${p.client ? `<p style="text-align:center;margin-bottom:16px;font-size:13px">Клиент: <b>${p.client}</b>${p.name ? ' &nbsp;|&nbsp; Проект: <b>' + p.name + '</b>' : ''}</p>` : ''}
  <table>
    <thead><tr><th>Комплектация</th><th class="td-price">Стоимость р.</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td>ИТОГО</td><td class="td-price">${Math.round(total).toLocaleString('ru-RU')}</td></tr></tfoot>
  </table>
  ${imgHtml}
  <div style="margin-top:16px;text-align:center">
    <button onclick="window.print()" style="padding:10px 32px;background:#CEB26F;color:#2E2E2E;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer">🖨 Распечатать / Сохранить PDF</button>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMoney(n) {
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}

function showError(msg) {
  alert(msg);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function restoreFormFields() {
  document.getElementById('proj-name').value   = project.name     || '';
  document.getElementById('proj-client').value = project.client   || '';
  document.getElementById('proj-order').value  = project.orderNum || '';
  if (project.kpImage) {
    document.getElementById('kp-img-name').textContent = 'фото загружено';
    document.getElementById('btn-clear-kp-img').style.display = '';
  }
  document.getElementById('total-w').value = project.totalW || 0;
  document.getElementById('total-h').value = project.totalH || 0;
  const d = project.dobory;
  document.getElementById('dobor-left').checked  = !!d.left;
  document.getElementById('dobor-right').checked = !!d.right;
  document.getElementById('dobor-top').checked   = !!d.top;
  document.getElementById('dobor-falsh').checked = !!d.falsh;
  document.getElementById('dobor-top-h').value   = d.customH || 0;
  document.getElementById('wall-panel-w').value  = project.wallPanel.w || 0;
  document.getElementById('wall-panel-h').value  = project.wallPanel.h || 0;
  document.getElementById('cushion-w').value     = project.cushion.w || 0;
  document.getElementById('cushion-h').value     = project.cushion.h || 0;
  const sel = document.getElementById('wall-panel-type');
  if (project.wallPanel.typeKey) sel.value = project.wallPanel.typeKey;
}

initAddons();
restoreFormFields();
renderBases();
updateSummary();
