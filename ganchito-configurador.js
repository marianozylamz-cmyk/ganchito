/* =========================================================
   GANCHITO — configurador 3D de mesa (v3: taller + abanico)
   Requiere Three.js r128 y taller-interior.js cargados antes
   de este script (en ese orden).

   Cambios vs v2:
   - El fondo ya no es un piso plano suelto: ahora se arma el
     interior del taller (paredes de ladrillo, piso, vigas,
     lámparas) vía window.GanchitoTaller.build(scene).
   - Las 3 mesas del showroom ya no están en línea recta: están
     en abanico (izquierda y derecha más atrás y rotadas hacia
     el centro), como si las tuvieras alrededor al entrar.
   ========================================================= */

(function () {

  /* ---------------------------------------------------------
     PALETAS DE COLOR
  --------------------------------------------------------- */
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

  // Escala real: 1 unidad Three.js = 25 cm. Se aplica a todos los
  // modelos para que las proporciones entre mesas sean coherentes
  // (ej: el cubo de 30×30×40 no puede verse más grande que la
  // ratona de 60×40×40).
  const CM = 1 / 25;
  const MEDIDAS_CM = {
    'ratona-madera': { w: 40, d: 300, h: 30 },
    'ratona-metal':  { w: 60, d: 45, h: 30 },
    'cubo':          { w: 25, d: 25, h: 30 },
    'monolitica':    { w: 50, d: 30, h: 35 },
  };
  function dimsFor(tipo) {
    const m = MEDIDAS_CM[tipo] || MEDIDAS_CM['ratona-madera'];
    return { w: m.w * CM, d: m.d * CM, h: m.h * CM };
  }

  // La mesa ratona no es un modelo aparte: es "ratona" + tipo de
  // patas (madera | metal). Cubo y monolítica no tienen patas.
  function tipoActual() {
    return estadoBase() === 'ratona' ? ('ratona-' + estado.patas) : estadoBase();
  }
  function estadoBase() { return estado.base; }
  function nombreTipo(base, patas) {
    if (base === 'ratona') return `Mesa ratona · patas de ${patas === 'metal' ? 'metal' : 'madera'}`;
    if (base === 'cubo') return 'Mesa cubo';
    return 'Mesa monolítica';
  }

  // Preset de cada mesa: ahora están MUY separadas angularmente
  // (izquierda ~46°, centro 0°, derecha ~46°) respecto del punto
  // donde "parás" a mirar. La idea es que al entrar veas la mesa
  // del centro de frente, y tengas que girar (arrastrar/deslizar)
  // para "caminar la mirada" hacia la de la izquierda o la derecha
  // — como en un videojuego, no como una vidriera con las 3 juntas.
  const SHOWROOM_PRESETS = {
    'ratona':     { x: -5.2, z: 0.6,  giro:  0.55, color: 'negro',     color2: 'crema', patron: 'damero',   grande: false, patas: 'madera' },
    'monolitica': { x:  0,   z: -1.2, giro:  0,     color: 'mostaza',  color2: 'crema', patron: 'guarda',   grande: false },
    'cubo':       { x:  5.2, z: 0.6,  giro: -0.55, color: 'terracota',color2: 'crema', patron: 'diagonal', grande: false },
  };

  let estado = {
    base:    'ratona',  // 'ratona' | 'cubo' | 'monolitica'
    patas:   'madera',  // 'madera' | 'metal' — solo aplica si base === 'ratona'
    patron:  'damero',
    tamano:  'chico',
    color:   'negro',
    color2:  'crema',
  };

  // 'overview' | 'showroom' | 'animando' | 'focus'
  let mode = 'overview';
  let needsRender = true;

  /* ---------------------------------------------------------
     GENERADOR DE TEXTURA según patrón (mosaico de la mesa)
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     SETUP THREE.JS
  --------------------------------------------------------- */
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  const canvasBoxId = 'ganchito-canvas-box-desktop';
  const canvasElId  = 'ganchito-canvas-desktop';

  const canvasBox = document.getElementById(canvasBoxId);
  const canvasEl  = document.getElementById(canvasElId);

  if (!canvasBox || !canvasEl) {
    console.warn('Ganchito configurador: no se encontró #ganchito-canvas-box o #ganchito-canvas');
    return;
  }

  canvasBox.style.touchAction = 'none';

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---------------------------------------------------------
  // MODELO DE CÁMARA: "parado, girando la mirada" — la cámara
  // NO orbita ni las mesas rotan con el drag. Es un punto fijo
  // (STAND) desde donde mirás, y lo que cambia con el drag/swipe
  // es hacia dónde mirás (camYaw), como girar la cabeza. Cada
  // mesa está a ~46° de la mirada de frente, así que para verla
  // centrada tenés que "girar" — no aparecen las 3 juntas.
  // ---------------------------------------------------------
  const STAND_Y = 2.5;
  const STAND_Z = 5.6;
  const LOOK_Y = 0.85;
  const LOOK_FORWARD = 6.5;
  const CAM_YAW_MIN = -1.05, CAM_YAW_MAX = 1.05; // ~ ±60°, alcanza para centrar cada estación con margen
  let camYaw = 0;

  const OVERVIEW_CAM_POS = new THREE.Vector3(0, STAND_Y + 1.7, STAND_Z + 3.6);
  const OVERVIEW_LOOKAT  = new THREE.Vector3(0, LOOK_Y, STAND_Z - LOOK_FORWARD);
  const SHOWROOM_CAM_POS = new THREE.Vector3(0, STAND_Y, STAND_Z);
  const SHOWROOM_LOOKAT  = new THREE.Vector3(0, LOOK_Y, STAND_Z - LOOK_FORWARD);
const FOCUS_CAM_POS    = new THREE.Vector3(4.4, 3.8, 4.4);
  const FOCUS_LOOKAT     = new THREE.Vector3(0, 0.55, 0);

  // Arranca en OVERVIEW: un poco más lejos/alto y con más niebla,
  // como si recién estuvieras entrando al taller. El fly-in hacia
  // SHOWROOM se dispara solo cuando la sección entra en pantalla
  // (ver IntersectionObserver más abajo), nunca antes.
  const OVERVIEW_FOG_NEAR = 5, OVERVIEW_FOG_FAR = 15;
  const SHOWROOM_FOG_NEAR = 10, SHOWROOM_FOG_FAR = 26;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18130f); // cálido, oscuro — ambiente de taller
  scene.fog = new THREE.Fog(0x18130f, OVERVIEW_FOG_NEAR, OVERVIEW_FOG_FAR);

  const camera = new THREE.PerspectiveCamera(isMobile ? 52 : 42, 1, 0.1, 100);
  const camLookAt = new THREE.Vector3(0, 0.9, -2);

  camera.position.copy(OVERVIEW_CAM_POS);
  camLookAt.copy(OVERVIEW_LOOKAT);
  camera.lookAt(camLookAt);

  // Luces — cálidas, tipo taller con lámparas de obra
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

  // Interior del taller (paredes, piso, vigas, lámparas)
  if (window.GanchitoTaller) {
    window.GanchitoTaller.build(scene);
  }

  // Grupo de la mesa controlable (modo focus)
  const mesaGroup = new THREE.Group();
  mesaGroup.visible = false;
  scene.add(mesaGroup);

  // Grupo del showroom (las 3 mesas en abanico)
  const showroomGroup = new THREE.Group();
  scene.add(showroomGroup);

  /* ---------------------------------------------------------
     HELPER: dispone y limpia un THREE.Group
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     HELPER: crea una varilla (cilindro) entre dos puntos —
     usado para las patas metálicas tipo "hairpin"
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     CONSTRUYE LA GEOMETRÍA DE UNA MESA DENTRO DE UN GRUPO DADO
     Todas las mesas respetan la escala real (ver dimsFor arriba).
  --------------------------------------------------------- */
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
      // Tapa fina de mosaico sobre estructura de patas metálicas
      // tipo "hairpin" — finas, negras/grafito, diseño moderno.
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
      // Travesaños finos que estabilizan cada par de patas (adelante/atrás)
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
      // cubo
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), allM);
      mesh.position.y = h / 2; mesh.castShadow = true; group.add(mesh);
    }
  }

  /* ---------------------------------------------------------
     SHOWROOM: arma las 3 mesas en abanico, mirando al centro
  --------------------------------------------------------- */
  function buildShowroom() {
    limpiarGrupo(showroomGroup);
    Object.keys(SHOWROOM_PRESETS).forEach(base => {
      const preset = SHOWROOM_PRESETS[base];
      const buildTipo = base === 'ratona' ? ('ratona-' + (preset.patas || 'madera')) : base;
      const sub = new THREE.Group();
      sub.userData.tipo = base; // guarda el tipo BASE (ratona/cubo/monolitica)
      buildMesaInto(sub, buildTipo, preset.color, preset.color2, preset.patron, preset.grande);
      sub.position.set(preset.x, 0, preset.z);
      sub.rotation.y = preset.giro;
      showroomGroup.add(sub);
    });
    needsRender = true;
  }

  /* ---------------------------------------------------------
     MESA CONTROLABLE (modo focus) — usa `estado`, siempre al origen
  --------------------------------------------------------- */
  function buildMesa() {
    buildMesaInto(mesaGroup, tipoActual(), estado.color, estado.color2, estado.patron, estado.tamano === 'grande');
    needsRender = true;
    actualizarResumen();
  }

  /* ---------------------------------------------------------
     RESUMEN Y WHATSAPP
  --------------------------------------------------------- */
  function actualizarResumen() {
    const c1 = COLORES[estado.color]  ? COLORES[estado.color].label  : estado.color;
    const c2 = COLORES[estado.color2] ? COLORES[estado.color2].label : estado.color2;
    const patrones = { damero: 'Damero', guarda: 'Guarda', diagonal: 'Diagonal', uniforme: 'Uniforme' };
    const tamanos = { chico: 'pieza chica', grande: 'pieza grande' };
    const nombre = nombreTipo(estado.base, estado.patas);
    const txt = `${nombre} · ${patrones[estado.patron]} · ${c1} + ${c2} · ${tamanos[estado.tamano]}`;

    const el = document.getElementById('ganchito-resumen');
    if (el) el.textContent = txt;

    const msg = encodeURIComponent(`Hola Ganchito! 👋 Me gustaría consultar sobre una "${txt}". ¿Está disponible y cuál es el precio?`);
    const wspEl = document.getElementById('ganchito-wsp');
    if (wspEl) wspEl.href = `https://wa.me/${WANUM}?text=${msg}`;
  }

  function syncTipoButtons(base) {
    const grupo = document.getElementById('ganchito-btn-tipo');
    if (grupo) {
      grupo.querySelectorAll('.ganchito-opt').forEach(b => {
        b.classList.toggle('activo', b.dataset.val === base);
      });
    }
    togglePatasGroup(base);
  }

  function syncPatasButtons(patas) {
    const grupo = document.getElementById('ganchito-btn-patas');
    if (!grupo) return;
    grupo.querySelectorAll('.ganchito-opt').forEach(b => {
      b.classList.toggle('activo', b.dataset.val === patas);
    });
  }

  function togglePatasGroup(base) {
    const grupoPatas = document.getElementById('ganchito-grupo-patas');
    if (grupoPatas) grupoPatas.classList.toggle('is-hidden', base !== 'ratona');
  }

  /* ---------------------------------------------------------
     ANIMACIÓN DE CÁMARA (vuelo entre showroom y foco)
  --------------------------------------------------------- */
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function animateCamera(toPos, toLook, duration, onDone, toFog) {
    const fromPos = camera.position.clone();
    const fromLook = camLookAt.clone();
    const fromFogNear = scene.fog.near, fromFogFar = scene.fog.far;
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / duration, 1);
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

  /* ---------------------------------------------------------
     SELECCIÓN DE MESA (click/tap en el showroom)
  --------------------------------------------------------- */
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
      setHint('Deslizá para mirar alrededor · tocá la mesa que te guste');
      onEnterShowroom();
    });
  }

  /* ---------------------------------------------------------
     ENTRADA AL TALLER (OVERVIEW → SHOWROOM)
     Se dispara una sola vez, cuando la sección #configurador entra
     en pantalla — no antes. Así el usuario primero "ve" el taller
     de lejos (más niebla, cámara más alta) y después la cámara
     entra sola al showroom. No usa scroll global, solo visibilidad.
  --------------------------------------------------------- */
  let entradaHecha = false;
  function entrarAlShowroom() {
    if (entradaHecha || mode !== 'overview') return;
    entradaHecha = true;
    mode = 'animando';
    animateCamera(SHOWROOM_CAM_POS, SHOWROOM_LOOKAT, 1800, () => {
      mode = 'showroom';
      setHint('Deslizá para mirar alrededor · tocá la mesa que te guste');
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
    // Sin soporte de IntersectionObserver, no dejamos al usuario
    // trabado en overview: entramos igual.
    entrarAlShowroom();
  }

  /* ---------------------------------------------------------
     UI DESKTOP: mostrar/ocultar panel de controles + botón volver
  --------------------------------------------------------- */
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
  }

  function onEnterFocus() {
    setControlesVisible(true);
    setVolverVisible(true);
    setHint('arrastrá para rotar');
  }
  function onEnterShowroom() {
    setControlesVisible(false);
    setVolverVisible(false);
  }

  if (volverBtn) volverBtn.addEventListener('click', volverAlShowroom);

  /* ---------------------------------------------------------
     DRAG PARA ROTAR + CLICK/TAP PARA SELECCIONAR (Pointer Events)
  --------------------------------------------------------- */
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

  canvasBox.addEventListener('pointerdown', e => {
    isPointerDown = true; moved = false;
    downX = lastX = e.clientX; downY = lastY = e.clientY;
  });
  window.addEventListener('pointermove', e => {
    if (!isPointerDown) return;
    if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) moved = true;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (mode === 'showroom' || mode === 'overview') {
      // Girar la mirada (no orbitar ni mover la posición) — como
      // girar la cabeza parado en un punto fijo del taller.
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

  /* ---------------------------------------------------------
     RESIZE
  --------------------------------------------------------- */
  function resize() {
    const w = canvasBox.clientWidth, h = canvasBox.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  new ResizeObserver(resize).observe(canvasBox);

  /* ---------------------------------------------------------
     CONTROLES UI (panel desktop de foco)
  --------------------------------------------------------- */
  function bindBtns(id, key, onChange) {
    const container = document.getElementById(id);
    if (!container) return;
    container.addEventListener('click', e => {
      const btn = e.target.closest('.ganchito-opt');
      if (!btn) return;
      container.querySelectorAll('.ganchito-opt').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
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
      coloresWrap.querySelectorAll('.ganchito-color-dot').forEach(d => d.classList.remove('activo'));
      dot.classList.add('activo');
      estado.color = dot.dataset.color;
      if (mode === 'focus') buildMesa();
    });
  }

  const colores2Wrap = document.getElementById('ganchito-colores-secundario');
  if (colores2Wrap) {
    colores2Wrap.addEventListener('click', e => {
      const dot = e.target.closest('.ganchito-color-dot2');
      if (!dot) return;
      colores2Wrap.querySelectorAll('.ganchito-color-dot2').forEach(d => d.classList.remove('activo'));
      dot.classList.add('activo');
      estado.color2 = dot.dataset.color2;
      if (mode === 'focus') buildMesa();
    });
  }

  /* ---------------------------------------------------------
     LOOP DE RENDER
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  setControlesVisible(false);
  setHint('');
  buildShowroom();
  resize();

  animate();

})();