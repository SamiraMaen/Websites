// Interactive 3D compact cassette for the hero.
// Tape winds from the left spool to the right as the visitor scrolls the page.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const C = { paper: '#DAD2D0', brick: '#FC8E00', ink: '#121110', tape: '#FBC201', green: '#647568' };

function labelTexture(side) {
  const W = 1024, H = 484;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const draw = () => {
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    // paper speckle
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(90,70,40,${Math.random() * 0.08})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    // top band
    g.fillStyle = side === 'A' ? C.brick : C.green; g.fillRect(0, 0, W, 110);
    g.fillStyle = C.tape; g.fillRect(0, 110, W, 26);
    g.fillStyle = C.paper; g.font = '900 72px "Autumn Vibes", Saudi, Alexandria, sans-serif'; g.textBaseline = 'middle';
    g.textAlign = 'left'; g.fillText('SHAABI MUSIC', 40, 58);
    g.textAlign = 'right'; g.font = '900 64px "Autumn Vibes", Saudi, Alexandria, sans-serif'; g.fillText('شعبي', W - 40, 60);
    // side letter
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = '900 110px "Autumn Vibes", Saudi, Alexandria, sans-serif'; g.fillText(side, 34, 250);
    g.font = '700 26px Alexandria, sans-serif'; g.fillText('C-60', 40, 330);
    g.textAlign = 'right'; g.fillText(side === 'A' ? '1974 →' : '→ TODAY', W - 40, 330);
    // window (cut out so the 3D reels show through), tinted like smoked plastic
    const wx = 260, wy = 170, ww = 504, wh = 190, r = 95;
    g.save(); g.beginPath(); g.roundRect(wx, wy, ww, wh, r); g.globalCompositeOperation = 'destination-out'; g.fill(); g.restore();
    g.fillStyle = 'rgba(30,26,22,0.28)'; g.beginPath(); g.roundRect(wx, wy, ww, wh, r); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 6; g.beginPath(); g.roundRect(wx, wy, ww, wh, r); g.stroke();
    // bottom writing lines + Arabic subtitle
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '800 40px "Autumn Vibes", Saudi, Alexandria, sans-serif';
    g.fillText(side === 'A' ? 'من الكاسيت للمهرجان' : 'حكاية مجتمع بيغني وبيتغير', W / 2, 420);
    g.strokeStyle = 'rgba(18,17,16,.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(60, 452); g.lineTo(W - 60, 452); g.stroke();
    tex.needsUpdate = true;
  };
  draw();
  Promise.all([
    document.fonts.load('900 72px Alexandria'),
    document.fonts.load('800 40px Saudi', 'من'),
    document.fonts.load('700 72px "Autumn Vibes"', 'SHAABI')
  ]).then(draw).catch(() => {});
  return tex;
}

function reelMesh() {
  const grp = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.24, 32), new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.5 }));
  grp.add(hub);
  const toothMat = new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.02), toothMat);
    const a = (i / 6) * Math.PI * 2;
    t.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0); t.rotation.z = a + Math.PI / 2;
    grp.add(t);
  }
  return grp;
}

export function initCassette(canvas, opts = {}) {
  const getProgress = opts.getProgress || (() => 0);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  scene.add(new THREE.HemisphereLight('#fff4dc', '#5a4632', 1.1));
  const key = new THREE.DirectionalLight('#ffe9c2', 2.2); key.position.set(4, 5, 7); scene.add(key);
  const rim = new THREE.DirectionalLight('#d4aa42', 1.2); rim.position.set(-6, -2, -4); scene.add(rim);

  const cassette = new THREE.Group();
  scene.add(cassette);

  const shellMat = new THREE.MeshStandardMaterial({ color: '#1a1816', roughness: 0.42, metalness: 0.08 });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(4.2, 2.7, 0.46, 5, 0.12), shellMat);
  cassette.add(shell);

  const Z = 0.232;
  const labelGeo = new THREE.PlaneGeometry(3.7, 1.75);
  const front = new THREE.Mesh(labelGeo, new THREE.MeshStandardMaterial({ map: labelTexture('A'), transparent: true, roughness: 0.85 }));
  front.position.set(0, 0.28, Z + 0.006); cassette.add(front);
  const back = new THREE.Mesh(labelGeo, new THREE.MeshStandardMaterial({ map: labelTexture('B'), transparent: true, roughness: 0.85 }));
  back.position.set(0, 0.28, -Z - 0.006); back.rotation.y = Math.PI; cassette.add(back);

  // spools of brown tape + white hubs, front and back
  const tapeMat = new THREE.MeshStandardMaterial({ color: '#FC8E00', roughness: 0.35, metalness: 0.2 });
  const spoolGeo = new THREE.CircleGeometry(1, 48);
  const reels = [];
  const spools = [];
  [-0.88, 0.88].forEach((x) => {
    [1, -1].forEach((dir) => {
      const sp = new THREE.Mesh(spoolGeo, tapeMat);
      sp.position.set(x, 0.17, dir * (Z + 0.001)); if (dir < 0) sp.rotation.y = Math.PI;
      cassette.add(sp); spools.push({ mesh: sp, left: x < 0 });
      const r = reelMesh(); r.position.set(x, 0.17, dir * (Z + 0.003)); if (dir < 0) r.rotation.y = Math.PI;
      cassette.add(r); reels.push(r);
    });
  });

  // bottom trapezoid with capstan holes
  const shape = new THREE.Shape();
  shape.moveTo(-1.45, -1.35); shape.lineTo(1.45, -1.35); shape.lineTo(1.2, -0.72); shape.lineTo(-1.2, -0.72); shape.closePath();
  const trap = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.5 }));
  trap.position.z = Z - 0.02; cassette.add(trap);
  const holeMat = new THREE.MeshBasicMaterial({ color: '#0d0c0b' });
  [-0.7, 0.7, -0.25, 0.25].forEach((x, i) => {
    const h = new THREE.Mesh(new THREE.CircleGeometry(i < 2 ? 0.09 : 0.05, 20), holeMat);
    h.position.set(x, -1.05, Z + 0.045); cassette.add(h);
  });
  // screws
  const screwMat = new THREE.MeshStandardMaterial({ color: '#b9b3a8', metalness: 0.9, roughness: 0.3 });
  const screwGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16); screwGeo.rotateX(Math.PI / 2);
  [[-1.92, 1.17], [1.92, 1.17], [-1.92, -1.17], [1.92, -1.17], [0, -0.85]].forEach(([x, y]) => {
    const s = new THREE.Mesh(screwGeo, screwMat); s.position.set(x, y, Z + (y === -0.85 ? 0.05 : 0.005)); cassette.add(s);
  });

  cassette.rotation.set(-0.18, 0.5, 0.12);

  // ---- interaction
  let targetX = -0.18, targetY = 0.5, spinVel = 0, dragging = false, lastX = 0, hover = false, extraY = 0;
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (dragging) { const dx = e.clientX - lastX; spinVel = dx * 0.012; extraY += dx * 0.012; lastX = e.clientX; }
    else { targetY = 0.5 + nx * 0.5; targetX = -0.18 + ny * 0.35; }
  };
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('pointerenter', () => { hover = true; });
  canvas.addEventListener('pointerleave', () => { hover = false; });
  window.addEventListener('pointermove', onMove, { passive: true });

  // ---- sizing
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1.1 ? 13.5 : 12;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---- loop (only while visible)
  let visible = true, raf = 0, last = performance.now(), reelSpeed = 1.4;
  const clock = { t: 0 };
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock.t += dt;
    const p = Math.max(0, Math.min(1, getProgress()));
    spools.forEach(({ mesh, left }) => { const r = left ? 0.6 - 0.3 * p : 0.3 + 0.3 * p; mesh.scale.set(r, r, 1); });
    const wantSpeed = hover || dragging ? 6 : 1.4;
    reelSpeed += (wantSpeed - reelSpeed) * 0.05;
    reels.forEach((r, i) => { r.rotation.z -= reelSpeed * dt * (i % 2 ? -1 : 1); });

    if (!dragging) { spinVel *= 0.94; extraY += spinVel; extraY *= 0.985; }
    cassette.rotation.y += (targetY + extraY - cassette.rotation.y) * 0.08;
    cassette.rotation.x += (targetX - cassette.rotation.x) * 0.08;
    if (!reduce) { cassette.position.y = Math.sin(clock.t * 1.2) * 0.12; cassette.rotation.z = 0.12 + Math.sin(clock.t * 0.8) * 0.04; }

    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(frame) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(canvas);
  raf = requestAnimationFrame(frame);
}
