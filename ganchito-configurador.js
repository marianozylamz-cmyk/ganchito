/* =========================================================
   GANCHITO — configurador 3D de mesa
   Requiere Three.js r128 cargado antes de este script.
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
    : '5492280000000';

  let estado = {
    tipo:    'ratona-madera',
    patron:  'damero',
    tamano:  'chico',
    color:   'negro',
    color2:  'crema',
  };
  let needsRender = true;

  /* ---------------------------------------------------------
     GENERADOR DE TEXTURA según patrón
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

    // Fondo de junta
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
            // borde = c1, interior = c2
            color = (r === 0 || r === rows - 1 || col === 0 || col === cols - 1) ? c1 : c2;
            break;
          case 'diagonal':
            // diagonal de c1 sobre fondo c2
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
    while (mesaGroup.children.length) {
      const obj = mesaGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
        else { if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
      }
      mesaGroup.remove(obj);
    }

    const grande = estado.tamano === 'grande';
    const tipo   = estado.tipo;
    const mTex   = makeMosaicTexture(estado.color, estado.color2, estado.patron, grande);
    const wTex   = makeWoodTexture();
    const mMat   = new THREE.MeshLambertMaterial({ map: mTex });
    const woodMat= new THREE.MeshLambertMaterial({ map: wTex });
    const allM   = [mMat, mMat, mMat, mMat, mMat, mMat];

    if (tipo === 'ratona-madera') {
      const topMats = [woodMat, woodMat, mMat, woodMat, woodMat, woodMat];
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 1.3), topMats);
      top.position.y = 0.92; top.castShadow = true; mesaGroup.add(top);

      const legGeo = new THREE.BoxGeometry(0.13, 0.9, 0.13);
      [[0.83, 0.52], [0.83, -0.52], [-0.83, 0.52], [-0.83, -0.52]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(x, 0.45, z); leg.castShadow = true; mesaGroup.add(leg);
      });
      [-0.46, 0.46].forEach(z => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.07, 0.07), woodMat);
        s.position.set(0, 0.32, z); mesaGroup.add(s);
      });

    } else if (tipo === 'ratona-yeso') {
      const H     = 0.95;
      const BASE  = 0.10;
      const MOSH  = H - BASE;
      const W     = 2.20;
      const D     = 0.95;
      const THICK = 0.26;
      const topH  = 0.11;

      const top = new THREE.Mesh(new THREE.BoxGeometry(W, topH, D), allM);
      top.position.y = H + topH / 2;
      top.castShadow = true;
      mesaGroup.add(top);

      [-1, 1].forEach(side => {
        const mosPanel = new THREE.Mesh(new THREE.BoxGeometry(THICK, MOSH, D), allM);
        mosPanel.position.set(side * (W / 2 - THICK / 2), BASE + MOSH / 2, 0);
        mosPanel.castShadow = true;
        mesaGroup.add(mosPanel);

        const cementMat = new THREE.MeshLambertMaterial({ color: 0xE8DDD0 });
        const baseFranja = new THREE.Mesh(new THREE.BoxGeometry(THICK, BASE, D), cementMat);
        baseFranja.position.set(side * (W / 2 - THICK / 2), BASE / 2, 0);
        mesaGroup.add(baseFranja);
      });

    } else {
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
    const c1 = COLORES[estado.color]  ? COLORES[estado.color].label  : estado.color;
    const c2 = COLORES[estado.color2] ? COLORES[estado.color2].label : estado.color2;
    const tipos = {
      'ratona-madera': 'Mesa ratona c/ patas',
      'ratona-yeso':   'Mesa ratona de yeso (U)',
      'cubo':          'Mesa cubo',
    };
    const patrones = {
      damero:   'Damero',
      guarda:   'Guarda',
      diagonal: 'Diagonal',
      uniforme: 'Uniforme',
    };
    const tamanos = { chico: 'pieza chica', grande: 'pieza grande' };
    const txt = `${tipos[estado.tipo]} · ${patrones[estado.patron]} · ${c1} + ${c2} · ${tamanos[estado.tamano]}`;
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

  canvasBox.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
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
  bindBtns('ganchito-btn-patron', 'patron');
  bindBtns('ganchito-btn-tamano', 'tamano');

  // Color principal
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

  // Color secundario
  const colores2Wrap = document.getElementById('ganchito-colores-secundario');
  if (colores2Wrap) {
    colores2Wrap.addEventListener('click', e => {
      const dot = e.target.closest('.ganchito-color-dot2');
      if (!dot) return;
      colores2Wrap.querySelectorAll('.ganchito-color-dot2').forEach(d => d.classList.remove('activo'));
      dot.classList.add('activo');
      estado.color2 = dot.dataset.color2;
      buildMesa();
    });
  }

  /* ---------------------------------------------------------
     LOOP DE RENDER
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
