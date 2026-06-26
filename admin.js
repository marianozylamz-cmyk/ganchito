/* =========================================================
   GANCHITO — admin.js
   Editor en contexto. Solo se activa si:
   1. La URL tiene ?admin=1
   2. sessionStorage tiene ganchito_admin = true
   ========================================================= */

(function () {
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1'
    && sessionStorage.getItem('ganchito_admin') === 'true';

  if (!isAdmin) return;

  // Limpiar el ?admin=1 de la URL sin recargar
  history.replaceState({}, '', window.location.pathname);

  /* ---------------------------------------------------------
     ESTADO: carga desde localStorage o usa defaults del DOM
  --------------------------------------------------------- */
  const STORAGE_KEY = 'ganchito_content';
  let content = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  let editMode = false;

  /* ---------------------------------------------------------
     APLICAR CONTENIDO GUARDADO al DOM (se llama en page load)
  --------------------------------------------------------- */
  function applyContent() {
    if (!content) return;

    // Hero
    if (content.heroTitle)  setHtml('#hero-editable-title', content.heroTitle);
    if (content.heroSub)    setHtml('#hero-editable-sub', content.heroSub);

    // Mesas (cards)
    if (content.mesas) {
      content.mesas.forEach((mesa, i) => {
        const card = document.querySelectorAll('[data-product]')[i];
        if (!card) return;
        if (mesa.name)        { card.dataset.name = mesa.name;         setHtml(card.querySelector('.card-body h3'), mesa.name); }
        if (mesa.desc)        { card.dataset.desc = mesa.desc;         setHtml(card.querySelector('.card-desc'), mesa.desc); }
        if (mesa.price)       { card.dataset.price = mesa.price;       setHtml(card.querySelector('.price'), '$' + mesa.price); }
        if (mesa.medidas)     card.dataset.medidas = mesa.medidas;
        if (mesa.materiales)  card.dataset.materiales = mesa.materiales;
        if (mesa.entrega)     card.dataset.entrega = mesa.entrega;
        if (mesa.fotos && mesa.fotos.length) {
          applyCardPhotos(card, mesa.fotos);
        }
      });
    }

    // Oficio
    if (content.oficioTitle) setHtml('#oficio-editable-title', content.oficioTitle);
    if (content.oficioText1) setHtml('#oficio-editable-text1', content.oficioText1);
    if (content.oficioText2) setHtml('#oficio-editable-text2', content.oficioText2);

    // Testimonios
    if (content.testimonios) {
      content.testimonios.forEach((t, i) => {
        const card = document.querySelectorAll('.testimonio-card')[i];
        if (!card) return;
        if (t.texto)   setHtml(card.querySelector('.testimonio-texto'), t.texto);
        if (t.nombre)  setHtml(card.querySelector('.testimonio-nombre'), t.nombre);
        if (t.ciudad)  setHtml(card.querySelector('.testimonio-ciudad'), t.ciudad);
      });
    }

    // FAQ
    if (content.faq) {
      content.faq.forEach((item, i) => {
        const el = document.querySelectorAll('.faq-item')[i];
        if (!el) return;
        if (item.pregunta) setHtml(el.querySelector('.faq-trigger'), item.pregunta + '<span class="faq-icon" aria-hidden="true"></span>');
        if (item.respuesta) setHtml(el.querySelector('.faq-body p'), item.respuesta);
      });
    }

    // Carrusel fotos taller
    if (content.tallerFotos && content.tallerFotos.length) {
      applyTallerFotos(content.tallerFotos);
    }
  }

  function setHtml(selector, html) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (el) el.innerHTML = html;
  }

  function applyCardPhotos(card, fotos) {
    const gallery = card.querySelector('[data-gallery]');
    if (!gallery) return;
    const slides = gallery.querySelectorAll('.gallery-slide');
    fotos.forEach((src, i) => {
      if (!slides[i]) return;
      slides[i].innerHTML = `<img src="${src}" alt="Foto ${i+1}">`;
    });
  }

  function applyTallerFotos(fotos) {
    const track = document.getElementById('carrusel-track');
    if (!track) return;
    const slides = track.querySelectorAll('.carrusel-slide');
    fotos.forEach((src, i) => {
      if (!slides[i]) return;
      slides[i].innerHTML = `<img src="${src}" alt="Foto taller ${i+1}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
    });
  }

  /* ---------------------------------------------------------
     GUARDAR CONTENIDO desde el DOM editado
  --------------------------------------------------------- */
  function collectAndSave() {
    const data = {};

    // Hero
    const heroTitle = document.querySelector('#hero-editable-title');
    const heroSub   = document.querySelector('#hero-editable-sub');
    if (heroTitle) data.heroTitle = heroTitle.innerHTML;
    if (heroSub)   data.heroSub   = heroSub.innerHTML;

    // Mesas
    data.mesas = [];
    document.querySelectorAll('[data-product]').forEach(card => {
      const mesa = {
        name:       card.querySelector('.card-body h3')?.innerText || '',
        desc:       card.querySelector('.card-desc')?.innerText || '',
        price:      (card.querySelector('.price')?.innerText || '').replace(/\$|\./g, ''),
        medidas:    card.dataset.medidas || '',
        materiales: card.dataset.materiales || '',
        entrega:    card.dataset.entrega || '',
        fotos: [],
      };
      card.querySelectorAll('.gallery-slide img').forEach(img => mesa.fotos.push(img.src));
      data.mesas.push(mesa);
    });

    // Oficio
    data.oficioTitle = document.querySelector('#oficio-editable-title')?.innerHTML || '';
    data.oficioText1 = document.querySelector('#oficio-editable-text1')?.innerHTML || '';
    data.oficioText2 = document.querySelector('#oficio-editable-text2')?.innerHTML || '';

    // Testimonios
    data.testimonios = [];
    document.querySelectorAll('.testimonio-card').forEach(card => {
      data.testimonios.push({
        texto:   card.querySelector('.testimonio-texto')?.innerText || '',
        nombre:  card.querySelector('.testimonio-nombre')?.innerText || '',
        ciudad:  card.querySelector('.testimonio-ciudad')?.innerText || '',
      });
    });

    // FAQ
    data.faq = [];
    document.querySelectorAll('.faq-item').forEach(item => {
      data.faq.push({
        pregunta:  item.querySelector('.faq-trigger')?.childNodes[0]?.textContent?.trim() || '',
        respuesta: item.querySelector('.faq-body p')?.innerText || '',
      });
    });

    // Fotos taller
    data.tallerFotos = [];
    document.querySelectorAll('#carrusel-track .carrusel-slide img').forEach(img => {
      data.tallerFotos.push(img.src);
    });

    content = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('✓ Cambios guardados');
  }

  /* ---------------------------------------------------------
     IDs EDITABLES en el HTML (agregar al DOM existente)
  --------------------------------------------------------- */
  function tagEditableElements() {
    // Hero title y subtítulo
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.id = 'hero-editable-title';
    const heroSub = document.querySelector('.hero-sub');
    if (heroSub) heroSub.id = 'hero-editable-sub';

    // Oficio
    const oficioTitle = document.querySelector('.oficio .section-title');
    if (oficioTitle) oficioTitle.id = 'oficio-editable-title';
    const oficioTexts = document.querySelectorAll('.oficio-text');
    if (oficioTexts[0]) oficioTexts[0].id = 'oficio-editable-text1';
    if (oficioTexts[1]) oficioTexts[1].id = 'oficio-editable-text2';
  }

  /* ---------------------------------------------------------
     MODO EDICIÓN: activa/desactiva contenteditable
  --------------------------------------------------------- */
  const EDITABLE_SELECTORS = [
    '.hero-title',
    '.hero-sub',
    '[data-product] .card-body h3',
    '[data-product] .card-desc',
    '[data-product] .price',
    '.oficio .section-title',
    '.oficio-text',
    '.testimonio-texto',
    '.testimonio-nombre',
    '.testimonio-ciudad',
    '.faq-trigger',
    '.faq-body p',
  ];

  function enableEditMode() {
    editMode = true;
    EDITABLE_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.contentEditable = 'true';
        el.classList.add('ganchito-editable');
        el.setAttribute('data-original', el.innerHTML);
      });
    });

    // Mostrar botones de foto en cards
    document.querySelectorAll('[data-product]').forEach((card, i) => {
      const mediaWrap = card.querySelector('.card-media-multi');
      if (!mediaWrap) return;
      const btn = document.createElement('button');
      btn.className = 'admin-photo-btn';
      btn.innerHTML = '📷 Cambiar fotos';
      btn.onclick = () => openPhotoEditor(card, i);
      mediaWrap.appendChild(btn);
    });

    // Botón fotos taller
    const tallerSection = document.querySelector('.taller-section');
    if (tallerSection) {
      const btn = document.createElement('button');
      btn.className = 'admin-taller-btn';
      btn.innerHTML = '📷 Editar fotos del taller';
      btn.onclick = openTallerEditor;
      tallerSection.querySelector('.container').appendChild(btn);
    }

    adminBar.querySelector('#admin-edit-btn').style.display = 'none';
    adminBar.querySelector('#admin-save-btn').style.display = 'inline-flex';
    adminBar.querySelector('#admin-cancel-btn').style.display = 'inline-flex';
    adminBar.querySelector('.admin-bar-hint').textContent = 'Hacé clic en cualquier texto para editarlo';
  }

  function disableEditMode(save) {
    editMode = false;
    EDITABLE_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.contentEditable = 'false';
        el.classList.remove('ganchito-editable');
        if (!save) el.innerHTML = el.getAttribute('data-original') || el.innerHTML;
      });
    });

    // Remover botones de foto temporales
    document.querySelectorAll('.admin-photo-btn, .admin-taller-btn').forEach(b => b.remove());

    if (save) collectAndSave();

    adminBar.querySelector('#admin-edit-btn').style.display = 'inline-flex';
    adminBar.querySelector('#admin-save-btn').style.display = 'none';
    adminBar.querySelector('#admin-cancel-btn').style.display = 'none';
    adminBar.querySelector('.admin-bar-hint').textContent = '';
  }

  /* ---------------------------------------------------------
     EDITOR DE FOTOS DE CARD
  --------------------------------------------------------- */
  function openPhotoEditor(card, cardIndex) {
    const modal = document.getElementById('admin-photo-modal');
    const grid  = document.getElementById('admin-photo-grid');
    const slides = card.querySelectorAll('.gallery-slide');
    grid.innerHTML = '';

    slides.forEach((slide, i) => {
      const img = slide.querySelector('img');
      const currentSrc = img ? img.src : '';
      const item = document.createElement('div');
      item.className = 'admin-photo-item';
      item.innerHTML = `
        <div class="admin-photo-preview">
          ${currentSrc
            ? `<img src="${currentSrc}" alt="Foto ${i+1}">`
            : `<div class="admin-photo-empty">Sin foto</div>`}
        </div>
        <span class="admin-photo-label">Foto ${i+1}</span>
        <div class="admin-photo-actions">
          <label class="admin-photo-upload-btn">
            ${currentSrc ? '↑ Reemplazar' : '+ Subir'}
            <input type="file" accept="image/*" data-slide="${i}" style="display:none">
          </label>
          ${currentSrc ? `<button class="admin-photo-delete-btn" data-slide="${i}">Borrar</button>` : ''}
        </div>
      `;
      grid.appendChild(item);

      // Upload
      item.querySelector('input[type=file]').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const src = ev.target.result;
          slides[i].innerHTML = `<img src="${src}" alt="Foto ${i+1}">`;
          // Actualizar preview en modal
          item.querySelector('.admin-photo-preview').innerHTML = `<img src="${src}" alt="Foto ${i+1}">`;
          item.querySelector('.admin-photo-upload-btn').innerHTML = '↑ Reemplazar<input type="file" accept="image/*" data-slide="'+i+'" style="display:none">';
          item.querySelector('input[type=file]').addEventListener('change', arguments.callee);
        };
        reader.readAsDataURL(file);
      });

      // Borrar
      const deleteBtn = item.querySelector('.admin-photo-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          slides[i].innerHTML = `<div class="photo-placeholder"><span>Foto ${i+1}</span></div>`;
          item.querySelector('.admin-photo-preview').innerHTML = `<div class="admin-photo-empty">Sin foto</div>`;
          deleteBtn.remove();
          item.querySelector('.admin-photo-upload-btn').innerHTML = '+ Subir<input type="file" accept="image/*" style="display:none">';
        });
      }
    });

    modal.classList.add('visible');
  }

  /* ---------------------------------------------------------
     EDITOR DE FOTOS DEL TALLER
  --------------------------------------------------------- */
  function openTallerEditor() {
    const modal = document.getElementById('admin-photo-modal');
    const grid  = document.getElementById('admin-photo-grid');
    const slides = document.querySelectorAll('#carrusel-track .carrusel-slide:not([aria-hidden])');
    grid.innerHTML = '<p style="grid-column:1/-1;font-family:var(--font-label);font-size:.85rem;color:var(--saddle);margin-bottom:8px;">Fotos del carrusel "Del taller a tu casa"</p>';

    slides.forEach((slide, i) => {
      const img = slide.querySelector('img');
      const currentSrc = img ? img.src : '';
      const item = document.createElement('div');
      item.className = 'admin-photo-item';
      item.innerHTML = `
        <div class="admin-photo-preview">
          ${currentSrc ? `<img src="${currentSrc}" alt="">` : `<div class="admin-photo-empty">Sin foto</div>`}
        </div>
        <span class="admin-photo-label">Taller ${i+1}</span>
        <div class="admin-photo-actions">
          <label class="admin-photo-upload-btn">
            ${currentSrc ? '↑ Reemplazar' : '+ Subir'}
            <input type="file" accept="image/*" style="display:none">
          </label>
          ${currentSrc ? `<button class="admin-photo-delete-btn">Borrar</button>` : ''}
        </div>
      `;
      grid.appendChild(item);

      item.querySelector('input[type=file]').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const src = ev.target.result;
          slide.innerHTML = `<img src="${src}" alt="Foto taller ${i+1}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
          item.querySelector('.admin-photo-preview').innerHTML = `<img src="${src}" alt="">`;
        };
        reader.readAsDataURL(file);
      });
    });

    modal.classList.add('visible');
  }

  /* ---------------------------------------------------------
     TOAST
  --------------------------------------------------------- */
  function showToast(msg) {
    let t = document.getElementById('admin-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'admin-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2800);
  }

  /* ---------------------------------------------------------
     BARRA ADMIN (se inyecta en el DOM)
  --------------------------------------------------------- */
  const adminBar = document.createElement('div');
  adminBar.id = 'admin-bar';
  adminBar.innerHTML = `
    <div class="admin-bar-inner">
      <span class="admin-bar-brand">⚙ Modo admin</span>
      <span class="admin-bar-hint"></span>
      <div class="admin-bar-actions">
        <button id="admin-edit-btn" class="admin-bar-btn admin-bar-btn-primary">✏ Editar página</button>
        <button id="admin-save-btn" class="admin-bar-btn admin-bar-btn-save" style="display:none">✓ Guardar cambios</button>
        <button id="admin-cancel-btn" class="admin-bar-btn admin-bar-btn-cancel" style="display:none">✕ Cancelar</button>
        <a href="admin/index.html" class="admin-bar-btn admin-bar-btn-logout" onclick="sessionStorage.clear()">Salir</a>
      </div>
    </div>
  `;
  document.body.prepend(adminBar);

  document.getElementById('admin-edit-btn').addEventListener('click', enableEditMode);
  document.getElementById('admin-save-btn').addEventListener('click', () => disableEditMode(true));
  document.getElementById('admin-cancel-btn').addEventListener('click', () => disableEditMode(false));

  /* ---------------------------------------------------------
     MODAL DE FOTOS
  --------------------------------------------------------- */
  const photoModal = document.createElement('div');
  photoModal.id = 'admin-photo-modal';
  photoModal.innerHTML = `
    <div class="admin-photo-modal-inner">
      <div class="admin-photo-modal-header">
        <h3>Fotos</h3>
        <button id="admin-photo-modal-close">✕</button>
      </div>
      <div class="admin-photo-grid" id="admin-photo-grid"></div>
    </div>
  `;
  document.body.appendChild(photoModal);
  document.getElementById('admin-photo-modal-close').addEventListener('click', () => {
    photoModal.classList.remove('visible');
  });
  photoModal.addEventListener('click', e => {
    if (e.target === photoModal) photoModal.classList.remove('visible');
  });

  /* ---------------------------------------------------------
     CSS INYECTADO
  --------------------------------------------------------- */
  const style = document.createElement('style');
  style.textContent = `
    body { padding-top: 52px; }

    #admin-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 9999;
      background: #14213E;
      border-bottom: 2px solid #C2872E;
      height: 52px;
    }
    .admin-bar-inner {
      max-width: 1180px;
      margin: 0 auto;
      padding: 0 24px;
      height: 100%;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .admin-bar-brand {
      font-family: 'Jost', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #C2872E;
      white-space: nowrap;
    }
    .admin-bar-hint {
      font-family: 'Work Sans', sans-serif;
      font-size: 0.82rem;
      color: rgba(255,255,255,0.5);
      flex: 1;
    }
    .admin-bar-actions { display: flex; gap: 8px; align-items: center; }
    .admin-bar-btn {
      padding: 7px 16px;
      border-radius: 6px;
      font-family: 'Jost', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border: 1.5px solid transparent;
      white-space: nowrap;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      transition: all .15s;
    }
    .admin-bar-btn-primary { background: #C2872E; color: #2A1C13; border-color: #C2872E; }
    .admin-bar-btn-primary:hover { background: #E3B45B; }
    .admin-bar-btn-save { background: #27AE60; color: #fff; border-color: #27AE60; }
    .admin-bar-btn-save:hover { background: #2ECC71; }
    .admin-bar-btn-cancel { background: transparent; color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.2); }
    .admin-bar-btn-cancel:hover { border-color: rgba(255,255,255,0.5); color: #fff; }
    .admin-bar-btn-logout { background: transparent; color: rgba(255,255,255,0.4); border: none; font-size: 0.75rem; }
    .admin-bar-btn-logout:hover { color: rgba(255,255,255,0.8); }

    /* Elementos editables */
    .ganchito-editable {
      outline: 2px dashed rgba(194,135,46,0.5) !important;
      outline-offset: 3px;
      border-radius: 3px;
      cursor: text !important;
      transition: outline-color .15s;
      min-width: 20px;
      display: inline-block;
    }
    .ganchito-editable:hover { outline-color: rgba(194,135,46,0.9) !important; }
    .ganchito-editable:focus { outline: 2px solid #C2872E !important; background: rgba(194,135,46,0.06); }

    /* Botón cambiar fotos sobre la card */
    .admin-photo-btn {
      position: absolute;
      bottom: 10px; left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      background: rgba(20,33,62,0.88);
      color: #F7F3EC;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      padding: 6px 14px;
      font-family: 'Jost', sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background .15s;
    }
    .admin-photo-btn:hover { background: rgba(194,135,46,0.9); color: #2A1C13; }

    .admin-taller-btn {
      display: block;
      margin: 20px auto 0;
      background: rgba(20,33,62,0.08);
      color: #8B5A2B;
      border: 1.5px dashed #DDD3BE;
      border-radius: 8px;
      padding: 10px 22px;
      font-family: 'Jost', sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s;
    }
    .admin-taller-btn:hover { background: rgba(194,135,46,0.12); border-color: #C2872E; }

    /* Modal de fotos */
    #admin-photo-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(20,33,62,0.6);
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #admin-photo-modal.visible { display: flex; }
    .admin-photo-modal-inner {
      background: #FFFDF9;
      border-radius: 14px;
      width: 100%;
      max-width: 680px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 32px 64px -20px rgba(0,0,0,0.4);
    }
    .admin-photo-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #DDD3BE;
      position: sticky; top: 0; background: #FFFDF9; z-index: 2;
    }
    .admin-photo-modal-header h3 {
      font-family: 'Zilla Slab', serif;
      font-size: 1.2rem;
      color: #14213E;
      margin: 0;
    }
    #admin-photo-modal-close {
      background: none; border: none; font-size: 1.1rem;
      color: #8B5A2B; cursor: pointer; padding: 4px 8px;
    }
    .admin-photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 16px;
      padding: 24px;
    }
    .admin-photo-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .admin-photo-preview {
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      background: #EFE7D6;
      border: 1px solid #DDD3BE;
    }
    .admin-photo-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .admin-photo-empty {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      color: #8B5A2B; font-size: 0.75rem;
      font-family: 'Jost', sans-serif;
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .admin-photo-label {
      font-family: 'Jost', sans-serif;
      font-size: 0.75rem;
      color: #8B5A2B;
      text-align: center;
    }
    .admin-photo-actions { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
    .admin-photo-upload-btn {
      background: #14213E;
      color: #F7F3EC;
      border-radius: 6px;
      padding: 5px 10px;
      font-family: 'Jost', sans-serif;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background .15s;
    }
    .admin-photo-upload-btn:hover { background: #2B3B63; }
    .admin-photo-delete-btn {
      background: none;
      color: #C0392B;
      border: 1px solid rgba(192,57,43,0.3);
      border-radius: 6px;
      padding: 5px 8px;
      font-family: 'Jost', sans-serif;
      font-size: 0.72rem;
      cursor: pointer;
    }
    .admin-photo-delete-btn:hover { background: rgba(192,57,43,0.08); }

    /* Toast */
    #admin-toast {
      position: fixed;
      bottom: 28px; left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #14213E;
      color: #F7F3EC;
      padding: 12px 22px;
      border-radius: 8px;
      font-family: 'Jost', sans-serif;
      font-size: 0.88rem;
      font-weight: 600;
      opacity: 0;
      transition: opacity .25s ease, transform .25s ease;
      z-index: 10001;
      pointer-events: none;
      border-left: 3px solid #C2872E;
    }
    #admin-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  tagEditableElements();
  applyContent();

})();
