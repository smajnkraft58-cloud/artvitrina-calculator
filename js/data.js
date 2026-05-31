// Default configuration for the furniture calculator

const DEFAULT_MATERIALS = {
  ldsp:         { name: 'ЛДСП',              unit: 'м²',    price: 800   },
  lhdf:         { name: 'ЛХДФ',              unit: 'м²',    price: 200   },
  eurovint:     { name: 'Евровинт',          unit: 'шт',    price: 5     },
  shkant:       { name: 'Шкант',             unit: 'шт',    price: 2     },
  screw:        { name: 'Саморез',           unit: 'шт',    price: 1     },
  leg_floor:    { name: 'Опора цокольная',   unit: 'шт',    price: 35    },
  leg_recessed: { name: 'Опора врезная',     unit: 'шт',    price: 28    },
  hinge:        { name: 'Петля',             unit: 'шт',    price: 90    },
  hang:         { name: 'Подвес',            unit: 'компл', price: 180   },
  pusher:       { name: 'Выталкиватель',     unit: 'шт',    price: 220   },
  lift_nk:      { name: 'Подъёмник НК-X5',  unit: 'шт',    price: 1600  },
};

const DEFAULT_CABINET_TYPES = {
  floor_single_bottom: {
    group: 'floor', groupName: 'Напольные',
    name: 'Одностворчатая с дном',
    wMin: 100, wMax: 600, hMin: 300, hMax: 2750, dMin: 100, dMax: 1000,
    hardware: { leg_floor: 4, hinge: 4, eurovint: 16, shkant: 8, screw: 20 },
    hingeNote: 'при увеличении высоты более 2100 мм добавляется 1 петля',
    hingeThreshold: 2100, hingesExtra: 1, hingeAxis: 'h',
    hasBottom: true, doors: 1,
  },
  floor_double_bottom: {
    group: 'floor', groupName: 'Напольные',
    name: 'Двухстворчатая с дном',
    wMin: 100, wMax: 1200, hMin: 300, hMax: 2750, dMin: 100, dMax: 1000,
    hardware: { leg_floor: 6, hinge: 8, eurovint: 20, shkant: 10, screw: 24 },
    hingeNote: 'при увеличении высоты более 2100 мм добавляются 2 петли',
    hingeThreshold: 2100, hingesExtra: 2, hingeAxis: 'h',
    hasBottom: true, doors: 2,
  },
  floor_single_no_bottom: {
    group: 'floor', groupName: 'Напольные',
    name: 'Одностворчатая без дна',
    wMin: 100, wMax: 600, hMin: 300, hMax: 2750, dMin: 100, dMax: 1000,
    hardware: { leg_recessed: 4, hinge: 4, eurovint: 14, shkant: 6, screw: 18 },
    hingeNote: 'при увеличении высоты более 2100 мм добавляется 1 петля',
    hingeThreshold: 2100, hingesExtra: 1, hingeAxis: 'h',
    hasBottom: false, doors: 1,
  },
  floor_double_no_bottom: {
    group: 'floor', groupName: 'Напольные',
    name: 'Двухстворчатая без дна',
    wMin: 100, wMax: 1200, hMin: 300, hMax: 2750, dMin: 100, dMax: 1000,
    hardware: { leg_recessed: 6, hinge: 8, eurovint: 18, shkant: 8, screw: 22 },
    hingeNote: 'при увеличении высоты более 2100 мм добавляются 2 петли',
    hingeThreshold: 2100, hingesExtra: 2, hingeAxis: 'h',
    hasBottom: false, doors: 2,
  },
  floor_lift_door: {
    group: 'floor', groupName: 'Напольные',
    name: 'С откидным фасадом',
    wMin: 200, wMax: 800, hMin: 100, hMax: 500, dMin: 100, dMax: 800,
    hardware: { leg_recessed: 4, hinge: 4, pusher: 1, eurovint: 12, shkant: 6, screw: 16 },
    hingeNote: null,
    hasBottom: true, doors: 1,
  },
  wall_single: {
    group: 'wall', groupName: 'Подвесные',
    name: 'Одностворчатая',
    wMin: 100, wMax: 600, hMin: 300, hMax: 2500, dMin: 100, dMax: 1000,
    hardware: { hang: 2, hinge: 2, eurovint: 14, shkant: 6, screw: 18 },
    hingeNote: null,
    hasBottom: true, doors: 1,
  },
  wall_double: {
    group: 'wall', groupName: 'Подвесные',
    name: 'Двухстворчатая',
    wMin: 200, wMax: 1200, hMin: 300, hMax: 2500, dMin: 100, dMax: 1000,
    hardware: { hang: 2, hinge: 4, pusher: 1, eurovint: 18, shkant: 8, screw: 22 },
    hingeNote: null,
    hasBottom: true, doors: 2,
  },
  wall_lift_mechanism: {
    group: 'wall', groupName: 'Подвесные',
    name: 'С подъёмным механизмом',
    wMin: 300, wMax: 1200, hMin: 240, hMax: 500, dMin: 100, dMax: 1000,
    hardware: { hang: 2, hinge: 2, pusher: 1, lift_nk: 2, eurovint: 16, shkant: 8, screw: 20 },
    hingeNote: 'при увеличении ширины более 800 мм добавляется 1 петля',
    hingeThreshold: 800, hingesExtra: 1, hingeAxis: 'w',
    hasBottom: true, doors: 1,
  },
};

const DEFAULT_FACADES = {
  ldsp_solid:       { name: 'ЛДСП однотонный',                    unit: 'м²', price: 600  },
  ldsp_textured:    { name: 'ЛДСП текстурированный',              unit: 'м²', price: 700  },
  mdf_enamel_matt:  { name: 'МДФ эмаль матовая Тайм',             unit: 'м²', price: 1800 },
  mdf_enamel_gloss: { name: 'МДФ эмаль глянец Тайм',              unit: 'м²', price: 2200 },
  mdf_enamel_mf1:   { name: 'МДФ эмаль матовая с фрезеровкой 1',  unit: 'м²', price: 2500 },
  mdf_enamel_mf2:   { name: 'МДФ эмаль матовая с фрезеровкой 2',  unit: 'м²', price: 2800 },
  mdf_shpon:        { name: 'МДФ шпон',                           unit: 'м²', price: 3000 },
  massiv_shpon:     { name: 'Массив и МДФ шпон',                  unit: 'м²', price: 4500 },
  frame:            { name: 'Рамочные фасады',                    unit: 'м²', price: 2000 },
  mirror:           { name: 'Зеркало (дополнительно)',            unit: 'м²', price: 1500 },
};

const DEFAULT_FILLING = {
  shelf:        { name: 'Полка',          unit: 'шт', price: 350,  note: 'ширина и глубина под размер базы' },
  drawer:       { name: 'Выдвижной ящик', unit: 'шт', price: 1200, note: 'направляющие подбираются по глубине' },
  mesh_shelf:   { name: 'Сетчатая полка', unit: 'шт', price: 800,  note: '' },
  rod:          { name: 'Штанга',         unit: 'шт', price: 250,  note: '' },
  trouser_rack: { name: 'Брючница',       unit: 'шт', price: 600,  note: '' },
  shoe_rack:    { name: 'Обувница',       unit: 'шт', price: 750,  note: '' },
  pantograph:   { name: 'Пантограф',      unit: 'шт', price: 2500, note: 'выбор из списка' },
};

const DEFAULT_WALL_PANELS = {
  enamel:       { name: 'Стеновая панель — Эмаль',        unit: 'м²', price: 2000 },
  shpon:        { name: 'Стеновая панель — Шпон',         unit: 'м²', price: 3000 },
  enamel_shpon: { name: 'Стеновая панель — Эмаль+Шпон',  unit: 'м²', price: 3500 },
  planks:       { name: 'Стеновая панель — Рейки',        unit: 'м²', price: 1800 },
  soft:         { name: 'Стеновая панель — Мягкая',       unit: 'м²', price: 2500 },
};

const DEFAULT_GENERAL = {
  doborPricePerM2: 600,
  cushionPricePerM2: 3000,
  ldspWasteCoeff: 1.10,
  lhdfWasteCoeff: 1.05,
  doborWidth: 50,
};

function loadConfig() {
  try {
    const saved = localStorage.getItem('artvitrina_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

function saveConfig(cfg) {
  localStorage.setItem('artvitrina_config', JSON.stringify(cfg));
}

function getConfig() {
  const saved = loadConfig();
  const general = saved?.general || {};
  const ldsp = general.ldspWasteCoeff;
  const lhdf = general.lhdfWasteCoeff;
  const safeGeneral = {
    ...JSON.parse(JSON.stringify(DEFAULT_GENERAL)),
    ...general,
    ldspWasteCoeff: (ldsp >= 1 && ldsp <= 2) ? ldsp : DEFAULT_GENERAL.ldspWasteCoeff,
    lhdfWasteCoeff: (lhdf >= 1 && lhdf <= 2) ? lhdf : DEFAULT_GENERAL.lhdfWasteCoeff,
  };
  return {
    materials:    saved?.materials    || JSON.parse(JSON.stringify(DEFAULT_MATERIALS)),
    cabinetTypes: saved?.cabinetTypes || JSON.parse(JSON.stringify(DEFAULT_CABINET_TYPES)),
    facades:      saved?.facades      || JSON.parse(JSON.stringify(DEFAULT_FACADES)),
    filling:      saved?.filling      || JSON.parse(JSON.stringify(DEFAULT_FILLING)),
    wallPanels:   saved?.wallPanels   || JSON.parse(JSON.stringify(DEFAULT_WALL_PANELS)),
    general:      safeGeneral,
  };
}

// Calculate ЛДСП area in m² for one cabinet
function calcLDSP(typeKey, w, h, d, cfg) {
  const ct = cfg.cabinetTypes[typeKey];
  const w_mm = Number(w), h_mm = Number(h), d_mm = Number(d);
  const sides = 2 * h_mm * d_mm;
  const top   = (w_mm - 36) * d_mm;
  const bot   = ct.hasBottom ? (w_mm - 36) * d_mm : 0;
  const area_mm2 = sides + top + bot;
  return (area_mm2 / 1_000_000) * cfg.general.ldspWasteCoeff;
}

// Calculate ЛХДФ area in m² for one cabinet (back panel)
function calcLHDF(w, h, cfg) {
  return ((Number(w) * Number(h)) / 1_000_000) * cfg.general.lhdfWasteCoeff;
}

// Calculate hardware quantities for one cabinet (respecting hinge threshold)
function calcHardware(typeKey, w, h, cfg) {
  const ct = cfg.cabinetTypes[typeKey];
  const hw = Object.assign({}, ct.hardware);
  if (ct.hingeNote && ct.hingesExtra) {
    const dim = ct.hingeAxis === 'w' ? Number(w) : Number(h);
    if (dim > ct.hingeThreshold) {
      hw.hinge = (hw.hinge || 0) + ct.hingesExtra;
    }
  }
  return hw;
}

// Calculate cost for ONE cabinet (qty applied by caller)
function calcCabinetCost(entry, cfg) {
  const { typeKey, w, h, d, facadeKey, filling, doors } = entry;
  const mat = cfg.materials;
  let cost = 0;
  const breakdown = {};

  // Sheet materials (per 1 unit)
  const ldspArea = calcLDSP(typeKey, w, h, d, cfg);
  const lhdfArea = calcLHDF(w, h, cfg);
  const ldspCost = ldspArea * mat.ldsp.price;
  const lhdfCost = lhdfArea * mat.lhdf.price;
  breakdown['ЛДСП'] = { qty: ldspArea.toFixed(3), unit: 'м²', price: mat.ldsp.price, total: ldspCost };
  breakdown['ЛХДФ'] = { qty: lhdfArea.toFixed(3), unit: 'м²', price: mat.lhdf.price, total: lhdfCost };
  cost += ldspCost + lhdfCost;

  // Hardware (per 1 unit)
  const hw = calcHardware(typeKey, w, h, cfg);
  for (const [key, hwQty] of Object.entries(hw)) {
    const m = mat[key];
    if (!m) continue;
    const itemCost = hwQty * m.price;
    breakdown[m.name] = { qty: hwQty, unit: m.unit, price: m.price, total: itemCost };
    cost += itemCost;
  }

  // Facade (per 1 unit)
  if (facadeKey && cfg.facades[facadeKey]) {
    const facade = cfg.facades[facadeKey];
    const facadeArea = ((Number(w) * Number(h)) / 1_000_000) * (doors || 1);
    const facadeCost = facadeArea * facade.price;
    breakdown[facade.name] = { qty: facadeArea.toFixed(3), unit: 'м²', price: facade.price, total: facadeCost };
    cost += facadeCost;
  }

  // Filling (per 1 unit)
  for (const [key, fillQty] of Object.entries(filling || {})) {
    if (!fillQty || fillQty <= 0) continue;
    const fi = cfg.filling[key];
    if (!fi) continue;
    const itemCost = fillQty * fi.price;
    breakdown[fi.name] = { qty: fillQty, unit: fi.unit, price: fi.price, total: itemCost };
    cost += itemCost;
  }

  return { cost, breakdown };
}
