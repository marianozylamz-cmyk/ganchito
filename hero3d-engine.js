/* =========================================================
   GANCHITO — PORTAL 3D (configurador)
   hero3d-engine.js
   Renderer, cámara, luces, HDRI/PMREM e interacción (orbit yaw+pitch
   por drag + pinch zoom), recortado de experimental-3d/hero-scene.js:
   sin el código de escenas guionadas por scroll ni de switcher entre
   páginas, que no aplican a esta sección embebida.

   No arranca el loop de render ni la interacción hasta que
   hero3d-portal.js llama a HeroScene.open() (tras el long-press) —
   así el canvas nunca compite por eventos de puntero mientras está
   oculto detrás del círculo.
   ========================================================= */

window.HeroScene = (function () {

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.getElementById('hero3d-canvas');
  const stage = document.getElementById('hero3d-stage');
  const portalStage = document.getElementById('portal-stage');
  if (!canvas) {
    console.warn('HeroScene: no se encontró #hero3d-canvas');
    return { ready: Promise.reject(new Error('sin canvas')), open() {}, start() {}, stop() {} };
  }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.75 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  // Sin scene.background: el canvas queda transparente y el gradiente de
  // "estudio oscuro" lo pone el CSS de #hero3d-stage.

  // FOV más abierto en mobile: en un viewport portrait angosto, un FOV
  // "cinematográfico" cerrado recorta el ancho de la mesa fuera de cuadro.
  const camera = new THREE.PerspectiveCamera(isMobile ? 46 : 38, 1, 0.1, 50);

  // Luz: la mayor parte del modelado viene del HDRI (environment);
  // esta luz direccional suave solo agrega un toque de brillo dirigido.
  const key = new THREE.DirectionalLight(0xfff1de, 0.55);
  key.position.set(3, 5, 4);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  // Sombra de contacto "falsa": un disco con gradiente radial, mucho
  // más liviano que shadow maps en tiempo real y más prolijo para
  // una foto de producto.
  const shadowTex = makeContactShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.15, depthWrite: false });
  const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.001;
  scene.add(shadowMesh);

  HeroMesa.build(scene, renderer);
  let mesaGroup = HeroMesa.group;

  // ---- Encuadre calculado desde la mesa real (no hardcodeado) — mide el
  // bounding box de la geometría recién construida y deriva el punto de
  // mira (su centro real) y la distancia de cámara (proporcional a su
  // "radio"), así el mismo motor sirve para cualquier tipo de mesa. ----
  let radius = 1, floatY = 0, LOOK_Y = 0;
  function measure(group) {
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    radius = box.getBoundingSphere(new THREE.Sphere()).radius;
    floatY = radius * 0.19; // "flotando", igual que en el laboratorio 3D
    LOOK_Y = center.y + floatY;
  }
  measure(mesaGroup);
  mesaGroup.position.y = floatY;

  // Fragmentos de mosaico flotando de fondo: dispersos alrededor de la
  // mesa a partir de su mismo radio, así se sienten "a escala". No se
  // reconstruyen al cambiar de tipo (costo/beneficio no lo justifica);
  // quedan a la escala de la primera mesa que se mostró.
  const atmosphere = HeroAtmosphere.build(scene, radius, LOOK_Y);

  const F = isMobile
    ? { heroZ: 4.75, heroY: 1.16 }
    : { heroZ: 5.31, heroY: 1.19 };
  function frameFor(r, lookY) {
    return {
      pos: new THREE.Vector3(0, lookY + F.heroY * r, F.heroZ * r),
      look: new THREE.Vector3(0, lookY, 0),
    };
  }
  const initialFrame = frameFor(radius, LOOK_Y);
  const basePos = initialFrame.pos.clone();
  const baseLook = initialFrame.look.clone();

  camera.position.copy(basePos);
  const camLookAt = baseLook.clone();
  camera.lookAt(camLookAt);

  function makeContactShadowTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  // ---- HDRI / PMREM (async, no bloquea el primer paint de la página) ----
  function loadHDRI() {
    return new Promise((resolve) => {
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      new THREE.RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .load('assets/hdri/studio_small_03_1k.hdr', (tex) => {
          const envMap = pmrem.fromEquirectangular(tex).texture;
          scene.environment = envMap;
          tex.dispose();
          pmrem.dispose();
          resolve();
        }, undefined, () => resolve()); // si falla la descarga, seguimos sin IBL en vez de romper
    });
  }

  // ---- Interacción: orbit de la CÁMARA (no de la mesa) en yaw+pitch.
  // Arranca DESHABILITADA — hero3d-portal.js la habilita recién al abrir
  // el portal (long-press), así el canvas nunca compite con el scroll ni
  // con el botón circular mientras está oculto detrás de él. ----
  let dragYawRaw = 0, dragPitchRaw = 0;
  let orbitYaw = 0, orbitPitch = 0;
  let isPointerDown = false, lastX = 0, lastY = 0;
  let interactionEnabled = false;
  let pinchStartDist = 0, zoomDistance = 0;

  function setInteractionEnabled(v) {
    interactionEnabled = v;
    canvas.style.touchAction = v ? 'none' : 'pan-y';
    if (!v) isPointerDown = false;
  }
  setInteractionEnabled(false); // sincroniza el touch-action inicial

  function onPointerDown(e) {
    if (!interactionEnabled) return;
    isPointerDown = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onPointerMove(e) {
    if (!isPointerDown) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    dragYawRaw = clamp(dragYawRaw + dx * 0.007, -0.75, 0.75);
    // arrastrar hacia abajo = mirar más desde arriba (se ve el mosaico)
    dragPitchRaw = clamp(dragPitchRaw + dy * 0.006, -0.32, 0.55);
    lastX = e.clientX; lastY = e.clientY;
  }
  function onPointerUp() { isPointerDown = false; }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // Parallax al pasar el mouse: en desktop, la mesa "reacciona" apenas
  // pasás el cursor por encima (sin hacer click) — un tilt sutil.
  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hoverCapable && !REDUCE_MOTION) {
    canvas.addEventListener('mousemove', (e) => {
      if (isPointerDown || !interactionEnabled) return; // no pisa un drag activo
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      dragYawRaw = clamp(nx * 0.18, -0.75, 0.75);
      dragPitchRaw = clamp(-ny * 0.12, -0.32, 0.55);
    });
    canvas.addEventListener('mouseleave', () => {
      if (isPointerDown) return;
      dragYawRaw = 0;
      dragPitchRaw = 0;
    });
  }

  // Pinch-to-zoom: gesto de 2 dedos, no interfiere nunca con el scroll de
  // 1 dedo (y no hace nada mientras interactionEnabled es false).
  canvas.addEventListener('touchstart', (e) => {
    if (!interactionEnabled) return;
    if (e.touches.length === 2) {
      isPointerDown = false; // el pinch de 2 dedos manda: cancela el drag-yaw en curso
      pinchStartDist = touchDist(e.touches);
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && interactionEnabled) {
      const d = touchDist(e.touches);
      const delta = (d - pinchStartDist) * 0.0025;
      zoomDistance = clamp(zoomDistance + delta, -0.9, 1.1);
      pinchStartDist = d;
    }
  }, { passive: true });

  function touchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function setColor(key) { HeroMesa.setColor(key); }
  function setColor2(key) { HeroMesa.setColor2(key); }
  function setPatron(key) { HeroMesa.setPatron(key); }
  function setTamano(key) { HeroMesa.setTamano(key); }

  // Tween genérico (sin GSAP) para la transición de "cinta continua"
  // al cambiar de tipo de mesa con el switcher.
  function tween(duration, onUpdate, onComplete) {
    if (REDUCE_MOTION) { onUpdate(1); if (onComplete) onComplete(); return; }
    const t0 = performance.now();
    function step(now) {
      const p = clamp((now - t0) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      onUpdate(eased);
      if (p < 1) requestAnimationFrame(step);
      else if (onComplete) onComplete();
    }
    requestAnimationFrame(step);
  }

  // Cambia el tipo de mesa in-place (sin recargar página) — la usa el
  // switcher. dir: 1 = "siguiente" (entra desde la derecha), -1 =
  // "anterior" (entra desde la izquierda). Conserva color/patrón/tamaño.
  let switching = false;
  function setTipo(tipo, dir) {
    if (switching || tipo === HeroMesa.tipo) return;
    switching = true;

    const newGroup = HeroMesa.rebuild(scene, renderer, tipo);
    measure(newGroup);

    const enterFrom = (dir === -1 ? -1 : 1) * radius * 3.2;
    newGroup.position.set(enterFrom, floatY, 0);

    // La cámara se reencuadra sola: basePos/baseLook se mueven al nuevo
    // objetivo y el lerp del render loop ya los sigue suavemente.
    const nextFrame = frameFor(radius, LOOK_Y);
    basePos.copy(nextFrame.pos);
    baseLook.copy(nextFrame.look);

    mesaGroup = newGroup;
    tween(650, (p) => {
      mesaGroup.position.x = enterFrom * (1 - p);
    }, () => { switching = false; });
  }

  // ---- Resize ----
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---- Loop de render: solo corre mientras el portal está abierto Y
  // visible en pantalla (ahorra batería en el resto de la página). ----
  let running = false;
  let opened = false;
  const zoomDir = new THREE.Vector3();
  const zoomedTarget = new THREE.Vector3();
  const orbitOffset = new THREE.Vector3();
  const orbitSpherical = new THREE.Spherical();
  function render() {
    // El drag del usuario orbita la CÁMARA (yaw+pitch) alrededor del
    // punto fijo que está mirando — no rota la mesa.
    const yawTarget = interactionEnabled ? dragYawRaw : 0;
    const pitchTarget = interactionEnabled ? dragPitchRaw : 0;
    orbitYaw += (yawTarget - orbitYaw) * 0.12;
    orbitPitch += (pitchTarget - orbitPitch) * 0.12;

    // El zoom por pinch se compone DENTRO del target antes de orbitar.
    zoomDir.subVectors(baseLook, basePos).normalize();
    zoomedTarget.copy(basePos).addScaledVector(zoomDir, zoomDistance);

    orbitOffset.copy(zoomedTarget).sub(baseLook);
    orbitSpherical.setFromVector3(orbitOffset);
    orbitSpherical.theta += orbitYaw;
    orbitSpherical.phi = clamp(orbitSpherical.phi - orbitPitch, 0.35, 1.45);
    orbitOffset.setFromSpherical(orbitSpherical);
    zoomedTarget.copy(baseLook).add(orbitOffset);

    camera.position.lerp(zoomedTarget, 0.12);
    camLookAt.lerp(baseLook, 0.12);
    camera.lookAt(camLookAt);

    atmosphere.update(performance.now() / 1000);
    renderer.render(scene, camera);
  }
  function loop() {
    if (!running) return;
    render();
    requestAnimationFrame(loop);
  }
  function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function stop() { running = false; }

  // Pausa/reanuda según visibilidad, pero solo una vez abierto el portal
  // (antes de abrir, el loop ni arrancó).
  if (portalStage && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!opened) return;
        entry.isIntersecting ? start() : stop();
      });
    }, { threshold: 0.01 }).observe(portalStage);
  }

  // ---- Abrir el portal: habilita la interacción y arranca el loop.
  // Idempotente — hero3d-portal.js la llama una sola vez, tras el
  // long-press, pero no pasa nada si se llama de más. ----
  function open() {
    if (opened) return;
    opened = true;
    setInteractionEnabled(true);
    start();
  }

  const ready = loadHDRI().then(() => {
    render(); // primer frame correcto antes de que se revele el canvas
  });

  return {
    ready,
    open,
    start,
    stop,
    setInteractionEnabled,
    setColor,
    setColor2,
    setPatron,
    setTamano,
    setTipo,
    camera,
    mesa: HeroMesa,
    reduceMotion: REDUCE_MOTION,
    get floatY() { return floatY; },
    get lookY() { return LOOK_Y; },
    get radius() { return radius; },
  };

})();
