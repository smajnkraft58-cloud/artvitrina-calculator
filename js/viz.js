// ─── Visualization: 3D (Three.js) + 2D (SVG) ─────────────────────────────────

let vizMode = '3d'; // '3d' | '2d'
let threeCtx = null; // { scene, camera, renderer, controls, animId }

// ─── Public entry point ───────────────────────────────────────────────────────
function renderVisualization() {
  const wrap = document.getElementById('viz-wrap');
  if (!project.bases.length) {
    wrap.classList.add('hidden');
    disposeThree();
    return;
  }
  wrap.classList.remove('hidden');
  if (vizMode === '3d') {
    render3D();
  } else {
    render2D();
  }
}

// ─── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.viz-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.viz-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    vizMode = btn.dataset.view;
    document.getElementById('viz-3d').classList.toggle('hidden', vizMode !== '3d');
    document.getElementById('viz-area').classList.toggle('hidden', vizMode !== '2d');
    renderVisualization();
  });
});

// ─── Fullscreen ───────────────────────────────────────────────────────────────
document.getElementById('btn-viz-fullscreen').addEventListener('click', () => {
  const wrap = document.getElementById('viz-wrap');
  if (!document.fullscreenElement) {
    wrap.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});
document.addEventListener('fullscreenchange', () => {
  if (vizMode === '3d' && threeCtx) resizeThree();
});

// ══════════════════════════════════════════════════════════════════════════════
// 3D RENDERER
// ══════════════════════════════════════════════════════════════════════════════

function render3D() {
  document.getElementById('viz-3d').classList.remove('hidden');
  document.getElementById('viz-area').classList.add('hidden');

  if (!window.THREE) { render2D(); return; } // fallback if Three.js didn't load

  if (!threeCtx) {
    initThree();
  }
  buildScene();
}

function initThree() {
  const canvas = document.getElementById('viz-canvas');
  const container = document.getElementById('viz-3d');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xf5f3ef, 1);

  const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 100;
  controls.maxDistance = 8000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f3ef);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(2000, 3000, 2000);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 15000;
  sun.shadow.camera.left = -3000;
  sun.shadow.camera.right = 3000;
  sun.shadow.camera.top = 3000;
  sun.shadow.camera.bottom = -3000;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xfff5e0, 0.4);
  fill.position.set(-1500, 500, -500);
  scene.add(fill);

  threeCtx = { scene, camera, renderer, controls, animId: null, sun };
  resizeThree();

  window.addEventListener('resize', resizeThree);

  function animate() {
    threeCtx.animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function resizeThree() {
  if (!threeCtx) return;
  const { renderer, camera } = threeCtx;
  const container = document.getElementById('viz-3d');
  const w = container.offsetWidth  || 600;
  const h = container.offsetHeight || 420;
  renderer.setSize(w, h, false); // false = don't touch canvas CSS
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function disposeThree() {
  if (!threeCtx) return;
  cancelAnimationFrame(threeCtx.animId);
  threeCtx.renderer.dispose();
  threeCtx = null;
}

// ─── Materials ────────────────────────────────────────────────────────────────
function matLDSP(hexColor) {
  return new THREE.MeshStandardMaterial({
    color: hexColor,
    roughness: 0.85,
    metalness: 0.0,
  });
}

const MAT_BODY   = () => matLDSP(0xf0ece3);   // ЛДСП light beige
const MAT_SHELF  = () => matLDSP(0xe8e0d0);   // shelf slightly darker
const MAT_BACK   = () => matLDSP(0xddd8cc);   // ЛХДФ back panel
const MAT_DRAWER = () => matLDSP(0xfaf7f2);   // drawer front
const MAT_ROD    = () => new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
const MAT_DOOR   = () => new THREE.MeshStandardMaterial({ color: 0xf8f5ef, roughness: 0.4, metalness: 0.05, transparent: true, opacity: 0.92 });
const MAT_EDGE   = () => new THREE.LineBasicMaterial({ color: 0x8a7e70, linewidth: 1 });

// ─── Scene builder ────────────────────────────────────────────────────────────
function buildScene() {
  const { scene, camera, controls, sun } = threeCtx;

  // Clear previous cabinets
  const toRemove = [];
  scene.traverse(obj => { if (obj.userData.isFurniture) toRemove.push(obj); });
  toRemove.forEach(obj => {
    obj.geometry?.dispose();
    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
    else obj.material?.dispose();
    scene.remove(obj);
  });

  // Ground plane
  scene.children
    .filter(c => c.userData.isGround)
    .forEach(c => scene.remove(c));
  const groundGeo = new THREE.PlaneGeometry(20000, 20000);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xe8e3d8, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.isGround = true;
  scene.add(ground);

  // ── Expand bases by qty ─────────────────────────────────────────────────────
  const slots = [];
  for (const b of project.bases) {
    const qty = b.qty || 1;
    for (let i = 0; i < qty; i++) slots.push(b);
  }

  const T = 18; // panel thickness mm
  const GAP = 2; // gap between cabinets

  let offsetX = 0;
  const group = new THREE.Group();
  group.userData.isFurniture = true;

  for (const b of slots) {
    const ct = cfg.cabinetTypes[b.typeKey];
    const W = b.w, H = b.h, D = b.d;
    const isWall = ct.group === 'wall';
    const fill = b.filling || {};

    const cabinetGroup = buildCabinet(b, ct, W, H, D, T, fill, isWall);
    cabinetGroup.position.set(offsetX + W / 2, isWall ? H * 0.6 + 400 : H / 2, 0);
    group.add(cabinetGroup);

    offsetX += W + GAP;
  }

  // Centre the whole group
  const totalW = offsetX - GAP;
  group.position.x = -totalW / 2;

  scene.add(group);

  // ── Camera framing ──────────────────────────────────────────────────────────
  const maxH = Math.max(...slots.map(b => b.h));
  const dist = Math.max(totalW, maxH) * 1.5 + 800;
  camera.position.set(totalW * 0.4, maxH * 0.6, dist);
  camera.lookAt(0, maxH * 0.4, 0);
  controls.target.set(0, maxH * 0.4, 0);
  controls.update();

  // Shadow camera fit
  sun.shadow.camera.left   = -totalW;
  sun.shadow.camera.right  =  totalW;
  sun.shadow.camera.top    =  maxH * 2;
  sun.shadow.camera.bottom = -200;
  sun.shadow.camera.updateProjectionMatrix();

  resizeThree();
}

function buildCabinet(b, ct, W, H, D, T, fill, isWall) {
  const g = new THREE.Group();

  const addBox = (w, h, d, x, y, z, matFn, cast = true) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, matFn());
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    g.add(mesh);

    // Edge lines
    const edges = new THREE.EdgesGeometry(geo);
    const line  = new THREE.LineSegments(edges, MAT_EDGE());
    line.position.copy(mesh.position);
    g.add(line);

    return mesh;
  };

  // ── Panels ──────────────────────────────────────────────────────────────────
  const iW = W - T * 2; // inner width
  const iD = D - T;     // inner depth (back panel T)

  // Left side
  addBox(T, H, D, -(W/2 - T/2), 0, 0, MAT_BODY);
  // Right side
  addBox(T, H, D,  (W/2 - T/2), 0, 0, MAT_BODY);
  // Top
  addBox(iW, T, D, 0, H/2 - T/2, 0, MAT_BODY);
  // Bottom (if hasBottom)
  if (ct.hasBottom) {
    addBox(iW, T, D, 0, -H/2 + T/2, 0, MAT_BODY);
  }
  // Back panel (ЛХДФ)
  addBox(W, H, T * 0.5, 0, 0, -(D/2 - T * 0.25), MAT_BACK, false);

  // ── Shelves ─────────────────────────────────────────────────────────────────
  const shelfCount = fill.shelf || 0;
  if (shelfCount > 0) {
    const usableH = H - T * 2;
    const spacing = usableH / (shelfCount + 1);
    for (let s = 1; s <= shelfCount; s++) {
      const sy = -H/2 + T + s * spacing;
      addBox(iW - 2, T * 0.75, iD - 4, 0, sy, T * 0.25, MAT_SHELF);
    }
  }

  // ── Rods (штанги) ───────────────────────────────────────────────────────────
  const rodCount = fill.rod || 0;
  if (rodCount > 0) {
    const positions = rodCount === 1 ? [H * 0.35] : [H * 0.25, H * 0.6];
    positions.forEach(rY => {
      const rodGeo = new THREE.CylinderGeometry(6, 6, iW - 20, 12);
      const rod = new THREE.Mesh(rodGeo, MAT_ROD());
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, -H/2 + rY, -D/2 + D * 0.35);
      rod.castShadow = true;
      g.add(rod);
    });
  }

  // ── Drawers ─────────────────────────────────────────────────────────────────
  const drawerCount = fill.drawer || 0;
  if (drawerCount > 0) {
    const cnt = Math.min(drawerCount, 6);
    const dH  = Math.min(H * 0.12, 160);
    const startY = -H/2 + T + 5;
    for (let d = 0; d < cnt; d++) {
      const dy = startY + d * (dH + 3) + dH / 2;
      // drawer box
      addBox(iW - 8, dH - 4, iD * 0.75, 0, dy, iD * 0.125, MAT_DRAWER);
      // handle bar
      const handleGeo = new THREE.CylinderGeometry(4, 4, iW * 0.35, 8);
      const handle = new THREE.Mesh(handleGeo, MAT_ROD());
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0, dy, D/2 - T + 6);
      g.add(handle);
    }
  }

  // ── Door (glass-tint overlay) ────────────────────────────────────────────────
  if (b.facadeKey) {
    const facadeColor = getFacadeColor(b.facadeKey);
    const doorMat = new THREE.MeshStandardMaterial({
      color: facadeColor,
      roughness: 0.35, metalness: 0.05,
      transparent: true, opacity: 0.88,
    });
    const doors = ct.doors || 1;
    const dW = (iW / doors) - 4;
    for (let i = 0; i < doors; i++) {
      const dx = -iW / 2 + (iW / doors) * i + dW / 2 + 2;
      const doorGeo = new THREE.BoxGeometry(dW, H - T * 2 - 4, T * 0.6);
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.position.set(dx, 0, D / 2 - T * 0.3 + 2);
      doorMesh.castShadow = true;
      g.add(doorMesh);
    }
  }

  // ── Wall cabinet hanging strip ───────────────────────────────────────────────
  if (isWall) {
    const hangGeo = new THREE.BoxGeometry(W - 20, 30, 15);
    const hangMesh = new THREE.Mesh(hangGeo, new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.6, roughness: 0.3 }));
    hangMesh.position.set(0, H/2 + 15, -D/2 + 20);
    g.add(hangMesh);
  }

  return g;
}

// Map facade key to approximate color
function getFacadeColor(key) {
  const map = {
    ldsp_solid:       0xf0ece3,
    ldsp_textured:    0xd4c9b0,
    mdf_enamel_matt:  0xe8e8e8,
    mdf_enamel_gloss: 0xf5f5f5,
    mdf_enamel_mf1:   0xddd8d0,
    mdf_enamel_mf2:   0xccc8c0,
    mdf_shpon:        0xb89060,
    massiv_shpon:     0xa07840,
    frame:            0xe0d8c8,
    mirror:           0xc0d0d8,
  };
  return map[key] || 0xf0ece3;
}

// ══════════════════════════════════════════════════════════════════════════════
// 2D RENDERER (SVG)
// ══════════════════════════════════════════════════════════════════════════════

function render2D() {
  document.getElementById('viz-3d').classList.add('hidden');
  document.getElementById('viz-area').classList.remove('hidden');
  document.getElementById('viz-area').innerHTML = buildVizSVG();
}

function buildVizSVG() {
  const PAD_LEFT = 48, PAD_RIGHT = 24, PAD_TOP = 28, PAD_BOTTOM = 48;
  const MAX_W = 720, MAX_H = 320;

  const slots = [];
  for (const b of project.bases) {
    const qty = b.qty || 1;
    for (let i = 0; i < qty; i++) slots.push({ b, isFirst: i === 0, qty });
  }

  const totalW_mm = slots.reduce((s, { b }) => s + b.w, 0);
  const maxH_mm   = Math.max(...slots.map(({ b }) => b.h));

  const scaleX = MAX_W / totalW_mm;
  const scaleY = MAX_H / maxH_mm;
  const scale  = Math.min(scaleX, scaleY, 0.38);

  const drawTotalW = totalW_mm * scale;
  const drawTotalH = maxH_mm  * scale;
  const SVG_W = PAD_LEFT + drawTotalW + PAD_RIGHT;
  const SVG_H = PAD_TOP  + drawTotalH + PAD_BOTTOM;
  const floorY = PAD_TOP + drawTotalH;

  let defs = `<defs>
    <marker id="arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
      <polygon points="0,0 5,2.5 0,5" fill="#aaa"/></marker>
    <marker id="arrb" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse">
      <polygon points="0,0 5,2.5 0,5" fill="#aaa"/></marker>
  </defs>`;

  let bodies = '', details = '', labels = '';
  let curX = PAD_LEFT;

  for (const { b, isFirst, qty } of slots) {
    const ct = cfg.cabinetTypes[b.typeKey];
    const bW = b.w * scale, bH = b.h * scale;
    const bY = floorY - bH;
    const isWall = ct.group === 'wall';
    const fill = b.filling || {};
    const PI = 2;

    bodies += `<rect x="${r(curX)}" y="${r(bY)}" width="${r(bW)}" height="${r(bH)}"
      fill="${isWall ? '#eef1f8' : '#f5f3ef'}" stroke="#2E2E2E" stroke-width="1.5"/>`;

    if (!isWall) {
      const lh = Math.min(7, bH * 0.04), lw = Math.max(3, bW * 0.06);
      bodies += `<rect x="${r(curX+4)}" y="${r(floorY)}" width="${r(lw)}" height="${r(lh)}" fill="#bbb"/>`;
      bodies += `<rect x="${r(curX+bW-4-lw)}" y="${r(floorY)}" width="${r(lw)}" height="${r(lh)}" fill="#bbb"/>`;
    } else {
      const hh = Math.min(5, bH * 0.025);
      details += `<rect x="${r(curX+bW*0.2)}" y="${r(bY-hh)}" width="${r(bW*0.12)}" height="${r(hh)}" fill="#aaa"/>`;
      details += `<rect x="${r(curX+bW*0.68)}" y="${r(bY-hh)}" width="${r(bW*0.12)}" height="${r(hh)}" fill="#aaa"/>`;
    }

    // Shelves
    const sc = fill.shelf || 0;
    if (sc > 0) {
      const sp = (bH - PI*2) / (sc + 1);
      for (let s = 1; s <= Math.min(sc, 12); s++) {
        const sy = r(bY + PI + s * sp);
        details += `<line x1="${r(curX+PI)}" y1="${sy}" x2="${r(curX+bW-PI)}" y2="${sy}" stroke="#CEB26F" stroke-width="1.8"/>`;
      }
    }

    // Rods
    const rc = fill.rod || 0;
    if (rc > 0) {
      [rc === 1 ? 0.35 : 0.25, rc >= 2 ? 0.65 : null].filter(Boolean).forEach(pos => {
        const ry = r(bY + bH * pos);
        details += `<line x1="${r(curX+6)}" y1="${ry}" x2="${r(curX+bW-6)}" y2="${ry}" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>`;
        details += `<circle cx="${r(curX+6)}" cy="${ry}" r="2.5" fill="#888"/>`;
        details += `<circle cx="${r(curX+bW-6)}" cy="${ry}" r="2.5" fill="#888"/>`;
      });
    }

    // Drawers
    const dc = fill.drawer || 0;
    if (dc > 0) {
      const cnt = Math.min(dc, 6), dh = Math.min(bH * 0.13, 18);
      const sy0 = bY + bH - cnt * dh - 4;
      for (let d = 0; d < cnt; d++) {
        const dy = r(sy0 + d * dh);
        details += `<rect x="${r(curX+3)}" y="${dy}" width="${r(bW-6)}" height="${r(dh-1)}" fill="#e8e4da" stroke="#aaa" stroke-width="0.8" rx="1"/>`;
        details += `<line x1="${r(curX+bW/2-7)}" y1="${r(sy0+d*dh+dh/2)}" x2="${r(curX+bW/2+7)}" y2="${r(sy0+d*dh+dh/2)}" stroke="#999" stroke-width="1.5" stroke-linecap="round"/>`;
      }
    }

    if (ct.doors === 2) {
      details += `<line x1="${r(curX+bW/2)}" y1="${r(bY)}" x2="${r(curX+bW/2)}" y2="${r(floorY)}" stroke="#ccc" stroke-width="1" stroke-dasharray="4,3"/>`;
    }

    if (b.facadeKey) {
      details += `<rect x="${r(curX+1)}" y="${r(bY+1)}" width="${r(bW-2)}" height="${r(bH-2)}" fill="rgba(206,178,111,0.07)" stroke="none"/>`;
    }

    if (isFirst) {
      const gW = b.w * qty * scale;
      const txt = qty > 1 ? `${b.w} × ${qty} шт` : `${b.w}`;
      labels += dimLine(curX, curX + gW, floorY + 14, txt, '#666', 9.5);
    }

    curX += bW;
  }

  bodies += `<line x1="${r(PAD_LEFT-4)}" y1="${r(floorY)}" x2="${r(PAD_LEFT+drawTotalW+4)}" y2="${r(floorY)}" stroke="#2E2E2E" stroke-width="2"/>`;
  labels += dimLine(PAD_LEFT, PAD_LEFT + drawTotalW, floorY + 30, `Общая ширина: ${totalW_mm} мм`, '#999', 9);

  const tall = slots.reduce((b, s) => s.b.h > b.b.h ? s : b, slots[0]);
  const tY = floorY - tall.b.h * scale;
  labels += `<line x1="${r(PAD_LEFT-10)}" y1="${r(tY)}" x2="${r(PAD_LEFT-10)}" y2="${r(floorY)}" stroke="#aaa" stroke-width="1" marker-start="url(#arrb)" marker-end="url(#arr)"/>`;
  labels += `<text x="${r(PAD_LEFT-28)}" y="${r((tY+floorY)/2)}" text-anchor="middle" dominant-baseline="middle"
    transform="rotate(-90,${r(PAD_LEFT-28)},${r((tY+floorY)/2)})" font-size="9" fill="#999" font-family="Montserrat,Arial">${tall.b.h} мм</text>`;

  return `<svg viewBox="0 0 ${r(SVG_W)} ${r(SVG_H+10)}" width="100%" style="display:block;max-width:${r(SVG_W)}px;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bodies}${details}${labels}
  </svg>`;
}

function r(n) { return Math.round(n * 10) / 10; }
function dimLine(x1, x2, y, text, color, fontSize) {
  const mx = (x1 + x2) / 2;
  return `<line x1="${r(x1)}" y1="${r(y)}" x2="${r(x2)}" y2="${r(y)}" stroke="${color}" stroke-width="0.8" marker-start="url(#arrb)" marker-end="url(#arr)"/>
  <text x="${r(mx)}" y="${r(y-3)}" text-anchor="middle" font-size="${fontSize}" fill="${color}" font-family="Montserrat,Arial">${text}</text>`;
}

// Initial render
renderVisualization();
