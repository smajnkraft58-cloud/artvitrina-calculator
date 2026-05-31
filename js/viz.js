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

function show3D() {
  document.getElementById('viz-3d').style.display = 'block';
  document.getElementById('viz-area').style.display = 'none';
}
function show2D() {
  document.getElementById('viz-3d').style.display = 'none';
  document.getElementById('viz-area').style.display = 'block';
}

function render3D() {
  show3D();
  if (!window.THREE) { render2D(); return; }
  // defer until layout is painted so canvas has real size
  requestAnimationFrame(() => {
    if (!threeCtx) initThree();
    buildScene();
  });
}

function initThree() {
  const canvas = document.getElementById('viz-canvas');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const camera = new THREE.PerspectiveCamera(48, 1, 1, 30000);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 200;
  controls.maxDistance = 12000;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // don't go below floor

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0ede6);
  scene.fog = new THREE.Fog(0xf0ede6, 8000, 18000);

  // ── Lights ──────────────────────────────────────────────────────────────────
  // Ambient (soft warm fill)
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.55));

  // Main ceiling spot
  const sun = new THREE.DirectionalLight(0xfffaf0, 1.1);
  sun.position.set(1500, 4000, 2500);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 20000;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -4000;
  sun.shadow.camera.right = sun.shadow.camera.top = 4000;
  scene.add(sun);

  // Soft fill from left
  const fill = new THREE.DirectionalLight(0xe8eeff, 0.35);
  fill.position.set(-3000, 2000, 1000);
  scene.add(fill);

  // Warm back-fill
  const back = new THREE.DirectionalLight(0xfff0d8, 0.2);
  back.position.set(0, 1000, -3000);
  scene.add(back);

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

// ─── Procedural textures ──────────────────────────────────────────────────────
function makeParquetTexture() {
  const size = 512;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');

  const plankW = 64, plankH = 20;
  const colors = ['#c8a96e','#bf9f65','#d4b47a','#c09060','#b88c58','#cca870'];

  ctx.fillStyle = '#c09060';
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < size / plankH + 1; row++) {
    const offset = (row % 2) * (plankW / 2);
    for (let col = -1; col < size / plankW + 1; col++) {
      const x = col * plankW + offset, y = row * plankH;
      const c = colors[(row * 3 + col * 2) % colors.length];
      ctx.fillStyle = c;
      ctx.fillRect(x + 1, y + 1, plankW - 2, plankH - 2);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.5;
      for (let g = 3; g < plankW - 4; g += 7) {
        ctx.beginPath();
        ctx.moveTo(x + g, y + 2);
        ctx.lineTo(x + g + 2, y + plankH - 3);
        ctx.stroke();
      }

      // Plank border (grout)
      ctx.strokeStyle = 'rgba(90,60,30,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, plankW - 1, plankH - 1);
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeWallTexture() {
  const size = 256;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');

  // Subtle plaster — base + fine noise
  ctx.fillStyle = '#e8e3d8';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const alpha = Math.random() * 0.04;
    ctx.fillStyle = `rgba(${Math.random()>0.5?180:220},${Math.random()>0.5?170:210},${Math.random()>0.5?150:190},${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
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

  // Clear furniture + room objects
  const toRemove = [];
  scene.traverse(obj => { if (obj.userData.isCab || obj.userData.isRoom) toRemove.push(obj); });
  toRemove.forEach(obj => scene.remove(obj));

  // Expand bases by qty
  const slots = [];
  for (const b of project.bases)
    for (let i = 0; i < (b.qty || 1); i++) slots.push(b);

  const T = 18, GAP = 2;
  let offsetX = 0;

  for (const b of slots) {
    const ct  = cfg.cabinetTypes[b.typeKey];
    const isW = ct.group === 'wall';
    const grp = buildCabinet(b, ct, b.w, b.h, b.d, T, b.filling || {}, isW);
    grp.userData.isCab = true;
    // floor cabinets: bottom at Y=0; wall cabinets: float at Y=400+h*0.1
    grp.position.set(offsetX + b.w / 2, isW ? 400 + b.h / 2 : b.h / 2, 0);
    scene.add(grp);
    offsetX += b.w + GAP;
  }

  const totalW = Math.max(offsetX - GAP, 1);
  const maxH   = Math.max(...slots.map(b => b.h), 2000);
  const maxD   = Math.max(...slots.map(b => b.d), 600);

  // Centre cabinets on X
  scene.traverse(o => { if (o.userData.isCab) o.position.x -= totalW / 2; });

  // Room dimensions
  const rW = totalW + 2600;   // extra space left/right
  const rH = maxH   + 1400;   // up to ceiling
  const rD = maxD   + 4000;   // depth of room (camera is inside)

  // Cabinets are at Z=0 (back face). Room back wall at Z = -(maxD/2 + 80)
  const backZ = -(maxD / 2 + 80);
  // Floor/ceiling/walls span forward from backZ to backZ + rD
  const midZ  = backZ + rD / 2;

  buildRoom(scene, rW, rH, rD, backZ, midZ, maxH);

  // Camera: slightly right, eye level, in front of cabinets
  const dist = Math.max(totalW, maxH) * 1.3 + 1500;
  camera.position.set(totalW * 0.15, maxH * 0.5, maxD / 2 + dist);
  const tgt = new THREE.Vector3(0, maxH * 0.42, 0);
  camera.lookAt(tgt);
  controls.target.copy(tgt);
  controls.update();

  // Fit shadow frustum
  const s = Math.max(totalW, maxH) + 500;
  sun.position.set(totalW * 0.5, maxH * 2, maxD / 2 + dist * 0.4);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -s;
  sun.shadow.camera.right = sun.shadow.camera.top   =  s;
  sun.shadow.camera.far = dist * 3;
  sun.shadow.camera.updateProjectionMatrix();

  resizeThree();
}

function buildRoom(scene, rW, rH, rD, backZ, midZ, maxH) {
  const tag = o => { o.userData.isRoom = true; o.receiveShadow = true; scene.add(o); return o; };
  const box = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return tag(m);
  };

  // Textures
  const pt = makeParquetTexture();
  pt.repeat.set(rW / 500, rD / 500);
  const wt = makeWallTexture();
  wt.repeat.set(rW / 1000, rH / 900);
  const wts = makeWallTexture();
  wts.repeat.set(rD / 1000, rH / 900);

  // ── Floor ──
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(rW, rD),
    new THREE.MeshStandardMaterial({ map: pt, roughness: 0.6, metalness: 0.04 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, midZ);
  tag(floor);

  // ── Back wall ──
  const bwMat = new THREE.MeshStandardMaterial({ map: wt, color: 0xe8e3d8, roughness: 0.92 });
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(rW, rH), bwMat);
  bw.position.set(0, rH / 2, backZ);
  tag(bw);

  // ── Left wall ──
  const swMat = new THREE.MeshStandardMaterial({ map: wts, color: 0xe5e0d5, roughness: 0.92 });
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(rD, rH), swMat.clone());
  lw.rotation.y = Math.PI / 2;
  lw.position.set(-rW / 2, rH / 2, midZ);
  tag(lw);

  // ── Right wall ──
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(rD, rH), swMat);
  rw.rotation.y = -Math.PI / 2;
  rw.position.set(rW / 2, rH / 2, midZ);
  tag(rw);

  // ── Ceiling ──
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(rW, rD),
    new THREE.MeshStandardMaterial({ color: 0xf5f2ec, roughness: 1 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, rH, midZ);
  tag(ceil);

  // ── Baseboard back ──
  const bpMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: 0.5 });
  box(rW, 80, 16, 0, 40, backZ + 8, bpMat);
  // left & right
  box(16, 80, rD, -rW / 2 + 8, 40, midZ, bpMat.clone());
  box(16, 80, rD,  rW / 2 - 8, 40, midZ, bpMat.clone());

  // ── Ceiling lamp ──
  const lampY = rH - 20;
  const lampZ = midZ - rD * 0.25; // lamp above cabinets area
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(55, 75, 28, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe090, emissiveIntensity: 0.7 })
  );
  lamp.position.set(0, lampY, lampZ);
  tag(lamp);

  // cord
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 90, 6),
    new THREE.MeshStandardMaterial({ color: 0x999999 })
  );
  cord.position.set(0, lampY + 59, lampZ);
  tag(cord);

  // point light
  const pl = new THREE.PointLight(0xfff4d0, 1.0, rD * 2.2);
  pl.position.set(0, lampY - 20, lampZ);
  pl.userData.isRoom = true;
  scene.add(pl);
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
  show2D();
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
