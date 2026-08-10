/* =========================================================
   GANCHITO — script.js
   Todo vainilla JS, sin dependencias. Pensado para que sea
   fácil de leer y editar en VS Code.
   ========================================================= */

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
const revealTargets = document.querySelectorAll(".card, .oficio-grid, .hero-copy, .hero-media");
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
   8) Año en el footer
   --------------------------------------------------------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------------------------------------------------------
   9) Gallery en cards (auto-rotate + dots + swipe)
   --------------------------------------------------------- */
document.querySelectorAll('[data-gallery]').forEach(gallery => {
  const slides = gallery.querySelectorAll('.gallery-slide');
  const card   = gallery.closest('.card');
  const dots   = card ? card.querySelectorAll('.gdot') : [];
  if (slides.length < 2) return;

  let current = 0;
  let timer = null;

  function goTo(idx) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  function startTimer() {
    if (timer) return; // ya hay uno corriendo, no dupliques
    timer = setInterval(() => goTo(current + 1), 2800);
  }
  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  // Dots clickeables
  dots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => { e.stopPropagation(); stopTimer(); goTo(i); startTimer(); });
  });

  // Flechas prev/next
  const prevBtn = card ? card.querySelector('.gallery-arrow-prev') : null;
  const nextBtn = card ? card.querySelector('.gallery-arrow-next') : null;
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); stopTimer(); goTo(current - 1); startTimer(); });
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); stopTimer(); goTo(current + 1); startTimer(); });

  // Pausa al hover (desktop)
  card.addEventListener('mouseenter', stopTimer);
  card.addEventListener('mouseleave', startTimer);

  // Swipe táctil (mobile)
  let touchStartX = 0;
  let touchStartY = 0;
  gallery.addEventListener('touchstart', (e) => {
    stopTimer();
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
    startTimer();
  }, { passive: true });

  startTimer();
});

/* ---------------------------------------------------------
   10) Accordion Gallery — "El proceso"
   Desktop: hover/foco expande el panel. Mobile: tap alterna
   cuál panel está abierto (acordeón clásico, uno a la vez).
   --------------------------------------------------------- */
(function () {
  const gallery = document.getElementById('accordion-gallery');
  if (!gallery) return;
  const panels = Array.from(gallery.querySelectorAll('.accordion-panel'));
  if (!panels.length) return;

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  function setActive(panel) {
    panels.forEach(p => {
      const active = p === panel;
      p.classList.toggle('is-active', active);
      p.setAttribute('aria-expanded', String(active));
    });
  }

  panels.forEach(panel => {
    // Desktop: hover ya lo resuelve el CSS (:hover). Foco por teclado
    // también vía CSS (:focus-visible). El click/tap decide cuál
    // queda "fija" como activa (útil sobre todo en mobile).
    panel.addEventListener('click', () => {
      if (isMobile()) {
        // Toggle: si ya estaba abierta, no la cerramos (siempre debe
        // quedar una visible), si no, la abrimos.
        setActive(panel);
      } else {
        setActive(panel);
      }
    });
    panel.addEventListener('focus', () => setActive(panel));
  });

  // Estado inicial: la primera queda activa (ya viene con is-active
  // en el HTML, esto solo asegura aria-expanded correcto).
  setActive(panels[0]);
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

