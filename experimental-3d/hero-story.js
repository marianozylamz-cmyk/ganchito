/* =========================================================
   GANCHITO — LABORATORIO 3D (prototipo aislado)
   hero-story.js
   Coreografía (GSAP + ScrollTrigger). Este archivo es el único que
   sabe que existen "escenas" — hero-scene.js solo expone una cámara
   y una mesa pilotables, sin saber de narrativa.

   Estructura v2:
   1) Escena 1 — la mesa aparece, se acerca, se asienta (intro por
      timeline, no por scroll). Al asentarse aparece el rail de
      colores. Orbit libre (yaw+pitch) mientras se puede interactuar.
   2) Escena 2 — un solo tramo de scroll, largo, en el que la cámara
      se aleja y la mesa se achica ("la caída") hasta desvanecerse.
   3) Handoff — las cards de "Conocé nuestras mesas" caen desde
      arriba, todas juntas, como cierre de la experiencia 3D.

   Sin ScrollTrigger `pin`: el canvas ya es position:fixed por CSS,
   así que esto solo lee progreso de scroll — el scroll nunca se
   intercepta ni se previene.
   ========================================================= */

(function () {

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function boot() {
    if (!window.HeroScene || !window.HeroScene.ready) return;

    gsap.registerPlugin(ScrollTrigger);
    const REDUCE_MOTION = HeroScene.reduceMotion;
    const F = HeroScene.FRAMES;

    // La escena 2 se aleja bastante más que el encuadre "hero" y la
    // mesa termina notoriamente chica, como pediste. Expresado como
    // offset proporcional al radio de la mesa (no en Y absoluto), así
    // funciona igual sea cual sea el tipo/tamaño de mesa de esta página.
    const scene2Start = { pos: F.hero.pos.clone(), look: F.hero.look.clone() };
    const scene2End = {
      pos: new THREE.Vector3(0, HeroScene.lookY + (F.hero.pos.y - HeroScene.lookY) * 1.9, F.hero.pos.z * 1.9),
      look: F.hero.look.clone(),
    };

    // ---- Textos de la escena 1: entrada suave, una sola vez ----
    const introEls = document.querySelectorAll('#scene-1 [data-reveal]');
    const colorRail = document.getElementById('color-rail');

    // Si venimos de cambiar de mesa con el switcher (ver más abajo), la
    // mesa entra volando en ~0.75s en vez de la caída de ~2.2s — el
    // texto y el rail de color esperan bastante menos para no sentirse
    // desfasados de una entrada que ya es mucho más rápida.
    const introDelay = HeroScene.enteredFrom ? 0.5 : 2.3;
    const railDelay = HeroScene.enteredFrom ? 1.2 : 3.5;

    HeroScene.ready.then(() => {
      if (REDUCE_MOTION) {
        introEls.forEach(el => el.style.opacity = 1);
        if (colorRail) colorRail.classList.add('is-visible');
        return;
      }
      // La mesa entra SOLA primero: 1s de fondo solo + ~1.2s cayendo
      // (ver playIntro en hero-scene.js). Recién cuando se asienta del
      // todo aparece el texto arriba — nunca antes, nunca superpuesto.
      gsap.fromTo(introEls,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, delay: introDelay, ease: 'power2.out' }
      );
      // El rail de colores aparece último, cuando el texto ya terminó de entrar.
      if (colorRail) {
        gsap.delayedCall(railDelay, () => colorRail.classList.add('is-visible'));
      }
    });

    // ---- Botón "seguir bajando": salvavidas si el drag capturó el
    // primer intento de scroll (touch-action es 'none' en la escena 1
    // mientras se puede interactuar con la mesa) ----
    const scrollCue = document.getElementById('scroll-cue');
    if (scrollCue) {
      scrollCue.addEventListener('click', () => {
        document.getElementById('scene-2').scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
      });
    }
    const dragHint = document.querySelector('.drag-hint');
    const tableSwitcher = document.querySelector('.table-switcher');
    // El hint, el botón de bajar y el switcher de mesas son propios de
    // la escena 1 — se apagan en cuanto arranca la escena 2 (mismo
    // criterio que el rail de color).
    function setScene1UIVisible(visible) {
      [dragHint, scrollCue, tableSwitcher].forEach(el => {
        if (!el) return;
        el.style.opacity = visible ? 1 : 0;
        el.style.pointerEvents = visible ? '' : 'none';
      });
    }

    // ---- Cambio de mesa (flechas del switcher): la mesa actual "vuela"
    // hacia el costado por el que se sale, y en la página de destino
    // entra desde el lado contrario (ver TRANSITION_DIR en hero-scene.js)
    // — sigue el mismo gesto lateral en vez de resetear todo y caer del
    // cielo de nuevo. ----
    document.querySelectorAll('.switcher-arrow').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || REDUCE_MOTION) return; // sin motion: navegación normal, sin animación
        e.preventDefault();
        const isNext = a.getAttribute('aria-label') === 'Mesa siguiente';
        // La mesa sale por el mismo lado que apunta la flecha tocada, y en
        // la página de destino "se transforma" en la otra entrando desde
        // ese mismo lado (ver TRANSITION_DIR en hero-scene.js) — no es un
        // rebote a la inversa, es un solo gesto continuo hacia un costado.
        const exitDir = isNext ? 1 : -1; // "siguiente" sale por la derecha, "anterior" por la izquierda
        HeroScene.setOrbitEnabled(false);
        if (colorRail) colorRail.classList.remove('is-visible');
        setScene1UIVisible(false);
        gsap.to(introEls, { opacity: 0, duration: 0.3, ease: 'power1.out' });
        HeroScene.setMeshTransform({ x: exitDir * HeroScene.radius * 3.2, shadowOpacity: 0 });
        sessionStorage.setItem('heroTransitionDir', isNext ? 'next' : 'prev');
        gsap.delayedCall(0.6, () => { window.location.href = href; });
      });
    });

    // ---- Escena 2: la cámara se aleja, la mesa se achica y gira
    // apenas, el rail de colores se apaga, los textos van arriba
    // (nunca sobre la mesa) ----
    const scene2Lines = document.querySelectorAll('#scene-2 .scene-line');
    function updateScene2Text(p) {
      const n = scene2Lines.length;
      scene2Lines.forEach((el, i) => {
        const start = i / n, end = (i + 1) / n;
        const fade = 0.08;
        let op = 0;
        if (p >= start && p <= end) {
          const local = (p - start) / (end - start);
          op = local < fade ? local / fade : (local > 1 - fade ? (1 - local) / fade : 1);
        }
        el.style.opacity = op;
      });
    }

    // La mesa no arranca a ALEJARSE apenas se entra a la escena 2: se
    // queda en su lugar, entera y editable durante el primer tramo de
    // scroll (2-3 "pantallas", recién se aleja de verdad en la 3ra o 4ta)
    // — pero sigue girando en 360 todo el tiempo, como el resto de la
    // caída, para que nunca se sienta estática. DEAD_ZONE es la fracción
    // del progreso de la escena 2 que cubre ese colchón sin alejamiento.
    const DEAD_ZONE = 0.45;
    function remap(raw) { return clamp01((raw - DEAD_ZONE) / (1 - DEAD_ZONE)); }

    let inDeadZone = true;

    ScrollTrigger.create({
      trigger: '#scene-2',
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: REDUCE_MOTION ? false : 0.7,
      onUpdate(self) {
        const raw = self.progress; // el giro y el texto usan esto: nunca se pausan
        const p = remap(raw);      // el alejamiento (posición/escala/cámara) usa esto: pausado en la zona muerta
        HeroScene.setCameraFrame(
          scene2Start.pos.clone().lerp(scene2End.pos, p),
          scene2Start.look.clone().lerp(scene2End.look, p)
        );
        HeroScene.setMeshTransform({
          // "Cae" tumbleando (gira más de una vuelta, pasa por boca abajo)
          // durante TODO el scroll de la escena 2, colchón incluido — solo
          // la deriva lateral, el achique y el hundimiento esperan a que
          // termine el colchón.
          x: lerp(0, HeroScene.radius * 1.5, p),
          y: lerp(HeroScene.floatY, HeroScene.sinkY, p),
          rotX: lerp(0, Math.PI * 2.4, raw),
          rotY: lerp(0, 1.3, raw),
          scale: lerp(1, 0.4, p),
          shadowOpacity: lerp(0.15, 0.04, p),
        });
        updateScene2Text(raw);

        // El drag-orbit, el rail de color y el resto de la UI de la
        // escena 1 se apagan recién cuando el alejamiento arranca de
        // verdad — no apenas se entra a la escena 2 — así se puede seguir
        // viendo, girando y personalizando la mesa durante todo el colchón.
        const stillDead = raw <= DEAD_ZONE;
        if (stillDead !== inDeadZone) {
          inDeadZone = stillDead;
          HeroScene.setOrbitEnabled(inDeadZone);
          if (colorRail) colorRail.classList.toggle('is-visible', inDeadZone);
          setScene1UIVisible(inDeadZone);
        }
      },
      onEnter: () => {
        // El scroll nativo pasa a mandar apenas se entra a la escena 2
        // (antes, en la escena 1, el drag captura el gesto para orbitar) —
        // así el colchón de arriba se recorre con un swipe normal.
        HeroScene.setScrollAllowed(true);
        inDeadZone = true;
      },
      onEnterBack: () => {
        HeroScene.setScrollAllowed(true);
      },
      onLeaveBack: () => {
        HeroScene.setInteractionEnabled(true);
        inDeadZone = true;
        if (colorRail) colorRail.classList.add('is-visible');
        setScene1UIVisible(true);
        updateScene2Text(0);
      },
    });

    if (REDUCE_MOTION) {
      // Sin scrub: salto directo al estado final/inicial en vez de
      // animar el recorrido cuadro a cuadro.
      ScrollTrigger.create({
        trigger: '#scene-2', start: 'top center', end: 'bottom center',
        onEnter: () => {
          HeroScene.setCameraFrame(scene2End.pos, scene2End.look);
          HeroScene.setMeshTransform({ y: HeroScene.sinkY, rotY: 0.9, scale: 0.4, shadowOpacity: 0.04 });
          updateScene2Text(1);
        },
        onLeaveBack: () => {
          HeroScene.setCameraFrame(scene2Start.pos, scene2Start.look);
          HeroScene.setMeshTransform({ y: HeroScene.floatY, rotY: 0, scale: 1, shadowOpacity: 0.15 });
          updateScene2Text(0);
        },
      });
    }

    // ---- Handoff: las cards caen del cielo, todas juntas ----
    const cards = gsap.utils.toArray('.handoff-card');
    if (cards.length) {
      gsap.fromTo(cards,
        { y: REDUCE_MOTION ? 0 : -160, opacity: REDUCE_MOTION ? 1 : 0 },
        {
          y: 0, opacity: 1,
          duration: REDUCE_MOTION ? 0.01 : 1.1,
          ease: 'back.out(1.5)',
          stagger: REDUCE_MOTION ? 0 : 0.06,
          scrollTrigger: { trigger: '.handoff', start: 'top 75%' },
        }
      );
      gsap.fromTo('.handoff .eyebrow, .handoff h2',
        { y: REDUCE_MOTION ? 0 : -24, opacity: REDUCE_MOTION ? 1 : 0 },
        {
          y: 0, opacity: 1, duration: REDUCE_MOTION ? 0.01 : 0.7, ease: 'power2.out',
          scrollTrigger: { trigger: '.handoff', start: 'top 85%' },
        }
      );
    }

    // ---- Swatches de color (tap/click directo, sin scroll de por medio) ----
    const swatchWrap = document.getElementById('color-swatches');
    if (swatchWrap) {
      swatchWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.swatch');
        if (!btn) return;
        swatchWrap.querySelectorAll('.swatch').forEach(b => {
          b.classList.remove('activo');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('activo');
        btn.setAttribute('aria-pressed', 'true');
        HeroScene.setColor(btn.dataset.color);
        if (!REDUCE_MOTION) {
          gsap.fromTo(btn, { scale: 0.8 }, { scale: 1.08, duration: 0.35, ease: 'back.out(3)' });
        }
        updateResumen();
      });
    }

    // ---- Panel "Personalizar": patrón, tamaño, color secundario y
    // resumen+WhatsApp — el resto del configurador real que no resuelve
    // ya el switcher entre páginas (tipo de mesa / tipo de patas). ----
    const cfg = window.HERO_CONFIG || {};
    const mesa = HeroScene.mesa;
    const PATRON_LABEL = { damero: 'Damero', guarda: 'Guarda', diagonal: 'Diagonal', uniforme: 'Uniforme' };
    const TAMANO_LABEL = { chico: 'Chico', grande: 'Grande' };

    const personalizarToggle = document.getElementById('personalizar-toggle');
    const personalizarSheet = document.getElementById('personalizar-sheet');
    const personalizarBackdrop = document.getElementById('personalizar-backdrop');
    const personalizarClose = document.getElementById('personalizar-close');

    function setPersonalizarOpen(open) {
      if (personalizarSheet) personalizarSheet.classList.toggle('is-open', open);
      if (personalizarBackdrop) personalizarBackdrop.classList.toggle('is-open', open);
    }
    if (personalizarToggle) personalizarToggle.addEventListener('click', () => setPersonalizarOpen(true));
    if (personalizarClose) personalizarClose.addEventListener('click', () => setPersonalizarOpen(false));
    if (personalizarBackdrop) personalizarBackdrop.addEventListener('click', () => setPersonalizarOpen(false));

    function updateResumen() {
      if (!mesa) return;
      const colorLabel = (mesa.COLORES[mesa.currentColor] || {}).label || '';
      const color2Label = (mesa.COLORES[mesa.currentColor2] || {}).label || '';
      const patronLabel = PATRON_LABEL[mesa.currentPatron] || mesa.currentPatron;
      const tamanoLabel = TAMANO_LABEL[mesa.currentTamano] || mesa.currentTamano;
      const nombre = cfg.nombre || 'esta mesa';

      const resumenEl = document.getElementById('personalizar-resumen-text');
      if (resumenEl) {
        resumenEl.innerHTML =
          `<p><strong>${nombre}</strong></p>` +
          `<p>Patrón ${patronLabel} · pieza ${tamanoLabel}</p>` +
          `<p>Color principal ${colorLabel} · detalle ${color2Label}</p>`;
      }
      const cta = document.getElementById('personalizar-cta');
      if (cta) {
        const texto = `Hola Ganchito! \u{1F44B} Me gustaría consultar sobre la ${nombre}, patrón ${patronLabel}, color ${colorLabel} con detalle ${color2Label}.`;
        cta.href = `https://wa.me/5492284354090?text=${encodeURIComponent(texto)}`;
      }
    }

    function wireChipGroup(id, onSelect) {
      const wrap = document.getElementById(id);
      if (!wrap) return;
      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-btn');
        if (!btn) return;
        wrap.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        onSelect(btn.dataset.value);
        updateResumen();
        if (!REDUCE_MOTION) {
          gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
        }
      });
    }
    wireChipGroup('patron-chips', (v) => HeroScene.setPatron(v));
    wireChipGroup('tamano-chips', (v) => HeroScene.setTamano(v));

    const color2Wrap = document.getElementById('color2-swatches');
    if (color2Wrap) {
      color2Wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.swatch-mini');
        if (!btn) return;
        color2Wrap.querySelectorAll('.swatch-mini').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        HeroScene.setColor2(btn.dataset.color2);
        updateResumen();
        if (!REDUCE_MOTION) {
          gsap.fromTo(btn, { scale: 0.8 }, { scale: 1.08, duration: 0.35, ease: 'back.out(3)' });
        }
      });
    }

    updateResumen();
  }

  if (window.HeroScene && window.HeroScene.ready) {
    boot();
  } else {
    console.warn('hero-story.js: HeroScene no está listo (¿se cargó hero-scene.js antes?)');
  }

})();
