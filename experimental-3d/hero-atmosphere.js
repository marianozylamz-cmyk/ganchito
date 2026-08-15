/* =========================================================
   GANCHITO — LABORATORIO 3D (prototipo aislado)
   hero-atmosphere.js
   Fragmentos de mosaico flotando de fondo — le dan profundidad y vida
   a la escena sin competir con la mesa (protagonista absoluta). Se
   mantienen chicos, semitransparentes y lejos del centro del cuadro.
   Respeta prefers-reduced-motion: quedan quietos, no flotan.
   ========================================================= */

window.HeroAtmosphere = (function () {

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mismos colores que el rail de selección — la atmósfera "sugiere"
  // la personalización antes incluso de que el usuario toque nada.
  const PALETTE = ['#1a1a1a', '#C2872E', '#A0522D', '#14213E', '#5C6B4C', '#F7F3EC'];

  function build(scene, radius, centerY) {
    const group = new THREE.Group();
    const items = [];
    const count = 10;

    for (let i = 0; i < count; i++) {
      const size = radius * (0.09 + Math.random() * 0.09);
      const geo = new THREE.BoxGeometry(size, size, size * 0.18);
      const mat = new THREE.MeshStandardMaterial({
        color: PALETTE[i % PALETTE.length],
        roughness: 0.55,
        metalness: 0,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Dispersos alrededor de la mesa, a SU misma altura — nunca por
      // encima de ella, para no terminar flotando en la zona donde
      // vive el texto (que siempre va arriba de todo, en 2D). Cerca
      // del radio de la mesa (no tan lejos que queden fuera de cuadro).
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const dist = radius * (1.25 + Math.random() * 1.05);
      const y = centerY + radius * (-0.55 + Math.random() * 0.85);
      const baseX = Math.cos(angle) * dist;
      const baseZ = Math.sin(angle) * dist - radius * 0.5;
      mesh.position.set(baseX, y, baseZ);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(mesh);

      items.push({
        mesh,
        baseX, baseY: y, baseZ,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        spin: 0.1 + Math.random() * 0.1,
        bobAmp: radius * (0.09 + Math.random() * 0.07),
        bobSpeed: 0.35 + Math.random() * 0.25,
        swayAmp: radius * (0.05 + Math.random() * 0.05),
        swaySpeed: 0.18 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
      });
    }

    scene.add(group);

    function update(t) {
      if (REDUCE_MOTION) return;
      items.forEach(it => {
        it.mesh.rotateOnAxis(it.axis, it.spin * 0.014);
        it.mesh.position.y = it.baseY + Math.sin(t * it.bobSpeed + it.phase) * it.bobAmp;
        it.mesh.position.x = it.baseX + Math.sin(t * it.swaySpeed + it.phase) * it.swayAmp;
      });
    }

    return { update };
  }

  return { build };

})();
