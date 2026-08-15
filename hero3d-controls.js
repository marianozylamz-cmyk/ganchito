/* =========================================================
   GANCHITO — PORTAL 3D (configurador)
   hero3d-controls.js
   Una vez abierto el portal (hero3d-portal.js), esto reinstala la
   personalización completa: switcher de mesas, rail de color principal
   y hoja "Personalizar" (patrón, tamaño, color secundario, resumen +
   WhatsApp) — el mismo lenguaje que experimental-3d/, pero anclado
   dentro de #portal-stage en vez de fixed a todo el viewport.

   Requiere: hero3d-engine.js (window.HeroScene), script.js
   (window.WHATSAPP_NUMBER / buildWhatsAppLink) ya cargados antes.
   ========================================================= */

(function () {
  const portalStage = document.getElementById('portal-stage');
  if (!portalStage) return;

  // accent: mismos colores del laboratorio 3D (experimental-3d/) — cada
  // tipo de mesa tenía su propio túnel: rojo, gris y navy.
  const TIPOS = [
    { key: 'ratona-madera', nombre: 'Mesa ratona · patas de madera', label: 'Ratona · madera', accent: '#C0392B' },
    { key: 'cubo',           nombre: 'Mesa cubo',                     label: 'Cubo',             accent: '#52585E' },
    { key: 'ratona-metal',   nombre: 'Mesa ratona · patas de metal',  label: 'Ratona · metal',   accent: '#14213E' },
  ];
  function setAccent(hex) {
    document.documentElement.style.setProperty('--accent', hex);
  }
  const COLOR_LABELS = {
    negro: 'Negro', mostaza: 'Mostaza', terracota: 'Terracota', navy: 'Navy',
    celeste: 'Celeste', oliva: 'Oliva', crema: 'Crema', rojo: 'Rojo', gris: 'Gris',
  };
  const PATRON_LABELS = { damero: 'Damero', guarda: 'Guarda', diagonal: 'Diagonal', uniforme: 'Uniforme' };
  const TAMANO_LABELS = { chico: 'pieza chica', grande: 'pieza grande' };

  function tipoIndex() {
    const i = TIPOS.findIndex((t) => t.key === HeroMesa.tipo);
    return i === -1 ? 0 : i;
  }

  // ---- Switcher de mesas ----
  const pill = document.getElementById('portal-switcher-pill');
  const prevBtn = document.getElementById('portal-switcher-prev');
  const nextBtn = document.getElementById('portal-switcher-next');

  function goTo(dir) {
    const i = tipoIndex();
    const next = TIPOS[(i + dir + TIPOS.length) % TIPOS.length];
    HeroScene.setTipo(next.key, dir);
    if (pill) pill.textContent = next.label;
    setAccent(next.accent);
    updateResumen();
  }
  if (prevBtn) prevBtn.addEventListener('click', () => goTo(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(1));

  // ---- Rail de color principal ----
  const colorSwatches = document.querySelectorAll('#portal-color-swatches .swatch');
  colorSwatches.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.color;
      HeroScene.setColor(key);
      colorSwatches.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('activo', active);
        b.setAttribute('aria-pressed', String(active));
      });
      updateResumen();
    });
  });

  // ---- Panel "Personalizar" ----
  const toggle = document.getElementById('personalizar-toggle');
  const backdrop = document.getElementById('personalizar-backdrop');
  const sheet = document.getElementById('personalizar-sheet');
  const closeBtn = document.getElementById('personalizar-close');

  function openSheet() {
    if (backdrop) backdrop.classList.add('is-open');
    if (sheet) sheet.classList.add('is-open');
  }
  function closeSheet() {
    if (backdrop) backdrop.classList.remove('is-open');
    if (sheet) sheet.classList.remove('is-open');
  }
  if (toggle) toggle.addEventListener('click', openSheet);
  if (closeBtn) closeBtn.addEventListener('click', closeSheet);
  if (backdrop) backdrop.addEventListener('click', closeSheet);

  function wireChipRow(id, onPick) {
    const row = document.getElementById(id);
    if (!row) return;
    row.querySelectorAll('.chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        onPick(btn.dataset.value);
        row.querySelectorAll('.chip-btn').forEach((b) => b.classList.toggle('activo', b === btn));
        updateResumen();
      });
    });
  }
  wireChipRow('portal-patron-chips', (v) => HeroScene.setPatron(v));
  wireChipRow('portal-tamano-chips', (v) => HeroScene.setTamano(v));

  const color2Swatches = document.querySelectorAll('#portal-color2-swatches .swatch-mini');
  color2Swatches.forEach((btn) => {
    btn.addEventListener('click', () => {
      HeroScene.setColor2(btn.dataset.color2);
      color2Swatches.forEach((b) => b.classList.toggle('activo', b === btn));
      updateResumen();
    });
  });

  // ---- Resumen + WhatsApp — mismo formato que ganchito-configurador.js,
  // y dispara el mismo evento 'ganchito:update' que ya escucha la
  // sección "Pedir" (script.js) para personalizar su CTA. ----
  const resumenEl = document.getElementById('portal-resumen-text');
  const ctaEl = document.getElementById('portal-personalizar-cta');

  function updateResumen() {
    const tipo = TIPOS[tipoIndex()];
    const c1 = COLOR_LABELS[HeroMesa.currentColor] || HeroMesa.currentColor;
    const c2 = COLOR_LABELS[HeroMesa.currentColor2] || HeroMesa.currentColor2;
    const patron = PATRON_LABELS[HeroMesa.currentPatron] || HeroMesa.currentPatron;
    const tamano = TAMANO_LABELS[HeroMesa.currentTamano] || HeroMesa.currentTamano;
    const texto = `${tipo.nombre} · ${patron} · ${c1} + ${c2} · ${tamano}`;

    if (resumenEl) resumenEl.textContent = texto;

    const msg = `Hola Ganchito! 👋 Me gustaría consultar sobre una "${texto}". ¿Está disponible y cuál es el precio?`;
    const whatsappUrl = (typeof buildWhatsAppLink === 'function')
      ? buildWhatsAppLink(msg)
      : `https://wa.me/5492284354090?text=${encodeURIComponent(msg)}`;
    if (ctaEl) ctaEl.href = whatsappUrl;

    document.dispatchEvent(new CustomEvent('ganchito:update', { detail: { texto, whatsappUrl } }));
  }

  // Primer resumen + acento del túnel: recién cuando el motor está
  // listo (para leer el color/patrón/tamaño/tipo reales del
  // HERO_CONFIG, no un default a ciegas).
  if (window.HeroScene && HeroScene.ready) {
    HeroScene.ready.then(() => {
      setAccent(TIPOS[tipoIndex()].accent);
      updateResumen();
    });
  }
})();
