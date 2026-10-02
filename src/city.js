'use strict';
/* Squad map (Three.js, embedded). Two views share the same agents and HTML markers:
   - city:   hexagonal 3D city, agents on hex plazas (perspective camera);
   - office: isometric 3D office, agents at desks inside rooms (orthographic camera).
   Without WebGL the same camera math drives a 2D projection, so markers stay usable. */
const MapNetwork = (() => {
  const viewport = document.getElementById('mapViewport');
  const canvas = document.getElementById('cityCanvas');
  const SQ3 = Math.sqrt(3), GRID = 10, TILE_H = .14, PLAZA_H = .34, FOV = 32;
  const C = { bg: 0x070a0b, tile: 0x182226, rim: 0x2b3d46, build: 0x34444b, cyan: 0x30c5e8, purple: 0xad85dd, plaza: 0x0e2229, green: 0x7fcf9d, amber: 0xe0a84a };

  /* ---------- hex math (axial, pointy-top) ---------- */
  const hexToWorld = (q, r) => ({ x: SQ3 * (q + r / 2), z: 1.5 * r });
  const hexDistance = (q1, r1, q2 = 0, r2 = 0) => (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
  const inGrid = h => h && Number.isInteger(h.q) && Number.isInteger(h.r) && hexDistance(h.q, h.r) <= GRID;
  const hexKey = h => h.q + ',' + h.r;
  function worldToHex(x, z) {
    const qf = (SQ3 / 3 * x - z / 3), rf = 2 / 3 * z, sf = -qf - rf;
    let q = Math.round(qf), r = Math.round(rf), s = Math.round(sf);
    const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    return { q: q + 0, r: r + 0 };
  }
  const HEXES = [];
  for (let q = -GRID; q <= GRID; q++) for (let r = -GRID; r <= GRID; r++) if (hexDistance(q, r) <= GRID) HEXES.push({ q, r });
  function rng(seed) { return () => { seed = (Math.imul(1664525, seed) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }; }

  /* ---------- office layout: 9 rooms, 40 desks (single source of truth, also used by the app) ---------- */
  const OFFICE = { x0: -17, x1: 18, z0: -11, z1: 11, corridor: [-1.5, 1.5] };
  const ROOMS = [
    { code: 'CMD', name: 'Sala de Comando', x: -17, z: -11, w: 7, d: 9.5, cols: 2, rows: 1, glass: true },
    { code: 'A', name: 'Open Space A', x: -10, z: -11, w: 13, d: 9.5, cols: 3, rows: 2, pad: 2 },
    { code: 'R', name: 'Sala de Reunião', x: 3, z: -11, w: 7.5, d: 9.5, round: 6, glass: true },
    { code: 'FOC', name: 'Foco', x: 10.5, z: -11, w: 7.5, d: 9.5, cols: 2, rows: 2, glass: true },
    { code: 'B', name: 'Open Space B', x: -17, z: 1.5, w: 12, d: 9.5, cols: 3, rows: 2, pad: 2 },
    { code: 'LAB', name: 'Lab', x: -5, z: 1.5, w: 6, d: 9.5, cols: 2, rows: 2 },
    { code: 'STU', name: 'Estúdio', x: 1, z: 1.5, w: 6, d: 9.5, cols: 2, rows: 2 },
    { code: 'OPS', name: 'Operações', x: 7, z: 1.5, w: 5.5, d: 9.5, cols: 2, rows: 2 },
    { code: 'COW', name: 'Coworking', x: 12.5, z: 1.5, w: 5.5, d: 9.5, cols: 2, rows: 2 }
  ];
  const SLOTS = [];
  ROOMS.forEach((room, ri) => {
    room.index = ri;
    if (room.round) {
      const cx = room.x + room.w / 2, cz = room.z + room.d / 2 + .4;
      for (let k = 0; k < room.round; k++) { const a = k / room.round * Math.PI * 2; SLOTS.push({ id: `${room.code}-${k + 1}`, room: room.code, x: cx + Math.cos(a) * 2.1, z: cz + Math.sin(a) * 2.1, rot: -a - Math.PI / 2, seat: true }); }
      room.table = { x: cx, z: cz };
      return;
    }
    const mx = .9, top = 1.6, cw = (room.w - mx * 2) / room.cols, ch = (room.d - top - .6) / room.rows;
    let n = 0;
    for (let r = 0; r < room.rows; r++) for (let c = 0; c < room.cols; c++) {
      n++; const id = room.code + '-' + (room.pad ? String(n).padStart(room.pad, '0') : n);
      // Rows face each other in pairs, like desk islands in the reference layout.
      const facing = r % 2 === 0 ? 1 : -1, x = room.x + mx + cw * (c + .5), z = room.z + top + ch * (r + .5) + (facing > 0 ? .18 : -.18);
      SLOTS.push({ id, room: room.code, x, z, rot: facing > 0 ? 0 : Math.PI, facing });
    }
  });
  const SLOT_BY_ID = new Map(SLOTS.map(s => [s.id, s]));
  const ROOM_BY_CODE = new Map(ROOMS.map(r => [r.code, r]));
  // Where the agent "sits": the chair in front of the desk (marker is projected above it).
  const seatOf = slot => slot.seat ? { x: slot.x, z: slot.z } : { x: slot.x, z: slot.z + (slot.facing > 0 ? -.62 : .62) };

  /* ---------- state ---------- */
  let width = 1600, height = 900, scene = [], links = [], selected = '', motion = true, linkMode = false, paused = false, mode = 'city';
  let occupied = new Map(), occupiedDesks = new Map(), running = { id: '', paused: false };
  let moving = null, moveHint = null, moveTip = null, occupiedNames = new Map(); // move mode (startMove)
  const life = { acts: [], actors: new Map(), nextAt: 0, last: 0, layer: null, els: new Map() }; // office life (lifeTick)
  let onPosition = () => {}, onCreateAt = () => {}, onEmptyClick = () => {};
  const cam = { tx: 0, tz: 0, distance: 18, base: 18, theta: .62, phi: .96, offsetX: 0 };
  const ocam = { tx: .5, tz: 0, zoom: 1, base: 1, theta: Math.PI / 4, elev: .6155, offsetX: 0, offsetY: 0, viewH: 26 };
  let needsRender = true, lastFrame = 0, gl = null;
  const tweens = [];
  const now = () => performance.now();
  const reducedMotion = () => !motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const invalidate = () => { needsRender = true; };
  function tween(duration, step, done) { const tw = { t0: now(), duration, step, done }; tweens.push(tw); invalidate(); return tw; }
  function cancelTween(tw) { const i = tweens.indexOf(tw); if (i >= 0) tweens.splice(i, 1); }
  // Transmorph camera pose: the camera orbits its target around its own right axis (the world seems to flip like a card).
  const pose = { flip: 0 };
  /* City shape (settings): 'flat' or 'planet'. The planet is the same flat city bent in the vertex shader (bendMaterial):
     b blends flat (0) -> sphere (1) of radius R/b centred at (0,-R/b,0), north pole fixed at the origin (azimuthal equidistant).
     Offsets up to Y0 keep their size (no z-fighting); what stands above them is scaled by H. LOOK drops the camera target toward
     the planet centre so the whole sphere is framed. */
  const PLANET_R = 8, PLANET_H = .65, PLANET_Y0 = PLAZA_H + .05, PLANET_LOOK = .55, PLANET_RHO = 18.6, CURL_MS = 1400;
  const planet = { b: 0, want: 'flat', run: null };
  let curling = false;
  function planetMap(x, y, z, b = planet.b) {
    if (b < 5e-4) return { x, y, z };
    const Rb = PLANET_R / b, rho = Math.max(Math.hypot(x, z), 1e-6), th = rho / Rb, s2 = Math.sin(th / 2);
    const h = Math.min(y, PLANET_Y0) + Math.max(y - PLANET_Y0, 0) * (1 + (PLANET_H - 1) * b), k = Math.sin(th) * (Rb + h) / rho;
    return { x: x * k, y: h * Math.cos(th) - 2 * Rb * s2 * s2, z: z * k };
  }
  // Flat (x, z) under a point on the finished planet (b = 1).
  function planetUnmap(px, py, pz) { const hz = Math.hypot(px, pz); if (hz < 1e-9) return { x: 0, z: 0 }; const rho = Math.atan2(hz, py + PLANET_R) * PLANET_R; return { x: px / hz * rho, z: pz / hz * rho }; }
  const labels = document.createElement('div'); labels.id = 'officeLabels'; labels.hidden = true; viewport.append(labels);
  labels.innerHTML = ROOMS.map((r, i) => `<span class="office-label" data-room="${r.code}" style="--i:${i}">${String(i + 1).padStart(2, '0')} / ${r.name.toUpperCase()}</span>`).join('');

  /* ---------- WebGL scenes ---------- */
  try {
    if (!window.THREE) throw Error('three missing');
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw Error('webgl unavailable');
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(C.bg, 1); renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
    const s = new T.Scene(); s.fog = new T.Fog(C.bg, 14, 46);
    const camera = new T.PerspectiveCamera(FOV, 16 / 9, .1, 400);
    const hemi = new T.HemisphereLight(0xa9cddd, 0x0a1114, 1.5); s.add(hemi);
    const SUN_POS = new T.Vector3(-8, 14, 6), RIM_POS = new T.Vector3(9, 5, -7), UP = new T.Vector3(0, 1, 0);
    const sun = new T.DirectionalLight(0xdcecf3, 2.4); sun.position.copy(SUN_POS); s.add(sun);
    const rimLight = new T.DirectionalLight(0x3a8fb0, .9); rimLight.position.copy(RIM_POS); s.add(rimLight);
    s.add(new T.AmbientLight(0x22343c, 1.1));
    const core = new T.PointLight(C.cyan, 3.2, 9, 1.6); core.position.set(0, 1.4, 0); s.add(core);

    /* Planet mode: every material of the city scene is patched once (bendTree, before each render) so the vertex shader maps the
       flat world onto the sphere (pl_map, mirrored by planetMap) and turns the normals with the surface (pl_bend). The patch is
       the identity at b = 0, so switching shapes never recompiles; objects tagged userData.noBend (planet scenery) are skipped. */
    const PLANET_U = { uPlanetR: { value: PLANET_R }, uPlanetB: { value: 0 }, uPlanetH: { value: PLANET_H }, uPlanetY0: { value: PLANET_Y0 } };
    const PLANET_GLSL = `
uniform float uPlanetR; uniform float uPlanetB; uniform float uPlanetH; uniform float uPlanetY0;
vec3 pl_map(vec3 pl_w) {
  if (uPlanetB < 0.0005) return pl_w;
  float pl_Rb = uPlanetR / uPlanetB, pl_rho = max(length(pl_w.xz), 1e-6), pl_th = pl_rho / pl_Rb, pl_s = sin(pl_th * 0.5);
  float pl_h = min(pl_w.y, uPlanetY0) + max(pl_w.y - uPlanetY0, 0.0) * mix(1.0, uPlanetH, uPlanetB);
  vec2 pl_d = pl_w.xz * (sin(pl_th) * (pl_Rb + pl_h) / pl_rho);
  return vec3(pl_d.x, pl_h * cos(pl_th) - 2.0 * pl_Rb * pl_s * pl_s, pl_d.y);
}
vec3 pl_bend(vec3 pl_v, vec3 pl_w) {
  if (uPlanetB < 0.0005) return pl_v;
  float pl_rho = max(length(pl_w.xz), 1e-6), pl_th = pl_rho * uPlanetB / uPlanetR, pl_c = cos(pl_th);
  vec3 pl_k = vec3(pl_w.z, 0.0, -pl_w.x) / pl_rho;
  return pl_v * pl_c + cross(pl_k, pl_v) * sin(pl_th) + pl_k * dot(pl_k, pl_v) * (1.0 - pl_c);
}
`;
    const PLANET_PROJECT = `
vec4 pl_wp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  pl_wp = instanceMatrix * pl_wp;
#endif
pl_wp = modelMatrix * pl_wp;
pl_wp.xyz = pl_map(pl_wp.xyz);
vec4 mvPosition = viewMatrix * pl_wp;
gl_Position = projectionMatrix * mvPosition;
`;
    const PLANET_NORMAL = `#include <defaultnormal_vertex>
{
  vec4 pl_np = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    pl_np = instanceMatrix * pl_np;
  #endif
  pl_np = modelMatrix * pl_np;
  mat3 pl_vr = mat3(viewMatrix);
  transformedNormal = pl_vr * pl_bend(transpose(pl_vr) * transformedNormal, pl_np.xyz);
}
`;
    function bendMaterial(m) {
      if (m.userData.planet) return; m.userData.planet = true;
      m.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, PLANET_U);
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + PLANET_GLSL).replace('#include <project_vertex>', PLANET_PROJECT).replace('#include <defaultnormal_vertex>', PLANET_NORMAL);
      };
      m.customProgramCacheKey = () => 'planet'; m.needsUpdate = true;
    }
    // Bounding volumes stay flat, so bent objects are never frustum-culled.
    function bendTree() {
      s.traverse(o => {
        if (!o.material) return; for (let p = o; p; p = p.parent) if (p.userData.noBend) return;
        o.frustumCulled = false; (Array.isArray(o.material) ? o.material : [o.material]).forEach(bendMaterial);
      });
    }

    const ground = new T.Mesh(new T.PlaneGeometry(260, 260), new T.MeshStandardMaterial({ color: 0x080c0e, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.01; s.add(ground);

    // Planet scenery (never bent): a core sphere that replaces the ground and curls into the planet body, a starfield around the
    // camera, a halo billboard for the cyan atmosphere and the decorative core at the south pole (rings, spire, beacon light).
    const planetFx = new T.Group(); planetFx.userData.noBend = true; planetFx.visible = false; s.add(planetFx);
    const coreMat = new T.MeshStandardMaterial({ color: 0x080c0e, roughness: 1, metalness: 0, emissive: 0x0b3440, emissiveIntensity: 0 });
    const planetCore = new T.Mesh(new T.SphereGeometry(1, 96, 64), coreMat); planetFx.add(planetCore);
    const starLayer = (count, radius, size, colorHex, seed) => {
      const pos = [], sr = rng(seed);
      for (let i = 0; i < count; i++) { const u = sr() * 2 - 1, a = sr() * Math.PI * 2, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * radius, u * radius, Math.sin(a) * r * radius); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      const pts = new T.Points(g, new T.PointsMaterial({ color: colorHex, size, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); planetFx.add(pts); return pts;
    };
    const stars = [starLayer(1300, 180, 1.4, 0xbfdde6, 4471), starLayer(160, 175, 2.6, 0xe8fbff, 9123)];
    const haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 256;
    { const g = haloCanvas.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128); [[0, 0], [.52, 0], [.66, .22], [.74, .55], [.775, .75], [.83, .32], [.92, .08], [1, 0]].forEach(([at, a]) => grd.addColorStop(at, `rgba(92,214,240,${a})`)); g.fillStyle = grd; g.fillRect(0, 0, 256, 256); }
    const HALO_PEAK = .775, haloMat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(haloCanvas), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    const halo = new T.Mesh(new T.PlaneGeometry(1, 1), haloMat); halo.renderOrder = 10; planetFx.add(halo);
    const beacon = new T.Group(); planetFx.add(beacon);
    const glowMat = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    // Rings hug the sphere around the south pole (their y follows the surface at their radius).
    const poleRing = (radius, tube, c, o) => { const m = new T.Mesh(new T.TorusGeometry(radius, tube, 8, 128), glowMat(c, o)); m.rotation.x = Math.PI / 2; m.position.y = PLANET_R - Math.sqrt(PLANET_R * PLANET_R - radius * radius) - .14; m.userData.o = o; beacon.add(m); return m; };
    const poleRings = [poleRing(1.5, .05, C.cyan, .95), poleRing(2.6, .03, 0x7fe3f6, .55), poleRing(3.6, .02, C.cyan, .3)];
    const spire = new T.Mesh(new T.CylinderGeometry(.035, .17, 2.8, 8), new T.MeshStandardMaterial({ color: 0x2b3d46, emissive: 0x0e3a47, emissiveIntensity: .9, roughness: .5, metalness: .6 })); spire.position.y = -1.3; beacon.add(spire);
    const orb = new T.Mesh(new T.SphereGeometry(.22, 16, 12), glowMat(0xbff6ff, 1)); orb.position.y = -2.8; orb.userData.o = 1; beacon.add(orb);
    const beaconLight = new T.PointLight(C.cyan, 0, 14, 1.4); beaconLight.position.y = -2.3; beacon.add(beaconLight);
    let beaconK = 0;
    function setPlanet(b) {
      PLANET_U.uPlanetB.value = b; const on = b >= 5e-4, Rb = on ? PLANET_R / b : PLANET_R;
      ground.visible = !on; planetFx.visible = on;
      if (on) {
        planetCore.position.set(0, -Rb, 0); planetCore.scale.setScalar(Rb - .02); coreMat.emissiveIntensity = .5 * b;
        stars[0].material.opacity = .75 * Math.min(1, b * 1.3); stars[1].material.opacity = Math.min(1, b * 1.3);
        haloMat.opacity = Math.max(0, (b - .55) / .45); halo.position.set(0, -Rb, 0); halo.scale.setScalar(2 * (Rb + 2.4) / HALO_PEAK); // glow beyond the tallest buildings, which stand out against it
        beaconK = Math.max(0, (b - .9) / .1); beacon.visible = beaconK > 0; beacon.position.set(0, -2 * Rb, 0);
        for (const m of [...poleRings, orb]) m.material.opacity = m.userData.o * beaconK;
      }
      invalidate();
    }

    // Tiles (one instance per hex) and their rims.
    const random = rng(26172), dummy = new T.Object3D(), color = new T.Color();
    const tiles = new T.InstancedMesh(new T.CylinderGeometry(.9, .93, TILE_H, 6), new T.MeshStandardMaterial({ color: C.tile, roughness: .95, metalness: .05 }), HEXES.length);
    HEXES.forEach((h, i) => {
      const w = hexToWorld(h.q, h.r); dummy.position.set(w.x, TILE_H / 2, w.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      tiles.setMatrixAt(i, dummy.matrix); const t = .82 + random() * .3; tiles.setColorAt(i, color.setHex(C.tile).multiplyScalar(t));
    });
    s.add(tiles);
    // seg > 1 subdivides each side, so big rings (radar sweep, pulses) follow the planet instead of cutting through it.
    const hexRing = (radius, y, seg = 1) => { const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3, a2 = a + Math.PI / 3; for (let j = 0; j < seg; j++) { const u = j / seg; pts.push(new T.Vector3((Math.cos(a) * (1 - u) + Math.cos(a2) * u) * radius, y, (Math.sin(a) * (1 - u) + Math.sin(a2) * u) * radius)); } } return pts; };
    const rimPositions = [];
    HEXES.forEach(h => { const w = hexToWorld(h.q, h.r), ring = hexRing(.9, TILE_H + .003); for (let k = 0; k < 6; k++) { const a = ring[k], b = ring[(k + 1) % 6]; rimPositions.push(a.x + w.x, a.y, a.z + w.z, b.x + w.x, b.y, b.z + w.z); } });
    const rimGeo = new T.BufferGeometry(); rimGeo.setAttribute('position', new T.Float32BufferAttribute(rimPositions, 3));
    s.add(new T.LineSegments(rimGeo, new T.LineBasicMaterial({ color: C.rim, transparent: true, opacity: .9 })));

    // Buildings: boxes + hex prisms, lower near the squad and taller towards the edge.
    const winCanvas = document.createElement('canvas'); winCanvas.width = 32; winCanvas.height = 128;
    const wc = winCanvas.getContext('2d'); wc.fillStyle = '#000'; wc.fillRect(0, 0, 32, 128);
    for (let y = 4; y < 124; y += 6) for (let x = 3; x < 30; x += 5) if (random() < .32) { wc.fillStyle = `rgba(180,205,214,${.25 + random() * .6})`; wc.fillRect(x, y, 2, 2); }
    const winTex = new T.CanvasTexture(winCanvas);
    const buildMat = new T.MeshStandardMaterial({ color: C.build, roughness: .72, metalness: .18, emissive: 0xa9c4ce, emissiveIntensity: .55, emissiveMap: winTex });
    const specs = [];
    HEXES.forEach(h => {
      const d = hexDistance(h.q, h.r); if (d <= 1) return;
      const f = Math.min(1, Math.max(0, (d - 1.5) / 8.5)), w = hexToWorld(h.q, h.r);
      const n = d < 3 ? 1 + (random() < .4 ? 1 : 0) : 1 + Math.floor(random() * 4), start = random() * Math.PI * 2;
      for (let k = 0; k < n; k++) {
        let hgt = .1 + (.22 + 2.7 * Math.pow(f, 1.4)) * (.35 + random() * .9); if (d >= 5 && random() < .07) hgt *= 1.8;
        const size = n === 1 ? .5 + random() * .22 : .26 + random() * .2, a = start + k * (Math.PI * 2 / n), off = n === 1 ? 0 : .4;
        specs.push({ key: hexKey(h), prism: random() < .35, x: w.x + Math.cos(a) * off, z: w.z + Math.sin(a) * off, h: hgt, w: size, d: size * (.8 + random() * .4), rot: Math.floor(random() * 6) * Math.PI / 3, tone: .75 + random() * .45 });
      }
    });
    const boxes = specs.filter(b => !b.prism), prisms = specs.filter(b => b.prism);
    const boxMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), buildMat, boxes.length);
    const prismMesh = new T.InstancedMesh(new T.CylinderGeometry(.5, .5, 1, 6), buildMat, prisms.length);
    const byHex = new Map();
    [[boxMesh, boxes], [prismMesh, prisms]].forEach(([mesh, list]) => list.forEach((b, i) => {
      b.mesh = mesh; b.index = i; mesh.setColorAt(i, color.setHex(C.build).multiplyScalar(b.tone));
      // `rise` is the transmorph wave (0..1), independent from `k` (hex free or occupied); `wave` orders it from the centre out.
      if (!byHex.has(b.key)) { const [q, r] = b.key.split(',').map(Number); byHex.set(b.key, { k: 1, rise: 1, wave: hexDistance(q, r) / GRID * .88 + random() * .12, items: [] }); }
      b.group = byHex.get(b.key); b.group.items.push(b);
    }));
    function writeBuilding(b, k) {
      const hh = Math.max(.0001, b.h * k * b.group.rise); dummy.position.set(b.x, TILE_H + hh / 2, b.z); dummy.rotation.set(0, b.rot, 0); dummy.scale.set(b.w, hh, b.d); dummy.updateMatrix(); b.mesh.setMatrixAt(b.index, dummy.matrix);
    }
    specs.forEach(b => writeBuilding(b, 1)); s.add(boxMesh, prismMesh);
    function setHexBuildings(key, target, animate) {
      const group = byHex.get(key); if (!group || group.target === target) return; group.target = target;
      const from = group.k, apply = k => { group.k = k; group.items.forEach(b => writeBuilding(b, k)); boxMesh.instanceMatrix.needsUpdate = prismMesh.instanceMatrix.needsUpdate = true; };
      if (!animate) { apply(target); return; }
      tween(650, p => apply(from + (target - from) * (1 - Math.pow(1 - p, 3))));
    }
    // Buildings resurging after the transmorph back to the city: a wave from the centre to the edge, each building with a small
    // overshoot, the windows lighting up (glow) and a ring running ahead of the wave.
    let riseRun = null, glow = 1;
    const writeAllBuildings = () => { for (const g of byHex.values()) g.items.forEach(b => writeBuilding(b, g.k)); boxMesh.instanceMatrix.needsUpdate = prismMesh.instanceMatrix.needsUpdate = true; };
    const setGlow = v => { glow = v; buildMat.emissiveIntensity = .55 * v; };
    function finishRise() { if (!riseRun) return; const r = riseRun; cancelTween(r); r.step(1); r.done(); }
    function sinkCity() { finishRise(); for (const g of byHex.values()) g.rise = 0; writeAllBuildings(); setGlow(.15); invalidate(); }
    // While it grows, each building is a cyan hologram that cools down to its own tone once it is standing.
    const holo = new T.Color(C.cyan).multiplyScalar(1.5);
    function tintBuildings(local) {
      for (const g of byHex.values()) { const lp = local ? local(g) : 1, mix = 1 - Math.min(1, Math.max(0, (lp - .15) / .85)); for (const b of g.items) b.mesh.setColorAt(b.index, color.setHex(C.build).multiplyScalar(b.tone).lerp(holo, mix * mix)); }
      boxMesh.instanceColor.needsUpdate = prismMesh.instanceColor.needsUpdate = true;
    }
    function riseCity(duration) {
      finishRise(); const spread = .55, grow = k => k >= 1 ? 1 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
      const local = p => g => Math.max(0, Math.min(1, (p - g.wave * spread) / (1 - spread)));
      riseRun = tween(duration, p => {
        const at = local(p); for (const g of byHex.values()) g.rise = grow(at(g));
        writeAllBuildings(); tintBuildings(at); setGlow(.15 + .85 * Math.min(1, p * 1.25));
      }, () => { riseRun = null; for (const g of byHex.values()) g.rise = 1; writeAllBuildings(); tintBuildings(); setGlow(1); });
      pulseAt({ q: 0, r: 0 }, { duration: duration * .75, grow: GRID * 2.1, opacity: .85 });
    }

    // Agent plazas, selection ring, hover outline, radar sweep, links.
    const hexLine = (radius, y, mat, seg = 1) => { const g = new T.BufferGeometry().setFromPoints(hexRing(radius, y, seg)); return new T.LineLoop(g, mat); };
    const plazaGeo = new T.CylinderGeometry(.9, .93, .2, 6);
    const plazas = new Map();
    const rimMat = () => new T.LineBasicMaterial({ color: linkMode ? C.purple : C.cyan, transparent: true, opacity: .9 });
    function addPlaza(a) {
      const group = new T.Group(), w = hexToWorld(a.hex.q, a.hex.r);
      const body = new T.Mesh(plazaGeo, new T.MeshStandardMaterial({ color: C.plaza, roughness: .6, metalness: .3, emissive: 0x0b3a47, emissiveIntensity: .7 }));
      body.position.y = TILE_H + .1; group.add(body);
      const rim = hexLine(.9, PLAZA_H + .004, rimMat()); group.add(rim);
      const glow = hexLine(1.02, TILE_H + .01, new T.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: .25 })); group.add(glow);
      group.position.set(w.x, 0, w.z); s.add(group);
      const p = { group, body, rim, glow, hex: { ...a.hex } }; plazas.set(a.id, p); return p;
    }
    function removePlaza(id) { const p = plazas.get(id); if (!p) return; s.remove(p.group); p.group.traverse(o => { o.geometry && o.geometry !== plazaGeo && o.geometry.dispose(); o.material && o.material.dispose(); }); plazas.delete(id); }
    const selRing = new T.Mesh(new T.RingGeometry(1.02, 1.1, 6, 1, Math.PI / 6), new T.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: .8, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
    selRing.rotation.x = -Math.PI / 2; selRing.visible = false; s.add(selRing);
    const hoverGroup = new T.Group(); hoverGroup.visible = false; s.add(hoverGroup);
    const hoverLineMat = new T.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: .95 });
    hoverGroup.add(hexLine(.92, TILE_H + .02, hoverLineMat));
    const hoverFill = new T.Mesh(new T.CylinderGeometry(.9, .9, .02, 6), new T.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: .14, blending: T.AdditiveBlending, depthWrite: false }));
    hoverFill.position.y = TILE_H + .012; hoverGroup.add(hoverFill);
    const sweep = hexLine(1, .2, new T.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0 }), 16); s.add(sweep);
    const linksGroup = new T.Group(); s.add(linksGroup);
    const packets = [];

    /** Arc tubes + travelling packets between two world points (shared by both views). */
    function buildArcs(group, packetList, list, pointOf, lift) {
      group.children.slice().forEach(o => { group.remove(o); o.geometry.dispose(); o.material.dispose(); }); packetList.length = 0;
      const map = new Map(scene.map(a => [a.id, a]));
      for (const l of list) {
        const a = map.get(l.from), b = map.get(l.to); if (!a || !b || a.id === b.id) continue;
        const A = pointOf(a), B = pointOf(b); if (!A || !B) continue;
        const len = A.distanceTo(B), mid = A.clone().add(B).multiplyScalar(.5); mid.y += lift(len);
        const curve = new T.QuadraticBezierCurve3(A, mid, B), relevant = l.from === selected || l.to === selected;
        const col = l.active ? (linkMode ? 0xbd93e9 : 0x5fd4ed) : linkMode ? (relevant ? 0xa77ad6 : 0x67518a) : (relevant ? 0x76c4d6 : 0x3b7487);
        group.add(new T.Mesh(new T.TubeGeometry(curve, 48, l.active ? .045 : relevant ? .034 : .024, 6, false), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: l.active ? 1 : relevant ? .92 : .6, depthWrite: false })));
        const count = l.active ? 3 : relevant ? 1 : 0;
        for (let k = 0; k < count; k++) {
          const dot = new T.Mesh(new T.SphereGeometry(l.active ? .09 : .06, 10, 8), new T.MeshBasicMaterial({ color: 0xf1fcff, transparent: true, opacity: l.active ? 1 : .8, blending: T.AdditiveBlending, depthWrite: false }));
          group.add(dot); packetList.push({ dot, curve, offset: k / count, speed: l.active ? .45 : .22 });
        }
      }
      invalidate();
    }
    let linksKey = '';
    function rebuildLinks() {
      const key = JSON.stringify([links, scene.map(a => [a.id, dragHexOf(a)]), selected, linkMode]);
      if (key === linksKey) return; linksKey = key;
      buildArcs(linksGroup, packets, links, a => { const h = dragHexOf(a); if (!inGrid(h)) return null; const w = hexToWorld(h.q, h.r); return new T.Vector3(w.x, PLAZA_H + .05, w.z); }, len => .22 + len * .07);
    }

    function syncCity() {
      const list = scene.filter(a => inGrid(a.hex)), ids = new Set(list.map(a => a.id));
      for (const id of [...plazas.keys()]) if (!ids.has(id)) removePlaza(id);
      for (const a of list) {
        const h = dragHexOf(a); let p = plazas.get(a.id);
        if (!p) { p = addPlaza(a); if (!syncCity.first) riseIn(p); }
        if (p.hex.q !== h.q || p.hex.r !== h.r) { const w = hexToWorld(h.q, h.r); p.group.position.set(w.x, 0, w.z); p.hex = { ...h }; }
        p.rim.material.color.setHex(linkMode ? C.purple : C.cyan);
      }
      // Buildings stay only on hexes nobody occupies (the squad's agents, plus any extra spots the app passes as occupied).
      const busy = new Set(occupied.keys()); list.forEach(a => busy.add(hexKey(dragHexOf(a))));
      for (const key of byHex.keys()) setHexBuildings(key, busy.has(key) ? 0 : 1, !syncCity.first);
      syncCity.first = false; rebuildLinks(); invalidate();
    }
    syncCity.first = true;
    function riseIn(p) { p.group.position.y = -.35; tween(700, k => { p.group.position.y = -.35 * Math.pow(1 - k, 3); }); pulseAt(p.hex); }
    function pulseAt(h, { duration = 1300, grow = 2.6, opacity = 1 } = {}) {
      const w = hexToWorld(h.q, h.r), ring = hexLine(1, PLAZA_H + .02, new T.LineBasicMaterial({ color: C.cyan, transparent: true, opacity }), Math.max(1, Math.ceil((1 + grow) / 1.4)));
      ring.position.set(w.x, 0, w.z); s.add(ring);
      tween(duration, k => { ring.scale.setScalar(1 + k * grow); ring.material.opacity = opacity * (1 - k); }, () => { s.remove(ring); ring.geometry.dispose(); ring.material.dispose(); });
    }

    /* ----- office scene (built lazily on first use) ----- */
    let office = null;
    function buildOffice() {
      const o = { scene: new T.Scene(), slotMarks: new Map(), links: new T.Group(), packets: [], key: '' };
      const os = o.scene, wr = rng(8812);
      o.camera = new T.OrthographicCamera(-10, 10, 10, -10, -200, 400);
      os.add(new T.HemisphereLight(0xc4e0ec, 0x0e171b, 2.1));
      const key = new T.DirectionalLight(0xe8f3f8, 2.8); key.position.set(-10, 18, 8); os.add(key);
      const fill = new T.DirectionalLight(0x3a8fb0, .8); fill.position.set(12, 8, -10); os.add(fill);
      os.add(new T.AmbientLight(0x22343c, 1.2));
      const mat = (c, extra = {}) => new T.MeshStandardMaterial({ color: c, roughness: .85, metalness: .1, ...extra });
      // Floor slab + fine grid.
      const W = OFFICE.x1 - OFFICE.x0, D = OFFICE.z1 - OFFICE.z0, cx = (OFFICE.x0 + OFFICE.x1) / 2, cz = (OFFICE.z0 + OFFICE.z1) / 2;
      const slab = new T.Mesh(new T.BoxGeometry(W + 1.2, .3, D + 1.2), mat(0x10181c)); slab.position.set(cx, -.15, cz); os.add(slab);
      const grid = [];
      for (let x = Math.ceil(OFFICE.x0); x <= OFFICE.x1; x++) grid.push(x, .005, OFFICE.z0, x, .005, OFFICE.z1);
      for (let z = OFFICE.z0; z <= OFFICE.z1; z++) grid.push(OFFICE.x0, .005, z, OFFICE.x1, .005, z);
      const gridGeo = new T.BufferGeometry(); gridGeo.setAttribute('position', new T.Float32BufferAttribute(grid, 3));
      os.add(new T.LineSegments(gridGeo, new T.LineBasicMaterial({ color: 0x18232a, transparent: true, opacity: .9 })));
      const slabEdge = new T.LineLoop(new T.BufferGeometry().setFromPoints([[OFFICE.x0 - .6, OFFICE.z0 - .6], [OFFICE.x1 + .6, OFFICE.z0 - .6], [OFFICE.x1 + .6, OFFICE.z1 + .6], [OFFICE.x0 - .6, OFFICE.z1 + .6]].map(([x, z]) => new T.Vector3(x, .006, z))), new T.LineBasicMaterial({ color: 0x2b3d46 }));
      os.add(slabEdge);
      // Rooms: floor plate, cyan outline, low partitions with a door gap on the corridor side, glass on some.
      const wallMat = mat(0x2a3940), glassMat = new T.MeshStandardMaterial({ color: 0x9fd2e2, transparent: true, opacity: .14, roughness: .1, metalness: .4, depthWrite: false }), deskMat = mat(0x46575f), baseMat = mat(0x1d2a30), chairMat = mat(0x33434a), plantMat = mat(0x2b423b), potMat = mat(0x2e3a3f);
      for (const room of ROOMS) {
        const plate = new T.Mesh(new T.BoxGeometry(room.w - .12, .04, room.d - .12), mat(room.glass ? 0x17252c : 0x141f25)); plate.position.set(room.x + room.w / 2, .02, room.z + room.d / 2); os.add(plate);
        const pts = [[room.x + .06, room.z + .06], [room.x + room.w - .06, room.z + .06], [room.x + room.w - .06, room.z + room.d - .06], [room.x + .06, room.z + room.d - .06]].map(([x, z]) => new T.Vector3(x, .045, z));
        os.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x2f6679, transparent: true, opacity: 1 })));
        const corridorSide = room.z < 0 ? room.z + room.d : room.z, door = room.x + room.w / 2;
        const walls = [[room.x, room.z, room.x + room.w, room.z], [room.x, room.z + room.d, room.x + room.w, room.z + room.d], [room.x, room.z, room.x, room.z + room.d], [room.x + room.w, room.z, room.x + room.w, room.z + room.d]];
        for (const [x1, z1, x2, z2] of walls) {
          const horizontal = z1 === z2, segs = horizontal && z1 === corridorSide ? [[x1, door - .8], [door + .8, x2]] : [[horizontal ? x1 : z1, horizontal ? x2 : z2]];
          for (const [a0, a1] of segs) {
            const len = a1 - a0; if (len <= .1) continue;
            const wall = new T.Mesh(new T.BoxGeometry(horizontal ? len : .08, .42, horizontal ? .08 : len), wallMat);
            wall.position.set(horizontal ? (a0 + a1) / 2 : x1, .21, horizontal ? z1 : (a0 + a1) / 2); os.add(wall);
            if (room.glass) { const g = new T.Mesh(new T.BoxGeometry(horizontal ? len : .03, 1.3, horizontal ? .03 : len), glassMat); g.position.set(wall.position.x, 1.07, wall.position.z); os.add(g); }
          }
        }
        if (room.table) {
          const top = new T.Mesh(new T.CylinderGeometry(1.35, 1.35, .07, 40), deskMat); top.position.set(room.table.x, .76, room.table.z); os.add(top);
          const leg = new T.Mesh(new T.CylinderGeometry(.18, .32, .72, 16), baseMat); leg.position.set(room.table.x, .36, room.table.z); os.add(leg);
        }
        // A couple of plants per room keeps the plan readable, like the reference.
        for (let k = 0; k < 2; k++) {
          const px = k ? room.x + room.w - .5 : room.x + .5, pz = room.z + .55;
          const pot = new T.Mesh(new T.CylinderGeometry(.2, .16, .36, 12), potMat); pot.position.set(px, .18, pz); os.add(pot);
          const leaves = new T.Mesh(new T.SphereGeometry(.34 + wr() * .1, 10, 8), plantMat); leaves.position.set(px, .62, pz); os.add(leaves);
        }
      }
      // Desks, monitors and chairs (instanced), plus per-slot markers.
      const desks = SLOTS.filter(sl => !sl.seat);
      const deskTop = new T.InstancedMesh(new T.BoxGeometry(1.35, .06, .72), deskMat, desks.length);
      const deskBase = new T.InstancedMesh(new T.BoxGeometry(1.25, .7, .62), baseMat, desks.length);
      const monitor = new T.InstancedMesh(new T.BoxGeometry(.62, .36, .04), mat(0x10181c), desks.length);
      const screens = new T.InstancedMesh(new T.PlaneGeometry(.56, .3), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), desks.length);
      desks.forEach((sl, i) => {
        const back = sl.facing > 0 ? 1 : -1;
        dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.position.set(sl.x, .75, sl.z); dummy.updateMatrix(); deskTop.setMatrixAt(i, dummy.matrix);
        dummy.position.set(sl.x, .36, sl.z); dummy.updateMatrix(); deskBase.setMatrixAt(i, dummy.matrix);
        dummy.position.set(sl.x, 1.02, sl.z + back * .24); dummy.updateMatrix(); monitor.setMatrixAt(i, dummy.matrix);
        dummy.rotation.set(0, sl.facing > 0 ? Math.PI : 0, 0); dummy.position.set(sl.x, 1.02, sl.z + back * .24 - back * .025); dummy.updateMatrix(); screens.setMatrixAt(i, dummy.matrix);
        screens.setColorAt(i, color.setHex(0x0d1a1f)); sl.screenIndex = i;
      });
      os.add(deskTop, deskBase, monitor, screens); o.screens = screens;
      const seatGeo = new T.CylinderGeometry(.27, .27, .08, 16), backGeo = new T.BoxGeometry(.5, .42, .06);
      const seats = new T.InstancedMesh(seatGeo, chairMat, SLOTS.length), backs = new T.InstancedMesh(backGeo, chairMat, SLOTS.length);
      SLOTS.forEach((sl, i) => {
        const seat = seatOf(sl), ang = sl.seat ? sl.rot : (sl.facing > 0 ? 0 : Math.PI);
        dummy.scale.set(1, 1, 1); dummy.rotation.set(0, ang, 0); dummy.position.set(seat.x, .46, seat.z); dummy.updateMatrix(); seats.setMatrixAt(i, dummy.matrix);
        const bx = seat.x, off = sl.facing > 0 ? -.26 : .26;
        if (sl.seat) { const a = Math.atan2(seat.z - (ROOM_BY_CODE.get(sl.room).table.z), seat.x - ROOM_BY_CODE.get(sl.room).table.x); dummy.position.set(seat.x + Math.cos(a) * .26, .72, seat.z + Math.sin(a) * .26); dummy.rotation.set(0, -a + Math.PI / 2, 0); }
        else { dummy.position.set(bx, .72, seat.z + off); dummy.rotation.set(0, 0, 0); }
        dummy.updateMatrix(); backs.setMatrixAt(i, dummy.matrix);
        // Slot marker on the floor (ring) + status LED on the desk.
        const ring = new T.Mesh(new T.RingGeometry(.36, .42, 28), new T.MeshBasicMaterial({ color: 0x3b5561, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(seat.x, .05, seat.z); os.add(ring);
        const led = new T.Mesh(new T.SphereGeometry(.07, 10, 8), new T.MeshBasicMaterial({ color: C.green, toneMapped: false })); led.visible = false;
        led.position.set(sl.seat ? seat.x : sl.x + .55, sl.seat ? .95 : .82, sl.seat ? seat.z : sl.z); os.add(led);
        o.slotMarks.set(sl.id, { ring, led, slot: sl });
      });
      os.add(seats, backs);
      // Hover and selection rings, plus the activity arcs.
      o.hover = new T.Mesh(new T.CircleGeometry(.5, 32), new T.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false }));
      o.hover.rotation.x = -Math.PI / 2; o.hover.visible = false; os.add(o.hover);
      o.sel = new T.Mesh(new T.RingGeometry(.5, .58, 36), new T.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: .9, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
      o.sel.rotation.x = -Math.PI / 2; o.sel.visible = false; os.add(o.sel);
      os.add(o.links);
      o.life = new T.Group(); o.lifePackets = []; os.add(o.life); // office life arcs (meetings, visits)
      return o;
    }
    function syncOffice() {
      if (!office) return;
      const byDesk = new Map(scene.filter(a => SLOT_BY_ID.has(deskOf(a))).map(a => [deskOf(a), a]));
      for (const [id, m] of office.slotMarks) {
        const a = byDesk.get(id), other = occupiedDesks.get(id);
        const status = a ? (running.id === a.id ? (running.paused ? 'paused' : 'running') : 'ready') : null;
        m.ring.material.color.setHex(a ? (linkMode ? C.purple : C.cyan) : other ? 0x3b4b52 : 0x2b3d46); m.ring.material.opacity = a ? .95 : .7;
        if (moving && !a && !other) { m.ring.material.color.setHex(C.cyan); m.ring.material.opacity = .5; } // free desks light up in move mode
        m.led.visible = !!a; if (a) m.led.material.color.setHex(status === 'running' ? C.cyan : status === 'paused' ? C.amber : C.green);
        m.status = status;
        if (m.slot.screenIndex !== undefined) office.screens.setColorAt(m.slot.screenIndex, color.setHex(status === 'running' ? 0x3fd6f2 : a ? 0x173640 : 0x0d1a1f));
      }
      if (office.screens.instanceColor) office.screens.instanceColor.needsUpdate = true;
      // Office shows activity only: active operation hops, or recent handoffs in Handoffs mode.
      const list = links.filter(l => l.active || linkMode);
      const key = JSON.stringify([list, scene.map(a => [a.id, deskOf(a)]), selected, linkMode]);
      if (key !== office.key) { office.key = key; buildArcs(office.links, office.packets, list, a => { const sl = SLOT_BY_ID.get(deskOf(a)); if (!sl) return null; const seat = seatOf(sl); return new T.Vector3(seat.x, 1.3, seat.z); }, len => .8 + len * .12); }
      invalidate();
    }

    const v3 = new T.Vector3(), raycaster = new T.Raycaster(), groundPlane = new T.Plane(new T.Vector3(0, 1, 0), -TILE_H), floorPlane = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3(), ndc = new T.Vector2();
    const flipAxis = new T.Vector3(), flipQ = new T.Quaternion(), flipPivot = new T.Vector3(), carryAxis = new T.Vector3(), carryQ = new T.Quaternion();
    const planetSphere = { center: new T.Vector3(0, -PLANET_R, 0), radius: PLANET_R + TILE_H }; // plain object: Ray.intersectSphere reads centre/radius
    // Orbiting the camera (instead of turning the scene) keeps the lights, the projection and the picking consistent.
    function orbit(c, c0, y = 0) {
      if (!pose.flip) return;
      flipAxis.set(Math.cos(c0.theta), 0, -Math.sin(c0.theta)); flipQ.setFromAxisAngle(flipAxis, -pose.flip); flipPivot.set(c0.tx, y, c0.tz);
      c.position.sub(flipPivot).applyQuaternion(flipQ).add(flipPivot); c.quaternion.premultiply(flipQ);
    }
    function applyCamera() {
      if (mode === 'office') {
        if (!office) office = buildOffice();
        const c = office.camera, aspect = width / height, h = ocam.viewH / 2;
        c.left = -h * aspect; c.right = h * aspect; c.top = h; c.bottom = -h; c.zoom = ocam.zoom;
        const dist = 80, ce = Math.cos(ocam.elev);
        c.position.set(ocam.tx + dist * ce * Math.sin(ocam.theta), dist * Math.sin(ocam.elev), ocam.tz + dist * ce * Math.cos(ocam.theta));
        c.lookAt(ocam.tx, 0, ocam.tz); orbit(c, ocam); c.setViewOffset(width, height, -ocam.offsetX, -ocam.offsetY, width, height); c.updateProjectionMatrix(); c.updateMatrixWorld();
        return;
      }
      // Flat pose around the target (tx, -L, tz); on the planet the target drops toward the centre (L) and the whole pose is then
      // carried by the surface at the focus: rigid, so at b = 0 it is exactly the flat camera and the transmorph pivot rides along.
      const b = planet.b, L = PLANET_LOOK * PLANET_R * b, sp = Math.sin(cam.phi);
      camera.position.set(cam.tx + cam.distance * sp * Math.sin(cam.theta), cam.distance * Math.cos(cam.phi) - L, cam.tz + cam.distance * sp * Math.cos(cam.theta));
      camera.lookAt(cam.tx, -L, cam.tz); orbit(camera, cam, -L);
      carryQ.identity();
      if (b >= 5e-4) {
        const rho = Math.hypot(cam.tx, cam.tz), F = planetMap(cam.tx, 0, cam.tz, b);
        if (rho > 1e-6) carryQ.setFromAxisAngle(carryAxis.set(cam.tz / rho, 0, -cam.tx / rho), rho * b / PLANET_R);
        camera.position.x -= cam.tx; camera.position.z -= cam.tz; camera.position.applyQuaternion(carryQ); camera.position.x += F.x; camera.position.y += F.y; camera.position.z += F.z;
        camera.quaternion.premultiply(carryQ);
      }
      // The lights turn with the carried view, so the side facing the camera is lit like the flat city.
      sun.position.copy(SUN_POS).applyQuaternion(carryQ); rimLight.position.copy(RIM_POS).applyQuaternion(carryQ); hemi.position.copy(UP).applyQuaternion(carryQ);
      { const cp = planetMap(0, 1.4, 0, b); core.position.set(cp.x, cp.y, cp.z); }
      camera.near = .1 + (Math.max(.1, cam.distance * .04) - .1) * b;
      camera.aspect = width / height; camera.setViewOffset(width, height, -cam.offsetX, 0, width, height); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      s.fog.near = cam.distance * 1.15; s.fog.far = cam.distance * 3.6;
      if (b >= 5e-4) { for (const st of stars) st.position.copy(camera.position); halo.quaternion.copy(camera.quaternion); }
    }
    const activeCamera = () => mode === 'office' && office ? office.camera : camera;
    gl = {
      renderer, applyCamera, pulseAt, sinkCity, riseCity, finishRise,
      sync() { syncCity(); syncOffice(); },
      // Flat world point -> screen. On the planet it goes through planetMap, and points on the far side count as behind.
      project(x, y, z) {
        const b = mode === 'office' ? 0 : planet.b, p = b ? planetMap(x, y, z, b) : { x, y, z };
        v3.set(p.x, p.y, p.z).project(activeCamera()); let behind = v3.z > 1;
        if (b > .5) { const cy = -PLANET_R / b, nx = p.x, ny = p.y - cy, nz = p.z, c = camera.position, dx = c.x - p.x, dy = c.y - p.y, dz = c.z - p.z; if ((nx * dx + ny * dy + nz * dz) / (Math.hypot(nx, ny, nz) * Math.hypot(dx, dy, dz)) < -.06) behind = true; }
        return { x: (v3.x + 1) / 2 * width, y: (1 - v3.y) / 2 * height, behind };
      },
      // Screen -> flat ground. On the finished planet: ray/sphere hit, then back to flat coordinates; no picking mid-curl.
      ground(sx, sy) {
        ndc.set(sx / width * 2 - 1, -(sy / height) * 2 + 1); raycaster.setFromCamera(ndc, activeCamera());
        if (mode !== 'office' && planet.b > 0) { if (planet.b < .999) return null; return raycaster.ray.intersectSphere(planetSphere, hit) ? planetUnmap(hit.x, hit.y, hit.z) : null; }
        return raycaster.ray.intersectPlane(mode === 'office' ? floorPlane : groundPlane, hit) ? { x: hit.x, z: hit.z } : null;
      },
      setPlanet,
      hover(target, empty) {
        if (mode === 'office') {
          if (!office) return; const sl = target && SLOT_BY_ID.get(target);
          if (!sl) { office.hover.visible = false; return; } const seat = seatOf(sl);
          office.hover.position.set(seat.x, .06, seat.z); office.hover.visible = true; office.hover.material.opacity = empty ? .28 : .08; return;
        }
        if (!target) { hoverGroup.visible = false; return; }
        const w = hexToWorld(target.q, target.r); hoverGroup.position.set(w.x, 0, w.z); hoverGroup.visible = true;
        hoverLineMat.color.setHex(empty ? C.cyan : 0x6f858f); hoverLineMat.opacity = empty ? .95 : .5; hoverFill.visible = empty;
      },
      deskStatus(id) { return office?.slotMarks.get(id)?.status || null; },
      animate(t) {
        const moving = !reducedMotion();
        const sel = scene.find(a => a.id === selected);
        if (mode === 'office') {
          if (!office) return;
          const sl = sel && SLOT_BY_ID.get(deskOf(sel));
          if (sl) { const seat = lifePos(sel) || seatOf(sl), k = moving ? (t % 2200) / 2200 : .3; office.sel.visible = true; office.sel.position.set(seat.x, .07, seat.z); office.sel.scale.setScalar(1 + k * .45); office.sel.material.opacity = .9 * (1 - k); office.sel.material.color.setHex(linkMode ? C.purple : C.cyan); }
          else office.sel.visible = false;
          for (const [, m] of office.slotMarks) if (m.status === 'running') m.led.scale.setScalar(moving ? 1 + Math.sin(t / 160) * .35 : 1.2);
          for (const pk of office.packets) { const k = moving ? ((t / 1000) * pk.speed + pk.offset) % 1 : pk.offset + .5; pk.dot.position.copy(pk.curve.getPoint(k % 1)); }
          for (const pk of office.lifePackets) { const k = ((t / 1000) * pk.speed + pk.offset) % 1; pk.dot.position.copy(pk.curve.getPoint(pk.back ? 1 - k : k)); }
          return;
        }
        if (sel && inGrid(sel.hex)) { const h = dragHexOf(sel), w = hexToWorld(h.q, h.r); selRing.visible = true; selRing.position.set(w.x, PLAZA_H + .01, w.z); const k = moving ? (t % 2200) / 2200 : .3; selRing.scale.setScalar(1 + k * .35); selRing.material.opacity = .85 * (1 - k); selRing.material.color.setHex(linkMode ? C.purple : C.cyan); }
        else selRing.visible = false;
        for (const pk of packets) { const k = moving ? ((t / 1000) * pk.speed + pk.offset) % 1 : pk.offset + .5; pk.dot.position.copy(pk.curve.getPoint(k % 1)); }
        if (moving) {
          const k = (t % 7000) / 7000; sweep.scale.setScalar(.5 + k * GRID * 1.9); sweep.material.opacity = .32 * (1 - k); sweep.material.color.setHex(linkMode ? C.purple : C.cyan);
          buildMat.emissiveIntensity = (.52 + Math.sin(t / 1300) * .06) * glow; core.intensity = 3 + Math.sin(t / 900) * .6;
          if (beacon.visible) { poleRings.forEach((m, i) => { m.rotation.z = t / (2600 + i * 900) * (i % 2 ? -1 : 1); }); orb.scale.setScalar(1 + Math.sin(t / 420) * .18); beaconLight.intensity = (2.6 + Math.sin(t / 420) * 1.1) * beaconK; }
        } else { sweep.material.opacity = 0; if (beacon.visible) beaconLight.intensity = 2.6 * beaconK; }
      },
      ensureOffice() { if (!office) { office = buildOffice(); syncOffice(); } },
      // Builds the office and compiles its shaders ahead of time, so the first transmorph to it does not stall.
      prepareOffice() { if (office?.ready) return; this.ensureOffice(); office.ready = true; const r = renderer.compileAsync?.(office.scene, office.camera); if (!r) renderer.compile(office.scene, office.camera); },
      render() { if (mode === 'office' && office) renderer.render(office.scene, office.camera); else { bendTree(); renderer.render(s, camera); } },
      // Office life: arcs between who is talking, with packets going both ways; an empty list clears them.
      lifeArcs(pairs) {
        if (!office) return; const g = office.life;
        g.children.slice().forEach(o => { g.remove(o); o.geometry.dispose(); o.material.dispose(); }); office.lifePackets.length = 0;
        for (const [a, b] of pairs) {
          const A = new T.Vector3(a.x, 1.25, a.z), B = new T.Vector3(b.x, 1.25, b.z), mid = A.clone().add(B).multiplyScalar(.5); mid.y += .55 + A.distanceTo(B) * .14;
          const curve = new T.QuadraticBezierCurve3(A, mid, B);
          g.add(new T.Mesh(new T.TubeGeometry(curve, 32, .026, 6, false), new T.MeshBasicMaterial({ color: 0x6fe3c1, transparent: true, opacity: .7, depthWrite: false })));
          for (let k = 0; k < 2; k++) { const dot = new T.Mesh(new T.SphereGeometry(.075, 10, 8), new T.MeshBasicMaterial({ color: 0xeafff8, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); g.add(dot); office.lifePackets.push({ dot, curve, offset: k * .5, speed: .42, back: k === 1 }); }
        }
        invalidate();
      }
    };
  } catch (error) {
    gl = null; viewport.classList.add('no-webgl');
    const note = document.createElement('div'); note.className = 'map-fallback'; note.textContent = 'VISUALIZAÇÃO 3D INDISPONÍVEL NESTE NAVEGADOR (WEBGL)'; viewport.append(note);
  }

  /* ---------- projection helpers (WebGL or 2D fallback with the same camera) ---------- */
  function fallbackScale() { return mode === 'office' ? height / (ocam.viewH / ocam.zoom) : height / (2 * Math.tan(FOV * Math.PI / 360) * cam.distance); }
  function projectWorld(x, y, z) {
    if (gl) return gl.project(x, y, z);
    const c0 = mode === 'office' ? ocam : cam, dx = x - c0.tx, dz = z - c0.tz, c = Math.cos(c0.theta), sn = Math.sin(c0.theta);
    const rx = dx * c - dz * sn, rz = dx * sn + dz * c, k = fallbackScale(), tilt = mode === 'office' ? Math.PI / 2 - ocam.elev : cam.phi;
    return { x: width / 2 + c0.offsetX + rx * k, y: height / 2 + (c0.offsetY || 0) + (rz * Math.cos(tilt) - y * Math.sin(tilt)) * k, behind: false };
  }
  function groundAt(sx, sy) {
    if (gl) return gl.ground(sx, sy);
    const c0 = mode === 'office' ? ocam : cam, tilt = mode === 'office' ? Math.PI / 2 - ocam.elev : cam.phi;
    const k = fallbackScale(), rx = (sx - width / 2 - c0.offsetX) / k, rz = (sy - height / 2 - (c0.offsetY || 0)) / k / Math.cos(tilt);
    const c = Math.cos(c0.theta), sn = Math.sin(c0.theta);
    return { x: c0.tx + rx * c + rz * sn, z: c0.tz - rx * sn + rz * c };
  }
  const local = event => { const b = viewport.getBoundingClientRect(); return { x: event.clientX - b.left, y: event.clientY - b.top }; };
  function hexAtScreen(sx, sy) { const g = groundAt(sx, sy); if (!g) return null; const h = worldToHex(g.x, g.z); return inGrid(h) ? h : null; }
  function deskAtScreen(sx, sy) {
    const g = groundAt(sx, sy); if (!g) return null; let best = null, bd = .75;
    for (const sl of SLOTS) { const seat = seatOf(sl), d = Math.hypot(seat.x - g.x, seat.z - g.z), dd = sl.seat ? d : Math.min(d, Math.hypot(sl.x - g.x, sl.z - g.z)); if (dd < bd) { bd = dd; best = sl.id; } }
    return best;
  }
  const targetAt = (sx, sy) => curling ? null : mode === 'office' ? deskAtScreen(sx, sy) : hexAtScreen(sx, sy); // nothing to pick while the city curls
  // Where an agent is shown: the drop target while it is dragged or moved (move mode preview), otherwise its own place.
  const dragHexOf = a => (dragging && dragging.nodeId === a.id && dragging.hex && mode === 'city') ? dragging.hex : (moving && moving.id === a.id && moving.target && mode === 'city') ? moving.target : a.hex;
  const deskOf = a => (dragging && dragging.nodeId === a.id && dragging.desk && mode === 'office') ? dragging.desk : (moving && moving.id === a.id && moving.target && mode === 'office') ? moving.target : a.desk;
  function isFreeHex(h, exceptId) { if (!inGrid(h)) return false; const who = occupied.get(hexKey(h)); if (who && who !== exceptId) return false; return !scene.some(a => a.id !== exceptId && inGrid(a.hex) && hexKey(dragHexOf(a)) === hexKey(h)); }
  function isFreeDesk(id, exceptId) { if (!SLOT_BY_ID.has(id)) return false; const who = occupiedDesks.get(id); if (who && who !== exceptId) return false; return !scene.some(a => a.id !== exceptId && deskOf(a) === id); }
  const isFree = (target, exceptId) => mode === 'office' ? isFreeDesk(target, exceptId) : isFreeHex(target, exceptId);

  function agentPoint(a) {
    if (mode === 'office') { const lp = lifePos(a); if (lp) return projectWorld(lp.x, 1.55, lp.z); const sl = SLOT_BY_ID.get(deskOf(a)); if (!sl) return null; const seat = seatOf(sl); return projectWorld(seat.x, 1.55, seat.z); }
    const h = dragHexOf(a); if (!inGrid(h)) return null; const w = hexToWorld(h.q, h.r); return projectWorld(w.x, PLAZA_H + .42, w.z);
  }
  function updatePositions() {
    for (const a of scene) {
      const p = agentPoint(a);
      for (const el of document.querySelectorAll(`[data-node="${a.id}"],[data-anchor="${a.id}"],[data-pin="${a.id}"]`)) {
        if (!p) { el.style.visibility = 'hidden'; continue; }
        el.style.left = `${p.x.toFixed(1)}px`; el.style.top = `${p.y.toFixed(1)}px`; el.style.visibility = p.behind ? 'hidden' : '';
        if (el.dataset.anchor) { const h = el.offsetHeight, w = el.offsetWidth, above = p.y - h - 50 >= 4, left = !above && p.x - w - 48 >= (width < 901 ? 8 : 296); el.classList.toggle('side', left); el.classList.toggle('below', !above && !left); }
        if (el.dataset.node) el.classList.toggle('walking', mode === 'office' && !!lifePos(a) && !!life.actors.get(a.id)?.path);
      }
    }
    if (mode === 'office') layoutCards();
    placeLifeBadges();
    labels.hidden = mode !== 'office';
    if (mode === 'office') for (const el of labels.children) { const r = ROOM_BY_CODE.get(el.dataset.room), p = projectWorld(r.x + .4, .05, r.z + .45); el.style.left = `${p.x.toFixed(1)}px`; el.style.top = `${p.y.toFixed(1)}px`; }
    const z = document.getElementById('zoomValue'); if (z) z.textContent = Math.round(mode === 'office' ? ocam.zoom / ocam.base * 100 : cam.base / cam.distance * 100) + '%';
  }
  /* Office agent cards: one per agent, placed greedily around its marker so that no card covers
     another card or another agent's marker. Sizes match .agent-card in styles.css. */
  const CARD_W = 156, CARD_H = 46, CARD_GAP = 6, MARK_R = 19, CARD_LIFT = 26, ACT_R = 22;
  // Quick-action bubbles around the selected marker (upper arc: chat, move, edit), same offsets as .node-bubble in styles.css.
  const ACT_SPOTS = [[-60, -34], [0, -72], [60, -34]];
  const cardOffsets = (() => {
    const list = [], sx = CARD_W / 2 + CARD_GAP, row = CARD_H + CARD_GAP;
    for (let k = 0; k < 4; k++) for (const dx of [0, -sx, sx, -2 * sx, 2 * sx]) list.push({ dx, top: -CARD_LIFT - CARD_H - k * row });
    for (let k = 0; k < 2; k++) for (const dx of [0, -sx, sx]) list.push({ dx, top: CARD_LIFT + k * row });
    for (const dx of [-(CARD_W / 2 + MARK_R + CARD_GAP), CARD_W / 2 + MARK_R + CARD_GAP]) list.push({ dx, top: -CARD_H / 2 });
    return list.sort((a, b) => Math.hypot(a.dx, a.top + CARD_H / 2) - Math.hypot(b.dx, b.top + CARD_H / 2));
  })();
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  function layoutCards() {
    const items = [];
    for (const el of viewport.querySelectorAll('.agent-card[data-card]')) {
      const id = el.dataset.card, a = scene.find(x => x.id === id), p = a && agentPoint(a), leader = viewport.querySelector(`[data-leader="${id}"]`);
      // A walking agent's card fades out where it was and comes back once the agent sits down.
      const walking = !!(a && lifePos(a) && life.actors.get(id)?.path); el.classList.toggle('walking', walking); leader?.classList.toggle('walking', walking); if (walking) continue;
      if (!p || p.behind) { el.style.visibility = 'hidden'; if (leader) leader.style.visibility = 'hidden'; continue; }
      items.push({ id, el, leader, p });
    }
    const marks = items.map(({ id, p }) => ({ id, x: p.x - MARK_R, y: p.y - MARK_R, w: MARK_R * 2, h: MARK_R * 2 }));
    // The quick-action bubbles beside the selected marker (see .node-bubble in styles.css) are obstacles as well.
    const pin = viewport.querySelector('.node-actions[data-pin]')?.dataset.pin, pinned = pin && items.find(i => i.id === pin);
    for (const ac of life.actors.values()) if (ac.badge) { const it = items.find(i => i.id === ac.id); if (it) marks.push({ id: '', x: it.p.x - 46, y: it.p.y - 54, w: 92, h: 32 }); }
    if (pinned) for (const [dx, dy] of ACT_SPOTS) marks.push({ id: '', x: pinned.p.x + dx - ACT_R, y: pinned.p.y + dy - ACT_R, w: 2 * ACT_R, h: 2 * ACT_R });
    // Visible HUD panels over the map are obstacles too, so cards are not hidden behind them.
    const vb = viewport.getBoundingClientRect();
    const placed = [...document.querySelectorAll('.left-hud,.right-hud,.map-side-controls')].filter(el => !el.inert && !el.classList.contains('dismissed') && el.offsetParent)
      .map(el => el.getBoundingClientRect()).filter(r => r.width && r.height).map(r => ({ x: r.left - vb.left - CARD_GAP, y: r.top - vb.top - CARD_GAP, w: r.width + CARD_GAP * 2, h: r.height + CARD_GAP * 2 }));
    items.sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x);
    // The transmorph back to the city collapses the last laid-out cards (render() has removed them by then).
    if (items.length) lastCards = items.map(it => it.el);
    for (const [i, it] of items.entries()) {
      it.el.style.setProperty('--i', i); it.leader?.style.setProperty('--i', i); // stagger of the cards' entrance (morph-land)
      let best = null, bestCost = Infinity;
      for (const o of cardOffsets) {
        const r = { x: it.p.x + o.dx - CARD_W / 2, y: it.p.y + o.top, w: CARD_W, h: CARD_H };
        let cost = 0;
        for (const q of placed) cost += overlap(r, q);
        for (const m of marks) cost += overlap(r, m) * (m.id === it.id ? 4 : 1);
        // Leaving the viewport counts as overlap, so cards stay on screen when there is room.
        cost += (Math.max(0, 4 - r.x) + Math.max(0, r.x + r.w - width + 4)) * CARD_H + (Math.max(0, 4 - r.y) + Math.max(0, r.y + r.h - height + 4)) * CARD_W;
        if (cost < bestCost) { best = r; bestCost = cost; if (!cost) break; }
      }
      placed.push(best);
      it.el.style.visibility = ''; it.el.style.left = `${best.x.toFixed(1)}px`; it.el.style.top = `${best.y.toFixed(1)}px`;
      if (it.leader) {
        // Leader line from the closest point of the card edge to the marker.
        const x1 = Math.max(best.x, Math.min(it.p.x, best.x + best.w)), y1 = Math.max(best.y, Math.min(it.p.y, best.y + best.h));
        const dx = it.p.x - x1, dy = it.p.y - y1, len = Math.max(0, Math.hypot(dx, dy) - MARK_R * .7);
        it.leader.style.visibility = len > 2 ? '' : 'hidden';
        it.leader.style.left = `${x1.toFixed(1)}px`; it.leader.style.top = `${y1.toFixed(1)}px`; it.leader.style.width = `${len.toFixed(1)}px`;
        it.leader.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      }
    }
  }
  function commitCamera() { if (gl) gl.applyCamera(); updatePositions(); invalidate(); }

  /* ---------- camera controls ---------- */
  function home() { homePose(); commitCamera(); }
  // Home framing of the current view, written to cam/ocam only (the transmorph also uses it to measure the other view).
  function homePose() {
    width = viewport.clientWidth || 1600; height = viewport.clientHeight || 900;
    const mobile = width < 561, tablet = width < 901, visibleW = mobile ? width : tablet ? width - 240 : Math.max(420, width - 640);
    if (mode === 'office') {
      // Fit the whole floor plan (its isometric footprint) between the side panels.
      const span = (OFFICE.x1 - OFFICE.x0 + OFFICE.z1 - OFFICE.z0) * .72, depth = (OFFICE.x1 - OFFICE.x0 + OFFICE.z1 - OFFICE.z0) * .36;
      const zx = visibleW / (span / ocam.viewH * height), zy = height * .78 / (depth / ocam.viewH * height);
      ocam.base = Math.min(zx, zy) * (mobile ? .95 : 1.02); ocam.zoom = ocam.base; ocam.theta = Math.PI / 4;
      ocam.tx = .5; ocam.tz = 0;
      // Shift the plan down in screen space, leaving room above the desks for the desk card.
      ocam.offsetY = mobile ? height * .06 : height * .09;
      ocam.offsetX = mobile ? 0 : tablet ? width * .1 : -width * .045;
      return;
    }
    if (planetShape()) {
      // The whole planet (plus its tallest buildings) between the side panels, north pole (the squad) facing the camera.
      const fitR = PLANET_R + 2.6, sn = Math.sin(FOV * Math.PI / 360);
      cam.base = fitR / sn * Math.max(1, height / visibleW) * (mobile ? 1.2 : 1.06);
      cam.distance = cam.base; cam.tx = 0; cam.tz = 0; cam.theta = .62; cam.phi = .7;
      cam.offsetX = mobile ? width * .05 : tablet ? width * .1 : 0;
      return;
    }
    const fit = 4.6, t = Math.tan(FOV * Math.PI / 360);
    cam.base = Math.max(fit / t, fit / (t * (visibleW / height))) * (mobile ? 1.55 : tablet ? 1.2 : 1.12);
    cam.distance = cam.base; cam.tx = 0; cam.tz = mobile ? -3.2 : tablet ? -1 : .4; cam.theta = .62; cam.phi = .96;
    cam.offsetX = mobile ? width * .05 : tablet ? width * .1 : 0;
  }
  function resize() {
    finishMorph(); finishCurl();
    width = viewport.clientWidth || 1600; height = viewport.clientHeight || 900;
    if (gl) { gl.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); gl.renderer.setSize(width, height, false); }
    home();
  }
  function clampTarget(c0) {
    // On the planet the focus stays within a radius (short of the south pole, where the surface frame would spin).
    if (mode !== 'office' && planet.b > 0) { const r = Math.hypot(c0.tx, c0.tz); if (r > PLANET_RHO) { c0.tx *= PLANET_RHO / r; c0.tz *= PLANET_RHO / r; } return; }
    const lim = mode === 'office' ? 22 : GRID * 1.6; c0.tx = Math.max(-lim, Math.min(lim, c0.tx)); c0.tz = Math.max(-lim, Math.min(lim, c0.tz));
  }
  function zoom(factor, sx = width / 2, sy = height / 2) {
    if (morphing || curling) return; // the transmorph / curl drives the camera (side controls and keys bypass the pointer block)
    const before = groundAt(sx, sy);
    if (mode === 'office') ocam.zoom = Math.min(ocam.base * 3, Math.max(ocam.base * .55, ocam.zoom * factor));
    else cam.distance = Math.min(cam.base * 2.2, Math.max(cam.base * .38, cam.distance / factor));
    if (gl) gl.applyCamera();
    const after = groundAt(sx, sy), c0 = mode === 'office' ? ocam : cam;
    if (before && after) { c0.tx += before.x - after.x; c0.tz += before.z - after.z; }
    clampTarget(c0); commitCamera();
  }
  function focus(agentId) {
    const a = scene.find(x => x.id === agentId); if (!a || morphing || curling) return;
    const sp = agentPoint(a); if (!sp) return;
    // Only move the camera when the agent is outside the area between the side panels.
    const left = width < 901 ? 40 : 320, right = width < 901 ? width - 40 : width - 360;
    if (!sp.behind && sp.x > left && sp.x < right && sp.y > 60 && sp.y < height - 170) return;
    let tx, tz; const c0 = mode === 'office' ? ocam : cam;
    if (mode === 'office') { const seat = seatOf(SLOT_BY_ID.get(a.desk)); tx = seat.x * .7; tz = seat.z * .7; } else { const w = hexToWorld(a.hex.q, a.hex.r), f = planet.b > .999 ? 1 : .6; tx = w.x * f; tz = w.z * f; } // the planet brings the agent to the front
    const fx = c0.tx, fz = c0.tz;
    if (reducedMotion()) { c0.tx = tx; c0.tz = tz; commitCamera(); return; }
    tween(650, k => { const e = 1 - Math.pow(1 - k, 3); c0.tx = fx + (tx - fx) * e; c0.tz = fz + (tz - fz) * e; if (gl) gl.applyCamera(); updatePositions(); });
  }
  // Rotate the camera around its target in 45° steps (buttons, [ and ] keys); right-drag still rotates freely.
  let rotateTween = null;
  function rotate(step) {
    if (morphing || curling) return;
    const c0 = mode === 'office' ? ocam : cam, q = Math.PI / 4, from = c0.theta, to = Math.round(from / q) * q + step * q;
    if (rotateTween) { const i = tweens.indexOf(rotateTween); if (i >= 0) tweens.splice(i, 1); rotateTween = null; }
    if (reducedMotion()) { c0.theta = to; commitCamera(); return; }
    tween(420, k => { c0.theta = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (gl) gl.applyCamera(); updatePositions(); }, () => { rotateTween = null; });
    rotateTween = tweens[tweens.length - 1];
  }
  function planetShape() { return !!gl && planet.want === 'planet'; }
  function finishCurl() { if (!planet.run) return; const r = planet.run; cancelTween(r); r.step(1); r.done(); }
  // Rolls the flat city into the planet (or unrolls it) while the camera travels from one home framing to the other.
  function setShape(next, animate) {
    next = next === 'planet' && gl ? 'planet' : 'flat'; finishCurl(); if (next === planet.want) return;
    planet.want = next; const to = next === 'planet' ? 1 : 0;
    if (!animate || mode !== 'city') { planet.b = to; gl?.setPlanet(to); if (mode === 'city') home(); else invalidate(); return; }
    const from = planet.b, a0 = { ...cam }; homePose(); const a1 = { ...cam }; Object.assign(cam, a0);
    if (moving) cancelMove(); lifeReset(); dragging = null; gl.hover(null); viewport.classList.remove('dragging', 'hex-hover-empty'); curling = true;
    const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(2 - 2 * k, 3) / 2;
    planet.run = tween(CURL_MS, k => {
      const e = ease(k); planet.b = from + (to - from) * e; gl.setPlanet(planet.b);
      for (const key of ['distance', 'base', 'tx', 'tz', 'theta', 'phi', 'offsetX']) cam[key] = a0[key] + (a1[key] - a0[key]) * e;
      gl.applyCamera(); updatePositions();
    }, () => { planet.run = null; curling = false; planet.b = to; gl.setPlanet(to); home(); });
  }
  let pendingMode = null, booted = false, morphing = false, queuedMode = null, morphRun = null, morphFx = null, cinema = null, ghostLayer = null, landTimer = 0, lastCards = [];
  function setMode(next) {
    next = next === 'office' ? 'office' : 'city';
    if (next === (pendingMode || mode)) { if (morphing) queuedMode = null; return; } // toggled back to where it is going: drop the queue
    finishCurl();
    if (moving) cancelMove();
    if (morphing) { queuedMode = next; return; }
    gl?.finishRise();
    const swap = () => { pendingMode = null; mode = next; if (gl && mode === 'office') gl.ensureOffice(); gl?.hover(null); viewport.classList.remove('hex-hover-empty', 'map-fading'); viewport.dataset.view = mode; home(); if (gl) gl.sync(); updatePositions(); invalidate(); };
    // Animate only when the map is visible; on boot, behind the Painel or with reduced motion the swap is immediate.
    if (!booted || paused || reducedMotion()) { swap(); return; }
    pendingMode = next;
    if (!gl) { viewport.classList.add('map-fading'); setTimeout(swap, 170); return; }
    morph(next, swap);
  }
  /* Cinematic transmorph ("entering the upside down"), one 1.2 s timeline:
     - out: the camera orbits down to ground level while it swings 60° around its target, so the current world tips over and
       spins until it is seen edge-on (letterbox bars, vignette, drifting spores);
     - cut: a light beam and a flicker; the other world arrives from the far side, passes face-on and settles home with a small
       overshoot; back in the city the buildings resurge in a wave that keeps going after the map is usable again;
     - the agents' icons travel between the views like a PowerPoint morph (ghost clones), ride the arriving world at the end and
       hand over to the real markers on landing; office cards collapse into their icons on the way out and pop in on arrival.
     A toggle pressed meanwhile is queued and runs right after. */
  const MORPH_MS = 1200, MORPH_SPLIT = 1 / 3, MORPH_SPIN = Math.PI / 3, MORPH_PULL = .35, MORPH_SAFE = 26, RISE_AT = .55, RISE_MS = 1100;
  const camOf = m => m === 'office' ? ocam : cam, sizeOf = (m, c = camOf(m)) => m === 'office' ? c.zoom : c.distance;
  const setSize = (m, v) => { if (m === 'office') ocam.zoom = v; else cam.distance = v; };
  // Pulled back at the cut; the perspective camera also stays out of the city while it is at ground level.
  // A sphere is never edge-on: at the cut the planet is pulled far back so it is small when the office arrives.
  const pulledSize = (m, size) => m === 'office' ? size / (1 + MORPH_PULL) : planet.b > .5 ? size * 3 : Math.max(MORPH_SAFE, size * (1 + MORPH_PULL));
  const elevOf = m => m === 'office' ? ocam.elev : Math.PI / 2 - cam.phi; // live: right-drag changes the city tilt
  const clamp01 = v => Math.max(0, Math.min(1, v)), smooth = v => v * v * (3 - 2 * v), shown = p => p && !p.behind ? p : null;
  // Home framing of view m and where every agent would be seen there (same camera math, measured synchronously, no render).
  function measureHome(m) {
    const c = camOf(m), saved = { ...c }, prev = mode; mode = m; homePose(); const home = { ...c };
    gl.applyCamera(); const pts = new Map(scene.map(a => [a.id, shown(agentPoint(a))]));
    Object.assign(c, saved); mode = prev; gl.applyCamera();
    return { home, pts };
  }
  function ghostClone(el) {
    const g = el.cloneNode(true);
    for (const n of [g, ...g.querySelectorAll('*')]) for (const at of ['data-action', 'data-id', 'data-node', 'data-card', 'title', 'aria-label']) n.removeAttribute(at);
    g.classList.remove('walking'); g.tabIndex = -1; return g;
  }
  function sporeField() {
    const layers = [[28, 1, '#bfeaf5'], [18, 1.6, '#30c5e8'], [9, 2.6, '#e6fbff']];
    cinema.querySelectorAll('i').forEach((el, k) => { const [count, size, color] = layers[k]; el.style.boxShadow = Array.from({ length: count }, () => `${Math.round(Math.random() * width)}px ${Math.round(Math.random() * (height + 260))}px 0 ${size}px ${color}${['44', '77', 'aa'][Math.floor(Math.random() * 3)]}`).join(','); });
  }
  // Beam, cinema frame (letterbox, vignette, spores) and ghost layer; also created at idle after boot so the first toggle is smooth.
  function ensureMorphLayers() {
    if (ghostLayer) return;
    morphFx = document.createElement('div'); morphFx.className = 'map-morph-fx';
    cinema = document.createElement('div'); cinema.className = 'map-cinema'; cinema.innerHTML = '<i></i><i></i><i></i>';
    ghostLayer = document.createElement('div'); ghostLayer.className = 'map-morph-ghosts';
    for (const el of [morphFx, cinema, ghostLayer]) { el.setAttribute('aria-hidden', 'true'); viewport.appendChild(el); }
    sporeField();
  }
  function finishMorph() { if (!morphRun) return; const r = morphRun; cancelTween(r); r.step(1); r.done(); }
  function morph(next, swap) {
    const prev = mode, c0 = camOf(prev);
    const cardsOut = prev === 'office' ? lastCards.filter(el => el.style.left) : []; // before lifeReset() lays out zero cards
    lifeReset(); dragging = null; viewport.classList.remove('dragging', 'hex-hover-empty'); gl.hover(null);
    gl.ensureOffice(); gl.prepareOffice(); // needed to measure the office; the async shader compile overlaps the out phase
    morphing = true;
    const src = new Map(scene.map(a => [a.id, shown(agentPoint(a))])), out = measureHome(prev), dst = measureHome(next).pts;
    ensureMorphLayers(); sporeField(); ghostLayer.replaceChildren();
    const nodes = [...document.querySelectorAll('#mapNodes .map-node[data-node]')], last = Math.max(1, nodes.length - 1), scaleOf = (m, sel) => m === 'office' ? (sel ? .82 : .72) : 1;
    const ghosts = nodes.map((el, i) => {
      const id = el.dataset.node, from = src.get(id), to = dst.get(id); if (!from && !to) return null;
      const sel = el.classList.contains('selected'), g = ghostClone(el); ghostLayer.appendChild(g);
      const lift = from && to ? Math.min(150, 40 + Math.hypot(to.x - from.x, to.y - from.y) * .25) : 0;
      return { id, el: g, from, to, lift, delay: i / last * .1, s0: scaleOf(prev, sel), s1: scaleOf(next, sel) };
    }).filter(Boolean);
    const cards = cardsOut.map(el => { const g = ghostClone(el), p = src.get(el.dataset.card); if (p) g.style.transformOrigin = `${(p.x - parseFloat(el.style.left)).toFixed(1)}px ${(p.y - parseFloat(el.style.top)).toFixed(1)}px`; ghostLayer.appendChild(g); return g; });
    clearTimeout(landTimer); viewport.classList.remove('morph-in', 'morph-swap', 'morph-land'); viewport.classList.add('map-morphing', 'morph-out');
    const a0 = { theta: c0.theta, tx: c0.tx, tz: c0.tz, size: sizeOf(prev) }, h0 = out.home, outSize = pulledSize(prev, sizeOf(prev, h0)), eOut = elevOf(prev);
    const flipBack = v => 1 + 2.1 * Math.pow(v - 1, 3) + 1.1 * Math.pow(v - 1, 2); // ease-out with a ~5% overshoot
    let swapped = false, rose = false, c1 = null, b = null, inSize = 0, eIn = 0;
    function moveGhosts(k) {
      const cap = next === 'office' ? 1 - clamp01(k / .26) : clamp01((k - .62) / .3); // city captions fade out before / in after the cut
      for (const g of ghosts) {
        const t = clamp01((k - g.delay) / (.9 - g.delay)), e = (1 - Math.cos(Math.PI * t)) / 2;
        let x, y, o = 1;
        if (g.from && g.to) { const u = 1 - e, mx = (g.from.x + g.to.x) / 2, my = (g.from.y + g.to.y) / 2 - g.lift; x = u * u * g.from.x + 2 * u * e * mx + e * e * g.to.x; y = u * u * g.from.y + 2 * u * e * my + e * e * g.to.y; }
        else if (g.to) { x = g.to.x; y = g.to.y; o = clamp01((k - .5) / .35); }
        else { x = g.from.x; y = g.from.y; o = 1 - clamp01(k / .3); }
        // Near the end the icon rides the arriving world (live projection, camera pose included) and lands on the real marker.
        if (swapped && g.to) { const a = scene.find(s => s.id === g.id), live = a && shown(agentPoint(a)); if (live) { const w = smooth(clamp01((k - .66) / .28)); x += (live.x - x) * w; y += (live.y - y) * w; } }
        g.el.style.left = `${x.toFixed(1)}px`; g.el.style.top = `${y.toFixed(1)}px`; g.el.style.opacity = o;
        g.el.style.transform = `translate(-50%,-50%) scale(${(g.s0 + (g.s1 - g.s0) * e).toFixed(3)})`; g.el.style.setProperty('--cap', cap.toFixed(3));
      }
      const c = clamp01(k / .3);
      for (const el of cards) { el.style.opacity = 1 - c; el.style.transform = `scale(${1 - .85 * c * c})`; }
    }
    function step(k) {
      if (k < MORPH_SPLIT) {
        const u = k / MORPH_SPLIT, e = u * u, m = smooth(u); // quadratic: the tilt and the spin start right away
        c0.theta = a0.theta + MORPH_SPIN * e; c0.tx = a0.tx + (h0.tx - a0.tx) * m; c0.tz = a0.tz + (h0.tz - a0.tz) * m;
        setSize(prev, a0.size + (outSize - a0.size) * m); pose.flip = -eOut * e;
      } else {
        if (!swapped) {
          swapped = true; pose.flip = 0; swap(); c1 = camOf(mode); b = { theta: c1.theta, size: sizeOf(mode) }; inSize = pulledSize(mode, b.size); eIn = elevOf(mode);
          if (mode === 'city') gl.sinkCity();
          viewport.classList.replace('morph-out', 'morph-in'); void morphFx.offsetWidth; viewport.classList.add('morph-swap');
        }
        const v = (k - MORPH_SPLIT) / (1 - MORPH_SPLIT), e = 1 - Math.pow(1 - v, 3);
        c1.theta = b.theta - MORPH_SPIN * (1 - e); setSize(mode, inSize + (b.size - inSize) * e); pose.flip = (Math.PI - eIn) * (1 - flipBack(v));
        if (!rose && k >= RISE_AT && mode === 'city') { rose = true; gl.riseCity(RISE_MS); }
      }
      gl.applyCamera(); moveGhosts(k);
    }
    morphRun = tween(MORPH_MS, step, () => {
      morphRun = null; pose.flip = 0; commitCamera(); morphing = false; ghostLayer.replaceChildren();
      viewport.classList.remove('map-morphing', 'morph-out', 'morph-in', 'morph-swap'); viewport.classList.add('morph-land');
      landTimer = setTimeout(() => viewport.classList.remove('morph-land'), 900);
      if (mode === 'city') { if (!rose) gl.riseCity(RISE_MS); for (const a of scene) if (inGrid(a.hex)) gl.pulseAt(a.hex, { duration: 650, grow: 1.8 }); }
      const q = queuedMode; queuedMode = null; if (q && q !== mode) setMode(q);
    });
  }

  /* ---------- office life: purely visual. Now and then agents walk to other rooms for a meeting, a visit, a call or a
     break, with a transmission badge over their heads and arcs between who is talking. Their real desks never change. ---------- */
  const LIFE_SPEED = 4.5, LIFE_KINDS = [['meeting', .4], ['visit', .3], ['call', .15], ['pause', .15]];
  const LIFE_DUR = { meeting: [8000, 14000], visit: [5000, 8000], call: [6000, 10000], pause: [5000, 9000] };
  const LIFE_LABEL = { meeting: 'REUNIÃO', visit: 'CONVERSA', call: 'EM CALL', pause: 'PAUSA' };
  const LIFE_ICON = {
    meeting: '<path d="M5.5 11a6.5 6.5 0 0 1 13 0M8.5 11a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="11" r="1.2"/><path d="M12 12.2V20M9 20h6"/>',
    visit: '<path d="M4 5h10v7H9l-3 3v-3H4Z"/><path d="M14 9h6v7h-2v3l-3-3h-3v-2"/>',
    call: '<path d="M4 14a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/>',
    pause: '<path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M11 3.5v2.5M14 3.5v2.5"/>'
  };
  const lifeRand = (a, b) => a + Math.random() * (b - a), lifeShuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  function lifeOn() { return mode === 'office' && !!gl && booted && !paused && !linkMode && !morphing && !reducedMotion(); }
  // The visual position of an agent that is away from its desk (not while it is dragged or moved by the person).
  function lifePos(a) { const ac = life.actors.get(a.id); if (!ac || (dragging && dragging.nodeId === a.id) || (moving && moving.id === a.id)) return null; return ac.pos; }
  function doorOf(code) { const r = ROOM_BY_CODE.get(code), side = r.z < 0 ? r.z + r.d : r.z; return { x: r.x + r.w / 2, inZ: side + (r.z < 0 ? -.8 : .8) }; }
  const roomAt = (x, z) => ROOMS.find(r => x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d)?.code || null;
  // Walk through the doors: out of the room, along the corridor (z = 0), into the other room.
  function officePath(from, to) {
    const ra = roomAt(from.x, from.z), rb = roomAt(to.x, to.z), pts = [{ ...from }];
    if (ra !== rb) { if (ra) { const d = doorOf(ra); pts.push({ x: d.x, z: d.inZ }, { x: d.x, z: 0 }); } if (rb) { const d = doorOf(rb); pts.push({ x: d.x, z: 0 }, { x: d.x, z: d.inZ }); } }
    pts.push({ ...to }); return pts;
  }
  function lifeHome(a) { const sl = SLOT_BY_ID.get(a.desk); return sl ? seatOf(sl) : null; }
  function lifeActor(a) { let ac = life.actors.get(a.id); if (!ac) { const home = lifeHome(a); if (!home) return null; ac = { id: a.id, pos: { ...home }, home, path: null, seg: 0, act: null, badge: null, spot: null }; life.actors.set(a.id, ac); } return ac; }
  function walkTo(ac, to) { ac.path = officePath(ac.pos, to); ac.seg = 0; }
  function stepActor(ac, dist) {
    while (dist > 0 && ac.path) {
      const target = ac.path[ac.seg + 1]; if (!target) { ac.path = null; break; }
      const dx = target.x - ac.pos.x, dz = target.z - ac.pos.z, d = Math.hypot(dx, dz);
      if (d <= dist) { ac.pos = { ...target }; dist -= d; ac.seg++; if (ac.seg >= ac.path.length - 1) ac.path = null; }
      else { ac.pos = { x: ac.pos.x + dx / d * dist, z: ac.pos.z + dz / d * dist }; dist = 0; }
    }
  }
  // Who can wander: not the agent running the operation (nor the ones in its active arcs), not dragged, moved or already busy.
  function lifeEligible() {
    const busy = new Set([running.id, moving?.id, dragging?.nodeId, ...links.filter(l => l.active).flatMap(l => [l.from, l.to])]);
    return lifeShuffle(scene.filter(a => SLOT_BY_ID.has(a.desk) && !busy.has(a.id) && !life.actors.get(a.id)?.act));
  }
  function lifeFreeSlots(room) {
    const taken = new Set([...occupiedDesks.keys(), ...scene.map(a => a.desk), ...[...life.actors.values()].map(ac => ac.spot).filter(Boolean)]);
    return lifeShuffle(SLOTS.filter(s => s.room === room && !taken.has(s.id)));
  }
  function lifeStart(kind) {
    const pool = lifeEligible(), act = { kind, members: [], state: 'gather', until: 0 };
    if (kind === 'meeting') {
      if (pool.length < 2) return false;
      let seats = lifeFreeSlots('R');
      if (seats.length < 2) { const alt = ROOMS.filter(r => r.code !== 'R').map(r => lifeFreeSlots(r.code)).sort((x, y) => y.length - x.length)[0]; if (!alt || alt.length < 2) return false; seats = alt; }
      const members = pool.slice(0, Math.min(pool.length, seats.length, 2 + Math.floor(Math.random() * 3)));
      members.forEach((a, i) => { const ac = lifeActor(a); ac.act = act; ac.spot = seats[i].id; walkTo(ac, seatOf(seats[i])); act.members.push(a.id); });
    } else if (kind === 'visit') {
      if (pool.length < 2) return false;
      const guest = pool[0], room = SLOT_BY_ID.get(guest.desk).room, host = pool.slice(1).find(h => SLOT_BY_ID.get(h.desk).room !== room) || pool[1];
      const hs = lifeHome(host), g = lifeActor(guest), h = lifeActor(host);
      g.act = h.act = act; walkTo(g, { x: hs.x + (Math.random() < .5 ? -.95 : .95), z: hs.z }); act.members.push(guest.id, host.id);
    } else if (kind === 'call') {
      if (!pool.length) return false; lifeActor(pool[0]).act = act; act.members.push(pool[0].id);
    } else if (kind === 'pause') {
      const a = pool[0]; if (!a) return false; const own = SLOT_BY_ID.get(a.desk).room, spots = ['COW', 'LAB', 'FOC'].filter(r => r !== own).flatMap(lifeFreeSlots);
      if (!spots.length) return false; const s = spots[0], ac = lifeActor(a); ac.act = act; ac.spot = s.id; walkTo(ac, seatOf(s)); act.members.push(a.id);
    } else return false;
    life.acts.push(act); return true;
  }
  function lifeOrder() { const out = [], pool = LIFE_KINDS.map(k => [...k]); while (pool.length) { let r = Math.random() * pool.reduce((s, k) => s + k[1], 0), i = 0; while (i < pool.length - 1 && (r -= pool[i][1]) > 0) i++; out.push(pool.splice(i, 1)[0][0]); } return out; }
  // Arcs with packets going both ways between who is talking (meetings in a ring, visits between guest and host).
  function lifeArcs() {
    const pairs = [];
    for (const act of life.acts) if (act.state === 'active' && (act.kind === 'meeting' || act.kind === 'visit')) {
      const pts = act.members.map(id => life.actors.get(id)?.pos).filter(Boolean);
      if (pts.length === 2) pairs.push([pts[0], pts[1]]); else if (pts.length > 2) pts.forEach((p, i) => pairs.push([p, pts[(i + 1) % pts.length]]));
    }
    gl?.lifeArcs(pairs);
  }
  function lifeEnd(act) {
    act.state = 'return'; act.members.forEach(id => { const ac = life.actors.get(id), a = scene.find(x => x.id === id); if (!ac) return; ac.badge = null; ac.spot = null; const home = a && lifeHome(a); if (home) ac.home = home; walkTo(ac, ac.home); });
    lifeArcs();
  }
  function lifeReset() {
    if (!life.acts.length && !life.actors.size) return;
    life.acts = []; life.actors.clear(); gl?.lifeArcs([]);
    for (const el of viewport.querySelectorAll('.walking')) el.classList.remove('walking');
    updatePositions(); invalidate();
  }
  // The agent dragged by the person goes back to its desk at once; the rest of its activity ends (the others walk back).
  function lifeRelease(id) { const ac = life.actors.get(id); if (!ac) return; if (ac.act && ac.act.state !== 'return') lifeEnd(ac.act); if (ac.act) ac.act.members = ac.act.members.filter(x => x !== id); life.actors.delete(id); updatePositions(); }
  function lifeTick(t) {
    if (!lifeOn()) { life.nextAt = 0; life.last = 0; if (life.acts.length || life.actors.size) { lifeReset(); return true; } return false; }
    if ([...life.actors.keys()].some(id => !scene.some(a => a.id === id))) { lifeReset(); return true; }
    const dt = life.last ? Math.min(100, t - life.last) : 16; life.last = t;
    if (!life.nextAt) life.nextAt = t + lifeRand(3000, 5000);
    if (t >= life.nextAt) { life.nextAt = t + lifeRand(6000, 12000); if (life.acts.length < (scene.length < 5 ? 1 : 2)) for (const k of lifeOrder()) if (lifeStart(k)) break; }
    let changed = false;
    for (const ac of life.actors.values()) if (ac.path) { stepActor(ac, LIFE_SPEED * dt / 1000); changed = true; }
    for (const act of [...life.acts]) {
      const acs = act.members.map(id => life.actors.get(id)).filter(Boolean);
      if (!acs.length) { life.acts.splice(life.acts.indexOf(act), 1); continue; }
      if (act.state === 'gather' && acs.every(ac => !ac.path)) { act.state = 'active'; act.until = t + lifeRand(...LIFE_DUR[act.kind]); acs.forEach(ac => { ac.badge = act.kind; }); lifeArcs(); changed = true; }
      else if (act.state === 'active' && t >= act.until) { lifeEnd(act); changed = true; }
      else if (act.state === 'return' && acs.every(ac => !ac.path)) { life.acts.splice(life.acts.indexOf(act), 1); acs.forEach(ac => life.actors.delete(ac.id)); changed = true; }
    }
    return changed;
  }
  // Badges over the heads: a small pill (icon + label) with transmission waves, pinned to the agent's visual position.
  function placeLifeBadges() {
    if (!life.layer) { if (!life.actors.size) return; life.layer = document.createElement('div'); life.layer.className = 'life-layer'; life.layer.setAttribute('aria-hidden', 'true'); viewport.appendChild(life.layer); }
    const want = new Map([...life.actors.values()].filter(ac => ac.badge).map(ac => [ac.id, ac.badge]));
    for (const [id, el] of life.els) if (want.get(id) !== el.dataset.kind) { el.remove(); life.els.delete(id); }
    for (const [id, kind] of want) {
      let el = life.els.get(id);
      if (!el) { el = document.createElement('div'); el.className = `life-badge ${kind}`; el.dataset.kind = kind; el.innerHTML = `<i></i><svg viewBox="0 0 24 24">${LIFE_ICON[kind]}</svg><span>${LIFE_LABEL[kind]}</span>`; life.layer.appendChild(el); life.els.set(id, el); }
      const a = scene.find(x => x.id === id), p = a && agentPoint(a);
      if (!p || p.behind || mode !== 'office') { el.style.visibility = 'hidden'; continue; }
      el.style.visibility = ''; el.style.left = `${p.x.toFixed(1)}px`; el.style.top = `${p.y.toFixed(1)}px`;
    }
  }

  /* ---------- move mode (bubble "Deslocar"): the next click on a free hex or desk moves the agent there ---------- */
  const MOVE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>';
  const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sameTarget = (a, b) => a === b || (!!a && !!b && (typeof a === 'string' || typeof b === 'string' ? a === b : hexKey(a) === hexKey(b)));
  function whoAt(target) {
    const a = scene.find(x => mode === 'office' ? x.desk === target : inGrid(x.hex) && hexKey(x.hex) === hexKey(target)); if (a) return a.name;
    const id = mode === 'office' ? occupiedDesks.get(target) : occupied.get(hexKey(target)); return (id && occupiedNames.get(id)) || '';
  }
  function startMove(id) {
    lifeReset(); // everyone back at their desks, so the free spots are the real ones
    const a = scene.find(x => x.id === id); if (!a || paused || linkMode) return;
    if (moving) cancelMove();
    moving = { id, target: null };
    if (!moveHint) {
      moveHint = document.createElement('div'); moveHint.className = 'map-move-hint'; viewport.appendChild(moveHint);
      moveHint.addEventListener('click', e => { if (e.target.closest('[data-move-cancel]')) cancelMove(); });
      moveTip = document.createElement('div'); moveTip.className = 'map-move-tip'; moveTip.hidden = true; viewport.appendChild(moveTip);
    }
    moveHint.innerHTML = `${MOVE_SVG}<strong>DESLOCANDO ${escHtml(a.name)}</strong><span>Clique em ${mode === 'office' ? 'uma mesa livre' : 'um hexágono livre'}</span><button type="button" data-move-cancel>Cancelar</button>`;
    moveHint.hidden = false; viewport.classList.add('map-moving'); gl?.sync(); updatePositions(); invalidate();
  }
  function cancelMove() {
    if (!moving) return; moving = null; viewport.classList.remove('map-moving', 'hex-hover-empty');
    if (moveHint) { moveHint.hidden = true; moveTip.hidden = true; }
    gl?.hover(null); gl?.sync(); updatePositions(); invalidate();
  }
  function moveTipText(target, valid) {
    const self = scene.find(x => x.id === moving.id), mine = !!self && (mode === 'office' ? self.desk === target : inGrid(self.hex) && hexKey(self.hex) === hexKey(target)), who = !valid && whoAt(target);
    if (mode === 'office') { const sl = SLOT_BY_ID.get(target), room = ROOM_BY_CODE.get(sl.room)?.name || sl.room; return `Mesa ${target} · ${room} · ${mine ? 'posição atual' : valid ? 'livre' : 'ocupada' + (who ? ' por ' + who : '')}`; }
    return mine ? 'Posição atual' : valid ? 'Slot livre' : 'Ocupado' + (who ? ' por ' + who : '');
  }
  // Hover in move mode: the agent previews the free target under the cursor, and a tip names the spot.
  function moveHover(p, target) {
    const valid = !!target && isFree(target, moving.id), prev = moving.target;
    moving.target = valid ? target : null;
    gl?.hover(target, valid); viewport.classList.toggle('hex-hover-empty', valid);
    if (!target) moveTip.hidden = true;
    else { moveTip.hidden = false; moveTip.classList.toggle('bad', !valid); moveTip.textContent = moveTipText(target, valid); moveTip.style.left = `${Math.min(p.x + 16, width - moveTip.offsetWidth - 8)}px`; moveTip.style.top = `${p.y + 18}px`; }
    if (!sameTarget(prev, moving.target)) { gl?.sync(); updatePositions(); }
    invalidate();
  }
  function commitMove(target) {
    const id = moving.id, a = scene.find(x => x.id === id); cancelMove(); if (!a) return;
    if (mode === 'office') { if (a.desk === target) return; a.desk = target; onPosition(id, { desk: target }); }
    else { if (inGrid(a.hex) && hexKey(a.hex) === hexKey(target)) return; a.hex = { ...target }; onPosition(id, { hex: { ...target } }); gl?.pulseAt(target); }
    gl?.sync(); updatePositions(); invalidate();
  }

  /* ---------- pointer interaction ---------- */
  let dragging = null, pointers = new Map(), pinchDistance = 0, lastTap = { t: 0, x: 0, y: 0 }, lastPanMoved = false;
  viewport.addEventListener('contextmenu', e => e.preventDefault());
  viewport.addEventListener('wheel', event => { if (document.getElementById('modalRoot').children.length) return; event.preventDefault(); const p = local(event); zoom(Math.exp(-event.deltaY * .0012), p.x, p.y); }, { passive: false });
  viewport.addEventListener('pointerdown', event => {
    // The quick-action bubbles of the selected agent are plain buttons: no pan, no capture, no empty click.
    if (event.target.closest('.node-actions,.map-move-hint')) return;
    if (event.pointerType === 'touch') { pointers.set(event.pointerId, local(event)); if (pointers.size === 2) { dragging = null; const p = [...pointers.values()]; pinchDistance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); return; } }
    const node = event.target.closest('.map-node,.agent-card');
    // Click-and-hold drags an agent between desks (office) or hexes (city).
    if (node && event.button !== 0) return;
    if (event.button !== 0 && event.button !== 2) return;
    const p = local(event), c0 = mode === 'office' ? ocam : cam;
    dragging = { mode: node ? 'node' : event.button === 2 ? 'rotate' : 'pan', x: p.x, y: p.y, start: groundAt(p.x, p.y), theta: c0.theta, phi: cam.phi, nodeId: node ? node.dataset.node || node.dataset.card : null, hex: null, desk: null, moved: false, type: event.pointerType, button: event.button, pointerId: event.pointerId, captured: false };
    // A plain click on a node must still reach the button (select / double click), so capture only once it moves.
    if (!node) { viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging'); dragging.captured = true; }
    if (node) event.preventDefault();
  });
  viewport.addEventListener('pointermove', event => {
    const p = local(event);
    if (pointers.has(event.pointerId)) { pointers.set(event.pointerId, p); if (pointers.size === 2) { const q = [...pointers.values()], d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y); if (pinchDistance > 0) zoom(d / pinchDistance, (q[0].x + q[1].x) / 2, (q[0].y + q[1].y) / 2); pinchDistance = d; return; } }
    if (!dragging) {
      if (moving) { moveHover(p, event.target.closest('.map-node,.agent-card,.node-actions,.map-move-hint') ? null : targetAt(p.x, p.y)); return; }
      if (event.target.closest('.map-node,.agent-card,.node-actions')) { gl?.hover(null); viewport.classList.remove('hex-hover-empty'); invalidate(); return; }
      const target = targetAt(p.x, p.y), empty = !!target && isFree(target);
      gl?.hover(target, empty); viewport.classList.toggle('hex-hover-empty', empty); invalidate(); return;
    }
    const dx = p.x - dragging.x, dy = p.y - dragging.y; if (!dragging.moved && Math.abs(dx) + Math.abs(dy) > 5) { dragging.moved = true; if (dragging.mode === 'node') lifeRelease(dragging.nodeId); }
    if (dragging.mode === 'node' && !dragging.moved) return;
    if (!dragging.captured) { dragging.captured = true; viewport.setPointerCapture(dragging.pointerId); viewport.classList.add('dragging'); }
    if (dragging.mode === 'node') {
      const target = targetAt(p.x, p.y);
      // The marker previews only a valid drop target; over an occupied spot it stays at its own place.
      const valid = target && isFree(target, dragging.nodeId) ? target : null;
      if (mode === 'office') dragging.desk = valid; else dragging.hex = valid;
      gl?.hover(target, !!target && isFree(target, dragging.nodeId)); gl?.sync(); updatePositions();
    } else if (dragging.mode === 'rotate') {
      if (mode === 'office') ocam.theta = dragging.theta - dx * .006;
      else { cam.theta = dragging.theta - dx * .006; cam.phi = Math.max(.5, Math.min(1.22, dragging.phi + dy * .004)); }
      commitCamera();
    } else if (!dragging.start && mode === 'city' && planet.b > .999) {
      // Grabbed off the planet: spin it by the screen delta (right = world moves right, down = the surface rolls toward you).
      const k = cam.distance / height * 1.1, ddx = p.x - (dragging.lx ?? dragging.x), ddy = p.y - (dragging.ly ?? dragging.y), c = Math.cos(cam.theta), sn = Math.sin(cam.theta);
      dragging.lx = p.x; dragging.ly = p.y; cam.tx += (-ddx * c - ddy * sn) * k; cam.tz += (ddx * sn - ddy * c) * k; clampTarget(cam); commitCamera();
    } else if (dragging.start) {
      if (gl) gl.applyCamera(); const at = groundAt(p.x, p.y), c0 = mode === 'office' ? ocam : cam;
      if (at) { c0.tx += dragging.start.x - at.x; c0.tz += dragging.start.z - at.z; clampTarget(c0); }
      commitCamera();
    }
  });
  const pointerEnd = event => {
    pointers.delete(event.pointerId); if (pointers.size < 2) pinchDistance = 0;
    if (!dragging) return;
    const d = dragging; dragging = null; viewport.classList.remove('dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (d.mode === 'node') {
      const a = scene.find(x => x.id === d.nodeId);
      if (a && d.moved && mode === 'office' && d.desk && isFreeDesk(d.desk, a.id) && d.desk !== a.desk) { a.desk = d.desk; onPosition(a.id, { desk: d.desk }); }
      else if (a && d.moved && mode === 'city' && d.hex && isFreeHex(d.hex, a.id) && hexKey(d.hex) !== hexKey(a.hex)) { a.hex = { ...d.hex }; onPosition(a.id, { hex: { ...d.hex } }); gl?.pulseAt(d.hex); }
      gl?.sync(); updatePositions(); invalidate(); return;
    }
    // Double tap on touch screens creates an agent, like a double click with the mouse.
    if (d.type === 'touch' && !d.moved && event.type === 'pointerup' && !moving) {
      const p = local(event), t = now();
      if (t - lastTap.t < 350 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 24) { lastTap.t = 0; createAt(p.x, p.y); } else lastTap = { t, x: p.x, y: p.y };
    }
    // A plain click on an empty spot (a desk/hex without a squad agent, or bare floor) clears the selection.
    if (d.mode === 'pan' && !d.moved && d.button === 0 && event.type === 'pointerup') {
      const p = local(event), target = targetAt(p.x, p.y);
      // Move mode: a click on a free target moves the agent; anywhere else it only shakes the tip.
      if (moving) { if (target && isFree(target, moving.id)) commitMove(target); else { moveHover(p, target); moveTip.classList.remove('flash'); void moveTip.offsetWidth; moveTip.classList.add('flash'); } lastPanMoved = d.moved; return; }
      const busy = target && (mode === 'office' ? scene.some(a => a.desk === target) : scene.some(a => inGrid(a.hex) && hexKey(a.hex) === hexKey(target)));
      if (!busy) onEmptyClick();
    }
    lastPanMoved = d.moved;
  };
  viewport.addEventListener('pointerup', pointerEnd); viewport.addEventListener('pointercancel', pointerEnd);
  viewport.addEventListener('pointerleave', () => { if (!dragging) { gl?.hover(null); viewport.classList.remove('hex-hover-empty'); invalidate(); } });
  function createAt(sx, sy) { const target = targetAt(sx, sy); if (!target || !isFree(target)) return; onCreateAt(mode === 'office' ? { desk: target } : { hex: { ...target } }); }
  viewport.addEventListener('dblclick', event => { if (event.target.closest('.map-node,.agent-card,.node-actions,.map-move-hint') || lastPanMoved || moving) return; const p = local(event); createAt(p.x, p.y); });

  /* ---------- render loop ---------- */
  function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden || paused) return;
    // A long frame (e.g. a first render compiling shaders) pauses the tweens instead of letting them skip to the end.
    for (const tw of tweens) { if (tw.last && t - tw.last > 100) tw.t0 += t - tw.last - 17; tw.last = t; }
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i], k = Math.min(1, (t - tw.t0) / tw.duration); tw.step(k); if (k >= 1) { tweens.splice(i, 1); tw.done?.(); } }
    const continuous = gl && !reducedMotion();
    if (!needsRender && !tweens.length && !continuous) return;
    if (continuous && !needsRender && !tweens.length && t - lastFrame < 30) return;
    lastFrame = t; needsRender = false;
    const lifeMoved = lifeTick(t);
    if (gl) { gl.animate(t); gl.render(); }
    if (tweens.length || lifeMoved) updatePositions();
  }
  viewport.dataset.view = mode;
  resize(); requestAnimationFrame(frame); window.addEventListener('resize', resize);

  return {
    set(data) {
      scene = data.agents; links = data.links || []; selected = data.selected; linkMode = !!data.handoffMode; motion = !!data.motion;
      running = { id: data.running?.id || '', paused: !!data.running?.paused };
      const wasPaused = paused; paused = !!data.paused;
      // The frame loop stops behind the Painel: a transmorph in progress (and the buildings' wave) ends at once instead of freezing.
      if (paused || reducedMotion()) { finishMorph(); finishCurl(); gl?.finishRise(); }
      // City shape: instant on boot, behind the Painel or with reduced motion; otherwise the city rolls into the planet (or back).
      const shape = data.cityShape === 'planet' && gl ? 'planet' : 'flat';
      if (shape !== planet.want) setShape(shape, booted && !paused && !reducedMotion() && !morphing);
      occupied = new Map((data.occupied || []).filter(o => inGrid(o.hex)).map(o => [hexKey(o.hex), o.id]));
      occupiedDesks = new Map((data.occupied || []).filter(o => SLOT_BY_ID.has(o.desk)).map(o => [o.desk, o.id]));
      occupiedNames = new Map((data.occupied || []).map(o => [o.id, o.name || '']));
      if (moving && (paused || linkMode || !scene.some(a => a.id === moving.id))) cancelMove();
      if (paused || linkMode || !motion) lifeReset();
      if (gl) gl.sync(); updatePositions(); invalidate();
      if (!booted && gl) setTimeout(() => (window.requestIdleCallback || setTimeout)(() => { gl?.prepareOffice(); ensureMorphLayers(); }), 1200);
      booted = true;
      if (wasPaused && !paused) commitCamera();
    },
    setMode, getMode: () => mode,
    startMove, cancelMove, isMoving: () => moving?.id || null,
    // Office life inspection / trigger (tests and debugging).
    officeLife: { state: () => ({ on: lifeOn(), acts: life.acts.map(a => ({ kind: a.kind, state: a.state, members: [...a.members] })), actors: [...life.actors.values()].map(ac => ({ id: ac.id, walking: !!ac.path, x: +ac.pos.x.toFixed(2), z: +ac.pos.z.toFixed(2), badge: ac.badge })) }), kick: kind => lifeOn() && lifeStart(kind) },
    home() { if (!morphing && !curling) home(); }, zoom, rotate, updatePositions, focus,
    // Planet mode inspection / manual blend (tests and debugging).
    planet: { state: () => ({ b: planet.b, want: planet.want, curling }), blend(b) { if (!gl) return; finishCurl(); planet.b = Math.max(0, Math.min(1, b)); gl.setPlanet(planet.b); commitCamera(); } },
    hexCenter(q, r) { const w = hexToWorld(q, r); const p = projectWorld(w.x, TILE_H, w.z); return { x: p.x, y: p.y }; },
    hexAt(sx, sy) { return hexAtScreen(sx, sy); },
    deskCenter(id) { const sl = SLOT_BY_ID.get(id); if (!sl) return null; const seat = seatOf(sl), p = projectWorld(seat.x, .05, seat.z); return { x: p.x, y: p.y }; },
    deskAt(sx, sy) { return deskAtScreen(sx, sy); },
    deskStatus(id) { return gl?.deskStatus(id) || null; },
    officeSlots() { return SLOTS.map(sl => ({ id: sl.id, room: sl.room })); },
    officeRooms() { return ROOMS.map(r => ({ code: r.code, name: r.name })); },
    pulse(agentId) { const a = scene.find(x => x.id === agentId); if (a && gl && mode === 'city' && inGrid(a.hex)) gl.pulseAt(a.hex); },
    onPosition(fn) { onPosition = fn; },
    onCreateAt(fn) { onCreateAt = fn; },
    onEmptyClick(fn) { onEmptyClick = fn; },
    getCamera() { return mode === 'office' ? { ...ocam, scale: ocam.zoom / ocam.base, webgl: !!gl, mode } : { ...cam, scale: cam.base / cam.distance, webgl: !!gl, mode }; },
    GRID, inGrid, hexDistance, hexKey, hexToWorld
  };
})();
