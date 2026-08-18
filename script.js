/* =========================================================
   GANCHITO — script.js
   Todo vainilla JS, sin dependencias. Pensado para que sea
   fácil de leer y editar en VS Code.
   ========================================================= */
// ==================== PAGE LOADER INIT ====================
const initPageLoader = () => {
    const MIN_SHOW_MS = 800;
    const MAX_WAIT_MS = 3500;
    
    const loader = document.getElementById('mp-page-loader');
    const body = document.body;
    
    if (!loader) return;
    
    // Agregar clase de "cargando" al body
    body.classList.add('mp-loading');
    
    // Tiempo mínimo de espera
    let minTimeReached = false;
    setTimeout(() => {
        minTimeReached = true;
        // Si ya está listo, remover inmediatamente
        if (window.mpLoaderReady) {
            hidePageLoader();
        }
    }, MIN_SHOW_MS);
    
    // Timeout máximo de respaldo (3.5 seg)
    window.mpLoaderTimeout = setTimeout(() => {
        hidePageLoader();
    }, MAX_WAIT_MS);
    
    // Función para ocultar el loader
    window.hidePageLoader = () => {
        if (!loader) return;
        
        clearTimeout(window.mpLoaderTimeout);
        
        loader.classList.add('mp-fade-out');
        body.classList.remove('mp-loading');
        
        // Eliminar del DOM después de la animación
        setTimeout(() => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            window.mpLoaderReady = true;
        }, 400);
    };
    
    // Marcar como "ready" cuando el loader esté listo para ocultarse
    window.mpLoaderReady = false;
};

// Inicializar el loader
initPageLoader();
/* ---------------------------------------------------------
   0) CARGAR CONTENIDO GUARDADO POR EL ADMIN (localStorage)
   --------------------------------------------------------- */
(function applyAdminContent() {
  const data = JSON.parse(localStorage.getItem('ganchito_content') || 'null');
  if (!data) return;
  function setText(selector, html) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (el && html) el.innerHTML = html;
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (data.heroTitle) setText('.hero-title', data.heroTitle);
    if (data.heroSub)   setText('.hero-sub',   data.heroSub);
    if (data.mesas) {
      data.mesas.forEach((mesa, i) => {
        const card = document.querySelectorAll('[data-product]')[i];
        if (!card) return;
        if (mesa.name)       { card.dataset.name = mesa.name;        setText(card.querySelector('.card-body h3'), mesa.name); }
        if (mesa.desc)       { card.dataset.desc = mesa.desc;        setText(card.querySelector('.card-desc'), mesa.desc); }
        if (mesa.price)      { card.dataset.price = mesa.price;      setText(card.querySelector('.price'), '$' + mesa.price); }
        if (mesa.medidas)    card.dataset.medidas = mesa.medidas;
        if (mesa.materiales) card.dataset.materiales = mesa.materiales;
        if (mesa.entrega)    card.dataset.entrega = mesa.entrega;
        if (mesa.fotos && mesa.fotos.length) {
          const slides = card.querySelectorAll('.gallery-slide');
          mesa.fotos.forEach((src, j) => { if (slides[j] && src) slides[j].innerHTML = `<img src="${src}" alt="Foto ${j+1}">`; });
        }
      });
    }
    if (data.oficioTitle) setText('.oficio .section-title', data.oficioTitle);
    const ot = document.querySelectorAll('.oficio-text');
    if (data.oficioText1 && ot[0]) setText(ot[0], data.oficioText1);
    if (data.oficioText2 && ot[1]) setText(ot[1], data.oficioText2);
    if (data.testimonios) {
      data.testimonios.forEach((t, i) => {
        const card = document.querySelectorAll('.testimonio-card')[i];
        if (!card) return;
        if (t.texto)  setText(card.querySelector('.testimonio-texto'), t.texto);
        if (t.nombre) setText(card.querySelector('.testimonio-nombre'), t.nombre);
        if (t.ciudad) setText(card.querySelector('.testimonio-ciudad'), t.ciudad);
      });
    }
    if (data.faq) {
      data.faq.forEach((item, i) => {
        const el = document.querySelectorAll('.faq-item')[i];
        if (!el) return;
        if (item.pregunta) {
          const trigger = el.querySelector('.faq-trigger');
          if (trigger) { trigger.childNodes[0].textContent = item.pregunta + ' '; }
        }
        if (item.respuesta) setText(el.querySelector('.faq-body p'), item.respuesta);
      });
    }
    if (data.tallerFotos) {
      const slides = document.querySelectorAll('#carrusel-track .carrusel-slide:not([aria-hidden])');
      data.tallerFotos.forEach((src, i) => {
        if (slides[i] && src) slides[i].innerHTML = `<img src="${src}" alt="Foto taller ${i+1}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
      });
    }
  });
})();

/* ---------------------------------------------------------
   1) CONFIG — Lo único que hace falta tocar para producción
   --------------------------------------------------------- */
const WHATSAPP_NUMBER = "5492284354090"; // Ganchito — +54 9 2284 35-4090

function buildWhatsAppLink(message){
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}

/* ---------------------------------------------------------
   2) Botones generales de WhatsApp (header y footer)
   --------------------------------------------------------- */
const genericMessage = "Hola Ganchito! 👋 Quiero hacer una consulta sobre sus muebles.";
const headerWhatsapp = document.getElementById("header-whatsapp");
const footerWhatsapp = document.getElementById("footer-whatsapp");
if (headerWhatsapp) headerWhatsapp.href = buildWhatsAppLink(genericMessage);
if (footerWhatsapp) footerWhatsapp.href = buildWhatsAppLink(genericMessage);

/* ---------------------------------------------------------
   3) Menú móvil
   --------------------------------------------------------- */
const navToggle = document.getElementById("nav-toggle");
const mainNav = document.getElementById("main-nav");

if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------------------------------------------------------
   4) Botones "Comprar" / "Consultar" de cada card
   --------------------------------------------------------- */
document.querySelectorAll('[data-action="comprar"]').forEach(button => {
  const card = button.closest("[data-product]");
  if (!card) return;
  const name = card.dataset.name;
  const price = card.dataset.price;
  const message = `Hola Ganchito! 👋 Quiero comprar la "${name}" ($${price}). ¿Está disponible?`;
  button.href = buildWhatsAppLink(message);
});

/* ---------------------------------------------------------
   5) Modal de producto ("Ver más")
   --------------------------------------------------------- */
const modalOverlay = document.getElementById("modal-overlay");
const modalClose = document.getElementById("modal-close");
const modalMedia = document.getElementById("modal-media");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalMedidas = document.getElementById("modal-medidas");
const modalMateriales = document.getElementById("modal-materiales");
const modalEntrega = document.getElementById("modal-entrega");
const modalPrice = document.getElementById("modal-price");
const modalComprar = document.getElementById("modal-comprar");

let lastFocusedEl = null;

let modalGalleryTimer = null;

function buildModalGallery(card, name){
  modalMedia.innerHTML = "";
  if (modalGalleryTimer) { clearInterval(modalGalleryTimer); modalGalleryTimer = null; }

  const galleryEl = card.querySelector('[data-gallery]');
  const imgs = galleryEl ? Array.from(galleryEl.querySelectorAll('img')).map(img => img.src) : [];

  // Fallback: si por algún motivo no hay data-gallery, usamos data-img
  const sources = imgs.length ? imgs : (card.dataset.img ? [card.dataset.img] : []);
  if (!sources.length) return;

  const main = document.createElement('div');
  main.className = 'modal-gallery-main';

  let current = 0;
  const slideEls = sources.map((src, i) => {
    const slide = document.createElement('div');
    slide.className = 'modal-gallery-slide' + (i === 0 ? ' active' : '');
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${name} — foto ${i + 1}`;
    slide.appendChild(img);
    main.appendChild(slide);
    return slide;
  });

  modalMedia.appendChild(main);

  if (sources.length < 2) return; // 1 sola foto: sin flechas/dots/thumbs

  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'modal-gallery-dots';
  const dotEls = sources.map((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'gdot' + (i === 0 ? ' active' : '');
    dotsWrap.appendChild(dot);
    return dot;
  });
  main.appendChild(dotsWrap);

  const prevBtn = document.createElement('button');
  prevBtn.className = 'modal-gallery-arrow modal-gallery-arrow-prev';
  prevBtn.setAttribute('aria-label', 'Foto anterior');
  prevBtn.innerHTML = '&#8249;';
  const nextBtn = document.createElement('button');
  nextBtn.className = 'modal-gallery-arrow modal-gallery-arrow-next';
  nextBtn.setAttribute('aria-label', 'Foto siguiente');
  nextBtn.innerHTML = '&#8250;';
  main.appendChild(prevBtn);
  main.appendChild(nextBtn);

  const thumbsWrap = document.createElement('div');
  thumbsWrap.className = 'modal-gallery-thumbs';
  const thumbEls = sources.map((src, i) => {
    const btn = document.createElement('button');
    btn.className = 'modal-gallery-thumb' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', `Ver foto ${i + 1}`);
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    btn.appendChild(img);
    thumbsWrap.appendChild(btn);
    return btn;
  });
  modalMedia.appendChild(thumbsWrap);

  function goTo(idx){
    slideEls[current].classList.remove('active');
    dotEls[current].classList.remove('active');
    thumbEls[current].classList.remove('active');
    current = (idx + sources.length) % sources.length;
    slideEls[current].classList.add('active');
    dotEls[current].classList.add('active');
    thumbEls[current].classList.add('active');
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  dotEls.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
  thumbEls.forEach((thumb, i) => thumb.addEventListener('click', () => goTo(i)));

  // Swipe táctil sobre la imagen grande
  let touchStartX = 0, touchStartY = 0;
  main.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  main.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goTo(current + 1); else goTo(current - 1);
    }
  }, { passive: true });
}

function openModal(card){
  const { name, price, desc, medidas, materiales, entrega } = card.dataset;

  modalTitle.textContent = name;
  modalDesc.textContent = desc;
  modalMedidas.textContent = medidas;
  modalMateriales.textContent = materiales;
  modalEntrega.textContent = entrega;
  modalPrice.textContent = card.querySelector(".price").textContent;

  buildModalGallery(card, name);

  const message = `Hola Ganchito! 👋 Quiero comprar la "${name}" ($${price}). ¿Está disponible?`;
  modalComprar.href = buildWhatsAppLink(message);

  lastFocusedEl = document.activeElement;
  modalOverlay.hidden = false;
  document.body.style.overflow = "hidden";
  modalClose.focus();
}
function closeModal(){
  modalOverlay.hidden = true;
  document.body.style.overflow = "";
  if (lastFocusedEl) lastFocusedEl.focus();
}

document.querySelectorAll('[data-action="ver-mas"]').forEach(button => {
  const card = button.closest("[data-product]");
  button.addEventListener("click", () => openModal(card));
});

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
});



/* ---------------------------------------------------------
   7) Animación simple al hacer scroll (reveal)
   --------------------------------------------------------- */
const revealTargets = document.querySelectorAll(".card, .memory-intro, .hero-copy, .hero-media, .faq-item");
revealTargets.forEach(el => el.setAttribute("data-reveal", ""));

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealTargets.forEach(el => observer.observe(el));
} else {
  revealTargets.forEach(el => el.classList.add("is-visible"));
}

/* ---------------------------------------------------------
   7b) Memory de Ganchito — reemplaza la vieja "Nuestro oficio".
   Mazo de 16 cartas (8 imágenes reales del proyecto, cada una dos
   veces), barajado distinto en cada partida. Flip 3D vía CSS
   (.is-flipped / .is-matched, ver styles.css); acá solo el estado.
   --------------------------------------------------------- */
(function () {
  const board = document.getElementById('memory-board');
  if (!board) return;

  const counterEl = document.getElementById('memory-pairs-found');
  const completeEl = document.getElementById('memory-complete');
  const restartBtn = document.getElementById('memory-restart');
  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fotos reales del proyecto — mesas, detalle, taller y el isotipo.
  // Nada de placeholders: son los mismos assets que usa el resto del sitio.
  const IMAGES = [
    { src: 'assets/images/PHOTO-2026-08-03-12-23-14.jpg', alt: 'Mesa Ratona de madera' },
    { src: 'assets/images/PHOTO-2026-08-03-12-30-22.jpg', alt: 'Mesa Cubo' },
    { src: 'assets/images/mesa-metal-2.jpg', alt: 'Mesa Ratona de metal' },
    { src: 'assets/images/mesa-ratona-c-metal.jpg', alt: 'Detalle del mosaico y la pata metálica' },
    { src: 'assets/images/WhatsApp Image 2026-08-04 at 14.42.40 (2).jpeg', alt: 'Mosaico pegado a mano sobre madera' },
    { src: 'assets/images/WhatsApp Image 2026-08-04 at 14.42.41.jpeg', alt: 'Armado de la estructura en el taller' },
    { src: 'assets/images/PHOTO-2026-08-03-12-23-12.jpg', alt: 'Mesa Ganchito en un living real' },
    { src: 'assets/images/logo-icono.png', alt: 'Isotipo Ganchito' },
  ];
  const TOTAL_PAIRS = IMAGES.length;

  let deck = [];
  let firstIndex = null;
  let secondIndex = null;
  let lock = false;
  let pairsFound = 0;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildDeck() {
    deck = shuffle(IMAGES.concat(IMAGES));
  }

  function cardMarkup(card) {
    return `
      <span class="memory-card-inner">
        <span class="memory-card-face memory-card-back" aria-hidden="true">
          <img src="assets/images/logo-icono.png" alt="">
        </span>
        <span class="memory-card-face memory-card-front">
          <img src="${card.src}" alt="${card.alt}" loading="lazy">
          <span class="memory-card-check" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </span>
        </span>
      </span>`;
  }

  function render() {
    board.innerHTML = '';
    deck.forEach((card, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'memory-card';
      btn.setAttribute('aria-label', `Carta oculta ${i + 1} de ${deck.length}`);
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = cardMarkup(card);
      btn.addEventListener('click', () => onCardTap(i));
      board.appendChild(btn);
    });
  }

  function cardEl(i) { return board.children[i]; }

  function onCardTap(i) {
    if (lock) return;
    const btn = cardEl(i);
    if (!btn || btn.classList.contains('is-flipped') || btn.classList.contains('is-matched')) return;

    flipUp(btn, deck[i]);

    if (firstIndex === null) {
      firstIndex = i;
      return;
    }

    secondIndex = i;
    lock = true;
    const a = deck[firstIndex], b = deck[secondIndex];

    if (a.src === b.src) {
      window.setTimeout(() => {
        markMatched(cardEl(firstIndex));
        markMatched(cardEl(secondIndex));
        pairsFound++;
        if (counterEl) counterEl.textContent = String(pairsFound);
        firstIndex = null; secondIndex = null; lock = false;
        if (pairsFound === TOTAL_PAIRS) onGameComplete();
      }, REDUCE_MOTION ? 30 : 350);
    } else {
      window.setTimeout(() => {
        flipDown(cardEl(firstIndex));
        flipDown(cardEl(secondIndex));
        firstIndex = null; secondIndex = null; lock = false;
      }, REDUCE_MOTION ? 200 : 700);
    }
  }

  function flipUp(btn, card) {
    btn.classList.add('is-flipped');
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', card.alt);
  }
  function flipDown(btn) {
    if (!btn) return;
    btn.classList.remove('is-flipped');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Carta oculta');
  }
  function markMatched(btn) {
    if (!btn) return;
    btn.classList.add('is-matched');
    btn.setAttribute('aria-label', btn.querySelector('.memory-card-front img').alt + ' — pareja encontrada');
  }

  function onGameComplete() {
    if (completeEl) {
      completeEl.hidden = false;
      requestAnimationFrame(() => completeEl.classList.add('is-visible'));
    }
    window.setTimeout(openCouponPopup, 700); // deja asentarse el "ganaste" antes del cupón
  }

  // ---- Cupón "ticket" — mismo código siempre (sin backend ni checkout,
  // se valida a mano por WhatsApp). Si ya lo reclamó antes en este
  // navegador, la segunda vez el chiste cambia en vez de repetir el
  // mismo texto solemne. ----
  const COUPON_CODE = 'GANCHITO10';
  const COUPON_KEY = 'ganchitoCouponClaimed';
  const couponPopup = document.getElementById('coupon-popup');
  const couponEyebrow = document.getElementById('coupon-eyebrow');
  const couponClose = document.getElementById('coupon-close');
  const couponCopyBtn = document.getElementById('coupon-copy');
  const couponWsp = document.getElementById('coupon-wsp');

  function openCouponPopup() {
    if (!couponPopup) return;
    const alreadyClaimed = localStorage.getItem(COUPON_KEY) === '1';
    if (couponEyebrow) {
      couponEyebrow.textContent = alreadyClaimed
        ? 'Ya lo habías ganado, pero tomá, insistí no más'
        : 'Encontraste las 8 parejas';
    }
    if (couponWsp) {
      const msg = alreadyClaimed
        ? `Hola Ganchito! 👋 Jugué de nuevo al memory (sí, otra vez) y quiero mi ${COUPON_CODE}, dale.`
        : `Hola Ganchito! 👋 Encontré las 8 parejas del juego 🎉 Quiero mi 10% de descuento en mi primera mesa con el código ${COUPON_CODE}.`;
      couponWsp.href = buildWhatsAppLink(msg);
    }
    localStorage.setItem(COUPON_KEY, '1');
    couponPopup.classList.add('is-open');
  }
  function closeCouponPopup() {
    if (couponPopup) couponPopup.classList.remove('is-open');
  }
  if (couponClose) couponClose.addEventListener('click', closeCouponPopup);
  if (couponPopup) {
    couponPopup.addEventListener('click', (e) => { if (e.target === couponPopup) closeCouponPopup(); });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && couponPopup && couponPopup.classList.contains('is-open')) closeCouponPopup();
  });
  if (couponCopyBtn) {
    couponCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(COUPON_CODE);
      } catch (err) {
        // Sin permiso/API de portapapeles (ej. contexto no seguro): el
        // código ya está visible y seleccionable a mano, no hace falta
        // avisar de un error para esto.
      }
      couponCopyBtn.textContent = '¡Copiado!';
      couponCopyBtn.classList.add('is-copied');
      window.setTimeout(() => {
        couponCopyBtn.textContent = 'Copiar';
        couponCopyBtn.classList.remove('is-copied');
      }, 1600);
    });
  }

  function newGame() {
    firstIndex = null; secondIndex = null; lock = false; pairsFound = 0;
    if (counterEl) counterEl.textContent = '0';
    if (completeEl) { completeEl.classList.remove('is-visible'); completeEl.hidden = true; }
    buildDeck();
    render();
  }

  if (restartBtn) restartBtn.addEventListener('click', newGame);

  newGame();
})();

/* ---------------------------------------------------------
   8) Año en el footer
   --------------------------------------------------------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------------------------------------------------------
   9) Gallery en cards — 100% manual (sin autoplay)
   --------------------------------------------------------- */
document.querySelectorAll('[data-gallery]').forEach(gallery => {
  const slides = gallery.querySelectorAll('.gallery-slide');
  const card   = gallery.closest('.card');
  const dots   = card ? card.querySelectorAll('.gdot') : [];
  if (slides.length < 2) return;

  let current = 0; // arranca siempre en la primera foto del HTML

  function goTo(idx) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  // Dots clickeables
  dots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => { e.stopPropagation(); goTo(i); });
  });

  // Flechas prev/next
  const prevBtn = card ? card.querySelector('.gallery-arrow-prev') : null;
  const nextBtn = card ? card.querySelector('.gallery-arrow-next') : null;
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1); });

  // Swipe táctil (mobile)
  let touchStartX = 0;
  let touchStartY = 0;
  gallery.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  gallery.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    // Solo reacciona si el swipe fue mayormente horizontal,
    // para no interferir con el scroll vertical de la página.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goTo(current + 1); else goTo(current - 1);
    }
  }, { passive: true });
});

/* ---------------------------------------------------------
   10) Galería circular — "El proceso"
   Fila con scroll horizontal NATIVO (scroll-snap) — no es un gesto
   simulado, así que en mobile jamás compite con el scroll vertical
   de la página. La foto centrada se agranda; el resto se "curva"
   hacia atrás (arco calculado en cada tick de scroll). Loop infinito
   por triplicado del mazo: el usuario siempre vive en la copia del
   medio, y si llega a pisar una punta se lo teletransporta de vuelta
   sin animación (las copias son idénticas, no se nota).
   --------------------------------------------------------- */
(function () {
  const track = document.getElementById('circular-track');
  if (!track) return;

  const prevBtn = document.getElementById('circular-prev');
  const nextBtn = document.getElementById('circular-next');
  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const IMAGES = [
    { src: 'assets/images/WhatsApp Image 2026-08-04 at 14.42.40 (1).jpeg', label: 'Lista en tu living' },
    { src: 'assets/images/WhatsApp Image 2026-08-04 at 14.42.40 (2).jpeg', label: 'Pegado de mosaico' },
    { src: 'assets/images/WhatsApp Image 2026-08-04 at 14.42.40.jpeg', label: 'Armado del mosaico' },
    { src: 'assets/images/WhatsApp Image 2026-08-04 at 14.42.41 (1).jpeg', label: 'Terminación a mano' },
    { src: 'assets/images/WhatsApp Image 2026-08-04 at 14.42.41.jpeg', label: 'Armado de estructura' },
  ];
  const N = IMAGES.length;
  const deck = IMAGES.concat(IMAGES, IMAGES); // [copia A][copia B][copia C]

  let items = [];

  function buildTrack() {
    track.innerHTML = '';
    items = deck.map((img, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'circular-item';
      btn.style.backgroundImage = `url('${img.src}')`;
      btn.dataset.img = img.src;
      // Solo la copia del medio (B) es alcanzable por teclado/lector de
      // pantalla — A y C son puramente visuales, para el loop infinito.
      const isMiddleCopy = i >= N && i < N * 2;
      btn.setAttribute('aria-label', img.label);
      if (!isMiddleCopy) { btn.tabIndex = -1; btn.setAttribute('aria-hidden', 'true'); }

      const label = document.createElement('span');
      label.className = 'circular-item-label';
      label.textContent = img.label;
      btn.appendChild(label);

      track.appendChild(btn);
      return btn;
    });
  }
  buildTrack();

  function centerOn(index, behavior) {
    const item = items[index];
    if (!item) return;
    const target = item.offsetLeft + item.offsetWidth / 2 - track.clientWidth / 2;
    track.scrollTo({ left: target, behavior: behavior || 'auto' });
  }

  function currentCenterIndex() {
    const idx = items.findIndex((it) => it.classList.contains('is-center'));
    return idx === -1 ? N + Math.floor(N / 2) : idx;
  }

  // ---- Arco visual: en cada tick de scroll, cada ítem recibe un
  // transform inline según su distancia al centro — sin animar el
  // propio scroll, así queda 1:1 con el dedo/rueda/trackpad. ----
  let ticking = false;
  function updateArc() {
    ticking = false;
    const trackRect = track.getBoundingClientRect();
    const centerX = trackRect.left + trackRect.width / 2;
    let closest = null, closestDist = Infinity;

    items.forEach((item) => {
      const r = item.getBoundingClientRect();
      const dist = (r.left + r.width / 2) - centerX;
      const norm = Math.max(-1, Math.min(1, dist / (trackRect.width / 2)));
      const absNorm = Math.abs(norm);

      item.style.transform = REDUCE_MOTION
        ? ''
        : `translateY(${absNorm * 22}px) scale(${1 - absNorm * 0.24}) rotate(${norm * 8}deg)`;

      if (Math.abs(dist) < closestDist) { closestDist = Math.abs(dist); closest = item; }
    });

    items.forEach((item) => item.classList.toggle('is-center', item === closest));
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(updateArc); }
  }
  track.addEventListener('scroll', onScroll, { passive: true });

  // ---- Loop infinito: al asentarse el scroll, si el centro cayó en
  // la copia A o C, saltar a la equivalente en B (instantáneo). ----
  let settleTimer = null;
  track.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const idx = currentCenterIndex();
      const copy = Math.floor(idx / N); // 0, 1 o 2
      if (copy === 1) return; // ya en la copia del medio
      centerOn((idx % N) + N, 'auto');
    }, 120);
  }, { passive: true });

  // ---- Flechas: pasan a la foto siguiente/anterior de a una ----
  function step(dir) {
    centerOn(currentCenterIndex() + dir, REDUCE_MOTION ? 'auto' : 'smooth');
  }
  if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => step(1));

  window.addEventListener('resize', () => centerOn(currentCenterIndex(), 'auto'));

  // Arranque: centrado en la copia del medio, sin animación.
  requestAnimationFrame(() => {
    centerOn(N + Math.floor(N / 2), 'auto');
    updateArc();
  });

  // ---- Long-press → ver la foto completa (proceso-lightbox) ----
  // Nada de touch-action:none: el track sigue siendo scroll horizontal
  // nativo, así que un swipe real cancela el long-press solo
  // (pointercancel / el drift de abajo), sin comprometer el gesto.
  const lightbox = document.getElementById('proceso-lightbox');
  const lightboxImg = document.getElementById('proceso-lightbox-img');
  const lightboxCaption = document.getElementById('proceso-lightbox-caption');
  const lightboxClose = document.getElementById('proceso-lightbox-close');
  const HOLD_MS = 480;
  const DRIFT_PX = 14;
  let pressTimer = null;
  let pressStartX = 0, pressStartY = 0;
  let suppressClickOn = null;

  function openLightbox(item) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = item.dataset.img || '';
    const label = item.querySelector('.circular-item-label');
    const text = label ? label.textContent : '';
    lightboxImg.alt = text;
    if (lightboxCaption) lightboxCaption.textContent = text;
    lightbox.classList.add('is-open');
  }
  function closeLightbox() { if (lightbox) lightbox.classList.remove('is-open'); }
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

  function cancelPress(item) {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    item.classList.remove('is-pressing');
  }

  track.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.circular-item');
    if (!item) return;
    pressStartX = e.clientX; pressStartY = e.clientY;
    item.classList.add('is-pressing');
    pressTimer = setTimeout(() => {
      pressTimer = null;
      item.classList.remove('is-pressing');
      suppressClickOn = item;
      openLightbox(item);
    }, HOLD_MS);
  });
  track.addEventListener('pointermove', (e) => {
    if (!pressTimer) return;
    const dx = e.clientX - pressStartX, dy = e.clientY - pressStartY;
    if (Math.hypot(dx, dy) > DRIFT_PX) {
      const item = e.target.closest('.circular-item');
      if (item) cancelPress(item); else { clearTimeout(pressTimer); pressTimer = null; }
    }
  });
  track.addEventListener('pointerup', (e) => {
    const item = e.target.closest('.circular-item');
    if (item) cancelPress(item);
  });
  track.addEventListener('pointercancel', (e) => {
    const item = e.target.closest('.circular-item');
    if (item) cancelPress(item);
  });

  // Tap corto: si vino de un long-press no hace nada (ya abrió el
  // lightbox); si no, centra esa foto — "tocar una de al lado la trae
  // al medio".
  track.addEventListener('click', (e) => {
    const item = e.target.closest('.circular-item');
    if (!item) return;
    if (suppressClickOn === item) { suppressClickOn = null; return; }
    centerOn(items.indexOf(item), REDUCE_MOTION ? 'auto' : 'smooth');
  });
})();

/* ---------------------------------------------------------
   11) FAQ accordion
   --------------------------------------------------------- */
document.querySelectorAll('.faq-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item   = trigger.closest('.faq-item');
    const body   = item.querySelector('.faq-body');
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';

    // Cerrar todos
    document.querySelectorAll('.faq-trigger').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
      t.closest('.faq-item').querySelector('.faq-body').classList.remove('is-open');
    });

    // Abrir el clickeado si estaba cerrado
    if (!isOpen) {
      trigger.setAttribute('aria-expanded', 'true');
      body.classList.add('is-open');
    }
  });
});

const faqWhatsapp = document.getElementById('faq-whatsapp');
if (faqWhatsapp) {
  faqWhatsapp.href = buildWhatsAppLink('Hola Ganchito! 👋 Tengo una consulta que no encontré en las preguntas frecuentes.');
}

/* =========================================================
   12) STORY NAV — progreso narrativo lateral
   ========================================================= */
(function () {
  const dots = document.querySelectorAll('.story-dot');
  const sections = ['#top', '#mesas', '#configurador', '#oficio', '#pedir'];

  function getActive() {
    const scrollY = window.scrollY + window.innerHeight * 0.35;
    let active = 0;
    sections.forEach((sel, i) => {
      const el = document.querySelector(sel === '#top' ? 'body' : sel);
      if (!el) return;
      const top = sel === '#top' ? 0 : el.getBoundingClientRect().top + window.scrollY;
      if (scrollY >= top) active = i;
    });
    return active;
  }

  function updateDots() {
    const active = getActive();
    dots.forEach((dot, i) => dot.classList.toggle('active', i === active));
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const sel = sections[i];
      const el = sel === '#top' ? document.body : document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateDots(); ticking = false; });
  }, { passive: true });
  updateDots();
})();

/* =========================================================
   13) STORY BRIDGES — reveal + IntersectionObserver
   ========================================================= */
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.story-bridge').forEach(el => el.classList.add('is-visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.3 });
  document.querySelectorAll('.story-bridge').forEach(el => obs.observe(el));
})();

/* =========================================================
   14) SECCIÓN PEDIR — reveal + sincronizar con configurador
   ========================================================= */
(function () {
  // Reveal de la sección
  const section = document.querySelector('.pedir-section');
  if (!section) return;
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { section.classList.add('is-visible'); obs.unobserve(section); } });
    }, { threshold: 0.15 });
    obs.observe(section);
  } else {
    section.classList.add('is-visible');
  }

  // Leer diseño del configurador para personalizar el CTA
  // El configurador expone window._ganchoEstado (lo vamos a parchear)
  // Fallback: escuchar evento custom 'ganchito:update'
  const resumenCard = document.getElementById('pedir-config-resumen');
  const resumenTexto = document.getElementById('pedir-config-texto');
  const pedrirWsp   = document.getElementById('pedir-wsp');
  const pedrirTitle = document.getElementById('pedir-title');
  const pedrirSub   = document.getElementById('pedir-sub');

  function syncFromConfigurador(detail) {
    let texto, whatsappUrl;

    if (detail) {
      // Vino del evento 'ganchito:update' — es el camino normal.
      texto = detail.texto;
      whatsappUrl = detail.whatsappUrl;
    } else {
      // Fallback (ej. si la sección "Pedir" entra en pantalla antes de
      // que el configurador dispare ningún evento): leemos el DOM una vez.
      const resumenEl = document.getElementById('ganchito-resumen');
      const wspEl     = document.getElementById('ganchito-wsp');
      if (!resumenEl || !wspEl) return;
      texto = resumenEl.textContent.trim();
      whatsappUrl = wspEl.href;
    }

    if (!texto || texto === '—') return;

    // Mostramos el resumen
    if (resumenCard && resumenTexto) {
      resumenTexto.textContent = texto;
      resumenCard.hidden = false;
    }

    // Personalizamos el CTA
    if (pedrirTitle)  pedrirTitle.textContent = 'Tu mesa está lista para pedir.';
    if (pedrirSub)    pedrirSub.textContent   = 'Ya la diseñaste. El siguiente paso es escribirnos y la ponemos en producción.';

    // Copiamos el link de WhatsApp del configurador
    if (pedrirWsp && whatsappUrl && whatsappUrl !== '#') {
      pedrirWsp.href = whatsappUrl;
    }
  }

  // El configurador es la fuente de verdad: escuchamos su evento en vez
  // de vigilar el DOM con un MutationObserver.
  document.addEventListener('ganchito:update', (e) => syncFromConfigurador(e.detail));

  // También al entrar a la sección
  window.addEventListener('scroll', function onScroll() {
    if (!section) return;
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.8) {
      syncFromConfigurador();
      window.removeEventListener('scroll', onScroll);
    }
  }, { passive: true });

  // Fallback link inicial
  if (pedrirWsp) pedrirWsp.href = buildWhatsAppLink('Hola Ganchito! 👋 Quiero consultar sobre una mesa. ¿Me contás más?');
})();

/* =========================================================
   15) REVEAL para secciones con data-reveal-section
   ========================================================= */
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal-section]').forEach(el => el.classList.add('is-visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-reveal-section]').forEach(el => obs.observe(el));
})();

