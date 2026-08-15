/* =========================================================
   GANCHITO — configurador 3D de mesa (v3: taller + abanico)
   Requiere Three.js r128 y taller-interior.js cargados antes
   de este script (en ese orden).
   ========================================================= */

(function () {

  const COLORES = {
    negro:     { hex: '#1a1a1a', label: 'Negro' },
    navy:      { hex: '#14213E', label: 'Navy' },
    mostaza:   { hex: '#C2872E', label: 'Mostaza' },
    rojo:      { hex: '#C0392B', label: 'Rojo' },
    oliva:     { hex: '#5C6B4C', label: 'Oliva' },
    terracota: { hex: '#A0522D', label: 'Terracota' },
    celeste:   { hex: '#1A5276', label: 'Celeste' },
    crema:     { hex: '#F7F3EC', label: 'Crema' },
  };

  const WANUM = (typeof WHATSAPP_NUMBER !== 'undefined')
    ? WHATSAPP_NUMBER
    : '5492284354090';

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CM = 1 / 20;

  const MEDIDAS_CM = {
    'ratona-madera': { w: 40, d: 30, h: 30 },
    'ratona-metal':  { w: 60, d: 45, h: 30 },
    'cubo':          { w: 25, d: 25, h: 30 },
    'monolitica':    { w: 50, d: 30, h: 35 },
  };
  function dimsFor(tipo) {
    const m = MEDIDAS_CM[tipo] || MEDIDAS_CM['ratona-madera'];
    return { w: m.w * CM, d: m.d * CM, h: m.h * CM };
  }

  function tipoActual() {
    return estadoBase() === 'ratona' ? ('ratona-' + estado.patas) : estadoBase();
  }
  function estadoBase() { return estado.base; }
  function nombreTipo(base, patas) {
    if (base === 'ratona') return `Mesa ratona · patas de ${patas === 'metal' ? 'metal' : 'madera'}`;
    if (base === 'cubo') return 'Mesa cubo';
    return 'Mesa monolítica';
  }

  const SHOWROOM_PRESETS = {
    'ratona':     { x: -5.2, z: 0.6,  giro:  0.55, color: 'negro',     color2: 'crema', patron: 'damero',   grande: false, patas: 'madera' },
    'monolitica': { x:  0,   z: -1.2, giro:  0,     color: 'mostaza',  color2: 'crema', patron: 'guarda',   grande: false },
    'cubo':       { x:  5.2, z: 0.6,  giro: -0.55, color: 'terracota',color2: 'crema', patron: 'diagonal', grande: false },
  };

  let estado = {
    base:    'ratona',
    patas:   'madera',
    patron:  'damero',
    tamano:  'chico',
    color:   'negro',
    color2:  'crema',
  };

  let mode = 'overview';
  let needsRender = true;

  function makeMosaicTexture(colorKey, color2Key, patron, grande) {
    const c1 = COLORES[colorKey]  ? COLORES[colorKey].hex  : '#1a1a1a';
    const c2 = COLORES[color2Key] ? COLORES[color2Key].hex : '#F7F3EC';
    const junta = '#CCBFAE';

    const cols = grande ? 4 : 8;
    const rows = grande ? 4 : 8;
    const size = 512;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const tW = size / cols, tH = size / rows;
    const gap = grande ? 6 : 3;

    ctx.fillStyle = junta;
    ctx.fillRect(0, 0, size, size);

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        let color;
        switch (patron) {
          case 'damero':
            color = (r + col) % 2 === 0 ? c1 : c2;
            break;
          case 'guarda':
            color = (r === 0 || r === rows - 1 || col === 0 || col === cols - 1) ? c1 : c2;
            break;
          case 'diagonal':
            color = (r === col || r === cols - 1 - col) ? c1 : c2;
            break;
          case 'uniforme':
          default:
            color = c1;
            break;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(col * tW + gap, r * tH + gap, tW - gap * 2, tH - gap * 2, 2);
        ctx.fill();
      }
    }
    return new THREE.CanvasTexture(c);
  }

  function makeWoodTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(0,0,0,0.09)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 128; i += 5) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i + (Math.random() * 3 - 1.5));
      ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
  }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  const canvasBoxId = 'ganchito-canvas-box-desktop';
  const canvasElId  = 'ganchito-canvas-desktop';

  const canvasBox = document.getElementById(canvasBoxId);
  const canvasEl  = document.getElementById(canvasElId);

  if (!canvasBox || !canvasEl) {
    console.warn('Ganchito configurador: no se encontró #ganchito-canvas-box o #ganchito-canvas');
    return;
  }

  canvasBox.style.touchAction = 'pan-y';

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const STAND_Y = 2.5;
  const STAND_Z = 5.6;
  const LOOK_Y = 0.85;
  const LOOK_FORWARD = 6.5;
  const CAM_YAW_MIN = -1.05, CAM_YAW_MAX = 1.05;
  let camYaw = 0;

  const OVERVIEW_CAM_POS = new THREE.Vector3(0, STAND_Y + 1.7, STAND_Z + 3.6);
  const OVERVIEW_LOOKAT  = new THREE.Vector3(0, LOOK_Y, STAND_Z - LOOK_FORWARD);
  const SHOWROOM_CAM_POS = new THREE.Vector3(0, STAND_Y, STAND_Z);
  const SHOWROOM_LOOKAT  = new THREE.Vector3(0, LOOK_Y, STAND_Z - LOOK_FORWARD);
  const FOCUS_CAM_POS    = new THREE.Vector3(3.8, 3.2, 3.8);
  const FOCUS_LOOKAT     = new THREE.Vector3(0, 0.50, 0);

  const OVERVIEW_FOG_NEAR = 5, OVERVIEW_FOG_FAR = 15;
  const SHOWROOM_FOG_NEAR = 10, SHOWROOM_FOG_FAR = 26;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18130f);
  scene.fog = new THREE.Fog(0x18130f, OVERVIEW_FOG_NEAR, OVERVIEW_FOG_FAR);

  const camera = new THREE.PerspectiveCamera(isMobile ? 52 : 42, 1, 0.1, 100);
  const camLookAt = new THREE.Vector3(0, 0.9, -2);

  camera.position.copy(OVERVIEW_CAM_POS);
  camLookAt.copy(OVERVIEW_LOOKAT);
  camera.lookAt(camLookAt);

  scene.add(new THREE.AmbientLight(0xfff2df, 0.42));
  const dirLight = new THREE.DirectionalLight(0xffe9c8, 0.55);
  dirLight.position.set(4, 8, 4);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width  = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xffd9a8, 0.22);
  fillLight.position.set(-4, 3, -3);
  scene.add(fillLight);

  if (window.GanchitoTaller) {
    window.GanchitoTaller.build(scene);
  }

  const mesaGroup = new THREE.Group();
  mesaGroup.visible = false;
  scene.add(mesaGroup);

  const showroomGroup = new THREE.Group();
  scene.add(showroomGroup);

  function limpiarGrupo(group) {
    while (group.children.length) {
      const obj = group.children[0];
      if (obj.children && obj.children.length) {
        limpiarGrupo(obj);
      }
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
      group.remove(obj);
    }
  }

  function legRod(p1, p2, radius, mat) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  }

  function buildMesaInto(group, tipo, colorKey, color2Key, patron, grande) {
    limpiarGrupo(group);

    const { w, d, h } = dimsFor(tipo);
    const mTex   = makeMosaicTexture(colorKey, color2Key, patron, grande);
    const wTex   = makeWoodTexture();
    const mMat   = new THREE.MeshLambertMaterial({ map: mTex });
    const woodMat= new THREE.MeshLambertMaterial({ map: wTex });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x25252a });
    const allM   = [mMat, mMat, mMat, mMat, mMat, mMat];

    if (tipo === 'ratona-madera') {
      const topThick = 0.10;
      const topMats = [woodMat, woodMat, mMat, woodMat, woodMat, woodMat];
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, d), topMats);
      top.position.y = h - topThick / 2; top.castShadow = true; group.add(top);

      const legH = h - topThick;
      const insetX = w / 2 - 0.10, insetZ = d / 2 - 0.10;
      const legGeo = new THREE.BoxGeometry(0.09, legH, 0.09);
      [[insetX, insetZ], [insetX, -insetZ], [-insetX, insetZ], [-insetX, -insetZ]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(x, legH / 2, z); leg.castShadow = true; group.add(leg);
      });
      [-insetZ * 0.85, insetZ * 0.85].forEach(z => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(insetX * 2 * 0.9, 0.06, 0.06), woodMat);
        s.position.set(0, legH * 0.55, z); group.add(s);
      });

    } else if (tipo === 'ratona-metal') {
      const topThick = 0.07;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, d), allM);
      top.position.y = h - topThick / 2; top.castShadow = true; group.add(top);

      const legH = h - topThick;
      const insetX = w / 2 - 0.14, insetZ = d / 2 - 0.14;
      const splay = 0.17;
      const radius = 0.018;
      [[insetX, insetZ], [insetX, -insetZ], [-insetX, insetZ], [-insetX, -insetZ]].forEach(([x, z]) => {
        const cima = new THREE.Vector3(x, legH, z);
        const pieA = new THREE.Vector3(x + Math.sign(x) * splay, 0, z);
        const pieB = new THREE.Vector3(x, 0, z + Math.sign(z) * splay);
        group.add(legRod(cima, pieA, radius, metalMat));
        group.add(legRod(cima, pieB, radius, metalMat));
      });
      [-insetZ, insetZ].forEach(z => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(insetX * 2 * 0.92, 0.02, 0.02), metalMat);
        bar.position.set(0, legH * 0.32, z);
        group.add(bar);
      });

    } else if (tipo === 'monolitica') {
      const topH   = h * 0.115;
      const baseH  = h * 0.105;
      const moshH  = h - topH - baseH;
      const thick  = d * 0.27;

      const top = new THREE.Mesh(new THREE.BoxGeometry(w, topH, d), allM);
      top.position.y = h - topH / 2;
      top.castShadow = true;
      group.add(top);

      [-1, 1].forEach(side => {
        const mosPanel = new THREE.Mesh(new THREE.BoxGeometry(thick, moshH, d), allM);
        mosPanel.position.set(side * (w / 2 - thick / 2), baseH + moshH / 2, 0);
        mosPanel.castShadow = true;
        group.add(mosPanel);

        const cementMat = new THREE.MeshLambertMaterial({ color: 0xE8DDD0 });
        const baseFranja = new THREE.Mesh(new THREE.BoxGeometry(thick, baseH, d), cementMat);
        baseFranja.position.set(side * (w / 2 - thick / 2), baseH / 2, 0);
        group.add(baseFranja);
      });

    } else {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), allM);
      mesh.position.y = h / 2; mesh.castShadow = true; group.add(mesh);
    }
  }

  function buildShowroom() {
    limpiarGrupo(showroomGroup);
    Object.keys(SHOWROOM_PRESETS).forEach(base => {
      const preset = SHOWROOM_PRESETS[base];
      const buildTipo = base === 'ratona' ? ('ratona-' + (preset.patas || 'madera')) : base;
      const sub = new THREE.Group();
      sub.userData.tipo = base;
      buildMesaInto(sub, buildTipo, preset.color, preset.color2, preset.patron, preset.grande);
      sub.position.set(preset.x, 0, preset.z);
      sub.rotation.y = preset.giro;
      showroomGroup.add(sub);
    });
    needsRender = true;
  }

  function buildMesa() {
    buildMesaInto(mesaGroup, tipoActual(), estado.color, estado.color2, estado.patron, estado.tamano === 'grande');
    needsRender = true;
    actualizarResumen();
  }

  function actualizarResumen() {
    const c1 = COLORES[estado.color]  ? COLORES[estado.color].label  : estado.color;
    const c2 = COLORES[estado.color2] ? COLORES[estado.color2].label : estado.color2;
    const patrones = { damero: 'Damero', guarda: 'Guarda', diagonal: 'Diagonal', uniforme: 'Uniforme' };
    const tamanos = { chico: 'pieza chica', grande: 'pieza grande' };
    const nombre = nombreTipo(estado.base, estado.patas);
    const txt = `${nombre} · ${patrones[estado.patron]} · ${c1} + ${c2} · ${tamanos[estado.tamano]}`;

    const el = document.getElementById('ganchito-resumen');
    if (el) {
      el.textContent = txt;
      const card = el.closest('.ganchito-resumen-card');
      if (card) {
        card.classList.remove('is-updated');
        void card.offsetWidth; // fuerza reflow para reiniciar la transición si hay cambios seguidos
        card.classList.add('is-updated');
      }
    }

    const msg = encodeURIComponent(`Hola Ganchito! 👋 Me gustaría consultar sobre una "${txt}". ¿Está disponible y cuál es el precio?`);
    const whatsappUrl = `https://wa.me/${WANUM}?text=${msg}`;
    const wspEl = document.getElementById('ganchito-wsp');
    if (wspEl) wspEl.href = whatsappUrl;

    document.dispatchEvent(new CustomEvent('ganchito:update', {
      detail: { texto: txt, whatsappUrl }
    }));
  }

  function syncTipoButtons(base) {
    const grupo = document.getElementById('ganchito-btn-tipo');
    if (grupo) {
      grupo.querySelectorAll('.ganchito-opt').forEach(b => {
        const activo = b.dataset.val === base;
        b.classList.toggle('activo', activo);
        b.setAttribute('aria-pressed', String(activo));
      });
    }
    togglePatasGroup(base);
  }

  function syncPatasButtons(patas) {
    const grupo = document.getElementById('ganchito-btn-patas');
    if (!grupo) return;
    grupo.querySelectorAll('.ganchito-opt').forEach(b => {
      const activo = b.dataset.val === patas;
      b.classList.toggle('activo', activo);
      b.setAttribute('aria-pressed', String(activo));
    });
  }

  function togglePatasGroup(base) {
    const grupoPatas = document.getElementById('ganchito-grupo-patas');
    if (grupoPatas) grupoPatas.classList.toggle('is-hidden', base !== 'ratona');
  }

  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function animateCamera(toPos, toLook, duration, onDone, toFog) {
    const fromPos = camera.position.clone();
    const fromLook = camLookAt.clone();
    const fromFogNear = scene.fog.near, fromFogFar = scene.fog.far;
    const effectiveDuration = REDUCE_MOTION ? 1 : duration;
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / effectiveDuration, 1);
      const e = easeInOutQuad(t);
      camera.position.lerpVectors(fromPos, toPos, e);
      camLookAt.lerpVectors(fromLook, toLook, e);
      camera.lookAt(camLookAt);
      if (toFog) {
        scene.fog.near = fromFogNear + (toFog[0] - fromFogNear) * e;
        scene.fog.far  = fromFogFar  + (toFog[1] - fromFogFar)  * e;
      }
      needsRender = true;
      if (t < 1) {
        requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    }
    requestAnimationFrame(step);
  }

  function seleccionarMesa(base) {
    if (mode !== 'showroom') return;
    mode = 'animando';
    estado.base = base;
    if (base === 'ratona' && !estado.patas) estado.patas = 'madera';
    syncTipoButtons(base);
    syncPatasButtons(estado.patas);
    setHint('');
    setVolverVisible(false);
    rotY = 0; rotX = 0;

    animateCamera(FOCUS_CAM_POS, FOCUS_LOOKAT, 750, () => {
      showroomGroup.visible = false;
      mesaGroup.visible = true;
      buildMesa();
      mode = 'focus';
      onEnterFocus();
    });
  }

  function volverAlShowroom() {
    if (mode !== 'focus') return;
    mode = 'animando';
    mesaGroup.visible = false;
    buildShowroom();
    showroomGroup.visible = true;
    setControlesVisible(false);
    camYaw = 0;

    animateCamera(SHOWROOM_CAM_POS, SHOWROOM_LOOKAT, 750, () => {
      mode = 'showroom';
      setHint('Girá para mirar alrededor · tocá la mesa que te guste');
      onEnterShowroom();
    });
  }

  let entradaHecha = false;
  function entrarAlShowroom() {
    if (entradaHecha || mode !== 'overview') return;
    entradaHecha = true;
    mode = 'animando';
    animateCamera(SHOWROOM_CAM_POS, SHOWROOM_LOOKAT, 1800, () => {
      mode = 'showroom';
      setHint('Girá para mirar alrededor · tocá la mesa que te guste');
    }, [SHOWROOM_FOG_NEAR, SHOWROOM_FOG_FAR]);
  }

  const seccionConfigurador = document.getElementById('configurador');
  if (seccionConfigurador && 'IntersectionObserver' in window) {
    const entradaObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entrarAlShowroom();
          entradaObserver.disconnect();
        }
      });
    }, { threshold: 0.35 });
    entradaObserver.observe(seccionConfigurador);
  } else {
    entrarAlShowroom();
  }

  const controlesEl = document.getElementById('ganchito-controles');
  const placeholderEl = document.getElementById('ganchito-placeholder');
  const volverBtn = document.getElementById('ganchito-volver');
  const hintEl = document.getElementById('ganchito-hint-desktop');

  function setHint(texto) {
    if (hintEl) hintEl.textContent = texto;
  }
  function setVolverVisible(visible) {
    if (volverBtn) volverBtn.hidden = !visible;
  }
  function setControlesVisible(visible) {
    if (controlesEl) controlesEl.classList.toggle('is-hidden', !visible);
    if (placeholderEl) placeholderEl.classList.toggle('is-hidden', visible);
    
    const section = document.getElementById('configurador');
    if (section) section.classList.toggle('overview-mode', !visible);
  }

  function onEnterFocus() {
    setControlesVisible(true);
    setVolverVisible(true);
    setHint('Girá tu mesa con el dedo');
    canvasBox.style.touchAction = 'none';
  }
  function onEnterShowroom() {
    setControlesVisible(false);
    setVolverVisible(false);
    canvasBox.style.touchAction = 'pan-y';
  }

  if (volverBtn) volverBtn.addEventListener('click', volverAlShowroom);

  let isPointerDown = false, downX = 0, downY = 0, lastX = 0, lastY = 0, moved = false;
  let rotY = 0, rotX = 0;

  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  function pickAt(clientX, clientY) {
    const rect = canvasBox.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const intersects = raycaster.intersectObjects(showroomGroup.children, true);
    if (!intersects.length) return;
    let obj = intersects[0].object;
    while (obj && !obj.userData.tipo) obj = obj.parent;
    if (obj && obj.userData.tipo) seleccionarMesa(obj.userData.tipo);
  }

  // Hover "tocable" en showroom (desktop): reutiliza el mismo raycaster de pickAt,
  // no toca la lógica de selección (pickAt / pointerup) en absoluto.
  let hoveredMesaGroup = null;
  function clearHover() {
    if (hoveredMesaGroup) {
      hoveredMesaGroup.scale.setScalar(1);
      hoveredMesaGroup = null;
      needsRender = true;
    }
    canvasBox.classList.remove('is-pickable');
  }
  function updateHover(clientX, clientY) {
    if (mode !== 'showroom') { clearHover(); return; }
    const rect = canvasBox.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const intersects = raycaster.intersectObjects(showroomGroup.children, true);
    let target = null;
    if (intersects.length) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.tipo) obj = obj.parent;
      if (obj && obj.userData.tipo) target = obj;
    }
    if (target !== hoveredMesaGroup) {
      if (hoveredMesaGroup) hoveredMesaGroup.scale.setScalar(1);
      if (target) target.scale.setScalar(1.03);
      hoveredMesaGroup = target;
      canvasBox.classList.toggle('is-pickable', !!target);
      needsRender = true;
    }
  }

  canvasBox.addEventListener('pointerdown', e => {
    isPointerDown = true; moved = false;
    downX = lastX = e.clientX; downY = lastY = e.clientY;
  });
  canvasBox.addEventListener('pointermove', e => {
    if (!isPointerDown) updateHover(e.clientX, e.clientY);
  });
  canvasBox.addEventListener('pointerleave', clearHover);
  window.addEventListener('pointermove', e => {
    if (!isPointerDown) return;
    if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) moved = true;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (mode === 'showroom' || mode === 'overview') {
      camYaw -= dx * 0.006;
      camYaw = Math.max(CAM_YAW_MIN, Math.min(CAM_YAW_MAX, camYaw));
    } else if (mode === 'focus') {
      rotY += dx * 0.01;
      rotY = Math.max(-0.55, Math.min(0.55, rotY));
      rotX += dy * 0.006;
      rotX = Math.max(-0.12, Math.min(0.35, rotX));
    }
    lastX = e.clientX; lastY = e.clientY;
    needsRender = true;
  });
  window.addEventListener('pointerup', e => {
    if (!isPointerDown) return;
    isPointerDown = false;
    if (!moved && mode === 'showroom') pickAt(e.clientX, e.clientY);
  });

  function resize() {
    const w = canvasBox.clientWidth, h = canvasBox.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  new ResizeObserver(resize).observe(canvasBox);

  function bindBtns(id, key, onChange) {
    const container = document.getElementById(id);
    if (!container) return;
    container.addEventListener('click', e => {
      const btn = e.target.closest('.ganchito-opt');
      if (!btn) return;
      container.querySelectorAll('.ganchito-opt').forEach(b => {
        b.classList.remove('activo');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('activo');
      btn.setAttribute('aria-pressed', 'true');
      estado[key] = btn.dataset.val;
      if (onChange) onChange(btn.dataset.val);
      if (mode === 'focus') buildMesa();
    });
  }
  bindBtns('ganchito-btn-tipo',   'base', togglePatasGroup);
  bindBtns('ganchito-btn-patas',  'patas');
  bindBtns('ganchito-btn-patron', 'patron');
  bindBtns('ganchito-btn-tamano', 'tamano');
  togglePatasGroup(estado.base);

  const coloresWrap = document.getElementById('ganchito-colores');
  if (coloresWrap) {
    coloresWrap.addEventListener('click', e => {
      const dot = e.target.closest('.ganchito-color-dot');
      if (!dot) return;
      coloresWrap.querySelectorAll('.ganchito-color-dot').forEach(d => {
        d.classList.remove('activo');
        d.setAttribute('aria-pressed', 'false');
      });
      dot.classList.add('activo');
      dot.setAttribute('aria-pressed', 'true');
      estado.color = dot.dataset.color;
      if (mode === 'focus') buildMesa();
    });
  }

  const colores2Wrap = document.getElementById('ganchito-colores-secundario');
  if (colores2Wrap) {
    colores2Wrap.addEventListener('click', e => {
      const dot = e.target.closest('.ganchito-color-dot2');
      if (!dot) return;
      colores2Wrap.querySelectorAll('.ganchito-color-dot2').forEach(d => {
        d.classList.remove('activo');
        d.setAttribute('aria-pressed', 'false');
      });
      dot.classList.add('activo');
      dot.setAttribute('aria-pressed', 'true');
      estado.color2 = dot.dataset.color2;
      if (mode === 'focus') buildMesa();
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    if (mode === 'showroom') {
      camLookAt.set(
        camera.position.x + Math.sin(camYaw) * LOOK_FORWARD,
        LOOK_Y,
        camera.position.z - Math.cos(camYaw) * LOOK_FORWARD
      );
      camera.lookAt(camLookAt);
    } else if (mode === 'focus' || (mode === 'animando' && mesaGroup.visible)) {
      mesaGroup.rotation.y = rotY + Math.PI / 5;
      mesaGroup.rotation.x = rotX;
    }
    if (!needsRender) return;
    renderer.render(scene, camera);
    needsRender = false;
  }

  setControlesVisible(false);
  setHint('');
  buildShowroom();
  resize();

  animate();

})();