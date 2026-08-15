/* =========================================================
   GANCHITO — LABORATORIO 3D (prototipo aislado)
   hero-mesa.js
   Geometría + materiales de la mesa protagonista. Adaptado de
   ganchito-configurador.js (buildMesaInto) pero reescrito con
   materiales PBR. No importa ni depende del configurador real:
   es una copia deliberada.

   Generalizado para soportar más de un tipo de mesa: cada página
   (index.html, cubo.html, ...) define `window.HERO_CONFIG` ANTES
   de este script con { tipo, color, patron, ... } — el motor
   (este archivo + hero-scene.js + hero-story.js) es el mismo para
   todas. Agregar un tipo nuevo es sumar una rama en build().
   ========================================================= */

window.HeroMesa = (function () {

  const CM = 1 / 20;

  // Mismas medidas reales que ganchito-configurador.js (MEDIDAS_CM).
  const MEDIDAS_CM = {
    'ratona-madera': { w: 40, d: 30, h: 20 }, // perfil "coffee table": h real es 30, lo bajamos a propósito
    'ratona-metal':  { w: 60, d: 45, h: 30 },
    'cubo':          { w: 25, d: 25, h: 30 },
  };

  // Mismos hex que ganchito-configurador.js.
  const COLORES = {
    negro:     { hex: '#1a1a1a', label: 'Negro' },
    mostaza:   { hex: '#C2872E', label: 'Mostaza' },
    terracota: { hex: '#A0522D', label: 'Terracota' },
    navy:      { hex: '#14213E', label: 'Navy' },
    celeste:   { hex: '#2980B9', label: 'Celeste' },
    oliva:     { hex: '#5C6B4C', label: 'Oliva' },
    crema:     { hex: '#F7F3EC', label: 'Crema' },
    rojo:      { hex: '#C0392B', label: 'Rojo' },
    gris:      { hex: '#52585E', label: 'Gris' },
  };
  const JUNTA = '#CCBFAE';

  const cfg = window.HERO_CONFIG || {};

  let mosaicMat = null;
  let currentTipo = cfg.tipo || 'ratona-madera';
  let currentColor = cfg.color || 'negro';
  let currentColor2 = cfg.color2 || 'crema';
  let currentPatron = cfg.patron || 'damero';
  let currentTamano = cfg.tamano || 'chico';
  let mesaGroup = null;
  let maxAniso = 1;

  function makeMosaicTexture(colorKey, color2Key, patron, grande) {
    const c1 = COLORES[colorKey]  ? COLORES[colorKey].hex  : COLORES.negro.hex;
    const c2 = COLORES[color2Key] ? COLORES[color2Key].hex : COLORES.crema.hex;
    const cols = grande ? 4 : 8, rows = grande ? 4 : 8;
    const size = 768; // más resolución que el configurador: acá la vemos de cerca
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const tW = size / cols, tH = size / rows, gap = 4;

    ctx.fillStyle = JUNTA;
    ctx.fillRect(0, 0, size, size);

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        let color;
        switch (patron) {
          case 'guarda':
            color = (r === 0 || r === rows - 1 || col === 0 || col === cols - 1) ? c1 : c2;
            break;
          case 'diagonal':
            color = (r === col || r === cols - 1 - col) ? c1 : c2;
            break;
          case 'uniforme':
            color = c1;
            break;
          case 'damero':
          default:
            color = (r + col) % 2 === 0 ? c1 : c2;
            break;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(col * tW + gap, r * tH + gap, tW - gap * 2, tH - gap * 2, 3);
        ctx.fill();

        // leve variación de brillo por pieza: rompe la uniformidad
        // perfecta del canvas y ayuda a que no se lea "digital".
        const shade = (Math.sin(r * 12.9898 + col * 78.233) * 43758.5453) % 1;
        ctx.fillStyle = `rgba(255,255,255,${shade > 0 ? shade * 0.05 : 0})`;
        ctx.fillRect(col * tW + gap, r * tH + gap, tW - gap * 2, tH - gap * 2);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    // Sin esto, el renderer trata los hex ya "gamma-correctos" que dibuja
    // el canvas 2D como si fueran valores lineales, y los reblanquea al
    // re-codificar la salida a sRGB — los colores oscuros/saturados
    // terminaban viéndose lavados, casi grises, sin importar qué tan
    // oscuro fuera el hex elegido.
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = maxAniso;
    return tex;
  }

  function makeWoodTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4A2E18';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size; i += 3) {
      const shade = 0.06 + Math.random() * 0.06;
      ctx.strokeStyle = `rgba(15,7,2,${shade})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.bezierCurveTo(size * 0.3, i + (Math.random() * 6 - 3), size * 0.7, i + (Math.random() * 6 - 3), size, i);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.4, 1.4);
    tex.anisotropy = maxAniso;
    return tex;
  }

  function legRod(group, x, z, legH, mat) {
    const geo = new THREE.BoxGeometry(0.09, legH, 0.09);
    const leg = new THREE.Mesh(geo, mat);
    leg.position.set(x, legH / 2, z);
    group.add(leg);
  }

  function buildRatonaMadera(group, w, d, h, woodMat) {
    const topThick = 0.10;
    const topMats = [woodMat, woodMat, mosaicMat, woodMat, woodMat, woodMat];
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, d), topMats);
    top.position.y = h - topThick / 2;
    group.add(top);

    const legH = h - topThick;
    const insetX = w / 2 - 0.10, insetZ = d / 2 - 0.10;
    [[insetX, insetZ], [insetX, -insetZ], [-insetX, insetZ], [-insetX, -insetZ]]
      .forEach(([x, z]) => legRod(group, x, z, legH, woodMat));

    [-insetZ * 0.85, insetZ * 0.85].forEach(z => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(insetX * 2 * 0.9, 0.06, 0.06), woodMat);
      s.position.set(0, legH * 0.55, z);
      group.add(s);
    });
  }

  // Varilla entre dos puntos (cilindro orientado) — para las patas de
  // metal, que van "abiertas" en diagonal, no rectas como las de madera.
  function legRodBetween(p1, p2, radius, mat) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
    const mesh = new THREE.Mesh(geo, mat);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  }

  function buildRatonaMetal(group, w, d, h) {
    // Tablero completo en mosaico (sin madera vista, como en el
    // configurador real) sobre una estructura de metal con patas
    // abiertas en diagonal.
    const allM = [mosaicMat, mosaicMat, mosaicMat, mosaicMat, mosaicMat, mosaicMat];
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2e,
      roughness: 0.35,
      metalness: 0.75,
      envMapIntensity: 0.6, // el metal se beneficia mucho más del HDRI que la madera/mosaico
    });

    const topThick = 0.07;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, d), allM);
    top.position.y = h - topThick / 2;
    group.add(top);

    const legH = h - topThick;
    const insetX = w / 2 - 0.14, insetZ = d / 2 - 0.14;
    const splay = 0.17;
    const legRadius = 0.018;
    [[insetX, insetZ], [insetX, -insetZ], [-insetX, insetZ], [-insetX, -insetZ]].forEach(([x, z]) => {
      const cima = new THREE.Vector3(x, legH, z);
      const pieA = new THREE.Vector3(x + Math.sign(x) * splay, 0, z);
      const pieB = new THREE.Vector3(x, 0, z + Math.sign(z) * splay);
      group.add(legRodBetween(cima, pieA, legRadius, metalMat));
      group.add(legRodBetween(cima, pieB, legRadius, metalMat));
    });
    [-insetZ, insetZ].forEach(z => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(insetX * 2 * 0.92, 0.02, 0.02), metalMat);
      bar.position.set(0, legH * 0.32, z);
      group.add(bar);
    });
  }

  function buildCubo(group, w, d, h) {
    // Cubo: un solo volumen, completamente revestido en mosaico —
    // no hay madera vista, igual que en el configurador real.
    const allM = [mosaicMat, mosaicMat, mosaicMat, mosaicMat, mosaicMat, mosaicMat];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), allM);
    mesh.position.y = h / 2;
    group.add(mesh);
  }

  function build(scene, renderer) {
    maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;

    mesaGroup = new THREE.Group();

    const m = MEDIDAS_CM[currentTipo] || MEDIDAS_CM['ratona-madera'];
    const w = m.w * CM, d = m.d * CM, h = m.h * CM;

    mosaicMat = new THREE.MeshPhysicalMaterial({
      map: makeMosaicTexture(currentColor, currentColor2, currentPatron, currentTamano === 'grande'),
      roughness: 0.32,
      metalness: 0,
      clearcoat: 0.28,
      clearcoatRoughness: 0.28,
      // envMapIntensity muy bajo a propósito: incluso un valor moderado
      // (0.2) alcanzaba para "lavar" los colores saturados/oscuros del
      // mosaico (un rojo profundo terminaba viéndose rosa pastel) — el
      // HDRI aporta un toque de reflejo, sin pisar el color elegido.
      envMapIntensity: 0.04,
    });

    if (currentTipo === 'cubo') {
      buildCubo(mesaGroup, w, d, h);
    } else if (currentTipo === 'ratona-metal') {
      buildRatonaMetal(mesaGroup, w, d, h);
    } else {
      const woodMat = new THREE.MeshStandardMaterial({
        map: makeWoodTexture(),
        roughness: 0.55,
        metalness: 0,
        envMapIntensity: 0.2,
      });
      buildRatonaMadera(mesaGroup, w, d, h, woodMat);
    }

    scene.add(mesaGroup);
    return mesaGroup;
  }

  function regenerarTextura() {
    if (!mosaicMat) return;
    const nuevaTex = makeMosaicTexture(currentColor, currentColor2, currentPatron, currentTamano === 'grande');
    if (mosaicMat.map) mosaicMat.map.dispose();
    mosaicMat.map = nuevaTex;
    mosaicMat.needsUpdate = true;
  }

  function setColor(colorKey) {
    if (!mosaicMat || !COLORES[colorKey] || colorKey === currentColor) return;
    currentColor = colorKey;
    regenerarTextura();
  }

  function setColor2(colorKey) {
    if (!mosaicMat || !COLORES[colorKey] || colorKey === currentColor2) return;
    currentColor2 = colorKey;
    regenerarTextura();
  }

  function setPatron(patron) {
    if (!mosaicMat || patron === currentPatron) return;
    currentPatron = patron;
    regenerarTextura();
  }

  function setTamano(tamano) {
    if (!mosaicMat || tamano === currentTamano) return;
    currentTamano = tamano;
    regenerarTextura();
  }

  return {
    build,
    setColor,
    setColor2,
    setPatron,
    setTamano,
    COLORES,
    get group() { return mesaGroup; },
    get currentColor() { return currentColor; },
    get currentColor2() { return currentColor2; },
    get currentPatron() { return currentPatron; },
    get currentTamano() { return currentTamano; },
    get tipo() { return currentTipo; },
  };

})();
