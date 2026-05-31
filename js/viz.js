// 2D Front-View Visualization

function renderVisualization() {
  const wrap = document.getElementById('viz-wrap');
  const el   = document.getElementById('viz-area');

  if (!project.bases.length) {
    wrap.classList.add('hidden');
    el.innerHTML = '';
    return;
  }
  wrap.classList.remove('hidden');
  el.innerHTML = buildVizSVG();
}

function buildVizSVG() {
  // ── Layout constants ────────────────────────────────────────────────────────
  const PAD_LEFT   = 48;  // room for height label + dim line
  const PAD_RIGHT  = 24;
  const PAD_TOP    = 28;
  const PAD_BOTTOM = 48;  // room for width labels + total dim line
  const MAX_W      = 760; // max SVG inner draw width
  const MAX_H      = 340; // max SVG inner draw height

  // ── Expand bases by qty ─────────────────────────────────────────────────────
  const slots = [];
  for (const b of project.bases) {
    const qty = b.qty || 1;
    for (let i = 0; i < qty; i++) {
      slots.push({ b, idx: i, isFirst: i === 0, isLast: i === qty - 1 });
    }
  }

  const totalW_mm = slots.reduce((s, { b }) => s + b.w, 0);
  const maxH_mm   = Math.max(...slots.map(({ b }) => b.h));

  // ── Scale ───────────────────────────────────────────────────────────────────
  const scaleX = MAX_W / totalW_mm;
  const scaleY = MAX_H / maxH_mm;
  const scale  = Math.min(scaleX, scaleY, 0.35); // never bigger than 0.35 px/mm

  const drawTotalW = totalW_mm * scale;
  const drawTotalH = maxH_mm  * scale;

  const SVG_W = PAD_LEFT + drawTotalW + PAD_RIGHT;
  const SVG_H = PAD_TOP  + drawTotalH + PAD_BOTTOM;

  const floorY = PAD_TOP + drawTotalH; // Y of floor line

  // ── SVG pieces ──────────────────────────────────────────────────────────────
  let defs = `
  <defs>
    <marker id="arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
      <polygon points="0,0 5,2.5 0,5" fill="#aaa"/>
    </marker>
    <marker id="arr-back" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse">
      <polygon points="0,0 5,2.5 0,5" fill="#aaa"/>
    </marker>
    <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="4" stroke="#ddd" stroke-width="1"/>
    </pattern>
  </defs>`;

  let bodies = '';    // cabinet rectangles
  let details = '';   // internal elements (shelves, rods, drawers)
  let labels  = '';   // dimension text

  let curX = PAD_LEFT;

  for (const { b, idx, isFirst } of slots) {
    const ct = cfg.cabinetTypes[b.typeKey];
    const bW = b.w * scale;
    const bH = b.h * scale;
    const bY = floorY - bH;
    const isWall = ct.group === 'wall';

    // ── Cabinet body ──────────────────────────────────────────────────────────
    const bodyFill = isWall ? '#eef1f8' : '#f5f3ef';
    const stroke   = '#2E2E2E';
    bodies += `<rect x="${r(curX)}" y="${r(bY)}" width="${r(bW)}" height="${r(bH)}"
      fill="${bodyFill}" stroke="${stroke}" stroke-width="1.5" rx="0"/>`;

    // Legs (floor cabinets without bottom get recessed legs visual)
    if (!isWall) {
      const legH = Math.min(8, bH * 0.04);
      const legW = Math.max(3, bW * 0.06);
      // left leg
      bodies += `<rect x="${r(curX + 4)}" y="${r(floorY)}" width="${r(legW)}" height="${r(legH)}" fill="#bbb"/>`;
      // right leg
      bodies += `<rect x="${r(curX + bW - 4 - legW)}" y="${r(floorY)}" width="${r(legW)}" height="${r(legH)}" fill="#bbb"/>`;
    }

    // Wall cabinet hanging brackets
    if (isWall) {
      const hangH = Math.min(6, bH * 0.03);
      details += `<rect x="${r(curX + bW * 0.2)}" y="${r(bY - hangH)}" width="${r(bW * 0.12)}" height="${r(hangH)}" fill="#aaa"/>`;
      details += `<rect x="${r(curX + bW * 0.68)}" y="${r(bY - hangH)}" width="${r(bW * 0.12)}" height="${r(hangH)}" fill="#aaa"/>`;
    }

    // ── Internal elements ─────────────────────────────────────────────────────
    const fill = b.filling || {};
    const PAD_INNER = 2;

    // Shelves
    const shelfCount = fill.shelf || 0;
    if (shelfCount > 0) {
      const usableH = bH - PAD_INNER * 2;
      const spacing = usableH / (shelfCount + 1);
      for (let s = 1; s <= Math.min(shelfCount, 12); s++) {
        const sy = r(bY + PAD_INNER + s * spacing);
        details += `<line x1="${r(curX + PAD_INNER)}" y1="${sy}" x2="${r(curX + bW - PAD_INNER)}" y2="${sy}"
          stroke="#CEB26F" stroke-width="1.8"/>`;
      }
    }

    // Rods (штанга) — up to 2
    const rodCount = fill.rod || 0;
    if (rodCount > 0) {
      const positions = rodCount === 1 ? [0.35] : [0.25, 0.65];
      positions.forEach(pos => {
        const rodY = r(bY + bH * pos);
        details += `<line x1="${r(curX + 6)}" y1="${rodY}" x2="${r(curX + bW - 6)}" y2="${rodY}"
          stroke="#888" stroke-width="2.5" stroke-linecap="round"/>`;
        details += `<circle cx="${r(curX + 6)}"     cy="${rodY}" r="2.5" fill="#888"/>`;
        details += `<circle cx="${r(curX + bW - 6)}" cy="${rodY}" r="2.5" fill="#888"/>`;
      });
    }

    // Drawers
    const drawerCount = fill.drawer || 0;
    if (drawerCount > 0) {
      const cnt     = Math.min(drawerCount, 6);
      const drawerH = Math.min(bH * 0.13, 18);
      const startY  = bY + bH - cnt * drawerH - 4;
      for (let d = 0; d < cnt; d++) {
        const dy = r(startY + d * drawerH);
        details += `<rect x="${r(curX + 3)}" y="${dy}" width="${r(bW - 6)}" height="${r(drawerH - 1)}"
          fill="#e8e4da" stroke="#aaa" stroke-width="0.8" rx="1"/>`;
        // handle
        details += `<line x1="${r(curX + bW/2 - 7)}" y1="${r(startY + d * drawerH + drawerH/2)}"
                         x2="${r(curX + bW/2 + 7)}" y2="${r(startY + d * drawerH + drawerH/2)}"
          stroke="#999" stroke-width="1.5" stroke-linecap="round"/>`;
      }
    }

    // Mesh shelf
    const meshCount = fill.mesh_shelf || 0;
    if (meshCount > 0) {
      const sy = r(bY + bH * 0.55);
      details += `<line x1="${r(curX + 2)}" y1="${sy}" x2="${r(curX + bW - 2)}" y2="${sy}"
        stroke="#aaa" stroke-width="1.5" stroke-dasharray="3,2"/>`;
    }

    // Trouser rack (брючница) — small horizontal bars
    if (fill.trouser_rack) {
      for (let t = 0; t < 3; t++) {
        const ty = r(bY + bH * (0.4 + t * 0.12));
        details += `<line x1="${r(curX + 5)}" y1="${ty}" x2="${r(curX + bW - 5)}" y2="${ty}"
          stroke="#bbb" stroke-width="1" stroke-dasharray="2,2"/>`;
      }
    }

    // Pantograph — diamond shape in centre
    if (fill.pantograph) {
      const cx = curX + bW / 2, cy = bY + bH * 0.45;
      details += `<polygon points="${r(cx)},${r(cy - bH*0.1)} ${r(cx + bW*0.3)},${r(cy)} ${r(cx)},${r(cy + bH*0.1)} ${r(cx - bW*0.3)},${r(cy)}"
        fill="none" stroke="#aaa" stroke-width="1"/>`;
    }

    // Shoe rack (обувница) — angled lines at bottom
    if (fill.shoe_rack) {
      for (let s = 0; s < 3; s++) {
        const sy1 = r(bY + bH * (0.7 + s * 0.08));
        details += `<line x1="${r(curX + 4)}" y1="${sy1}" x2="${r(curX + bW - 4)}" y2="${r(bY + bH * (0.74 + s * 0.08))}"
          stroke="#bbb" stroke-width="1.2"/>`;
      }
    }

    // Double door divider
    if (ct.doors === 2) {
      details += `<line x1="${r(curX + bW / 2)}" y1="${r(bY)}" x2="${r(curX + bW / 2)}" y2="${r(floorY)}"
        stroke="#aaa" stroke-width="1" stroke-dasharray="4,3"/>`;
    }

    // Facade tint if selected
    if (b.facadeKey) {
      details += `<rect x="${r(curX + 1)}" y="${r(bY + 1)}" width="${r(bW - 2)}" height="${r(bH - 2)}"
        fill="rgba(206,178,111,0.06)" stroke="none"/>`;
    }

    // ── Width label below floor line ──────────────────────────────────────────
    if (isFirst) {
      // group bracket: show total width for this base group
      const groupW = b.w * (b.qty || 1) * scale;
      if (b.qty > 1) {
        labels += dimLine(curX, curX + groupW, floorY + 14, `${b.w} × ${b.qty} шт`, '#666', 9.5);
      } else {
        labels += dimLine(curX, curX + bW, floorY + 14, `${b.w}`, '#666', 10);
      }
    }

    curX += bW;
  }

  // ── Floor line ───────────────────────────────────────────────────────────────
  bodies += `<line x1="${r(PAD_LEFT - 4)}" y1="${r(floorY)}" x2="${r(PAD_LEFT + drawTotalW + 4)}" y2="${r(floorY)}"
    stroke="#2E2E2E" stroke-width="2"/>`;

  // ── Total width dim line (bottom) ────────────────────────────────────────────
  labels += dimLine(PAD_LEFT, PAD_LEFT + drawTotalW, floorY + 30, `Общая ширина: ${totalW_mm} мм`, '#999', 9);

  // ── Height label (left side) ─────────────────────────────────────────────────
  const tallestSlot = slots.reduce((best, s) => s.b.h > best.b.h ? s : best, slots[0]);
  const tY = floorY - tallestSlot.b.h * scale;
  labels += `<line x1="${r(PAD_LEFT - 10)}" y1="${r(tY)}" x2="${r(PAD_LEFT - 10)}" y2="${r(floorY)}"
    stroke="#aaa" stroke-width="1" marker-start="url(#arr-back)" marker-end="url(#arr)"/>`;
  labels += `<text x="${r(PAD_LEFT - 28)}" y="${r((tY + floorY) / 2)}"
    text-anchor="middle" dominant-baseline="middle"
    transform="rotate(-90, ${r(PAD_LEFT - 28)}, ${r((tY + floorY) / 2)})"
    font-size="9" fill="#999" font-family="Montserrat, Arial">${tallestSlot.b.h} мм</text>`;

  return `<svg viewBox="0 0 ${r(SVG_W)} ${r(SVG_H + 10)}" width="100%"
    style="display:block;max-width:${r(SVG_W)}px;margin:0 auto"
    xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${bodies}
    ${details}
    ${labels}
  </svg>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function r(n) { return Math.round(n * 10) / 10; }

function dimLine(x1, x2, y, text, color, fontSize) {
  const mx = (x1 + x2) / 2;
  return `
    <line x1="${r(x1)}" y1="${r(y)}" x2="${r(x2)}" y2="${r(y)}"
      stroke="${color}" stroke-width="0.8" marker-start="url(#arr-back)" marker-end="url(#arr)"/>
    <text x="${r(mx)}" y="${r(y - 3)}" text-anchor="middle"
      font-size="${fontSize}" fill="${color}" font-family="Montserrat, Arial">${text}</text>`;
}

// Initial render
renderVisualization();
