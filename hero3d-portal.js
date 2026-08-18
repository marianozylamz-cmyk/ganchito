/* =========================================================
   GANCHITO — PORTAL 3D (configurador)
   hero3d-portal.js
   Puerta de entrada: un círculo chico ("agujero negro") que hay que
   mantener presionado para revelar la experiencia 3D (hero3d-engine.js).
   Pointer Events unifica touch/mouse; el gesto vive SOLO en el botón
   (touch-action:none ahí adentro, nunca en la sección ni el body), así
   el scroll de la página nunca se ve afectado.
   ========================================================= */

(function () {
  const portalStage = document.getElementById('portal-stage');
  const gate = document.getElementById('portal-gate');
  const orb = document.getElementById('portal-orb');
  const orbHint = document.getElementById('portal-orb-hint');
  const dragHint = document.getElementById('portal-drag-hint');
  if (!portalStage || !gate || !orb) return;

  const HOLD_MS = 550;
  const DRIFT_PX = 16;

  // El botón "habla": empieza neutro y se pone cada vez más insistente
  // cada vez que sueltan antes de tiempo — el chiste es que te cargue
  // un poco hasta que finalmente mantenés apretado.
  const HINTS = ['Apretá el botón', 'Pero apretá con ganas', 'Dale! Mantené apretado'];
  let attempts = 0;

  let pressTimer = null;
  let pressActive = false;
  let activePointerId = null;
  let startX = 0, startY = 0;
  let revealed = false;

  function startPress(pointerId, x, y) {
    if (revealed) return;
    pressActive = true;
    activePointerId = pointerId;
    startX = x; startY = y;
    orb.classList.add('is-charging');
    pressTimer = window.setTimeout(completePress, HOLD_MS);
  }

  function cancelPress() {
    if (!pressActive) return; // ya se procesó este intento (evita doble conteo)
    pressActive = false;
    if (pressTimer) { window.clearTimeout(pressTimer); pressTimer = null; }
    orb.classList.remove('is-charging');
    activePointerId = null;

    if (orbHint) {
      attempts = Math.min(attempts + 1, HINTS.length - 1);
      orbHint.textContent = HINTS[attempts];
    }
  }

  function completePress() {
    pressActive = false;
    pressTimer = null;
    orb.classList.remove('is-charging');
    reveal();
  }

  function reveal() {
    if (revealed) return;
    revealed = true;

    gate.classList.add('is-hidden');
    portalStage.classList.add('is-open');
    // Saca el gate del árbol de hit-testing recién cuando terminó de
    // desvanecerse — antes de eso sigue "clickeable" por accidente.
    window.setTimeout(() => { gate.style.display = 'none'; }, 650);

    if (window.HeroScene && window.HeroScene.ready) {
      window.HeroScene.ready.then(() => {
        window.HeroScene.open();
        showDragHint();
      });
    }
  }

  function showDragHint() {
    if (!dragHint) return;
    window.setTimeout(() => dragHint.classList.add('is-visible'), 500);
    window.setTimeout(() => dragHint.classList.remove('is-visible'), 500 + 3200);
  }

  // ---- Puntero (touch + mouse, unificado) ----
  orb.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // evita selección de texto / callout de iOS en el hold
    startPress(e.pointerId, e.clientX, e.clientY);
  });
  orb.addEventListener('pointermove', (e) => {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > DRIFT_PX) cancelPress(); // se fue de garrón: no cuenta
  });
  orb.addEventListener('pointerup', (e) => {
    if (e.pointerId !== activePointerId) return;
    cancelPress(); // soltó antes de tiempo — se cancela solo
  });
  orb.addEventListener('pointercancel', cancelPress);

  // ---- Teclado: mantener Enter/Espacio simula el mismo hold ----
  orb.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      startPress('kbd', 0, 0);
    }
  });
  orb.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') cancelPress();
  });
})();
