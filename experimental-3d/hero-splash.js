/* =========================================================
   GANCHITO — LABORATORIO 3D (prototipo aislado)
   hero-splash.js
   Portada de apertura: pantalla completa con el título ("Mesas hechas
   a mano / Armá la tuya") sobre un fondo azul, que se disuelve para
   revelar la mesa 3D debajo. Solo en una entrada "en frío" — si venís
   de tocar una flecha del switcher (ver hero-story.js/hero-scene.js)
   esta pantalla no se muestra, para no cortar el gesto lateral.
   Independiente del motor 3D a propósito: no espera a HeroScene.ready,
   así se ve desde el primer paint sin flash de contenido sin estilo.
   ========================================================= */

(function () {
  const splash = document.getElementById('intro-splash');
  if (!splash) return;

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTransition = !!sessionStorage.getItem('heroTransitionDir');

  if (isTransition || REDUCE_MOTION) {
    splash.classList.add('is-hidden');
    return;
  }

  function dissolve() {
    const bubbles = splash.querySelectorAll('.intro-splash-bubble');
    gsap.timeline({ onComplete: () => splash.classList.add('is-hidden') })
      .to(bubbles, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out' }, 0)
      .to(splash, { opacity: 0, scale: 1.06, filter: 'blur(10px)', duration: 0.9, ease: 'power2.inOut' }, 0.2);
  }

  setTimeout(dissolve, 1700);
})();
