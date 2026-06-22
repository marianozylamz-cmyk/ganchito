/* =========================================================
   GANCHITO — configurador 3D de mesa
   Requiere Three.js r128 cargado antes de este script.
   ========================================================= */

(function () {

  /* ---------------------------------------------------------
     PALETAS DE COLOR
  --------------------------------------------------------- */
  const PALETAS = {
    negro:     { main: '#1a1a1a', mid: '#3a3a3a', junta: '#F7F3EC', label: 'Negro' },
    navy:      { main: '#14213E', mid: '#2B3B63', junta: '#F7F3EC', label: 'Navy' },
    mostaza:   { main: '#C2872E', mid: '#E3B45B', junta: '#F7F3EC', label: 'Mostaza' },
    rojo:      { main: '#C0392B', mid: '#E74C3C', junta: '#FDECEA', label: 'Rojo' },
    oliva:     { main: '#5C6B4C', mid: '#8A9A78', junta: '#F4F2EC', label: 'Oliva' },
    terracota: { main: '#A0522D', mid: '#C2703F', junta: '#FAF0E8', label: 'Terracota' },
    celeste:   { main: '#1A5276', mid: '#2980B9', junta: '#EBF5FB', label: 'Celeste' },
  };

  // Mismo número que en script.js — solo un lugar para cambiar
  const WANUM = (typeof WHATSAPP_NUMBER !== 'undefined')
    ? WHATSAPP_NUMBER
    : '5492280000000'; // TODO: reemplazar si usás este archivo sin script.js

  let estado = { tipo: 'ratona-madera', tamano: 'chico', color: 'negro' };
  let needsRender = true;

  /* ---------------------------------------------------------
     TEXTURAS
  --------------------------------------------------------- */
  function makeMosaicTexture(palKey, grande) {
    const pal = PALETAS[palKey];
    const cols = grande ? 4 : 8;
    const rows = grande ? 4 : 8;
    const size = 512;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const tW = size / cols, tH = size / rows, gap = grande ? 6 : 3;
    ctx.fillStyle = pal.junta;
    ctx.fillRect(0, 0, size, size);
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = (r + col) % 2 === 0 ? pal.main : pal.mid;
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
  const canvasBox = document.getElementById('ganchito-canvas-box');
  const canvasEl  = document.getElementById('ganchito-canvas');

  if (!canvasBox || !canvasEl) {
    console.warn('Ganchito configurador: no se encontró #ganchito-canvas-box o #ganchito-canvas');
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(3.4, 2.9, 3.4);
  camera.lookAt(0, 0.55, 0);

  // Luces
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLight.position.set(5, 9, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width  = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xffeedd, 0.35);
  fillLight.position.set(-4, 3, -3);
  scene.add(fillLight);

  // Piso
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshLambertMaterial({ color: 0x111122 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const mesaGroup = new THREE.Group();
  scene.add(mesaGroup);

  /* ---------------------------------------------------------
     CONSTRUCCIÓN DE LA MESA
  --------------------------------------------------------- */
  function buildMesa() {
    // Limpiar meshes anteriores y liberar geometrías/materiales
    while (mesaGroup.children.length) {
      const obj = mesaGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose && m.map && m.map.dispose());
        else { if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
      }
      mesaGroup.remove(obj);
    }

    const grande = estado.tamano === 'grande';
    const tipo   = estado.tipo;
    const mTex   = makeMosaicTexture(estado.color, grande);
    const wTex   = makeWoodTexture();
    const mMat   = new THREE.MeshLambertMaterial({ map: mTex });
    const woodMat= new THREE.MeshLambertMaterial({ map: wTex });
    const allM   = [mMat, mMat, mMat, mMat, mMat, mMat];

    if (tipo === 'ratona-madera') {
      // Tope: mosaico arriba, madera en los lados
      const topMats = [woodMat, woodMat, mMat, woodMat, woodMat, woodMat];
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 1.3), topMats);
      top.position.y = 0.92; top.castShadow = true; mesaGroup.add(top);

      const legGeo = new THREE.BoxGeometry(0.13, 0.9, 0.13);
      [[0.83, 0.52], [0.83, -0.52], [-0.83, 0.52], [-0.83, -0.52]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(x, 0.45, z); leg.castShadow = true; mesaGroup.add(leg);
      });
      // Travesaños
      [-0.46, 0.46].forEach(z => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.07, 0.07), woodMat);
        s.position.set(0, 0.32, z); mesaGroup.add(s);
      });

    } else if (tipo === 'ratona-yeso') {
      /*
        Forma real: U invertida vista de frente.
        - Dos paneles laterales macizos (patas tipo "panel")
        - Tope que los une arriba
        - Franja de base en cemento/yeso sin mosaico (como en la foto)
        Todo el resto: mosaico.
      */
      const H     = 0.95;   // altura total del panel lateral
      const BASE  = 0.10;   // franja de base sin mosaico
      const MOSH  = H - BASE; // altura con mosaico en el panel
      const W     = 2.20;   // ancho total de la mesa
      const D     = 0.95;   // profundidad
      const THICK = 0.26;   // grosor de cada panel lateral
      const topH  = 0.11;   // grosor del tope

      // Tope — mosaico en todas las caras
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(W, topH, D), allM
      );
      top.position.y = H + topH / 2;
      top.castShadow = true;
      mesaGroup.add(top);

      // Paneles laterales: parte de mosaico (superior)
      [-1, 1].forEach(side => {
        const mosPanel = new THREE.Mesh(
          new THREE.BoxGeometry(THICK, MOSH, D), allM
        );
        mosPanel.position.set(side * (W / 2 - THICK / 2), BASE + MOSH / 2, 0);
        mosPanel.castShadow = true;
        mesaGroup.add(mosPanel);

        // Franja de base de cemento (sin mosaico, tono crema/gris)
        const cementMat = new THREE.MeshLambertMaterial({ color: 0xE8DDD0 });
        const baseFranja = new THREE.Mesh(
          new THREE.BoxGeometry(THICK, BASE, D), cementMat
        );
        baseFranja.position.set(side * (W / 2 - THICK / 2), BASE / 2, 0);
        baseFranja.castShadow = true;
        mesaGroup.add(baseFranja);
      });

    } else {
      // Cubo todo mosaico
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), allM);
      mesh.position.y = 0.8; mesh.castShadow = true; mesaGroup.add(mesh);
    }

    needsRender = true;
    actualizarResumen();
  }

  /* ---------------------------------------------------------
     RESUMEN Y WHATSAPP
  --------------------------------------------------------- */
  function actualizarResumen() {
    const pal = PALETAS[estado.color];
    const tipos = {
      'ratona-madera': 'Mesa ratona c/ patas',
      'ratona-yeso':   'Mesa ratona de yeso (U)',
      'cubo':          'Mesa cubo',
    };
    const txt = `${tipos[estado.tipo]} · Mosaico ${estado.tamano} · ${pal.label}`;
    const resEl = document.getElementById('ganchito-resumen');
    const wspEl = document.getElementById('ganchito-wsp');
    if (resEl) resEl.textContent = txt;
    if (wspEl) {
      const msg = encodeURIComponent(`Hola Ganchito! 👋 Me gustaría consultar sobre una "${txt}". ¿Está disponible y cuál es el precio?`);
      wspEl.href = `https://wa.me/${WANUM}?text=${msg}`;
    }
  }

  /* ---------------------------------------------------------
     DRAG PARA ROTAR
  --------------------------------------------------------- */
  let isDragging = false, prevX = 0, prevY = 0;
  let rotY = Math.PI / 5, rotX = 0.22;

  canvasBox.addEventListener('mousedown', e => {
    isDragging = true; prevX = e.clientX; prevY = e.clientY;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    rotY += (e.clientX - prevX) * 0.012;
    rotX += (e.clientY - prevY) * 0.008;
    rotX = Math.max(-0.1, Math.min(0.65, rotX));
    prevX = e.clientX; prevY = e.clientY;
    needsRender = true;
  });
  canvasBox.addEventListener('touchstart', e => {
    isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    rotY += (e.touches[0].clientX - prevX) * 0.012;
    rotX += (e.touches[0].clientY - prevY) * 0.008;
    rotX = Math.max(-0.1, Math.min(0.65, rotX));
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    needsRender = true;
  }, { passive: true });

  /* ---------------------------------------------------------
     RESIZE
  --------------------------------------------------------- */
  function resize() {
    const w = canvasBox.clientWidth, h = canvasBox.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  resize();
  new ResizeObserver(resize).observe(canvasBox);

  /* ---------------------------------------------------------
     CONTROLES UI
  --------------------------------------------------------- */
  function bindBtns(id, key) {
    const container = document.getElementById(id);
    if (!container) return;
    container.addEventListener('click', e => {
      const btn = e.target.closest('.ganchito-opt');
      if (!btn) return;
      container.querySelectorAll('.ganchito-opt').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      estado[key] = btn.dataset.val;
      buildMesa();
    });
  }
  bindBtns('ganchito-btn-tipo',   'tipo');
  bindBtns('ganchito-btn-tamano', 'tamano');

  const coloresWrap = document.getElementById('ganchito-colores');
  if (coloresWrap) {
    coloresWrap.addEventListener('click', e => {
      const dot = e.target.closest('.ganchito-color-dot');
      if (!dot) return;
      coloresWrap.querySelectorAll('.ganchito-color-dot').forEach(d => d.classList.remove('activo'));
      dot.classList.add('activo');
      estado.color = dot.dataset.color;
      buildMesa();
    });
  }

  /* ---------------------------------------------------------
     LOOP DE RENDER (solo cuando needsRender = true → ahorra CPU)
  --------------------------------------------------------- */
  function animate() {
    requestAnimationFrame(animate);
    if (!needsRender) return;
    mesaGroup.rotation.y = rotY;
    mesaGroup.rotation.x = rotX;
    renderer.render(scene, camera);
    needsRender = false;
  }

  buildMesa();
  animate();

})();
