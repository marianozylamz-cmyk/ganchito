/* =========================================================
   GANCHITO — mosaico narrativo del scroll (v3)

   Arranca a aparecer cuando llegás a la sección de FAQ y
   termina de tapar toda la pantalla recién al final de la
   página (footer + un colchón de scroll extra invisible).

   Por qué nunca tapa contenido que todavía no viste:
   la franja es fija (position:fixed) y va CRECIENDO desde
   arriba a un ritmo IGUAL o MÁS LENTO que el scroll. Eso
   significa que lo que va quedando tapado arriba es, como
   máximo, lo mismo que ya se scrolleó y quedó "arriba" de
   la ventana en el frame anterior — o sea, algo que el
   usuario ya vio. El FAQ, los botones de WhatsApp y el
   footer siempre terminan de mostrarse antes de que el
   mosaico llegue a esa altura.

   Al llegar al final del todo (scroll máximo, incluyendo el
   colchón extra que agrega este mismo script después del
   footer), el mosaico cubre el 100% de la pantalla y las
   piezas dibujan el logo de Ganchito en blanco y azul.

   NOVEDAD v3: el logo YA NO se lee de un .png. Se dibuja a
   mano con LOGO_PATTERN, una grilla de texto donde vos
   elegís exactamente qué celda va azul ('#') y cuál va
   blanca ('.'). Así el resultado es 100% predecible, sin
   depender de umbrales de "cobertura de tinta" que rompían
   los trazos finos (el gancho, el carrito, las ruedas).

   No depende de GSAP ni de nada más: solo scroll + canvas.
   ========================================================= */
(function () {
  // ---------- AJUSTÁ ACÁ ----------
  const START_SELECTOR = '.faq-section';  // acá empieza a aparecer el mosaico
  const BUFFER_VH        = 70;  // scroll extra invisible después del footer, para que cierre 100% sin tapar nada
  const COLOR_TILE       = '#F4EEE1'; // pieza "blanca" (fondo del logo)
  const COLOR_LOGO       = '#14213E'; // azul (trazo del logo)
  const GROUT             = '#E3D9C4';

  // =========================================================
  // EL LOGO, DIBUJADO A MANO EN UNA GRILLA DE TEXTO.
  //
  // Cada elemento del array es UNA FILA. Cada CARÁCTER de esa
  // fila es UNA CELDA del mosaico:
  //   '#'  = celda pintada de azul (COLOR_LOGO)
  //   '.'  = celda blanca (COLOR_TILE)
  //
  // Contás las columnas de izquierda a derecha empezando en 0,
  // y las filas de arriba a abajo empezando en 0. Para editar
  // el dibujo, simplemente cambiás un '.' por un '#' (o al
  // revés) en la posición que quieras — no hace falta tocar
  // ninguna otra parte del código.
  //
  // Todas las filas deben tener el mismo largo (rellená con
  // puntos las que sean más cortas). Este patrón es un punto
  // de partida aproximado de tu logo (G + gancho + carrito +
  // dos ruedas cuadradas huecas) — ajustalo celda por celda
  // mirando el resultado en pantalla hasta que cierre perfecto.
  // =========================================================
 const LOGO_PATTERN = [
  "...........................................", // Línea 0 (Toda blanca - 43 puntos)
  "...............######......................", // Línea 1 (14 puntos, 7 numerales, 22 puntos)
  "..............##...##.....................", // Línea 2 (14 puntos, 2 numerales, 3 puntos, 2 numerales, 21 puntos)
  "..............##....##....................", // Línea 3 (14 puntos, 1 numeral, 5 puntos, 2 numerales, 20 puntos)
  "..............##.....#....................", // Línea 4 (14 puntos, 1 numeral, 5 puntos, 1 numeral, 20 puntos)
  "..............##....##....................", // Línea 5 (14 puntos, 2 numerales, 5 puntos, 2 numerales, 20 puntos)
  "..............##..........................", // Línea 6 (14 puntos, 2 numerales, 25 puntos)
  "..............##..........................", // Línea 7 (14 puntos, 2 numerales, 25 puntos)
  "..............##..........................", // Línea 8 (14 puntos, 2 numerales, 25 puntos)
  "..............##...######.................", // Línea 9 (14 puntos, 2 numerales, 3 puntos, 7 numerales, 16 puntos)
  "..............##...######.................", // Línea 10 (14 puntos, 2 numerales, 3 puntos, 7 numerales, 16 puntos)
  "...............#.....##.#.................", // Línea 11 (15 puntos, 1 numeral, 5 puntos, 2 numerales, 2 puntos, 1 numeral, 16 puntos)
  "...............#.....##.#.................", // Línea 12 (15 puntos, 1 numeral, 5 puntos, 2 numerales, 2 puntos, 1 numeral, 16 puntos)
  "................##..##..#.................", // Línea 13 (16 puntos, 2 numerales, 2 puntos, 2 numerales, 3 puntos, 1 numeral, 16 puntos)
  ".................#####..#................", // Línea 14 (17 puntos, 14 numerales, 4 puntos, 1 numeral, 16 puntos)
  "........................#..................", // Línea 15 (25 puntos, 1 numeral, 16 puntos)
  "...............##########................", // Línea 16 (17 puntos, 10 numerales, 16 puntos)
  "...............###....###................", // Línea 17 (17 puntos, 3 numerales, 4 puntos, 3 numerales, 17 puntos)
  "...............#.#....#.#................", // Línea 18 (17 puntos, 3 numerales, 4 puntos, 3 numerales, 17 puntos)
  "...............###....###................"  // Línea 19 (17 puntos, 3 numerales, 4 puntos, 3 numerales, 17 puntos)
];
  // Tamaño de pieza según ancho de pantalla (un poco más chico en
  // mobile para ganar columnas, pero sin exagerar).
  function getResponsiveConfig() {
    const w = window.innerWidth;
    if (w <= 600)  return { tileW: 28, rowH: 24 };
    if (w <= 900)  return { tileW: 34, rowH: 28 };
    return { tileW: 40, rowH: 32 };
  }
  // ---------------------------------

  let TILE_W = 40, ROW_HEIGHT = 32;
  let canvas, ctx, dpr = 1;
  let cols = 0, rowsMax = 0;
  let seedRow = [];        // orden aleatorio de aparición por fila (determinístico)
  let logoMap = null;      // Set con "fila,col" de las piezas que son parte del logo
  let startY = 0, endY = 1;

  // ---------- utilidades ----------
  function shuffleSeed(n, seed) {
    const arr = Array.from({ length: n }, (_, i) => i);
    let s = seed || 1;
    for (let i = n - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function shadeColor(hex, percent) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + percent, g = ((n >> 8) & 0xff) + percent, b = (n & 0xff) + percent;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `rgb(${r},${g},${b})`;
  }

  // Agrega el colchón de scroll invisible al final del <body>,
  // así el mosaico tiene margen para terminar de cerrarse sin
  // tapar el footer mientras todavía se está leyendo.
  function ensureBuffer() {
    let bufferEl = document.querySelector('.mosaico-buffer-space');
    if (!bufferEl) {
      bufferEl = document.createElement('div');
      bufferEl.className = 'mosaico-buffer-space';
      bufferEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bufferEl);
    }
    bufferEl.style.cssText = `height:${BUFFER_VH}vh;width:100%;pointer-events:none;`;
  }

  // Arma el Set de celdas del logo a partir de LOGO_PATTERN,
  // centrado en la grilla actual de pantalla. Se llama cada
  // vez que cambia el tamaño de ventana (resize), porque cols/
  // rowsMax pueden cambiar.
  function buildLogoMapFromPattern() {
    const map = new Set();
    const patRows = LOGO_PATTERN.length;
    const patCols = LOGO_PATTERN[0].length;

    const startRow = Math.round((rowsMax - patRows) / 2);
    const startCol = Math.round((cols - patCols) / 2);

    for (let r = 0; r < patRows; r++) {
      const rowStr = LOGO_PATTERN[r];
      for (let c = 0; c < patCols; c++) {
        if (rowStr[c] === '#') {
          map.add(`${r + startRow},${c + startCol}`);
        }
      }
    }
    logoMap = map;
  }

  function drawTile(x, y, w, h, isLogo, seed) {
    const jitterX = ((seed * 13) % 5) - 2;
    const jitterY = ((seed * 7) % 5) - 2;
    const rot = (((seed * 31) % 7) - 3) * (Math.PI / 180); // ±3°
    const shade = ((seed * 17) % 20) - 10;
    const base = isLogo ? COLOR_LOGO : COLOR_TILE;

    ctx.save();
    ctx.translate(x + w / 2 + jitterX, y + h / 2 + jitterY);
    ctx.rotate(rot);

    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = shadeColor(base, shade);
    ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);

    ctx.shadowColor = 'transparent';
    const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);

    ctx.restore();
  }

  function paintRow(rowIndex, cantidad) {
    const orden = seedRow[rowIndex];
    for (let i = 0; i < cantidad; i++) {
      const col = orden[i];
      const isLogo = logoMap ? logoMap.has(`${rowIndex},${col}`) : false;
      drawTile(col * TILE_W, rowIndex * ROW_HEIGHT, TILE_W, ROW_HEIGHT, isLogo, col * 7 + rowIndex * 31 + 1);
    }
  }

  // ---------- scroll → progreso ----------
  // startY: scrollY al que el FAQ toca el techo de la ventana.
  // endY: scrollY máximo posible (incluye el colchón del final).
  function computeAnchors() {
    const startEl = document.querySelector(START_SELECTOR);
    const docH = document.documentElement.scrollHeight;
    startY = startEl ? (startEl.getBoundingClientRect().top + window.scrollY) : 0;
    endY = Math.max(startY + 1, docH - window.innerHeight);
  }

  let lastRows = -1, lastPartial = -1;

  function draw(force) {
    const scrollY = window.scrollY || window.pageYOffset;
    const progress = Math.max(0, Math.min(1, (scrollY - startY) / (endY - startY)));
    const coveragePx = progress * (rowsMax * ROW_HEIGHT);
    const filasCompletas = Math.floor(coveragePx / ROW_HEIGHT);
    const partial = (coveragePx / ROW_HEIGHT) - filasCompletas;

    if (!force && filasCompletas === lastRows && Math.abs(partial - lastPartial) < 0.01) return;
    lastRows = filasCompletas; lastPartial = partial;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const altoConGrout = Math.min(rowsMax, filasCompletas + (partial > 0 ? 1 : 0)) * ROW_HEIGHT;
    if (altoConGrout > 0) {
      ctx.fillStyle = GROUT;
      ctx.fillRect(0, 0, canvas.width / dpr, altoConGrout);
    }

    for (let r = 0; r < filasCompletas; r++) paintRow(r, cols);
    if (partial > 0 && filasCompletas < rowsMax) {
      paintRow(filasCompletas, Math.floor(partial * cols));
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cfg = getResponsiveConfig();
    TILE_W = cfg.tileW;
    ROW_HEIGHT = cfg.rowH;

    const w = window.innerWidth;
    const h = window.innerHeight;
    cols = Math.ceil(w / TILE_W) + 1;
    rowsMax = Math.ceil(h / ROW_HEIGHT) + 1;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    seedRow = Array.from({ length: rowsMax }, (_, r) => shuffleSeed(cols, r * 97 + 13));
    buildLogoMapFromPattern();
    computeAnchors();

    lastRows = -1; lastPartial = -1;
    draw(true);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { draw(); ticking = false; });
  }

  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'mosaico-narrativo';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%',
      'z-index:9999', 'pointer-events:none', 'display:block'
    ].join(';');
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');

    ensureBuffer();
    resize();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();