/* =========================================================
   GANCHITO — LABORATORIO 3D (prototipo aislado)
   hero-scene.js
   Renderer, cámara, luces, HDRI/PMREM, interacción (orbit yaw+pitch
   por drag + pinch zoom) y loop de render. Expone window.HeroScene para que
   hero-story.js (GSAP/ScrollTrigger) maneje la cámara según el
   scroll, sin que este archivo sepa nada de "escenas" o narrativa.
   ========================================================= */

window.HeroScene = (function () {

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Si venimos de tocar una flecha del switcher (ver hero-story.js), la
  // mesa entra volando desde el costado en vez de caer del cielo — se
  // lee y se limpia una sola vez acá, al toque, para que una recarga
  // normal de la página no herede el flag por error.
  const TRANSITION_DIR = sessionStorage.getItem('heroTransitionDir');
  sessionStorage.removeItem('heroTransitionDir');

  const canvas = document.getElementById('hero3d-canvas');
  const stage = document.getElementById('hero3d-stage');
  if (!canvas) {
    console.warn('HeroScene: no se encontró #hero3d-canvas');
    return { ready: Promise.reject(new Error('sin canvas')) };
  }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.75 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  // Sin scene.background: el canvas queda transparente y el gradiente de
  // "estudio oscuro" lo pone el CSS de #hero3d-stage (más simple y sin
  // los artefactos de filtrado que puede dar una textura como fondo).

  // FOV más abierto en mobile: en un viewport portrait angosto, un FOV
  // "cinematográfico" cerrado recorta el ancho de la mesa fuera de
  // cuadro. Mismo criterio que ya usa el configurador real. En desktop
  // el FOV vertical más cerrado agranda el objeto verticalmente, así
  // que además alejamos un poco la cámara para compensar.
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
  const mesaGroup = HeroMesa.group;

  // ---- Encuadres calculados desde la mesa real (no hardcodeados) ----
  // Para que el MISMO motor sirva para cualquier tipo de mesa (ratona,
  // cubo, lo que venga) sin retocar números a mano: medimos el bounding
  // box de la geometría recién construida y derivamos el punto de mira
  // (su centro real) y las distancias de cámara (proporcionales a su
  // "radio") a partir de eso. Los factores de abajo son los que ya
  // veníamos afinando a mano para la ratona — quedan fijos entre tipos,
  // lo que cambia es el tamaño real de cada mesa.
  const box = new THREE.Box3().setFromObject(mesaGroup);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;

  const floatY = radius * 0.19;  // "flotando" antes de la escena 2
  const sinkY = -radius * 0.11;  // se hunde levemente al alejarse (escena 2)
  mesaGroup.position.y = floatY;

  const LOOK_Y = center.y + floatY;

  // Fragmentos de mosaico flotando de fondo: dispersos alrededor de la
  // mesa a partir de su mismo radio, así se sienten "a escala" sea cual
  // sea el tipo de mesa de esta página.
  const atmosphere = HeroAtmosphere.build(scene, radius, LOOK_Y);

  const F = isMobile
    // heroZ/heroY más grandes que antes (cámara más lejos): la mesa
    // entra más chica en mobile, con más aire alrededor.
    ? { wideZ: 6.85, wideY: 2.27, closeZ: 2.45, closeY: 0.60, heroZ: 4.75, heroY: 1.16 }
    : { wideZ: 8.77, wideY: 2.71, closeZ: 3.27, closeY: 0.78, heroZ: 5.31, heroY: 1.19 };
  function frame(zFactor, yFactor) {
    return {
      pos: new THREE.Vector3(0, LOOK_Y + yFactor * radius, zFactor * radius),
      look: new THREE.Vector3(0, LOOK_Y, 0),
    };
  }
  // Intro en 3 tiempos: aparece lejos → se acerca (mientras entra el
  // texto) → se aleja un poco para entrar completa en cuadro (mosaicos
  // incluidos). "close" es un keyframe intermedio, no un estado final.
  const FRAMES = {
    wide:  frame(F.wideZ, F.wideY),
    close: frame(F.closeZ, F.closeY),
    hero:  frame(F.heroZ, F.heroY),
  };

  // La cámara arranca directo en el encuadre final — ya no hace dolly de
  // acercamiento. El único movimiento de la entrada es la mesa cayendo
  // (ver playIntro), una entrada más tranquila que antes.
  camera.position.copy(FRAMES.hero.pos);
  const camLookAt = FRAMES.hero.look.clone();
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
  // No hace falta 360° horizontal, pero sí poder mirar más desde arriba
  // para que se vea bien el mosaico — por eso ambos ejes orbitan la
  // cámara alrededor del punto que está mirando, en vez de solo rotar
  // el objeto en Y.
  //
  // touch-action se togglea a propósito: 'none' mientras la escena
  // invita a interactuar (hero, con affordance visible), 'pan-y' en
  // cuanto arranca el scroll guionado de la escena 2 — ahí el scroll
  // vuelve a ser 100% nativo sin excepciones.
  let dragYawRaw = 0, dragPitchRaw = 0;
  let orbitYaw = 0, orbitPitch = 0;
  let isPointerDown = false, lastX = 0, lastY = 0;
  let interactionEnabled = true;
  let pinchStartDist = 0, zoomDistance = 0;

  function setInteractionEnabled(v) {
    interactionEnabled = v;
    canvas.style.touchAction = v ? 'none' : 'pan-y';
    if (!v) isPointerDown = false;
  }
  setInteractionEnabled(true); // sincroniza el touch-action inicial con interactionEnabled

  // Variante liviana: solo habilita/deshabilita el drag-orbit, sin tocar
  // touch-action. La usa la "zona muerta" de la escena 2 (ver hero-story.js):
  // ahí el scroll nativo ya está permitido (pan-y, ver setScrollAllowed) pero
  // la mesa sigue quieta y se puede seguir orbitando/editando un rato más.
  function setOrbitEnabled(v) {
    interactionEnabled = v;
    if (!v) isPointerDown = false;
  }
  // Toggle de touch-action solo, sin tocar el estado de orbit — lo usa
  // hero-story.js apenas se entra a la escena 2 (scroll nativo de ahí en
  // más) independientemente de si la mesa sigue "quieta" o no.
  function setScrollAllowed(v) {
    canvas.style.touchAction = v ? 'pan-y' : 'none';
  }

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
  // pasás el cursor por encima (sin hacer click) — un tilt sutil hacia
  // donde apunta el cursor, mucho más chico que el rango del drag manual.
  // Reutiliza el mismo sistema de orbit de cámara (yaw+pitch), así que se
  // apaga solo fuera de la escena 1 / la zona muerta del scroll (donde
  // interactionEnabled pasa a false).
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

  // Pinch-to-zoom: gesto de 2 dedos, no interfiere nunca con el
  // scroll de 1 dedo.
  canvas.addEventListener('touchstart', (e) => {
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

  // ---- Estado que hero-story.js puede pilotear desde el scroll ----
  let sceneCamPos = FRAMES.hero.pos.clone();
  let sceneCamLook = FRAMES.hero.look.clone();
  let sceneMeshX = 0;
  let sceneMeshY = floatY;
  let sceneMeshRotX = 0;
  let sceneMeshRotY = 0;
  let sceneMeshScale = 1;
  let sceneShadowOpacity = 0.15;

  function setCameraFrame(pos, look) {
    sceneCamPos.copy(pos);
    sceneCamLook.copy(look);
  }
  function setMeshTransform({ x, y, rotX, rotY, scale, shadowOpacity }) {
    if (x !== undefined) sceneMeshX = x;
    if (y !== undefined) sceneMeshY = y;
    if (rotX !== undefined) sceneMeshRotX = rotX;
    if (rotY !== undefined) sceneMeshRotY = rotY;
    if (scale !== undefined) sceneMeshScale = scale;
    if (shadowOpacity !== undefined) sceneShadowOpacity = shadowOpacity;
  }
  function setColor(key) { HeroMesa.setColor(key); }
  function setColor2(key) { HeroMesa.setColor2(key); }
  function setPatron(key) { HeroMesa.setPatron(key); }
  function setTamano(key) { HeroMesa.setTamano(key); }

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

  // ---- Entrada tranquila: la cámara ya está quieta en el encuadre
  // final (no hay dolly-zoom). Lo único que se mueve es la mesa, que
  // cae desde arriba sobre el eje Y — y ni eso arranca de inmediato:
  // primero un segundo de fondo solo, sin mesa, para que la entrada no
  // "pegue" fuerte apenas abre la página.
  function playIntro() {
    if (REDUCE_MOTION) return; // la mesa ya está en su lugar final, quieta

    if (TRANSITION_DIR) {
      // Venimos de tocar una flecha del switcher: la mesa anterior salió
      // por un lado (ver hero-story.js) y esta entra por el lado OPUESTO,
      // viajando en el mismo sentido — como una sola cinta continua: la
      // que se va y la que entra se mueven para el mismo lado, nunca se
      // cruzan ni rebotan. "next" salió por la derecha → esta entra por
      // la izquierda y sigue viajando hacia la derecha hasta el centro.
      const fromX = TRANSITION_DIR === 'next' ? -radius * 3.2 : radius * 3.2;
      sceneMeshX = fromX;
      mesaGroup.position.x = fromX;
      sceneMeshY = floatY;
      mesaGroup.position.y = floatY;
      sceneShadowOpacity = 0;
      shadowMat.opacity = 0;

      const proxy = { x: fromX, shadow: 0 };
      gsap.to(proxy, {
        x: 0,
        shadow: 0.15,
        duration: 0.75,
        ease: 'power3.out',
        onUpdate: () => {
          sceneMeshX = proxy.x;
          sceneShadowOpacity = proxy.shadow;
        },
      });
      return;
    }

    // Entrada "en frío" (carga directa / recarga): 1s de fondo solo y
    // recién ahí la mesa cae desde arriba.
    const dropFrom = floatY + radius * 5; // bien arriba, fuera de cuadro
    sceneMeshY = dropFrom;
    mesaGroup.position.y = dropFrom;
    sceneShadowOpacity = 0;
    shadowMat.opacity = 0;

    const proxy = { y: dropFrom, shadow: 0 };
    gsap.delayedCall(1.0, () => {
      gsap.to(proxy, {
        y: floatY,
        shadow: 0.15,
        duration: 1.2,
        ease: 'power3.out',
        onUpdate: () => {
          sceneMeshY = proxy.y;
          sceneShadowOpacity = proxy.shadow;
        },
      });
    });
  }

  // ---- Loop de render: solo corre mientras el laboratorio 3D está
  // visible en pantalla (ahorra batería en el resto de la página) ----
  let running = false;
  const zoomDir = new THREE.Vector3();
  const zoomedTarget = new THREE.Vector3();
  const orbitOffset = new THREE.Vector3();
  const orbitSpherical = new THREE.Spherical();
  function render() {
    // El drag del usuario orbita la CÁMARA (yaw+pitch) alrededor del
    // punto guionado que está mirando — no rota la mesa. Si no se puede
    // interactuar (escena 2 en scroll), el offset de órbita se relaja
    // solo a 0 para que la cámara guionada retome el control.
    const yawTarget = interactionEnabled ? dragYawRaw : 0;
    const pitchTarget = interactionEnabled ? dragPitchRaw : 0;
    orbitYaw += (yawTarget - orbitYaw) * 0.12;
    orbitPitch += (pitchTarget - orbitPitch) * 0.12;

    // El zoom por pinch se compone DENTRO del target antes de orbitar/
    // lerpear, así no queda "compitiendo" cuadro a cuadro contra el
    // lerp hacia la cámara guionada (que si no, lo borraría solo).
    zoomDir.subVectors(sceneCamLook, sceneCamPos).normalize();
    zoomedTarget.copy(sceneCamPos).addScaledVector(zoomDir, zoomDistance);

    orbitOffset.copy(zoomedTarget).sub(sceneCamLook);
    orbitSpherical.setFromVector3(orbitOffset);
    orbitSpherical.theta += orbitYaw;
    orbitSpherical.phi = clamp(orbitSpherical.phi - orbitPitch, 0.35, 1.45);
    orbitOffset.setFromSpherical(orbitSpherical);
    zoomedTarget.copy(sceneCamLook).add(orbitOffset);

    camera.position.lerp(zoomedTarget, 0.12);
    camLookAt.lerp(sceneCamLook, 0.12);
    camera.lookAt(camLookAt);

    // Rotación y posición propias de la mesa: las guioná el scroll
    // (sceneMeshRotX/Y/X), nunca el drag del usuario — eso ahora orbita
    // la cámara. rotX es el "tumbling" de la caída (pasa por boca abajo).
    mesaGroup.rotation.x += (sceneMeshRotX - mesaGroup.rotation.x) * 0.12;
    mesaGroup.rotation.y += (sceneMeshRotY - mesaGroup.rotation.y) * 0.12;
    mesaGroup.position.x += (sceneMeshX - mesaGroup.position.x) * 0.12;
    mesaGroup.position.y += (sceneMeshY - mesaGroup.position.y) * 0.12;
    mesaGroup.scale.setScalar(mesaGroup.scale.x + (sceneMeshScale - mesaGroup.scale.x) * 0.12);
    shadowMat.opacity += (sceneShadowOpacity - shadowMat.opacity) * 0.12;

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

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.isIntersecting ? start() : stop());
    }, { threshold: 0.01 }).observe(document.getElementById('hero3d-root'));
  } else {
    start();
  }

  // ---- Revelado: recién mostramos el canvas cuando el HDRI está
  // listo y ya se renderizó un primer frame correcto. Antes de eso
  // el fondo de la página (mismo tono oscuro) ocupa ese espacio, así
  // que no se percibe como una carga rota, sino como una entrada. ----
  const ready = loadHDRI().then(() => {
    render();
    document.body.classList.add('hero3d-ready');
    playIntro();
  });

  return {
    ready,
    camera,
    setCameraFrame,
    setMeshTransform,
    setInteractionEnabled,
    setOrbitEnabled,
    setScrollAllowed,
    setColor,
    setColor2,
    setPatron,
    setTamano,
    mesa: HeroMesa,
    enteredFrom: TRANSITION_DIR,
    reduceMotion: REDUCE_MOTION,
    FRAMES,
    floatY,
    sinkY,
    lookY: LOOK_Y,
    radius,
  };

})();
