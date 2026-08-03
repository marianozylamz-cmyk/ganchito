/* =========================================================
   GANCHITO — interior del taller (ambientación de fondo)
   Requiere Three.js r128 cargado antes de este script.
   Se usa desde ganchito-configurador.js:
     window.GanchitoTaller.build(scene)
   ========================================================= */

window.GanchitoTaller = (function () {

  /* ---------------------------------------------------------
     TEXTURAS — canvas procedural (versión liviana)
  --------------------------------------------------------- */
  function mkLadrillo() {
    const s = 512;
    const cv = document.createElement('canvas'); cv.width = s; cv.height = s;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#8a7d6e'; ctx.fillRect(0, 0, s, s);

    const bW = 96, bH = 42, junta = 7;
    const filas = Math.ceil(s / (bH + junta)) + 1;
    const cols  = Math.ceil(s / (bW + junta)) + 1;

    for (let r = 0; r < filas; r++) {
      const offset = r % 2 === 0 ? 0 : (bW + junta) / 2;
      for (let c = -1; c < cols + 1; c++) {
        const x = c * (bW + junta) + offset;
        const y = r * (bH + junta);
        const seed = r * 31 + c * 17;
        const rr = 140 + ((seed * 13) % 30);
        const gg =  65 + ((seed *  7) % 20);
        const bb =  35 + ((seed *  5) % 15);
        ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
        ctx.fillRect(x, y, bW, bH);
        ctx.strokeStyle = 'rgba(20,10,5,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, bW, bH);
      }
    }
    // Manchas de humedad / hollín
    for (let i = 0; i < 4; i++) {
      const mx = Math.random() * s, my = Math.random() * s;
      const gr = ctx.createRadialGradient(mx, my, 0, mx, my, 40 + Math.random() * 60);
      gr.addColorStop(0, 'rgba(10,8,5,0.18)');
      gr.addColorStop(1, 'rgba(10,8,5,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, s, s);
    }
    // Sombra de contacto en la base (donde toca el piso) — AO barato pintado a mano
    const baseSombra = ctx.createLinearGradient(0, s * 0.82, 0, s);
    baseSombra.addColorStop(0, 'rgba(10,6,3,0)');
    baseSombra.addColorStop(1, 'rgba(10,6,3,0.35)');
    ctx.fillStyle = baseSombra;
    ctx.fillRect(0, s * 0.82, s, s * 0.18);

    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function mkCemento() {
    const s = 512;
    const cv = document.createElement('canvas'); cv.width = s; cv.height = s;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#6b6560'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const v = 40 + Math.random() * 30;
      ctx.fillStyle = `rgba(${v},${v - 5},${v - 10},${0.03 + Math.random() * 0.06})`;
      ctx.fillRect(x, y, 2, 2);
    }
    const g = 6, ls = s / g;
    ctx.strokeStyle = 'rgba(20,15,10,0.45)'; ctx.lineWidth = 3;
    for (let i = 0; i <= g; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * ls); ctx.lineTo(s, i * ls); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * ls, 0); ctx.lineTo(i * ls, s); ctx.stroke();
    }
    // Fragmentos de azulejo — guiño al oficio
    const colores = ['#14213E', '#C2872E', '#C0392B', '#F7F3EC', '#5C6B4C'];
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const c = colores[Math.floor(Math.random() * colores.length)];
      ctx.fillStyle = c;
      const sz = 4 + Math.random() * 8;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.random() * Math.PI);
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
    // Vignette suave en los bordes — sugiere que el piso "se hunde"
    // levemente en sombra cerca de las paredes (AO barato, sin post-processing)
    const vin = ctx.createRadialGradient(s / 2, s / 2, s * 0.35, s / 2, s / 2, s * 0.72);
    vin.addColorStop(0, 'rgba(5,4,3,0)');
    vin.addColorStop(1, 'rgba(5,4,3,0.22)');
    ctx.fillStyle = vin;
    ctx.fillRect(0, 0, s, s);

    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* ---------------------------------------------------------
     TEXTURA — canvas de "azulejos apilados" para la estantería
     de materiales. Reusa la paleta de mosaicos de las mesas para
     que la estantería se sienta parte del mismo mundo visual.
  --------------------------------------------------------- */
  function mkAzulejosApilados() {
    const w = 256, h = 160;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#3a2f26'; ctx.fillRect(0, 0, w, h);

    const paleta = ['#14213E', '#C2872E', '#C0392B', '#5C6B4C', '#A0522D', '#F7F3EC'];
    const pilas = 5;
    const pilaW = w / pilas;
    for (let p = 0; p < pilas; p++) {
      const nAzulejos = 4 + Math.floor(Math.random() * 4);
      let y = h - 6;
      const baseX = p * pilaW + pilaW * 0.15;
      const azW = pilaW * 0.7;
      for (let i = 0; i < nAzulejos; i++) {
        const azH = 7 + Math.random() * 3;
        const color = paleta[(p + i) % paleta.length];
        y -= azH + 1.5;
        ctx.fillStyle = color;
        ctx.fillRect(baseX, y, azW, azH);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(baseX, y, azW, azH);
      }
    }
    return new THREE.CanvasTexture(cv);
  }

  /* ---------------------------------------------------------
     CONSTRUCCIÓN DEL TALLER
  --------------------------------------------------------- */
  function build(scene) {
    const group = new THREE.Group();

    const ladrilloTex = mkLadrillo(); ladrilloTex.repeat.set(4, 1.4);
    const cementoTex  = mkCemento();  cementoTex.repeat.set(6, 8);

    const wMat = new THREE.MeshLambertMaterial({ map: ladrilloTex });
    const pMat = new THREE.MeshLambertMaterial({ map: cementoTex, color: 0x5e5a55 });
    const vigaMat = new THREE.MeshLambertMaterial({ color: 0x2e1a0a });

    // Piso
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), pMat);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(0, -0.01, -4);
    piso.receiveShadow = true;
    group.add(piso);

    // Pared de fondo
    const paredFondo = new THREE.Mesh(new THREE.PlaneGeometry(22, 6.5), wMat);
    paredFondo.position.set(0, 3.1, -7.2);
    group.add(paredFondo);

    // Paredes laterales (parciales, dan sensación de galpón)
    const paredIzq = new THREE.Mesh(new THREE.PlaneGeometry(15, 6.5), wMat);
    paredIzq.rotation.y = Math.PI / 2;
    paredIzq.position.set(-9, 3.1, -1);
    group.add(paredIzq);

    const paredDer = new THREE.Mesh(new THREE.PlaneGeometry(15, 6.5), wMat);
    paredDer.rotation.y = -Math.PI / 2;
    paredDer.position.set(9, 3.1, -1);
    group.add(paredDer);

    // Vigas de techo
    for (let z = -6.5; z <= 2.5; z += 4.5) {
      const viga = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 0.3), vigaMat);
      viga.position.set(0, 6.0, z);
      group.add(viga);
    }
    // Vigas transversales
    [-8, 0, 8].forEach(x => {
      const viga = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 9.5), vigaMat);
      viga.position.set(x, 5.85, -3.5);
      group.add(viga);
    });

    // Lámparas industriales simples — bulbo + luz puntual cálida
    [[-3.5, -4.2], [3.5, -4.2], [0, -0.8]].forEach(([x, z]) => {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 1.1, 6),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      cable.position.set(x, 5.4, z);
      group.add(cable);

      const bulbo = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
      );
      bulbo.position.set(x, 4.85, z);
      group.add(bulbo);

      const luz = new THREE.PointLight(0xffe8a0, 0.85, 11, 2);
      luz.position.set(x, 4.75, z);
      group.add(luz);
    });

    // Zócalo — pequeño detalle en la base de las paredes
    const zocaloMat = new THREE.MeshLambertMaterial({ color: 0x2a2420 });
    const zocaloFondo = new THREE.Mesh(new THREE.BoxGeometry(22, 0.22, 0.06), zocaloMat);
    zocaloFondo.position.set(0, 0.11, -7.17);
    group.add(zocaloFondo);

    buildVida(group);

    scene.add(group);
    return group;
  }

  /* ---------------------------------------------------------
     "VIDA" DEL TALLER — herramientas colgadas, estantería con
     materiales y un boceto en la pared. Todo geometría primitiva
     (sin GLBs) para no repetir los quilombos de carga que tuvimos
     antes; el peso queda igual de liviano que el resto del taller.
  --------------------------------------------------------- */
  function buildVida(group) {
    const metalMat  = new THREE.MeshLambertMaterial({ color: 0x8a8a8a });
    const mangoMat  = new THREE.MeshLambertMaterial({ color: 0x5a3a20 });
    const cuerdaMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });

    // --- Panel de herramientas, colgado en la pared izquierda ---
    const panelHerramientas = new THREE.Group();

    // Martillo: mango + cabeza
    const martillo = new THREE.Group();
    const mangoM = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), mangoMat);
    mangoM.rotation.z = Math.PI / 2;
    martillo.add(mangoM);
    const cabezaM = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.06), metalMat);
    cabezaM.position.set(0.27, 0, 0);
    martillo.add(cabezaM);
    martillo.position.set(-0.5, 0.35, 0);
    martillo.rotation.z = 0.15;
    panelHerramientas.add(martillo);

    // Serrucho: hoja plana + mango
    const serrucho = new THREE.Group();
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.01), metalMat);
    serrucho.add(hoja);
    const mangoS = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.05), mangoMat);
    mangoS.position.set(-0.28, 0.02, 0);
    serrucho.add(mangoS);
    serrucho.position.set(0.1, 0.15, 0);
    serrucho.rotation.z = -0.08;
    panelHerramientas.add(serrucho);

    // Regla / escuadra
    const regla = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.01), new THREE.MeshLambertMaterial({ color: 0xC2872E }));
    regla.position.set(0.55, 0.4, 0);
    regla.rotation.z = 0.5;
    panelHerramientas.add(regla);

    // Clavos de sostén (los "ganchos" del panel)
    [-0.5, 0.1, 0.55].forEach((x, i) => {
      const clavo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), metalMat);
      clavo.position.set(x, [0.55, 0.32, 0.58][i], 0);
      panelHerramientas.add(clavo);
    });

    panelHerramientas.rotation.y = Math.PI / 2;
    panelHerramientas.position.set(-8.85, 1.7, -3.5);
    group.add(panelHerramientas);

    // --- Estantería de materiales (azulejos apilados), pared derecha ---
    const estanteMat = new THREE.MeshLambertMaterial({ color: 0x4a3424 });
    const estante = new THREE.Group();
    [0, 0.6, 1.2].forEach(y => {
      const tabla = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.45), estanteMat);
      tabla.position.set(0, y, 0);
      tabla.castShadow = true;
      estante.add(tabla);

      const soporteMat = new THREE.MeshLambertMaterial({ color: 0x2e1a0a });
      [-0.65, 0.65].forEach(x => {
        const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), soporteMat);
        soporte.position.set(x, y - 0.025, 0);
        estante.add(soporte);
      });

      // Pila de azulejos sobre cada tabla
      const azulejoTex = mkAzulejosApilados();
      const azulejoMat = new THREE.MeshLambertMaterial({ map: azulejoTex });
      const pila = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 0.36), azulejoMat);
      pila.position.set(0, y + 0.135, 0);
      pila.castShadow = true;
      estante.add(pila);
    });
    estante.rotation.y = -Math.PI / 2;
    estante.position.set(8.85, 0.3, -3.2);
    group.add(estante);

    // --- Boceto / plano en la pared de fondo, guiño al oficio ---
    const plano = document.createElement('canvas');
    plano.width = 128; plano.height = 96;
    const pctx = plano.getContext('2d');
    pctx.fillStyle = '#EFE7D6'; pctx.fillRect(0, 0, 128, 96);
    pctx.strokeStyle = 'rgba(20,10,5,0.55)'; pctx.lineWidth = 1.5;
    pctx.strokeRect(10, 12, 70, 45);
    pctx.beginPath();
    pctx.moveTo(10, 34); pctx.lineTo(80, 34);
    pctx.moveTo(45, 12); pctx.lineTo(45, 57);
    pctx.stroke();
    pctx.font = '7px monospace'; pctx.fillStyle = 'rgba(20,10,5,0.6)';
    pctx.fillText('80 x 45', 20, 68);
    const planoTex = new THREE.CanvasTexture(plano);
    const planoMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.0),
      new THREE.MeshLambertMaterial({ map: planoTex })
    );
    planoMesh.position.set(-2.6, 3.4, -7.15);
    group.add(planoMesh);
  }

  return { build };

})();