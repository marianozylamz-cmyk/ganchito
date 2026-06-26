/* =========================================================
   GANCHITO — script.js
   Todo vainilla JS, sin dependencias. Pensado para que sea
   fácil de leer y editar en VS Code.
   ========================================================= */

/* ---------------------------------------------------------
   1) CONFIG — Lo único que hace falta tocar para producción
   --------------------------------------------------------- */
const WHATSAPP_NUMBER = "5492280000000"; // TODO: reemplazar por el número real de Ganchito (formato 549 + código de área + número, sin espacios ni guiones)

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

function openModal(card){
  const { name, price, img, desc, medidas, materiales, entrega } = card.dataset;

  modalTitle.textContent = name;
  modalDesc.textContent = desc;
  modalMedidas.textContent = medidas;
  modalMateriales.textContent = materiales;
  modalEntrega.textContent = entrega;
  // Tomamos el precio ya formateado que se ve en la card (ej "$100.000" o "Desde $100.000")
  modalPrice.textContent = card.querySelector(".price").textContent;

  // Imagen real, o clon del mosaico interactivo si es la mesa personalizada
  modalMedia.innerHTML = "";
  if (img) {
    const image = document.createElement("img");
    image.src = img;
    image.alt = name;
    modalMedia.appendChild(image);
  } else {
    const swatch = document.getElementById("mosaic-swatch");
    if (swatch) {
      const clone = swatch.cloneNode(true);
      clone.removeAttribute("id"); // evita IDs duplicados dentro del modal
      modalMedia.appendChild(clone);
    }
  }

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
   6) Mosaico interactivo de la mesa personalizada
   --------------------------------------------------------- */
const mosaicSwatch = document.getElementById("mosaic-swatch");
const paletteButtons = document.querySelectorAll(".swatch-dot");

const PALETTES = {
  navy:    ["#14213E", "#2B3B63", "#F7F3EC"],
  mostaza: ["#C2872E", "#E3B45B", "#F7F3EC"],
  nogal:   ["#4A3424", "#8B5A2B", "#F7F3EC"],
  oliva:   ["#5C6B4C", "#8A9A78", "#F7F3EC"],
};

function buildMosaic(paletteKey){
  if (!mosaicSwatch) return;
  const colors = PALETTES[paletteKey] || PALETTES.mostaza;
  mosaicSwatch.innerHTML = "";
  for (let i = 0; i < 25; i++){
    const tile = document.createElement("div");
    tile.className = "tile";
    // Patrón simple tipo guarda: alterna colores según posición
    const col = i % 5;
    const row = Math.floor(i / 5);
    const isBorder = col === 0 || col === 4 || row === 0 || row === 4;
    tile.style.backgroundColor = isBorder ? colors[0] : colors[(row + col) % 2 === 0 ? 1 : 2];
    mosaicSwatch.appendChild(tile);
  }
}

paletteButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    paletteButtons.forEach(b => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    buildMosaic(btn.dataset.palette);
  });
});

// Estado inicial del mosaico
buildMosaic("mostaza");
const defaultPaletteBtn = document.querySelector('[data-palette="mostaza"]');
if (defaultPaletteBtn) defaultPaletteBtn.setAttribute("aria-pressed", "true");

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
   9) Gallery en cards (auto-rotate + dots)
   --------------------------------------------------------- */
document.querySelectorAll('[data-gallery]').forEach(gallery => {
  const slides = gallery.querySelectorAll('.gallery-slide');
  const card   = gallery.closest('.card');
  const dots   = card ? card.querySelectorAll('.gdot') : [];
  if (slides.length < 2) return;

  let current = 0;
  let timer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  function startTimer() {
    timer = setInterval(() => goTo(current + 1), 2800);
  }
  function stopTimer() { clearInterval(timer); }

  // Dots clickeables
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { stopTimer(); goTo(i); startTimer(); });
  });

  // Pausa al hover
  card.addEventListener('mouseenter', stopTimer);
  card.addEventListener('mouseleave', startTimer);

  startTimer();
});

/* ---------------------------------------------------------
   10) Carrusel arrastrable con auto-scroll suave
   --------------------------------------------------------- */
(function () {
  const wrap  = document.getElementById('carrusel-wrap');
  const track = document.getElementById('carrusel-track');
  if (!wrap || !track) return;

  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let autoX = 0;
  let dragOffset = 0;
  let isDragInterrupted = false;
  const SPEED = 0.6; // px por frame

  function getMaxScroll() {
    return track.scrollWidth / 2; // mitad porque duplicamos slides
  }

  function animate() {
    if (!isDragging) {
      autoX += SPEED;
      if (autoX >= getMaxScroll()) autoX -= getMaxScroll();
      track.style.transform = `translateX(${-(autoX + dragOffset)}px)`;
    }
    requestAnimationFrame(animate);
  }

  // Mouse
  wrap.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.clientX;
    scrollLeft = autoX;
    wrap.style.cursor = 'grabbing';
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    wrap.style.cursor = 'grab';
    autoX = scrollLeft + (startX - (startX)); // mantiene posición actual
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    autoX = scrollLeft - dx;
    if (autoX < 0) autoX = 0;
    if (autoX >= getMaxScroll()) autoX -= getMaxScroll();
  });

  // Touch
  wrap.addEventListener('touchstart', e => {
    isDragging = true;
    startX = e.touches[0].clientX;
    scrollLeft = autoX;
  }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    autoX = scrollLeft - dx;
    if (autoX < 0) autoX = 0;
    if (autoX >= getMaxScroll()) autoX -= getMaxScroll();
  }, { passive: true });

  animate();
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
