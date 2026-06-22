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
