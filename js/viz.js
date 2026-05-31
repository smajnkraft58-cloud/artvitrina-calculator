// ─── Visualization: 3D (Three.js) + 2D (SVG) ─────────────────────────────────

let vizMode = '3d';
let threeCtx = null;

// ─── Public entry point ───────────────────────────────────────────────────────
function renderVisualization() {
  const wrap = document.getElementById('viz-wrap');
  if (!project.bases.length) {
    wrap.classList.add('hidden');
    disposeThree();
    return;
  }
  wrap.classList.remove('hidden');
  vizMode === '3d' ? render3D() : render2D();
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
  !document.fullscreenElement ? wrap.requestFullscreen?.() : document.exitFullscreen?.();
});
document.addEventListener('fullscreenchange', () => {
  if (vizMode === '3d' && threeCtx) resizeThree();
});

function show3D() {
  document.getElementById('viz-3d').style.display  = 'block';
  document.getElementById('viz-area').style.display = 'none';
}
function show2D() {
  document.getElementById('viz-3d').style.display  = 'none';
  document.getElementById('viz-area').style.display = 'block';
}

// ══════════════════════════════════════════════════════════════════════════════
// 3D
// ══════════════════════════════════════════════════════════════════════════════
function render3D() {
  show3D();
  if (!window.THREE) { render2D(); return; }
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
  renderer.setClearColor(0xf0ede6, 1);

  const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 100;
  controls.maxDistance = 10000;
  controls.maxPolarAngle = Math.PI / 2 - 0.01;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0ede6);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  const sun = new THREE.DirectionalLight(0xfffaf0, 1.1);
  sun.position.set(2000, 4000, 3000);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xe8eeff, 0.3);
  fill.position.set(-2000, 1000, 500);
  scene.add(fill);

  threeCtx = { scene, camera, renderer, controls, animId: null, sun };
  resizeThree();
  window.addEventListener('resize', resizeThree);

  (function animate() {
    threeCtx.animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}

function resizeThree() {
  if (!threeCtx) return;
  const { renderer, camera } = threeCtx;
  const c = document.getElementById('viz-3d');
  const w = c.offsetWidth || 660, h = c.offsetHeight || 420;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function disposeThree() {
  if (!threeCtx) return;
  cancelAnimationFrame(threeCtx.animId);
  threeCtx.renderer.dispose();
  threeCtx = null;
}

// ─── Parquet floor texture (procedural) ──────────────────────────────────────
function makeParquetTexture() {
  const size = 512;
  const cvs  = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx  = cvs.getContext('2d');

  const plankW = 64, plankH = 20;
  const colors = ['#c8a96e','#bf9f65','#d4b47a','#c09060','#b88c58','#cca870'];

  ctx.fillStyle = '#c09060';
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < size / plankH + 1; row++) {
    const offset = (row % 2) * (plankW / 2);
    for (let col = -1; col < size / plankW + 1; col++) {
      const x = col * plankW + offset, y = row * plankH;
      ctx.fillStyle = colors[(row * 3 + col * 2) % colors.length];
      ctx.fillRect(x + 1, y + 1, plankW - 2, plankH - 2);
      // grain
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 0.5;
      for (let g = 4; g < plankW - 4; g += 8) {
        ctx.beginPath(); ctx.moveTo(x+g, y+2); ctx.lineTo(x+g+2, y+plankH-3); ctx.stroke();
      }
      // border
      ctx.strokeStyle = 'rgba(80,50,20,0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x+.5, y+.5, plankW-1, plankH-1);
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Materials ────────────────────────────────────────────────────────────────
const MAT_BODY   = () => new THREE.MeshStandardMaterial({ color: 0xf0ece3, roughness: 0.85 });
const MAT_SHELF  = () => new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.85 });
const MAT_BACK   = () => new THREE.MeshStandardMaterial({ color: 0xddd8cc, roughness: 0.9  });
const MAT_DRAWER = () => new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: 0.8  });
const MAT_ROD    = () => new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
const MAT_EDGE   = () => new THREE.LineBasicMaterial({ color: 0x8a7e70 });

// ─── Scene ────────────────────────────────────────────────────────────────────
function buildScene() {
  const { scene, camera, controls, sun } = threeCtx;

  // Clear previous
  const rem = [];
  scene.traverse(o => { if (o.userData.cab || o.userData.room) rem.push(o); });
  rem.forEach(o => scene.remove(o));

  // Expand slots
  const slots = [];
  for (const b of project.bases)
    for (let i = 0; i < (b.qty || 1); i++) slots.push(b);

  const T = 18, GAP = 2;
  let offsetX = 0;

  for (const b of slots) {
    const ct  = cfg.cabinetTypes[b.typeKey];
    const isW = ct.group === 'wall';
    const grp = buildCabinet(b, ct, b.w, b.h, b.d, T, b.filling || {}, isW);
    grp.userData.cab = true;
    grp.position.set(offsetX + b.w / 2, isW ? 500 + b.h / 2 : b.h / 2, 0);
    scene.add(grp);
    offsetX += b.w + GAP;
  }

  const totalW = Math.max(offsetX - GAP, 1);
  const maxH   = Math.max(...slots.map(b => b.h), 2000);

  // Centre on X
  scene.traverse(o => { if (o.userData.cab) o.position.x -= totalW / 2; });

  // ── Floor with parquet ──────────────────────────────────────────────────────
  const pt = makeParquetTexture();
  const floorSize = Math.max(totalW + 3000, 6000);
  pt.repeat.set(floorSize / 500, floorSize / 500);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSize, floorSize),
    new THREE.MeshStandardMaterial({ map: pt, roughness: 0.6, metalness: 0.03 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1, 0);
  floor.receiveShadow = true;
  floor.userData.room = true;
  scene.add(floor);

  // ── Camera ─────────────────────────────────────────────────────────────────
  const dist = Math.max(totalW, maxH) * 1.4 + 900;
  camera.position.set(totalW * 0.3, maxH * 0.55, dist);
  const tgt = new THREE.Vector3(0, maxH * 0.4, 0);
  camera.lookAt(tgt);
  controls.target.copy(tgt);
  controls.update();

  // Shadow frustum
  const s = Math.max(totalW, maxH) + 800;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -s;
  sun.shadow.camera.right = sun.shadow.camera.top   =  s;
  sun.shadow.camera.far = dist * 2.5;
  sun.shadow.camera.updateProjectionMatrix();

  resizeThree();
}

// ─── Cabinet builder ──────────────────────────────────────────────────────────
function buildCabinet(b, ct, W, H, D, T, fill, isWall) {
  const g = new THREE.Group();

  const addBox = (w, h, d, x, y, z, matFn, cast = true) => {
    const geo  = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, matFn());
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    g.add(mesh);
    const el = new THREE.LineSegments(new THREE.EdgesGeometry(geo), MAT_EDGE());
    el.position.copy(mesh.position);
    g.add(el);
  };

  const iW = W - T * 2;
  const iD = D - T;

  // Panels
  addBox(T, H, D, -(W/2 - T/2), 0, 0, MAT_BODY);   // left
  addBox(T, H, D,  (W/2 - T/2), 0, 0, MAT_BODY);   // right
  addBox(iW, T, D, 0,  H/2 - T/2, 0, MAT_BODY);    // top
  if (ct.hasBottom) addBox(iW, T, D, 0, -H/2 + T/2, 0, MAT_BODY); // bottom
  addBox(W, H, T * 0.5, 0, 0, -(D/2 - T*0.25), MAT_BACK, false);  // back

  // Legs
  if (!isWall) {
    const legH = Math.min(10, H * 0.04), legW = Math.max(4, W * 0.06);
    [[-(W/2 - legW), legH/2 - H/2],[(W/2 - legW), legH/2 - H/2]].forEach(([lx]) => {
      const lGeo = new THREE.BoxGeometry(legW, legH, legW);
      const lMesh = new THREE.Mesh(lGeo, new THREE.MeshStandardMaterial({ color: 0xbbbbbb }));
      lMesh.position.set(lx, -H/2 - legH/2, 0);
      g.add(lMesh);
    });
  }

  // Shelves
  const sc = fill.shelf || 0;
  if (sc > 0) {
    const sp = (H - T*2) / (sc + 1);
    for (let s = 1; s <= Math.min(sc, 12); s++)
      addBox(iW-2, T*0.7, iD-4, 0, -H/2 + T + s*sp, T*0.2, MAT_SHELF);
  }

  // Rods
  const rc = fill.rod || 0;
  if (rc > 0) {
    const positions = rc === 1 ? [H*0.35] : [H*0.25, H*0.62];
    positions.slice(0, rc).forEach(rY => {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 5, iW-20, 12),
        MAT_ROD()
      );
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, -H/2 + rY, -D/2 + D*0.38);
      rod.castShadow = true;
      g.add(rod);
    });
  }

  // Drawers
  const dc = fill.drawer || 0;
  if (dc > 0) {
    const cnt = Math.min(dc, 6), dH = Math.min(H*0.12, 160);
    const sy = -H/2 + T + 5;
    for (let d = 0; d < cnt; d++) {
      addBox(iW-8, dH-4, iD*0.75, 0, sy + d*(dH+3) + dH/2, iD*0.125, MAT_DRAWER);
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4, iW*0.35, 8),
        MAT_ROD()
      );
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0, sy + d*(dH+3) + dH/2, D/2 - T + 5);
      g.add(handle);
    }
  }

  // Double door line
  if (ct.doors === 2) {
    const pts = [
      new THREE.Vector3(0, -H/2, D/2),
      new THREE.Vector3(0,  H/2, D/2),
    ];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xcccccc })
    );
    g.add(line);
  }

  // Facade colour overlay
  if (b.facadeKey) {
    const fc = getFacadeColor(b.facadeKey);
    const fm = new THREE.MeshStandardMaterial({ color: fc, roughness: 0.4, transparent: true, opacity: 0.85 });
    const doors = ct.doors || 1;
    const dW = (iW / doors) - 4;
    for (let i = 0; i < doors; i++) {
      const dx = -iW/2 + (iW/doors)*i + dW/2 + 2;
      const fd = new THREE.Mesh(new THREE.BoxGeometry(dW, H - T*2 - 4, T*0.5), fm);
      fd.position.set(dx, 0, D/2 - T*0.25 + 2);
      fd.castShadow = true;
      g.add(fd);
    }
  }

  // Wall bracket
  if (isWall) {
    const hm = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.6, roughness: 0.3 });
    [-.28, .28].forEach(xf => {
      const br = new THREE.Mesh(new THREE.BoxGeometry(W*0.12, 28, 14), hm);
      br.position.set(W * xf, H/2 + 14, -D/2 + 18);
      g.add(br);
    });
  }

  return g;
}

function getFacadeColor(key) {
  const m = {
    ldsp_solid: 0xf0ece3, ldsp_textured: 0xd4c9b0,
    mdf_enamel_matt: 0xe8e8e8, mdf_enamel_gloss: 0xf5f5f5,
    mdf_enamel_mf1: 0xddd8d0, mdf_enamel_mf2: 0xccc8c0,
    mdf_shpon: 0xb89060, massiv_shpon: 0xa07840,
    frame: 0xe0d8c8, mirror: 0xc0d0d8,
  };
  return m[key] || 0xf0ece3;
}

// ══════════════════════════════════════════════════════════════════════════════
// 2D SVG
// ══════════════════════════════════════════════════════════════════════════════
function render2D() {
  show2D();
  document.getElementById('viz-area').innerHTML = buildVizSVG();
}

function buildVizSVG() {
  const PAD_L = 48, PAD_R = 24, PAD_T = 28, PAD_B = 48;
  const MAX_W = 720, MAX_H = 320;

  const slots = [];
  for (const b of project.bases) {
    const qty = b.qty || 1;
    for (let i = 0; i < qty; i++) slots.push({ b, isFirst: i === 0, qty });
  }

  const totalW_mm = slots.reduce((s, { b }) => s + b.w, 0);
  const maxH_mm   = Math.max(...slots.map(({ b }) => b.h));
  const scale     = Math.min(MAX_W / totalW_mm, MAX_H / maxH_mm, 0.38);
  const drawW     = totalW_mm * scale, drawH = maxH_mm * scale;
  const SVG_W     = PAD_L + drawW + PAD_R, SVG_H = PAD_T + drawH + PAD_B;
  const floorY    = PAD_T + drawH;

  let defs = `<defs>
    <marker id="arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><polygon points="0,0 5,2.5 0,5" fill="#aaa"/></marker>
    <marker id="arrb" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse"><polygon points="0,0 5,2.5 0,5" fill="#aaa"/></marker>
  </defs>`;

  let bodies = '', details = '', labels = '', curX = PAD_L;

  for (const { b, isFirst, qty } of slots) {
    const ct = cfg.cabinetTypes[b.typeKey];
    const bW = b.w * scale, bH = b.h * scale, bY = floorY - bH;
    const isWall = ct.group === 'wall', fill = b.filling || {}, PI = 2;

    bodies += `<rect x="${r(curX)}" y="${r(bY)}" width="${r(bW)}" height="${r(bH)}" fill="${isWall?'#eef1f8':'#f5f3ef'}" stroke="#2E2E2E" stroke-width="1.5"/>`;

    if (!isWall) {
      const lh = Math.min(7, bH*.04), lw = Math.max(3, bW*.06);
      bodies += `<rect x="${r(curX+4)}" y="${r(floorY)}" width="${r(lw)}" height="${r(lh)}" fill="#bbb"/>`;
      bodies += `<rect x="${r(curX+bW-4-lw)}" y="${r(floorY)}" width="${r(lw)}" height="${r(lh)}" fill="#bbb"/>`;
    } else {
      const hh = Math.min(5, bH*.025);
      details += `<rect x="${r(curX+bW*.2)}" y="${r(bY-hh)}" width="${r(bW*.12)}" height="${r(hh)}" fill="#aaa"/>`;
      details += `<rect x="${r(curX+bW*.68)}" y="${r(bY-hh)}" width="${r(bW*.12)}" height="${r(hh)}" fill="#aaa"/>`;
    }

    const sc = fill.shelf || 0;
    if (sc > 0) {
      const sp = (bH-PI*2)/(sc+1);
      for (let s = 1; s <= Math.min(sc,12); s++) {
        const sy = r(bY+PI+s*sp);
        details += `<line x1="${r(curX+PI)}" y1="${sy}" x2="${r(curX+bW-PI)}" y2="${sy}" stroke="#CEB26F" stroke-width="1.8"/>`;
      }
    }
    const rc = fill.rod || 0;
    if (rc > 0) {
      [rc===1?0.35:0.25, rc>=2?0.65:null].filter(Boolean).forEach(pos => {
        const ry = r(bY+bH*pos);
        details += `<line x1="${r(curX+6)}" y1="${ry}" x2="${r(curX+bW-6)}" y2="${ry}" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>`;
        details += `<circle cx="${r(curX+6)}" cy="${ry}" r="2.5" fill="#888"/>`;
        details += `<circle cx="${r(curX+bW-6)}" cy="${ry}" r="2.5" fill="#888"/>`;
      });
    }
    const dc = fill.drawer || 0;
    if (dc > 0) {
      const cnt = Math.min(dc,6), dh = Math.min(bH*.13,18), sy0 = bY+bH-cnt*dh-4;
      for (let d = 0; d < cnt; d++) {
        details += `<rect x="${r(curX+3)}" y="${r(sy0+d*dh)}" width="${r(bW-6)}" height="${r(dh-1)}" fill="#e8e4da" stroke="#aaa" stroke-width="0.8" rx="1"/>`;
        details += `<line x1="${r(curX+bW/2-7)}" y1="${r(sy0+d*dh+dh/2)}" x2="${r(curX+bW/2+7)}" y2="${r(sy0+d*dh+dh/2)}" stroke="#999" stroke-width="1.5" stroke-linecap="round"/>`;
      }
    }
    if (ct.doors===2) details += `<line x1="${r(curX+bW/2)}" y1="${r(bY)}" x2="${r(curX+bW/2)}" y2="${r(floorY)}" stroke="#ccc" stroke-width="1" stroke-dasharray="4,3"/>`;
    if (b.facadeKey) details += `<rect x="${r(curX+1)}" y="${r(bY+1)}" width="${r(bW-2)}" height="${r(bH-2)}" fill="rgba(206,178,111,0.07)"/>`;

    if (isFirst) {
      const gW = b.w*qty*scale;
      labels += dimLine(curX, curX+gW, floorY+14, qty>1?`${b.w} × ${qty} шт`:`${b.w}`, '#666', 9.5);
    }
    curX += bW;
  }

  bodies += `<line x1="${r(PAD_L-4)}" y1="${r(floorY)}" x2="${r(PAD_L+drawW+4)}" y2="${r(floorY)}" stroke="#2E2E2E" stroke-width="2"/>`;
  labels += dimLine(PAD_L, PAD_L+drawW, floorY+30, `Общая ширина: ${totalW_mm} мм`, '#999', 9);

  const tall = slots.reduce((a,s) => s.b.h>a.b.h?s:a, slots[0]);
  const tY   = floorY - tall.b.h * scale;
  labels += `<line x1="${r(PAD_L-10)}" y1="${r(tY)}" x2="${r(PAD_L-10)}" y2="${r(floorY)}" stroke="#aaa" stroke-width="1" marker-start="url(#arrb)" marker-end="url(#arr)"/>`;
  labels += `<text x="${r(PAD_L-28)}" y="${r((tY+floorY)/2)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90,${r(PAD_L-28)},${r((tY+floorY)/2)})" font-size="9" fill="#999" font-family="Montserrat,Arial">${tall.b.h} мм</text>`;

  return `<svg viewBox="0 0 ${r(SVG_W)} ${r(SVG_H+10)}" width="100%" style="display:block;max-width:${r(SVG_W)}px;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bodies}${details}${labels}
  </svg>`;
}

function r(n) { return Math.round(n * 10) / 10; }
function dimLine(x1, x2, y, text, color, fs) {
  return `<line x1="${r(x1)}" y1="${r(y)}" x2="${r(x2)}" y2="${r(y)}" stroke="${color}" stroke-width="0.8" marker-start="url(#arrb)" marker-end="url(#arr)"/>
  <text x="${r((x1+x2)/2)}" y="${r(y-3)}" text-anchor="middle" font-size="${fs}" fill="${color}" font-family="Montserrat,Arial">${text}</text>`;
}

// Initial render
renderVisualization();
