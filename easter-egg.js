/* =========================================================
   GANCHITO — easter-egg.js
   "El mosaico fugitivo": un cuadradito que parece haberse caído cerca
   de un borde de pantalla. Tocarlo lo hace huir a otro borde con un
   mensaje cada vez más cargoso. Al 4to toque se queda quieto y desde
   el propio mosaico nace un bocadillo invitando a seguir a Ganchito
   en Instagram.

   Decorativo, no funcional: el botón vive con aria-hidden/tabindex="-1"
   a propósito (ver index.html) — no vale la pena forzar a un lector de
   pantalla a "cazarlo".
   ========================================================= */

(function () {
  const SESSION_KEY = 'ganchitoMosaicFound';
  // Debug: ?egg=1 en la URL fuerza que aparezca ya (ignora el delay
  // random y el "una vez por sesión") — solo para poder probarlo sin
  // esperar. No afecta el comportamiento real para un visitante normal.
  const DEBUG = /[?&]egg=1\b/.test(location.search);
  if (DEBUG) sessionStorage.removeItem(SESSION_KEY);
  if (!DEBUG && sessionStorage.getItem(SESSION_KEY) === '1') return; // ya lo encontraron esta sesión

  const tile = document.getElementById('mosaic-fugitive');
  const tag = document.getElementById('mosaic-fugitive-tag');
  const payoff = document.getElementById('mosaic-payoff');
  const payoffClose = document.getElementById('mosaic-payoff-close');
  const payoffLink = document.getElementById('mosaic-payoff-link');
  if (!tile || !payoff) return;

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MESSAGES = ['No tocar.', 'Te dijimos que no lo toques.', 'Bueno...'];
  const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'mid-left', 'mid-right'];
  const BREAK_AT = 4; // al 4to toque, el mosaico se queda quieto y habla

  let taps = 0;
  let currentCorner = null;

  function isMobile() { return window.matchMedia('(max-width: 760px)').matches; }

  function place(corner) {
    const margin = isMobile() ? 16 : 28;
    const topSafe = 88; // debajo del header sticky
    tile.style.top = tile.style.bottom = tile.style.left = tile.style.right = '';
    if (corner === 'top-left')      { tile.style.top = topSafe + 'px'; tile.style.left = margin + 'px'; }
    else if (corner === 'top-right'){ tile.style.top = topSafe + 'px'; tile.style.right = margin + 'px'; }
    else if (corner === 'bottom-left') { tile.style.bottom = margin + 'px'; tile.style.left = margin + 'px'; }
    else if (corner === 'bottom-right'){ tile.style.bottom = margin + 'px'; tile.style.right = margin + 'px'; }
    else if (corner === 'mid-left')  { tile.style.top = '50%'; tile.style.left = margin + 'px'; }
    else if (corner === 'mid-right') { tile.style.top = '50%'; tile.style.right = margin + 'px'; }
    tile.style.setProperty('--rot', (Math.random() * 16 - 8).toFixed(1) + 'deg');
  }

  function randomCorner(excluding) {
    const options = CORNERS.filter((c) => c !== excluding);
    return options[Math.floor(Math.random() * options.length)];
  }

  function firstAppear() {
    currentCorner = randomCorner(null);
    place(currentCorner);
    tile.hidden = false;
    requestAnimationFrame(() => tile.classList.add('is-visible'));
  }

  function flee() {
    tile.classList.add('is-fleeing');
    window.setTimeout(() => {
      currentCorner = randomCorner(currentCorner);
      place(currentCorner);
      tile.classList.remove('is-fleeing');
    }, REDUCE_MOTION ? 0 : 260);
  }

  let tagTimer = null;
  function showTag(text) {
    if (!tag) return;
    tag.textContent = text;
    tag.classList.add('is-visible');
    window.clearTimeout(tagTimer);
    tagTimer = window.setTimeout(() => tag.classList.remove('is-visible'), 2400);
  }

  tile.addEventListener('click', () => {
    if (taps >= BREAK_AT) { showPayoff(); return; } // ya se quedó quieto: re-abre el bocadillo si lo cerraron
    taps++;
    if (taps >= BREAK_AT) {
      if (tag) tag.classList.remove('is-visible');
      showPayoff();
      return;
    }
    showTag(MESSAGES[taps - 1]);
    flee();
  });

  // ---- Aparición inicial: recién cuando ya pasó el hero (mesas a la
  // vista) + una demora al azar, para que nunca se sienta "lo primero
  // que ves" ni algo mecánico atado al scroll. ----
  const marker = document.getElementById('mesas');
  function armFirstAppear() {
    const delay = DEBUG ? 0 : 8000 + Math.random() * 12000;
    window.setTimeout(firstAppear, delay);
  }
  if (DEBUG) {
    armFirstAppear();
  } else if (marker && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          armFirstAppear();
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    obs.observe(marker);
  } else {
    armFirstAppear();
  }

  // ---- El payoff: el mosaico se queda quieto y "habla" ----
  function showPayoff() {
    positionPayoff();
    payoff.hidden = false;
    requestAnimationFrame(() => payoff.classList.add('is-visible'));
  }
  function hidePayoff() {
    payoff.classList.remove('is-visible');
    window.setTimeout(() => { payoff.hidden = true; }, REDUCE_MOTION ? 0 : 250);
  }

  // El bocadillo nace del mosaico y siempre "crece" hacia el centro de
  // la pantalla — así nunca se corta contra un borde, sea cual sea de
  // las 6 posiciones en la que el mosaico haya quedado.
  function positionPayoff() {
    const r = tile.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const openRight = cx < window.innerWidth / 2;
    const openDown = cy < window.innerHeight / 2;
    const gap = 14;

    payoff.style.top = payoff.style.bottom = payoff.style.left = payoff.style.right = '';
    payoff.classList.remove('opens-down-right', 'opens-down-left', 'opens-up-right', 'opens-up-left');

    if (openDown) { payoff.style.top = (r.bottom + gap) + 'px'; }
    else { payoff.style.bottom = (window.innerHeight - r.top + gap) + 'px'; }

    if (openRight) { payoff.style.left = Math.max(12, r.left) + 'px'; }
    else { payoff.style.right = Math.max(12, window.innerWidth - r.right) + 'px'; }

    payoff.classList.add('opens-' + (openDown ? 'down' : 'up') + '-' + (openRight ? 'right' : 'left'));
  }
  window.addEventListener('resize', () => {
    if (!payoff.hidden) positionPayoff();
  });

  if (payoffClose) payoffClose.addEventListener('click', hidePayoff);
  if (payoffLink) {
    payoffLink.addEventListener('click', () => {
      sessionStorage.setItem(SESSION_KEY, '1');
      // Deja ver la transición de salida antes de que el navegador
      // cambie de foco a la pestaña nueva.
      hidePayoff();
      tile.classList.remove('is-visible');
      window.setTimeout(() => { tile.hidden = true; }, 250);
    });
  }
})();
