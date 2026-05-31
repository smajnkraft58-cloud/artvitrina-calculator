// Admin panel logic

function renderAdmin() {
  renderAdminMaterials();
  renderAdminCabinets();
  renderAdminFacades();
  renderAdminFilling();
  renderAdminWallPanels();
  renderAdminGeneral();
}

// ─── Materials ────────────────────────────────────────────────────────────────
function renderAdminMaterials() {
  const el = document.getElementById('admin-materials');
  el.innerHTML = Object.entries(cfg.materials).map(([key, m]) => `
    <tr>
      <td>${m.name}</td>
      <td>${m.unit}</td>
      <td><input type="number" class="price-input" data-section="materials" data-key="${key}"
        value="${m.price}" min="0" step="1"></td>
    </tr>`).join('');
  attachPriceInputs(el);
}

// ─── Cabinet Types ────────────────────────────────────────────────────────────
function renderAdminCabinets() {
  const el = document.getElementById('admin-cabinets');
  el.innerHTML = Object.entries(cfg.cabinetTypes).map(([key, ct]) => `
    <div class="admin-cabinet-block">
      <div class="admin-cabinet-name">${ct.groupName} — ${ct.name}</div>
      <div class="admin-dims-row">
        <label>Ш мин <input type="number" class="dim-input" data-ctype="${key}" data-field="wMin" value="${ct.wMin}"></label>
        <label>Ш макс <input type="number" class="dim-input" data-ctype="${key}" data-field="wMax" value="${ct.wMax}"></label>
        <label>В мин <input type="number" class="dim-input" data-ctype="${key}" data-field="hMin" value="${ct.hMin}"></label>
        <label>В макс <input type="number" class="dim-input" data-ctype="${key}" data-field="hMax" value="${ct.hMax}"></label>
        <label>Г мин <input type="number" class="dim-input" data-ctype="${key}" data-field="dMin" value="${ct.dMin}"></label>
        <label>Г макс <input type="number" class="dim-input" data-ctype="${key}" data-field="dMax" value="${ct.dMax}"></label>
      </div>
      <div class="admin-hw-row">
        ${Object.entries(ct.hardware).map(([hk, hq]) => `
          <label>${cfg.materials[hk]?.name || hk}
            <input type="number" class="hw-input" data-ctype="${key}" data-hw="${hk}" value="${hq}" min="0">
          </label>`).join('')}
      </div>
    </div>`).join('');

  el.querySelectorAll('.dim-input').forEach(inp => {
    inp.addEventListener('change', () => {
      cfg.cabinetTypes[inp.dataset.ctype][inp.dataset.field] = +inp.value;
      saveConfig(cfg);
    });
  });
  el.querySelectorAll('.hw-input').forEach(inp => {
    inp.addEventListener('change', () => {
      cfg.cabinetTypes[inp.dataset.ctype].hardware[inp.dataset.hw] = +inp.value;
      saveConfig(cfg);
    });
  });
}

// ─── Facades ─────────────────────────────────────────────────────────────────
function renderAdminFacades() {
  const el = document.getElementById('admin-facades');
  el.innerHTML = Object.entries(cfg.facades).map(([key, f]) => `
    <tr>
      <td>${f.name}</td>
      <td>${f.unit}</td>
      <td><input type="number" class="price-input" data-section="facades" data-key="${key}"
        value="${f.price}" min="0" step="1"></td>
    </tr>`).join('');
  attachPriceInputs(el);
}

// ─── Filling ──────────────────────────────────────────────────────────────────
function renderAdminFilling() {
  const el = document.getElementById('admin-filling');
  el.innerHTML = Object.entries(cfg.filling).map(([key, fi]) => `
    <tr>
      <td>${fi.name}</td>
      <td>${fi.unit}</td>
      <td><input type="number" class="price-input" data-section="filling" data-key="${key}"
        value="${fi.price}" min="0" step="1"></td>
    </tr>`).join('');
  attachPriceInputs(el);
}

// ─── Wall Panels ──────────────────────────────────────────────────────────────
function renderAdminWallPanels() {
  const el = document.getElementById('admin-wallpanels');
  el.innerHTML = Object.entries(cfg.wallPanels).map(([key, wp]) => `
    <tr>
      <td>${wp.name}</td>
      <td>${wp.unit}</td>
      <td><input type="number" class="price-input" data-section="wallPanels" data-key="${key}"
        value="${wp.price}" min="0" step="1"></td>
    </tr>`).join('');
  attachPriceInputs(el);
}

// ─── General Settings ─────────────────────────────────────────────────────────
function renderAdminGeneral() {
  const g = cfg.general;
  document.getElementById('gen-dobor-price').value = g.doborPricePerM2;
  document.getElementById('gen-cushion-price').value = g.cushionPricePerM2;
  document.getElementById('gen-ldsp-coeff').value = g.ldspWasteCoeff;
  document.getElementById('gen-lhdf-coeff').value = g.lhdfWasteCoeff;
  document.getElementById('gen-dobor-width').value = g.doborWidth;
}

document.getElementById('save-general').addEventListener('click', () => {
  const ldsp  = +document.getElementById('gen-ldsp-coeff').value;
  const lhdf  = +document.getElementById('gen-lhdf-coeff').value;
  if (ldsp < 1 || ldsp > 2) { showError('Коэффициент отходов ЛДСП должен быть от 1 до 2 (например 1.10)'); return; }
  if (lhdf < 1 || lhdf > 2) { showError('Коэффициент отходов ЛХДФ должен быть от 1 до 2 (например 1.05)'); return; }
  cfg.general.doborPricePerM2    = +document.getElementById('gen-dobor-price').value;
  cfg.general.cushionPricePerM2  = +document.getElementById('gen-cushion-price').value;
  cfg.general.ldspWasteCoeff     = ldsp;
  cfg.general.lhdfWasteCoeff     = lhdf;
  cfg.general.doborWidth         = +document.getElementById('gen-dobor-width').value;
  saveConfig(cfg);
  showToast('Настройки сохранены');
  updateSummary();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function attachPriceInputs(container) {
  container.querySelectorAll('.price-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const section = inp.dataset.section;
      const key = inp.dataset.key;
      cfg[section][key].price = +inp.value;
      saveConfig(cfg);
      updateSummary();
      // Refresh wall panel selector in calculator
      if (section === 'wallPanels') {
        const sel = document.getElementById('wall-panel-type');
        const current = sel.value;
        sel.innerHTML = '<option value="">— Не включать —</option>' +
          Object.entries(cfg.wallPanels).map(([k, v]) =>
            `<option value="${k}">${v.name} — ${v.price.toLocaleString('ru-RU')} ₽/м²</option>`
          ).join('');
        sel.value = current;
      }
    });
  });
}

// ─── Export / Import Config ───────────────────────────────────────────────────
document.getElementById('btn-export-config').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'artvitrina-config.json';
  a.click();
});

document.getElementById('btn-import-config').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      cfg = data;
      saveConfig(cfg);
      renderAdmin();
      updateSummary();
      showToast('Конфигурация загружена');
    } catch (err) {
      showError('Ошибка при загрузке файла: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('btn-reset-config').addEventListener('click', () => {
  if (confirm('Сбросить все цены и параметры к значениям по умолчанию?')) {
    localStorage.removeItem('artvitrina_config');
    cfg = getConfig();
    renderAdmin();
    updateSummary();
    showToast('Настройки сброшены');
  }
});
